
import { GoogleGenerativeAI } from "@google/generative-ai";
import { VideoData, SeoAnalysisResult, ThumbnailAnalysisResult, ChannelAnalysisResult, SingleVideoAnalysis, KeywordAnalysisResult, KeywordAnalysisSource } from "../types";

// Helper to fetch image as inline data for Gemini Vision
const urlToGenerativePart = async (url: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const base64data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    const base64String = base64data.split(',')[1];
    return {
      inlineData: {
        data: base64String,
        mimeType: blob.type || "image/jpeg",
      },
    };
  } catch (error) {
    console.warn("Error fetching image for analysis (likely CORS issue, proceeding text-only):", error);
    return null;
  }
};

export const analyzeKeywordSEO = async (
  apiKeys: string[],
  searchTerm: string,
  videos: VideoData[],
  modelId: string,
  regionName: string = "Toàn cầu",
  timeframe: string = "12 tháng qua",
  categoryName: string = "Tất cả danh mục"
): Promise<KeywordAnalysisResult> => {

  const views = videos.map(v => v.viewCountRaw || 0);
  const highestViews = Math.max(...views, 0);
  const avgViews = Math.round(views.reduce((a, b) => a + b, 0) / (videos.length || 1));

  const now = new Date();
  const last7DaysCount = videos.filter(v => {
    const d = new Date(v.publishedAt);
    return (now.getTime() - d.getTime()) <= (7 * 24 * 60 * 60 * 1000);
  }).length;

  const ccCount = videos.filter(v => v.caption === 'true').length;
  const inTitleCount = videos.filter(v => v.title.toLowerCase().includes(searchTerm.toLowerCase())).length;

  const channels: Record<string, { count: number; views: number }> = {};
  videos.forEach(v => {
    if (!channels[v.channelTitle]) channels[v.channelTitle] = { count: 0, views: 0 };
    channels[v.channelTitle].count++;
    channels[v.channelTitle].views += (v.viewCountRaw || 0);
  });
  const sortedCreators = Object.entries(channels).sort((a, b) => b[1].views - a[1].views);
  const topCreator = sortedCreators[0]?.[0] || "Chưa xác định";

  const prompt = `
    Bạn là một chuyên gia phân tích dữ liệu YouTube Master.
    NHIỆM VỤ: Hãy sử dụng công cụ Google Search để tìm nạp dữ liệu thực tế mới nhất từ Google Trends và YouTube Search cho từ khóa: "${searchTerm}".
    
    BỐI CẢNH TÌM KIẾM:
    - Vùng: ${regionName}
    - Thời gian: ${timeframe}
    - Danh mục: ${categoryName}

    Dựa trên thông tin tìm được, hãy trả về dữ liệu phân tích chi tiết.
    Yêu cầu trả về JSON chính xác theo Schema sau (chỉ trả về JSON, không có code block):
    {
      "overallScore": number,
      "volume": number,
      "competition": number,
      "relatedKeywords": [{"term": string, "score": number}],
      "risingKeywords": [{"term": string, "volume": string, "change": string, "isUp": boolean, "topic": string, "country": string}],
      "topOpportunities": [{"term": string, "score": number, "reason": string, "topic": string, "country": string}]
    }
  `;

  // Loop fallback logic theo thứ tự yêu cầu
  const fallbackSequence = [
    modelId || "gemini-3-flash-preview",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash"
  ].filter((v, i, a) => a.indexOf(v) === i); // Đảm bảo Unique

  let aiData: any = null;
  let sources: KeywordAnalysisSource[] | undefined = undefined;
  let lastError: any = null;
  let success = false;

  for (const key of apiKeys) {
    if (success) break;
    if (!key.trim()) continue;
    const genAI = new GoogleGenerativeAI(key);

    for (const currentModel of fallbackSequence) {
      if (success) break;
      try {
        console.log(`[Keyword Analysis] Đang thử model: ${currentModel} với Key: ...${key.slice(-4)}`);
        // Config tools for Flash models to enable Search
        const toolConfig = [{ googleSearch: {} } as any];

        const model = genAI.getGenerativeModel({
          model: currentModel,
          tools: toolConfig
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        aiData = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());

        // Try extract Grounding metadata
        if (result.response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
          sources = result.response.candidates[0].groundingMetadata.groundingChunks
            .filter((chunk: any) => chunk.web?.uri)
            .map((chunk: any) => ({ title: chunk.web.title || "Nguồn tin cậy", uri: chunk.web.uri }));
        }

        console.log(`[Keyword Analysis] Thành công với model: ${currentModel}`);
        success = true;
        break; // Thành công thì thoát vòng lặp model
      } catch (error: any) {
        console.warn(`[Keyword Analysis] Model ${currentModel} thất bại: ${error.message}`);
        lastError = error;
        aiData = null; // Đặt lại null để tiếp tục
        if (error.message.includes('429') || error.message.includes('Quota')) {
          console.warn('API Key đạt giới hạn, chuyển sang Key khác...');
          break; // Thoát vòng Model, qua vòng lặp Key tiếp theo
        }
      }
    }
  }

  if (!aiData) {
    // Nếu cả 3 model đều thất bại thì fallback cuối cùng bằng phân tích cục bộ
    console.warn(`Tất cả Models (kể cả Fallback) đều thất bại vì ${lastError?.message}. Trả về dữ liệu nội bộ.`);
    return {
      searchTerm, highestViews, avgViews,
      addedLast7Days: `${last7DaysCount}/${videos.length}`,
      ccCount: `${ccCount}/${videos.length}`,
      timesInTitle: `${inTitleCount}/${videos.length}`,
      timesInDesc: videos.filter(v => v.description.toLowerCase().includes(searchTerm.toLowerCase())).length + `/${videos.length}`,
      topCreator, avgAge: "Dữ liệu ước tính",
      topChannels: sortedCreators.slice(0, 3).map(([name]) => ({ name, subscriberCount: "N/A" })),
      overallScore: 75, volume: 50, competition: 50, relatedKeywords: [], risingKeywords: [], topOpportunities: [],
      sources: [{ title: "Lỗi kết nối AI (Dùng dữ liệu nội bộ)", uri: "#" }]
    } as KeywordAnalysisResult;
  }

  return {
    searchTerm,
    highestViews,
    avgViews,
    addedLast7Days: `${last7DaysCount}/${videos.length}`,
    ccCount: `${ccCount}/${videos.length}`,
    timesInTitle: `${inTitleCount}/${videos.length}`,
    timesInDesc: videos.filter(v => v.description.toLowerCase().includes(searchTerm.toLowerCase())).length + `/${videos.length}`,
    topCreator,
    avgAge: "Theo xu hướng hiện tại",
    topChannels: sortedCreators.slice(0, 3).map(([name]) => ({ name, subscriberCount: "N/A" })),
    ...aiData,
    sources: sources?.length ? sources : undefined
  } as KeywordAnalysisResult;
};

export const analyzeSeoStrategy = async (apiKeys: string[], videos: VideoData[], modelId: string): Promise<SeoAnalysisResult> => {
  const prompt = `Phân tích chiến lược SEO video và trả về JSON (không markdown). Trả lời tiếng Việt.`;
  const fallbacks = [modelId || "gemini-3-flash-preview", "gemini-2.5-flash-lite", "gemini-2.5-flash"].filter((v, i, a) => a.indexOf(v) === i);
  let lastError;

  for (const key of apiKeys) {
    if (!key.trim()) continue;
    const genAI = new GoogleGenerativeAI(key);
    for (const currentModel of fallbacks) {
      try {
        const model = genAI.getGenerativeModel({ model: currentModel, generationConfig: { responseMimeType: "application/json" } });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim()) as SeoAnalysisResult;
      } catch (e: any) {
        console.warn(`[SEO Strategy] Model ${currentModel} failed: ${e.message}`);
        lastError = e;
        if (e.message.includes('429') || e.message.includes('Quota')) break;
      }
    }
  }
  throw new Error(`Lỗi phân tích SEO: ${lastError?.message}`);
};

export const analyzeThumbnailPatterns = async (apiKeys: string[], videos: VideoData[], modelId: string): Promise<ThumbnailAnalysisResult> => {
  const prompt = `Phân tích mẫu thumbnail hiệu quả và trả về JSON (không markdown). Trả lời tiếng Việt.
    Yêu cầu trả về JSON có cấu trúc như sau:
    {
      "designStyle": "string",
      "emotionalAppeal": "string",
      "layoutComposition": "string",
      "colorAndLighting": "string",
      "typography": "string",
      "standoutElements": "string",
      "improvements": "string",
      "designProposals": [
        {
          "styleName": "string",
          "background": "string",
          "textOverlay": "string",
          "layoutExample": "string"
        },
        {
          "styleName": "string",
          "background": "string",
          "textOverlay": "string",
          "layoutExample": "string"
        },
        {
          "styleName": "string",
          "background": "string",
          "textOverlay": "string",
          "layoutExample": "string"
        }
      ]
    }`;

  const fallbacks = [modelId || "gemini-3-flash-preview", "gemini-2.5-flash-lite", "gemini-2.5-flash"].filter((v, i, a) => a.indexOf(v) === i);
  let lastError;

  for (const key of apiKeys) {
    if (!key.trim()) continue;
    const genAI = new GoogleGenerativeAI(key);
    for (const currentModel of fallbacks) {
      try {
        const model = genAI.getGenerativeModel({ model: currentModel, generationConfig: { responseMimeType: "application/json" } });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim()) as ThumbnailAnalysisResult;
      } catch (e: any) {
        console.warn(`[Thumbnail Patterns] Model ${currentModel} failed: ${e.message}`);
        lastError = e;
        if (e.message.includes('429') || e.message.includes('Quota')) break;
      }
    }
  }
  throw new Error(`Lỗi phân tích Thumbnail: ${lastError?.message}`);
};

export const analyzeChannelStrategy = async (apiKeys: string[], videos: VideoData[], modelId: string): Promise<ChannelAnalysisResult> => {
  const prompt = `Phân tích SWOT kênh và trả về JSON (không markdown). Trả lời tiếng Việt.`;
  const fallbacks = [modelId || "gemini-3-flash-preview", "gemini-2.5-flash-lite", "gemini-2.5-flash"].filter((v, i, a) => a.indexOf(v) === i);
  let lastError;

  for (const key of apiKeys) {
    if (!key.trim()) continue;
    const genAI = new GoogleGenerativeAI(key);
    for (const currentModel of fallbacks) {
      try {
        const model = genAI.getGenerativeModel({ model: currentModel, generationConfig: { responseMimeType: "application/json" } });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim()) as ChannelAnalysisResult;
      } catch (e: any) {
        console.warn(`[Channel Strategy] Model ${currentModel} failed: ${e.message}`);
        lastError = e;
        if (e.message.includes('429') || e.message.includes('Quota')) break;
      }
    }
  }
  throw new Error(`Lỗi phân tích Kênh: ${lastError?.message}`);
};

export const generateThumbnailVisual = async (apiKey: string, video: VideoData, suggestion: any, fullAnalysis: any): Promise<{ imagePrompt: string, imageUrl: string }> => {
  console.log("DEBUG: Starting generateThumbnailVisual with Pollinations FLUX");

  let imagePrompt = suggestion.imagePrompt || `High quality 4k youtube thumbnail, photorealistic, ${suggestion.background}, ${suggestion.textOverlay}`;

  try {
    console.log("DEBUG: Using Pre-generated Image Prompt:", imagePrompt);

    // Use Pollinations.ai FLUX model
    console.log(`[Image Generation] Sử dụng Pollinations.ai với model FLUX...`);
    const encodedPrompt = encodeURIComponent(imagePrompt);
    const pollinationsUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?model=flux&width=1280&height=720&nologo=true`;

    // Test if Pollinations is accessible
    const pollResponse = await fetch(pollinationsUrl, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer sk_bC1Jk35gW3SUvGFVjGecNuEMj5mg6Jw1'
      }
    });

    if (pollResponse.ok) {
      const blob = await pollResponse.blob();
      const base64data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      console.log(`[Image Generation] Tạo ảnh thành công bằng Pollinations.ai`);
      return { imagePrompt, imageUrl: base64data };
    } else {
      const errText = await pollResponse.text();
      throw new Error(`Pollinations API lỗi: HTTP ${pollResponse.status} - ${errText}`);
    }

  } catch (error: any) {
    console.error(`Lỗi toàn bộ block tạo ảnh: ${error.message}`);
    throw new Error(`Tạo ảnh thất bại. Lỗi: ${error.message}`);
  }
};

export const analyzeSingleVideoAnalytics = async (apiKeys: string[], video: VideoData, modelId: string): Promise<SingleVideoAnalysis> => {
  const prompt = `
    Phân tích chi tiết video YouTube và Thumbnail(nếu có):
    Tiêu đề: ${video.title}
    Mô tả: ${video.description}
  Kênh: ${video.channelTitle}
  View: ${video.viewCountRaw}, Like: ${video.likeCountRaw}, ER: ${video.engagementRate}%

    YÊU CẦU QUAN TRỌNG:
  1. PHÂN TÍCH SÂU VỀ HÌNH ẢNH THUMBNAIL(Bố cục, màu sắc, cảm xúc, text trên ảnh).
    2. TẤT CẢ OUTPUT PHẢI LÀ TIẾNG VIỆT 100 %.

    Yêu cầu trả về JSON chính xác(không markdown):
  {
    "performanceVerdict": "string (Nhận định hiệu suất)",
      "audienceHook": "string (Yếu tố thu hút)",
        "retentionStrategy": "string (Chiến lược giữ chân)",
          "growthPotential": "string (Tiềm năng tăng trưởng)",
            "predictedDemographics": { "ageGroups": "string", "genderDistribution": "string", "targetLocations": "string" },
    "thumbnailAnalysis": {
      "strengths": "string (Điểm mạnh của thumbnail)",
        "weaknesses": "string (Điểm yếu)",
          "emotionalTriggers": "string (Yếu tố cảm xúc, khuôn mặt...)",
            "textAnalysis": "string (Phân tích text trên ảnh: font, màu, nội dung)",
              "composition": "string (Bố cục, độ tương phản, nổi bật)",
                "improvementSuggestions": ["string (Đề xuất 1: Rõ ràng, cụ thể)", "string (Đề xuất 2: Khác biệt với đề xuất 1)", "string (Đề xuất 3: Đột phá, sáng tạo)"],
                  "designProposals": [
                    {
                      "styleName": "string (Tên phong cách, VD: Gây sốc, Bí ẩn, Tươi sáng...)",
                      "background": "string (Mô tả background)",
                      "textOverlay": "string (Text trên ảnh)",
                      "layoutExample": "string (Mô tả bố cục)",
                      "imagePrompt": "string (BẮT BUỘC Tiếng Anh, max 500 ký tự. Prompt để AI vẽ ảnh 3D/Photorealistic chi tiết về bối cảnh, nhân vật, màu sắc, high quality, 4k)"
                    },
                    {
                      "styleName": "string (Phong cách 2)",
                      "background": "string",
                      "textOverlay": "string",
                      "layoutExample": "string",
                      "imagePrompt": "string (Tiếng Anh, max 500 ký tự)"
                    },
                    {
                      "styleName": "string (Phong cách 3)",
                      "background": "string",
                      "textOverlay": "string",
                      "layoutExample": "string",
                      "imagePrompt": "string (Tiếng Anh, max 500 ký tự)"
                    }
                  ]
    },
    "copyrightDetails": "string (Nếu video có bản quyền (licensedContent=true), hãy trích xuất thông tin bản quyền từ mô tả/tiêu đề hoặc ghi 'Thông tin bản quyền được xác định bởi hệ thống YouTube'. Nếu không, ghi 'Không tìm thấy thông tin bản quyền cụ thể')"
  }
  `;

  // Fetch image if available
  let imagePart = null;
  if (video.thumbnailUrl) {
    // Try maxres first, fall back to default
    const highResUrl = video.thumbnailUrl.replace('hqdefault', 'maxresdefault');
    try {
      imagePart = await urlToGenerativePart(highResUrl);
    } catch {
      try {
        imagePart = await urlToGenerativePart(video.thumbnailUrl);
      } catch {
        imagePart = null;
      }
    }
  }

  const parts: any[] = imagePart ? [{ text: prompt }, imagePart] : [{ text: prompt }];

  const targetModelId = modelId || 'gemini-2.5-flash';
  const fallbacks = [targetModelId, 'gemini-3-flash-preview', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'].filter((v, i, a) => a.indexOf(v) === i);
  let lastError;

  for (const key of apiKeys) {
    if (!key.trim()) continue;
    const genAI = new GoogleGenerativeAI(key);
    for (const currentModel of fallbacks) {
      try {
        console.log(`[Single Video Analytics] Thử model: ${currentModel}...`);
        const fallbackModel = genAI.getGenerativeModel({ model: currentModel, generationConfig: { responseMimeType: "application/json" } });
        const fallbackResult = await fallbackModel.generateContent({ contents: [{ role: "user", parts }] });
        const fallbackText = fallbackResult.response.text();
        const cleanedFallbackText = fallbackText.replace(/```json/g, '').replace(/```/g, '').trim();
        const fallbackAnalysis = JSON.parse(cleanedFallbackText) as SingleVideoAnalysis;
        return fallbackAnalysis;
      } catch (error: any) {
        console.warn(`[Single Video Analytics] Fallback ${currentModel} failed: ${error.message}`);
        lastError = error;
        if (error.message.includes('429') || error.message.includes('Quota')) break;
      }
    }
  }

  throw new Error(`Lỗi khối phân tích toàn cục: Tất cả models đều thất bại. Chi tiết: ${lastError?.message}`);
};
