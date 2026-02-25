
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
  apiKey: string,
  searchTerm: string,
  videos: VideoData[],
  modelId: string,
  regionName: string = "Toàn cầu",
  timeframe: string = "12 tháng qua",
  categoryName: string = "Tất cả danh mục"
): Promise<KeywordAnalysisResult> => {
  const genAI = new GoogleGenerativeAI(apiKey);

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

  // Primary attempt: Selected Model (e.g. Gemini 3.0 Flash) + Search Tool if supported
  try {
    // Note: tools might not be supported on all models, but 3.0 and 2.0-exp usually support it.
    // Use the selected modelId, or default to 3.0
    const selectedModel = modelId || "gemini-3.0-flash";

    // Config tools only for models known to support search grounding (usually 2.0+ exp/flash variants)
    const toolConfig = (selectedModel.includes('flash') || selectedModel.includes('exp'))
      ? [{ googleSearch: {} } as any]
      : undefined;

    const model = genAI.getGenerativeModel({
      model: selectedModel,
      tools: toolConfig
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Clean JSON if needed
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const aiData = JSON.parse(cleanedText);

    // Extract grounding metadata if available (SDK might structure it differently, checking response candidate)
    const sources: KeywordAnalysisSource[] = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          sources.push({ title: chunk.web.title || "Nguồn tin cậy", uri: chunk.web.uri });
        }
      });
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
      sources: sources.length > 0 ? sources : undefined
    } as KeywordAnalysisResult;

  } catch (error: any) {
    console.warn("Primary Analysis failed, attempting fallback to Gemini 2.5 Flash...", error);

    // First Fallback: Gemini 2.5 Flash (if primary wasn't already 2.5)
    if (modelId !== "gemini-2.5-flash") {
      try {
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          tools: [{ googleSearch: {} } as any]
        });
        const result = await model.generateContent(prompt); // Try with search first on 2.5
        const text = result.response.text();
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiData = JSON.parse(cleanedText);

        // Return result from 2.5
        return {
          searchTerm,
          highestViews, avgViews,
          addedLast7Days: `${last7DaysCount}/${videos.length}`,
          ccCount: `${ccCount}/${videos.length}`,
          timesInTitle: `${inTitleCount}/${videos.length}`,
          timesInDesc: videos.filter(v => v.description.toLowerCase().includes(searchTerm.toLowerCase())).length + `/${videos.length}`,
          topCreator, avgAge: "Theo xu hướng hiện tại",
          topChannels: sortedCreators.slice(0, 3).map(([name]) => ({ name, subscriberCount: "N/A" })),
          ...aiData,
          sources: [{ title: "Dữ liệu từ Gemini 2.5 Flash", uri: "#" }]
        } as KeywordAnalysisResult;

      } catch (e2) {
        console.warn("Gemini 2.5 Flash fallback failed, proceeding to Gemini 1.5 Flash standard fallback...", e2);
      }
    }

    // Final Fallback: Gemini 1.5 Flash
    const fallbackPrompt = `
      Bạn là chuyên gia về YouTube.
      Dựa trên danh sách ${videos.length} video hàng đầu về "${searchTerm}" mà tôi đã cung cấp (tiêu đề, lượt xem, kênh...), hãy phân tích xu hướng.
      
      Dữ liệu các video hàng đầu:
      ${videos.slice(0, 10).map(v => `- ${v.title} (${v.viewCountRaw} xem)`).join('\n')}

      Hãy NHIỆM VỤ: Dự đoán các từ khóa đang lên và cơ hội nội dung.
      Trả về JSON chính xác (không markdown):
      {
        "overallScore": number,
        "volume": number,
        "competition": number,
        "relatedKeywords": [{"term": string, "score": number}],
        "risingKeywords": [{"term": string, "volume": string, "change": string, "isUp": boolean, "topic": string, "country": string}],
        "topOpportunities": [{"term": string, "score": number, "reason": string, "topic": string, "country": string}]
      }
    `;

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
      const result = await model.generateContent(fallbackPrompt);
      const text = result.response.text();
      const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const aiData = JSON.parse(cleanedText);

      return {
        searchTerm,
        highestViews,
        avgViews,
        addedLast7Days: `${last7DaysCount}/${videos.length}`,
        ccCount: `${ccCount}/${videos.length}`,
        timesInTitle: `${inTitleCount}/${videos.length}`,
        timesInDesc: videos.filter(v => v.description.toLowerCase().includes(searchTerm.toLowerCase())).length + `/${videos.length}`,
        topCreator,
        avgAge: "Dữ liệu ước tính",
        topChannels: sortedCreators.slice(0, 3).map(([name]) => ({ name, subscriberCount: "N/A" })),
        ...aiData,
        sources: [{ title: "Phân tích nội bộ từ Metadata Video", uri: "#" }]
      } as KeywordAnalysisResult;

    } catch (fallbackError: any) {
      console.error("Fallback Analysis Error:", fallbackError);
      throw new Error(`Lỗi phân tích: ${fallbackError.message || "Không thể kết nối Gemini"}`);
    }
  }
};

export const analyzeSeoStrategy = async (apiKey: string, videos: VideoData[], modelId: string): Promise<SeoAnalysisResult> => {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelId || "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
    const prompt = `Phân tích chiến lược SEO video và trả về JSON (không markdown). Trả lời tiếng Việt.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim()) as SeoAnalysisResult;
  } catch (error) { throw new Error(`Lỗi phân tích SEO: ${error}`); }
};

export const analyzeThumbnailPatterns = async (apiKey: string, videos: VideoData[], modelId: string): Promise<ThumbnailAnalysisResult> => {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelId || "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
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

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim()) as ThumbnailAnalysisResult;
  } catch (error) { throw new Error(`Lỗi phân tích Thumbnail: ${error}`); }
};

export const analyzeChannelStrategy = async (apiKey: string, videos: VideoData[], modelId: string): Promise<ChannelAnalysisResult> => {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelId || "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
    const prompt = `Phân tích SWOT kênh và trả về JSON (không markdown). Trả lời tiếng Việt.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim()) as ChannelAnalysisResult;
  } catch (error) { throw new Error(`Lỗi phân tích Kênh: ${error}`); }
};

export const generateThumbnailVisual = async (apiKey: string, video: VideoData, suggestion: any, fullAnalysis: any): Promise<{ imagePrompt: string, imageUrl: string }> => {
  console.log("DEBUG: Starting generateThumbnailVisual with Imagen 3");
  let imagePrompt = "";
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use Gemini 2.5 Flash to generate a detailed image prompt first
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { responseMimeType: "text/plain" } });

    const textPrompt = `
      You are a world-class YouTube Thumbnail Designer.
      Goal: Create a "After" version of a thumbnail that fixes the weaknesses of the current one.

      Video Title: ${video.title}
      
      Current Analysis (The "Before" state):
      - Strengths: ${fullAnalysis?.strengths || "N/A"}
      - Weaknesses to Fix: ${fullAnalysis?.weaknesses || "N/A"}
      - Improvement Advice: ${Array.isArray(fullAnalysis?.improvementSuggestions) ? fullAnalysis.improvementSuggestions.join('. ') : (fullAnalysis?.improvementSuggestions || "Make it pop")}

      Your Design Plan (The "After" state):
      - Style: ${suggestion.styleName}
      - Background: ${suggestion.background}
      - Text Overlay: ${suggestion.textOverlay}
      - Layout: ${suggestion.layoutExample}

      TASK: Create a HIGHLY DETAILED, PHOTOREALISTIC image generation prompt (in English) for this specific design style.
      The prompt must:
      1. Directly address the "Weaknesses" (e.g., if weakness is "cluttered", prompt for "clean, minimal").
      2. Follow the "Design Plan".
      3. Describe the visual elements (lighting, colors, expressions, text placement) in extreme detail for an AI generator.
      4. Include keywords: "high quality, 4k, trending on youtube, vibrant, high contrast, catchy".

      Return ONLY the raw prompt string, no markdown, no explanations. Max 500 characters.
    `;

    const result = await model.generateContent(textPrompt);
    imagePrompt = result.response.text().trim();
    if (imagePrompt.length > 500) {
      imagePrompt = imagePrompt.substring(0, 500); // Imagen models sometimes have stricter prompt length limits
    }
    console.log("DEBUG: Generated Image Prompt:", imagePrompt);

    // Call Imagen 3 model via REST API since standard SDK doesn't natively support it yet easily for text-to-image without specific setup
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances: [
          { prompt: imagePrompt }
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: "16:9",
          outputOptions: {
            mimeType: "image/jpeg"
          }
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Imagen API Error: ${response.status} ${errText}`);
    }

    const data = await response.json();

    if (data.predictions && data.predictions.length > 0 && data.predictions[0].bytesBase64Encoded) {
      const imageUrl = `data:image/jpeg;base64,${data.predictions[0].bytesBase64Encoded}`;
      console.log("DEBUG: Generated Image successfully via Imagen 3");
      return { imagePrompt, imageUrl };
    } else {
      throw new Error("Invalid response format from Imagen API");
    }

  } catch (error: any) {
    console.warn(`DEBUG: Visual generation with Imagen 3 failed (${error.message}). Falling back to Pollinations...`);
    // Truncate the prompt to avoid URI Too Long errors with the API
    let safePrompt = imagePrompt || "beautiful youtube thumbnail";
    if (safePrompt.length > 500) safePrompt = safePrompt.substring(0, 500); // Flux handles longer prompts better

    const encodedPrompt = encodeURIComponent(safePrompt);
    const pollinationsKey = "sk_GBd4wtcGOT5eBdbn59vAnaKakMZmT4oO";
    const pollinationsUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?width=1280&height=720&nologo=true&model=flux&key=${pollinationsKey}`;
    return { imagePrompt: imagePrompt || "Generated without custom prompt", imageUrl: pollinationsUrl };
  }
};

export const analyzeSingleVideoAnalytics = async (apiKey: string, video: VideoData, modelId: string): Promise<SingleVideoAnalysis> => {
  const genAI = new GoogleGenerativeAI(apiKey);
  // Default to gemini-2.5-flash if 1.5 is problematic or not specified
  const targetModelId = (modelId === 'gemini-1.5-flash') ? 'gemini-2.5-flash' : (modelId || 'gemini-2.5-flash');
  const model = genAI.getGenerativeModel({ model: targetModelId, generationConfig: { responseMimeType: "application/json" } });

  const prompt = `
    Phân tích chi tiết video YouTube và Thumbnail (nếu có):
    Tiêu đề: ${video.title}
    Mô tả: ${video.description}
    Kênh: ${video.channelTitle}
    View: ${video.viewCountRaw}, Like: ${video.likeCountRaw}, ER: ${video.engagementRate}%

    YÊU CẦU QUAN TRỌNG: 
    1. PHÂN TÍCH SÂU VỀ HÌNH ẢNH THUMBNAIL (Bố cục, màu sắc, cảm xúc, text trên ảnh).
    2. TẤT CẢ OUTPUT PHẢI LÀ TIẾNG VIỆT 100%.

    Yêu cầu trả về JSON chính xác (không markdown):
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
              "layoutExample": "string (Mô tả bố cục)"
            },
            {
              "styleName": "string (Phong cách 2)",
              "background": "string",
              "textOverlay": "string",
              "layoutExample": "string"
            },
            {
              "styleName": "string (Phong cách 3)",
              "background": "string",
              "textOverlay": "string",
              "layoutExample": "string"
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

  try {
    const result = await model.generateContent({ contents: [{ role: "user", parts }] });
    const text = result.response.text();
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const analysis = JSON.parse(cleanedText) as SingleVideoAnalysis;
    return analysis;
  } catch (error: any) {
    console.warn(`Primary model failed: ${error.message}, attempting fallbacks...`);
    const fallbacks = ['gemini-3.0-flash', 'gemini-2.5-flash', 'gemini-1.5-pro'];
    for (const fallbackId of fallbacks) {
      if (fallbackId === targetModelId) continue;
      try {
        console.log(`Fallback to ${fallbackId}...`);
        const fallbackModel = genAI.getGenerativeModel({ model: fallbackId, generationConfig: { responseMimeType: "application/json" } });
        const fallbackResult = await fallbackModel.generateContent({ contents: [{ role: "user", parts }] });
        const fallbackText = fallbackResult.response.text();
        const cleanedFallbackText = fallbackText.replace(/```json/g, '').replace(/```/g, '').trim();
        const fallbackAnalysis = JSON.parse(cleanedFallbackText) as SingleVideoAnalysis;
        return fallbackAnalysis;
      } catch (e) {
        console.warn(`Fallback ${fallbackId} failed`);
        continue;
      }
    }
    throw new Error(`Lỗi khối phân tích toàn cục: Tất cả models đều thất bại. Hãy kiểm tra lại API Key hoặc Data Limit. Chi tiết lỗi từ model chính: ${error.message}`);
  }
};
