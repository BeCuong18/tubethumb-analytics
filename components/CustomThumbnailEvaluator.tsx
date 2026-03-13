import React, { useState, useRef } from 'react';
import { CustomThumbnailEvaluation, GEMINI_MODELS } from '../types';
import { evaluateCustomThumbnail } from '../services/geminiService';
import { auth, checkUsageLimit, incrementUsage } from '../services/firebaseService';

interface CustomThumbnailEvaluatorProps {
  onClose: () => void;
  geminiModel: string;
  apiKey: string | string[];
}

const CustomThumbnailEvaluator: React.FC<CustomThumbnailEvaluatorProps> = ({ onClose, geminiModel, apiKey }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<CustomThumbnailEvaluation | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg("Kích thước ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB.");
        return;
      }
      setMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Extract base64 part
        const base64String = result.split(',')[1];
        setSelectedImage(base64String);
        setEvaluation(null); // Reset prev evaluation
        setErrorMsg(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const startEvaluation = async () => {
    if (!selectedImage) return;

    if (!apiKey || (Array.isArray(apiKey) && apiKey.length === 0)) {
      setErrorMsg("Vui lòng nhập Gemini API Key trong cài đặt trước khi sử dụng tính năng này.");
      return;
    }

    setIsEvaluating(true);
    setErrorMsg(null);

    const email = auth.currentUser?.email;
    if (email) {
      const isAllowed = await checkUsageLimit(email, 15);
      if (!isAllowed) {
        setErrorMsg("Hệ thống: Bạn đã đạt giới hạn 15 lượt AI hôm nay. Vui lòng quay lại vào ngày mai!");
        setIsEvaluating(false);
        return;
      }
    }

    try {
      const result = await evaluateCustomThumbnail(Array.isArray(apiKey) ? apiKey : [apiKey], selectedImage, mimeType, geminiModel);
      setEvaluation(result);
      if (email) {
        await incrementUsage(email);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Lỗi không thể chấm điểm Thumbnail từ Gemini.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500 scale-110 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]";
    if (score >= 60) return "text-yellow-500 scale-105 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]";
    return "text-red-500 scale-100 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]";
  };
  
  const getRingColor = (score: number) => {
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#eab308";
    return "#ef4444";
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="bg-[#121212] w-full max-w-5xl my-auto rounded-[2.5rem] overflow-hidden border border-[#2a2a2a] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 md:p-8 border-b border-[#222] bg-[#1a1a1a]/50">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(147,51,234,0.3)] shrink-0">
              <span className="text-2xl md:text-3xl">🎯</span>
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white leading-tight uppercase tracking-tighter">Thumbnail <span className="text-purple-500">Evaluator</span></h2>
              <p className="text-xs text-gray-400 font-medium">Chấm điểm & Phân tích tối ưu tỷ lệ click (CTR)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors text-gray-400 hover:text-white shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 space-y-8 bg-gradient-to-b from-[#121212] to-black">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Upload Area & Preview (Left Side) */}
            <div className="lg:col-span-4 space-y-6">
              <div 
                className={`relative w-full aspect-video rounded-[2rem] border-2 border-dashed overflow-hidden flex flex-col items-center justify-center transition-all group cursor-pointer
                  ${selectedImage ? 'border-[#333] bg-[#1a1a1a]' : 'border-purple-500/30 bg-purple-500/5 hover:border-purple-500 hover:bg-purple-500/10'}`}
                onClick={() => !isEvaluating && fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/jpeg, image/png, image/webp" 
                  onChange={handleImageUpload} 
                  className="hidden" 
                />
                
                {selectedImage ? (
                  <>
                    <img src={`data:${mimeType};base64,${selectedImage}`} alt="Uploaded Thumbnail" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    {!isEvaluating && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-white/10 text-white px-4 py-2 rounded-xl text-sm font-bold backdrop-blur-md border border-white/20">Thay đổi ảnh</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center p-6 flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-300">Nhấn để tải ảnh lên</p>
                      <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">Hỗ trợ JPG, PNG, WEBP (Max 5MB)</p>
                    </div>
                  </div>
                )}
              </div>

              {selectedImage && (!evaluation || errorMsg) && (
                <button
                  onClick={startEvaluation}
                  disabled={isEvaluating}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-sm transition-all shadow-[0_10px_30px_rgba(147,51,234,0.3)] hover:shadow-[0_10px_40px_rgba(147,51,234,0.5)] hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 relative overflow-hidden group"
                >
                  {isEvaluating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      AI ĐANG PHÂN TÍCH...
                    </>
                  ) : (
                    <>
                      <span className="text-lg">🤖</span> BẮT ĐẦU CHẤM ĐIỂM
                      <div className="absolute inset-0 bg-white/20 w-0 group-hover:w-full transition-all duration-500 ease-out z-0"></div>
                    </>
                  )}
                </button>
              )}

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-xs font-bold flex items-start gap-3">
                  <span className="text-base shrink-0">⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Analysis Results (Right Side) */}
            <div className="lg:col-span-8 min-h-[400px]">
              {isEvaluating ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-[#1a1a1a] rounded-[2rem] border border-[#2a2a2a] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-[100px] rounded-full animate-pulse-slow"></div>
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
                  
                  <div className="w-24 h-24 relative mb-8">
                    <div className="absolute inset-0 border-4 border-[#333] rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-3xl animate-bounce">🤖</div>
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2 text-center relative z-10">Gemini Vision AI</h3>
                  <p className="text-gray-400 text-sm max-w-sm text-center font-medium relative z-10 leading-relaxed">
                    Hệ thống đang mô phỏng góc nhìn của %khán giả, công cụ quét từng pixel để đánh giá sức hút thị giác...
                  </p>
                </div>
              ) : evaluation ? (
                <div className="bg-[#1a1a1a] rounded-[2.5rem] p-6 md:p-10 border border-purple-500/20 shadow-2xl relative animate-fade-in overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 blur-[50px]"></div>
                  
                  {/* Scores Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 pb-10 border-b border-[#2a2a2a]">
                    <div className="flex flex-col items-center justify-center p-4 bg-[#111] rounded-3xl border border-[#222]">
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-4">Điểm Tổng Tonal</span>
                      <div className="relative w-24 h-24">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="45" fill="none" stroke="#222" strokeWidth="8" />
                          <circle cx="50" cy="50" r="45" fill="none" stroke={getRingColor(evaluation.overallScore)} strokeWidth="8" strokeLinecap="round" strokeDasharray="283" strokeDashoffset={283 - (283 * evaluation.overallScore / 100)} className="transition-all duration-1000 ease-out" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-2xl font-black transition-all ${getScoreColor(evaluation.overallScore)}`}>{evaluation.overallScore}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-4 bg-[#111] rounded-3xl border border-[#222]">
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-4">Điểm Dừng Lướt</span>
                      <div className="relative w-24 h-24">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="45" fill="none" stroke="#222" strokeWidth="8" />
                          <circle cx="50" cy="50" r="45" fill="none" stroke={getRingColor(evaluation.stopScrollingScore)} strokeWidth="8" strokeLinecap="round" strokeDasharray="283" strokeDashoffset={283 - (283 * evaluation.stopScrollingScore / 100)} className="transition-all duration-1000 ease-out delay-100" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-2xl font-black transition-all ${getScoreColor(evaluation.stopScrollingScore)}`}>{evaluation.stopScrollingScore}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-4 bg-[#111] rounded-3xl border border-[#222]">
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-4 inline-block text-center h-4">Tỉ Lệ<br/>Cạnh Tranh</span>
                      <span className={`text-4xl font-black mb-2 flex-grow flex items-center ${evaluation.competitiveness > 70 ? 'text-red-500' : evaluation.competitiveness > 40 ? 'text-yellow-500' : 'text-green-500'}`}>
                        {evaluation.competitiveness}%
                      </span>
                      <span className="text-[10px] uppercase font-bold text-gray-400">Độc đáo</span>
                    </div>

                    <div className="flex flex-col items-center justify-center p-4 bg-[#111] rounded-3xl border border-[#222]">
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-4 inline-block text-center h-4">Hiển Thị<br/>Nổi Bật</span>
                      <span className="text-3xl lg:text-4xl mb-2 flex-grow flex items-center">
                        {evaluation.mobileReadability === 'Tốt' ? '📱✨' : evaluation.mobileReadability === 'Trung bình' ? '📱👀' : '📱🔍'}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${evaluation.mobileReadability === 'Tốt' ? 'bg-green-500/10 text-green-500' : evaluation.mobileReadability === 'Trung bình' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}`}>
                        Đọc Mobile: {evaluation.mobileReadability}
                      </span>
                    </div>
                  </div>

                  {/* Visual Attention Map */}
                  <div className="mb-10">
                    <h4 className="text-xs font-black text-purple-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                      Sức Hút Thị Giác (Visual Attention Map)
                    </h4>
                    <div className="h-4 w-full bg-[#111] rounded-full overflow-hidden flex shadow-inner border border-[#222]">
                      <div className="bg-pink-500 hover:opacity-80 transition-opacity" style={{ width: `${evaluation.visualAttention.faces}%` }} title={`Khuôn mặt: ${evaluation.visualAttention.faces}%`}></div>
                      <div className="bg-blue-500 hover:opacity-80 transition-opacity" style={{ width: `${evaluation.visualAttention.text}%` }} title={`Chữ (Text): ${evaluation.visualAttention.text}%`}></div>
                      <div className="bg-gray-600 hover:opacity-80 transition-opacity" style={{ width: `${evaluation.visualAttention.background}%` }} title={`Background: ${evaluation.visualAttention.background}%`}></div>
                      <div className="bg-yellow-500 hover:opacity-80 transition-opacity" style={{ width: `${evaluation.visualAttention.otherElements}%` }} title={`Khác: ${evaluation.visualAttention.otherElements}%`}></div>
                    </div>
                    <div className="flex justify-between items-start flex-wrap gap-4 mt-4 text-[10px] font-bold text-gray-400 uppercase">
                      <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>Khuôn mặt ({evaluation.visualAttention.faces}%)</div>
                      <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>Text ({evaluation.visualAttention.text}%)</div>
                      <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-gray-600"></span>Nền ({evaluation.visualAttention.background}%)</div>
                      <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>Chi tiết phụ ({evaluation.visualAttention.otherElements}%)</div>
                    </div>
                  </div>

                  {/* Detailed Analysis */}
                  <div className="space-y-6">
                    <div className="bg-[#111] p-6 rounded-3xl border border-[#222] group hover:border-purple-500/30 transition-all">
                      <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 flex justify-between items-center">Nhận Xét Tổng Quan <span className="text-xl group-hover:scale-125 transition-transform">🔬</span></h4>
                      <p className="text-sm font-medium text-white leading-relaxed">{evaluation.analysis.overall}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-[#111] p-5 rounded-3xl border border-[#222]">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Bố cục & Hướng mắt</span>
                        <p className="text-sm text-gray-300 font-medium">{evaluation.analysis.composition}</p>
                      </div>
                      <div className="bg-[#111] p-5 rounded-3xl border border-[#222]">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Tương phản & Nổi khối</span>
                        <p className="text-sm text-gray-300 font-medium">{evaluation.analysis.colorContrast}</p>
                      </div>
                      <div className="bg-[#111] p-5 rounded-3xl border border-[#222]">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Typography (Chữ)</span>
                        <p className="text-sm text-gray-300 font-medium">{evaluation.analysis.typography}</p>
                      </div>
                      <div className="bg-[#111] p-5 rounded-3xl border border-[#222]">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Tác động Cảm xúc</span>
                        <p className="text-sm text-gray-300 font-medium">{evaluation.analysis.emotionalImpact}</p>
                      </div>
                    </div>

                    {/* Actionable Feedback */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[#2a2a2a]">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black bg-green-500/10 text-green-500 px-3 py-1.5 rounded-lg border border-green-500/20 uppercase tracking-widest inline-block">Điểm Sáng</h4>
                        <ul className="space-y-2">
                          {evaluation.strengths.map((str, i) => (
                            <li key={i} className="flex gap-2 text-sm text-gray-300 font-medium">
                              <span className="text-green-500 font-black">✓</span> <span>{str}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black bg-red-500/10 text-red-500 px-3 py-1.5 rounded-lg border border-red-500/20 uppercase tracking-widest inline-block">Nên Cải Thiện</h4>
                        <ul className="space-y-2">
                          {evaluation.weaknesses.map((wk, i) => (
                            <li key={i} className="flex gap-2 text-sm text-gray-300 font-medium">
                              <span className="text-red-500 font-black">✕</span> <span>{wk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 p-6 rounded-3xl border border-purple-500/30 mt-6 !mt-8">
                       <h4 className="text-xs font-black text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="text-xl">🚀</span> Đề Xuất Tối Ưu (Khuyên dùng)
                      </h4>
                      <ul className="list-decimal list-outside pl-5 text-sm font-bold text-white space-y-3">
                        {evaluation.improvementSuggestions.map((sug, i) => (
                          <li key={i} className="pl-2 leading-relaxed">{sug}</li>
                        ))}
                      </ul>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-[#1a1a1a] rounded-[2rem] border border-dashed border-[#333] text-gray-500 text-center">
                  <span className="text-6xl mb-6 opacity-20">📊</span>
                  <p className="text-sm font-bold uppercase tracking-[0.2em] mb-2">Chờ phân tích hình ảnh</p>
                  <p className="text-xs font-medium max-w-sm">Tải lên một mẫu Thumbnail thiết kế của bạn và nhấn bắt đầu để xem chấm điểm chi tiết từ AI.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomThumbnailEvaluator;
