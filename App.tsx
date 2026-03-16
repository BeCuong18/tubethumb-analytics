
import React, { useState, FormEvent, useEffect, useMemo } from 'react';
import { LoadingState, VideoData, SeoAnalysisResult, ThumbnailAnalysisResult, ChannelAnalysisResult, KeywordAnalysisResult, COUNTRIES, SearchMode, GEMINI_MODELS, SavedAnalysis, TIMEFRAMES, YOUTUBE_CATEGORIES, SingleVideoAnalysis, SortBy } from './types';
import { analyzeSeoStrategy, analyzeThumbnailPatterns, analyzeChannelStrategy, analyzeKeywordSEO } from './services/geminiService';
import { fetchYouTubeVideos, extractChannelIdentifier, extractVideoId, extractPlaylistId } from './services/youtubeService';
import { getSavedReports, getYoutubeApiKey, getGeminiApiKey, deleteReport } from './services/storageService';
import ThumbnailCard from './components/ThumbnailCard';
import TagInput from './components/TagInput';
import VideoAnalyticsModal from './components/VideoAnalyticsModal';
import ApiKeyModal from './components/ApiKeyModal';
import LoginModal from './components/LoginModal';
import CustomThumbnailEvaluator from './components/CustomThumbnailEvaluator';
import { fetchAssignedApiKey, fetchAssignedAiKey, checkUsageLimit, incrementUsage, getUsageInfo, logUserSearch } from './services/firebaseService';
import { authService } from './services/authService';

const SEARCH_MODES = [
  { value: SearchMode.KEYWORDS, label: 'Từ khoá' },
  { value: SearchMode.CHANNELS, label: 'Kênh' },
  { value: SearchMode.VIDEO_IDS, label: 'Video' },
  { value: SearchMode.PLAYLIST, label: 'Danh sách phát' },
];



const App: React.FC = () => {
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState<string[]>([]);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isEvaluatorOpen, setIsEvaluatorOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [inputTags, setInputTags] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('ALL');
  const [selectedTimeframe, setSelectedTimeframe] = useState(365);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [maxVideos, setMaxVideos] = useState(100);
  const [searchMode, setSearchMode] = useState<SearchMode>(SearchMode.KEYWORDS);
  const [geminiModel, setGeminiModel] = useState<string>(GEMINI_MODELS[0].id);

  const [videos, setVideos] = useState<VideoData[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
  const [selectedSavedAnalysis, setSelectedSavedAnalysis] = useState<SingleVideoAnalysis | null>(null);
  const [savedReports, setSavedReports] = useState<SavedAnalysis[]>([]);
  const [videoFilter, setVideoFilter] = useState<'ALL' | 'SHORTS' | 'UNDER_20' | 'OVER_20'>('ALL');
  const [sortBy, setSortBy] = useState<SortBy>(SortBy.VIEWS);

  // User Auth State
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [usageInfo, setUsageInfo] = useState<{ used: number, remaining: number } | null>(null);

  const fetchUsageInfo = async () => {
    if (userEmail) {
      const info = await getUsageInfo(userEmail, 15);
      setUsageInfo(info);
    }
  };

  useEffect(() => {
    fetchUsageInfo();
  }, [userEmail]);

  const handleDeleteReport = (video: VideoData) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa báo cáo này khỏi kho lưu trữ?')) {
      deleteReport(video.id);
      setSavedReports(getSavedReports());
    }
  };

  const [keywordResult, setKeywordResult] = useState<KeywordAnalysisResult | null>(null);
  const [keywordTab, setKeywordTab] = useState<'overview' | 'opportunities' | 'rising'>('overview');
  const [selectedTopic, setSelectedTopic] = useState<string>('Tất cả');
  const [selectedCountryKwd, setSelectedCountryKwd] = useState<string>('Tất cả');

  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isLoading = loadingState !== LoadingState.IDLE && loadingState !== LoadingState.ERROR;

  useEffect(() => {
    // Không tự động load key ở LocalStorage cho YouTube Key vì cấp qua Database
    // Tuy nhiên Gemini Key sẽ được nhập thủ công từ LocalStorage
    const storedGemini = getGeminiApiKey();
    if (storedGemini) setGeminiApiKey(storedGemini);

    setSavedReports(getSavedReports());
  }, []);

  useEffect(() => {
    setSavedReports(getSavedReports());
  }, [selectedVideo]);

  // Kiểm tra trạng thái đăng nhập từ authService (chứa localStorage token)
  useEffect(() => {
    const checkAuth = async () => {
      const status = authService.getLoginStatus();
      if (status.isLoggedIn && status.username) {
        setUserEmail(status.username);

        // Tài khoản đã đăng nhập, lấy YouTube API Key từ Firestore (Dùng username làm document ID tuỳ config DB của bạn)
        try {
          const fetchedKey = await fetchAssignedApiKey(status.username);

          if (fetchedKey) {
            setYoutubeApiKey(fetchedKey);

            // Nếu có Gemini key trong máy, thì có thể đóng modal
            const storedGemini = getGeminiApiKey();
            if (storedGemini) {
              setIsKeyModalOpen(false); // Đóng modal bắt nhập tự động nếu đã lấy được
            } else {
              setIsKeyModalOpen(true); // Yêu cầu người dùng nhập Gemini Key
            }
          } else {
            console.log(`Không tìm thấy cấu hình Key YouTube từ Database cho user: ${status.username}`);
          }
        } catch (error) {
          console.error("Lỗi khi đồng bộ Settings:", error);
        }
      } else {
        setUserEmail(null);
      }
    };

    checkAuth();
  }, [userEmail]);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (inputTags.length === 0 || !youtubeApiKey) {
      if (!youtubeApiKey) setIsKeyModalOpen(true);
      return;
    }

    // Kiểm tra giới hạn 15 lần/ngày cho toàn bộ hành động tìm kiếm (từ khóa, video, kênh)
    if (userEmail) {
      const isAllowed = await checkUsageLimit(userEmail, 15);
      if (!isAllowed) {
        setErrorMsg("Hệ thống: Bạn đã đạt giới hạn 15 lượt sử dụng hôm nay. Vui lòng quay lại vào ngày mai để tiếp tục!");
        return;
      }
    }

    setLoadingState(LoadingState.FETCHING_VIDEOS);
    setErrorMsg(null);
    setVideos([]);
    setKeywordResult(null);
    setSelectedTopic('Tất cả');
    setSelectedCountryKwd('Tất cả');

    try {
      const fetchedVideos = await fetchYouTubeVideos(
        youtubeApiKey,
        inputTags,
        selectedRegion,
        maxVideos,
        selectedTimeframe,
        searchMode,
        selectedCategory,
        sortBy
      );

      if (fetchedVideos.length === 0) throw new Error(`Không tìm thấy video nào. Hãy thử thay đổi bộ lọc hoặc từ khoá.`);
      setVideos(fetchedVideos);

      // Tăng số lượt sử dụng vì đã tìm kiếm thành công
      if (userEmail) {
        await incrementUsage(userEmail);
        fetchUsageInfo();
      }

      // Bổ sung ghi nhận lịch sử tìm kiếm từ khóa với loại tìm kiếm (searchType)
      if (inputTags.length > 0) {
        logUserSearch(userEmail || 'guest', inputTags[0], searchMode).catch(e => console.error("Lỗi log search:", e));
      }

      if (searchMode === SearchMode.KEYWORDS) {
        try {
          const regName = COUNTRIES.find(c => c.code === selectedRegion)?.name || "Toàn cầu";
          const timeLabel = TIMEFRAMES.find(t => t.value === selectedTimeframe)?.label || "12 tháng qua";
          const catName = YOUTUBE_CATEGORIES.find(c => c.id === selectedCategory)?.name || "Tất cả danh mục";

          if (geminiApiKey && geminiApiKey.length > 0) {
            const kwAnalysis = await analyzeKeywordSEO(geminiApiKey, inputTags[0], fetchedVideos, geminiModel, regName, timeLabel, catName);
            setKeywordResult(kwAnalysis);
          } else {
            console.warn("Skipping AI analysis: No Gemini Key");
          }
        } catch (e: any) {
          console.warn("KW Analysis failed", e);
          setErrorMsg(e.message || "Lỗi phân tích dữ liệu. Vui lòng kiểm tra lại kết nối và API Key.");
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Đã xảy ra lỗi hệ thống.");
    } finally {
      setLoadingState(LoadingState.IDLE);
    }
  };

  const topicsList = useMemo(() => {
    if (!keywordResult) return ['Tất cả'];
    const s = new Set<string>();
    keywordResult.risingKeywords.forEach(k => s.add(k.topic));
    keywordResult.topOpportunities.forEach(k => s.add(k.topic));
    return ['Tất cả', ...Array.from(s)];
  }, [keywordResult]);

  const countriesList = useMemo(() => {
    if (!keywordResult) return ['Tất cả'];
    const s = new Set<string>();
    keywordResult.risingKeywords.forEach(k => s.add(k.country));
    keywordResult.topOpportunities.forEach(k => s.add(k.country));
    return ['Tất cả', ...Array.from(s)];
  }, [keywordResult]);

  const filteredRising = useMemo(() => {
    if (!keywordResult) return [];
    return keywordResult.risingKeywords.filter(k =>
      (selectedTopic === 'Tất cả' || k.topic === selectedTopic) &&
      (selectedCountryKwd === 'Tất cả' || k.country === selectedCountryKwd)
    );
  }, [keywordResult, selectedTopic, selectedCountryKwd]);

  const filteredOpportunities = useMemo(() => {
    if (!keywordResult) return [];
    return keywordResult.topOpportunities.filter(k =>
      (selectedTopic === 'Tất cả' || k.topic === selectedTopic) &&
      (selectedCountryKwd === 'Tất cả' || k.country === selectedCountryKwd)
    );
  }, [keywordResult, selectedTopic, selectedCountryKwd]);

  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      if (videoFilter === 'ALL') return true;
      const getSeconds = (str?: string) => {
        if (!str) return 0;
        const p = str.split(':').map(Number);
        if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
        if (p.length === 2) return p[0] * 60 + p[1];
        return p[0] || 0;
      };
      const sec = getSeconds(v.duration);
      if (videoFilter === 'SHORTS') return sec <= 60;
      if (videoFilter === 'UNDER_20') return sec > 60 && sec <= 1200;
      if (videoFilter === 'OVER_20') return sec > 1200;
      return true;
    });
  }, [videos, videoFilter]);

  const getInputPlaceholder = () => {
    switch (searchMode) {
      case SearchMode.KEYWORDS: return "Nhập từ khoá (Enter để thêm)...";
      case SearchMode.CHANNELS: return "Dán link kênh YouTube...";
      case SearchMode.VIDEO_IDS: return "Dán link video YouTube...";
      case SearchMode.PLAYLIST: return "Dán link playlist...";
      default: return "";
    }
  };

  const getTagTransformLogic = (tag: string) => {
    if (searchMode === SearchMode.CHANNELS) return extractChannelIdentifier(tag).value;
    if (searchMode === SearchMode.VIDEO_IDS) return extractVideoId(tag);
    if (searchMode === SearchMode.PLAYLIST) return extractPlaylistId(tag);
    return tag;
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100 flex flex-col font-inter selection:bg-red-600/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-md border-b border-[#2a2a2a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-red-600 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/20">
              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 .6-.03 1.29-.1 2.09-.06.8-.15 1.43-.28 1.9-.13.47-.29.81-.48 1.01-.19.2-.43.32-.72.36-.53.08-1.5.11-2.92.11H6.5c-1.42 0-2.39-.03-2.92-.11-.29-.04-.53-.16-.72-.36-.19-.2-.35-.54-.48-1.01-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-.6.03-1.29.1-2.09.06-.8.15-1.43.28-1.9.13-.47.29-.81.48-1.01.19-.2.43-.32.72-.36.53-.08 1.5-.11 2.92-.11h11c1.42 0 2.39.03 2.92.11.29.04.53.16.72.36.19.2.35.54.48 1.01z" /></svg>
            </div>
            <h1 className="text-xl font-black tracking-tight hidden sm:block">TubeThumb <span className="text-red-600">Master</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsKeyModalOpen(true)}
              className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all border ${youtubeApiKey && geminiApiKey && geminiApiKey.length > 0 ? 'bg-green-600/10 text-green-500 border-green-600/50' : 'bg-red-600/10 text-red-500 border-red-600/50 animate-pulse'}`}
            >
              {youtubeApiKey && geminiApiKey && geminiApiKey.length > 0 ? 'API Key: OK' : 'Nhập API Key'}
            </button>
            {usageInfo && (
              <div className="text-[10px] font-black uppercase text-gray-400 border border-[#2a2a2a] px-3 py-2 rounded-full hidden sm:block" title="Lượt dùng hệ thống hôm nay">
                Lượt dùng: <span className="text-white">{usageInfo.remaining}</span>/{usageInfo.remaining + usageInfo.used}
              </div>
            )}
            <button onClick={() => setShowGuide(!showGuide)} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Hướng dẫn</button>
            <button onClick={() => setIsEvaluatorOpen(true)} className="text-[10px] font-black text-white uppercase tracking-widest bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-2.5 rounded-full transition-all border border-white/5 shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:shadow-[0_0_20px_rgba(147,51,234,0.5)] hover:scale-105 flex items-center gap-2">
              <span className="text-sm">🎯</span> Chấm điểm Thumbnail
            </button>
            <a href="#saved-reports" className="text-[10px] font-black text-white uppercase tracking-widest bg-gradient-to-r from-[#222] to-[#333] px-5 py-2.5 rounded-full transition-all border border-white/5 shadow-xl hover:scale-105">
              Kho lưu trữ ({savedReports.length})
            </a>
            {userEmail && (
              <button
                onClick={() => {
                  authService.logout();
                  setUserEmail(null);
                }}
                className="group relative flex items-center justify-center overflow-hidden text-[10px] font-black uppercase tracking-widest bg-[#1a1a1a] hover:bg-red-600 h-[36px] px-5 rounded-full transition-all duration-300 border border-[#333] hover:border-red-500/50 shadow-xl"
              >
                {/* Trạng thái mặc định: User */}
                <div className="flex items-center gap-2 transition-all duration-300 transform group-hover:-translate-y-10 group-hover:opacity-0 absolute">
                  <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  <span className="truncate max-w-[100px] text-gray-300 group-hover:text-white transition-colors">{userEmail}</span>
                </div>

                {/* Trạng thái Hover: Đăng Xuất */}
                <div className="flex items-center gap-2 transition-all duration-300 transform translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 absolute text-white">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                  <span>Đăng Xuất</span>
                </div>

                {/* Phần tử ẩn để đo kích thước layout linh hoạt */}
                <div className="invisible flex items-center gap-2 h-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"></svg>
                  <span className="truncate max-w-[100px]">{userEmail.length > 9 ? userEmail : 'Đăng Xuất'}</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">

        {/* Quick Guide */}
        {showGuide && (
          <div className="max-w-4xl mx-auto mb-10 p-8 bg-blue-600/10 border border-blue-500/20 rounded-[2rem] animate-fade-in">
            <h3 className="text-lg font-black text-blue-400 mb-4 flex items-center gap-2">
              <span className="text-2xl">💡</span> Hướng dẫn nhanh
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium text-gray-400 leading-relaxed">
              <li className="flex gap-2"><span>1.</span> <b>YouTube Data API Key</b> được cấp tự động thông qua tài khoản đăng nhập. Nên bạn hoàn toàn không cần cấu hình.</li>
              <li className="flex gap-2"><span>2.</span> Nhập <b>Gemini AI API Key</b> vào phần Quản lý API Key để kích hoạt chức năng phân tích AI.</li>
              <li className="flex gap-2"><span>3.</span> Nhập từ khoá hoặc link kênh bạn muốn nghiên cứu.</li>
              <li className="flex gap-2"><span>4.</span> Sử dụng các bộ lọc Vùng, Thời gian để AI lấy dữ liệu Real-time chính xác nhất.</li>
            </ul>
            <button onClick={() => setShowGuide(false)} className="mt-6 text-[10px] font-black uppercase text-blue-500 hover:underline">Đã hiểu, đóng hướng dẫn</button>
          </div>
        )}

        {/* Main Search Configuration (Google Trends Style) */}
        <div className="max-w-6xl mx-auto mb-16 space-y-8 animate-fade-in">
          <div className="text-center space-y-2">
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase leading-none">Phân Tích Xu Hướng YouTube</h2>
            <p className="text-gray-500 text-sm font-medium">Báo cáo thị trường & xu hướng từ Google Trends bằng trí tuệ nhân tạo Gemini 3.0</p>
          </div>

          <div className="bg-[#1a1a1a] p-1.5 rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] border border-[#2a2a2a]">
            {/* Top Bar: Search Input */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center p-4 gap-4">
              <div className="flex-grow">
                <TagInput
                  tags={inputTags}
                  setTags={setInputTags}
                  disabled={isLoading}
                  placeholder={getInputPlaceholder()}
                  transformTag={getTagTransformLogic}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={!youtubeApiKey || inputTags.length === 0 || isLoading}
                className="bg-white hover:bg-gray-200 text-black px-12 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest transition-all shadow-xl disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
              >
                {loadingState === LoadingState.FETCHING_VIDEOS ? (
                  <><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div> ĐANG TẢI...</>
                ) : "BẮT ĐẦU"}
              </button>
            </div>

            {/* Bottom Bar: Filters */}
            <div className="flex flex-wrap items-center justify-center gap-4 p-6 border-t border-[#2a2a2a] bg-[#141414]/50 rounded-b-[3rem]">
              {/* Search Mode */}
              <select
                value={searchMode}
                onChange={(e) => setSearchMode(e.target.value as SearchMode)}
                className="bg-transparent text-gray-400 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-white/5 cursor-pointer focus:outline-none border border-[#333] transition-colors"
              >
                {SEARCH_MODES.map(m => <option key={m.value} value={m.value} className="bg-[#1a1a1a]">{m.label}</option>)}
              </select>

              <div className="w-px h-6 bg-[#333] hidden md:block"></div>

              {/* Region */}
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="bg-transparent text-gray-400 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-white/5 cursor-pointer focus:outline-none border border-[#333] transition-colors"
              >
                {COUNTRIES.map(c => <option key={c.code} value={c.code} className="bg-[#1a1a1a]">{c.name}</option>)}
              </select>

              {/* Timeframe */}
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(Number(e.target.value))}
                className="bg-transparent text-gray-400 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-white/5 cursor-pointer focus:outline-none border border-[#333] transition-colors"
              >
                {TIMEFRAMES.map(t => <option key={t.value} value={t.value} className="bg-[#1a1a1a]">{t.label}</option>)}
              </select>

              {/* Category */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-gray-400 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-white/5 cursor-pointer focus:outline-none border border-[#333] transition-colors"
              >
                {YOUTUBE_CATEGORIES.map(cat => <option key={cat.id} value={cat.id} className="bg-[#1a1a1a]">{cat.name}</option>)}
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="bg-transparent text-gray-400 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-white/5 cursor-pointer focus:outline-none border border-[#333] transition-colors"
              >
                <option value={SortBy.VIEWS} className="bg-[#1a1a1a]">Lượt View</option>
                <option value={SortBy.DATE_DESC} className="bg-[#1a1a1a]">Mới nhất</option>
                <option value={SortBy.DATE_ASC} className="bg-[#1a1a1a]">Cũ nhất</option>
                <option value={SortBy.VPH} className="bg-[#1a1a1a]">VPH cao nhất</option>
              </select>

              <div className="w-px h-6 bg-[#333] hidden md:block"></div>
            </div>
          </div>
          {errorMsg && <div className="p-5 bg-red-900/10 border border-red-900/20 text-red-500 rounded-[2rem] text-xs font-bold text-center animate-shake flex items-center justify-center gap-3">
            <span className="text-xl">⚠️</span> {errorMsg}
          </div>}
        </div>

        {/* Dashboard Phân tích Từ khóa (Master) */}
        {searchMode === SearchMode.KEYWORDS && keywordResult && (
          <div className="max-w-7xl mx-auto mb-16 animate-fade-in">
            {/* Thanh Header Dashboard: Tab & Bộ lọc */}
            <div className="flex flex-wrap items-center justify-between gap-6 mb-10 bg-[#1a1a1a] p-5 rounded-[2.5rem] border border-[#2a2a2a] shadow-2xl">
              <div className="flex items-center gap-2">
                <button onClick={() => setKeywordTab('overview')} className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${keywordTab === 'overview' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-[#111] text-gray-500 hover:text-gray-300'}`}>Tổng quan</button>
                <button onClick={() => setKeywordTab('opportunities')} className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${keywordTab === 'opportunities' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-[#111] text-gray-500 hover:text-gray-300'}`}>Cơ hội từ khóa</button>
                <button onClick={() => setKeywordTab('rising')} className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${keywordTab === 'rising' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-[#111] text-gray-500 hover:text-gray-300'}`}>Đang gia tăng</button>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Phân loại:</span>
                  <select value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} className="bg-[#111] text-[11px] font-bold text-white px-5 py-2.5 rounded-2xl border border-[#333] focus:outline-none cursor-pointer hover:border-red-600/30 transition-all">
                    {topicsList.map(t => <option key={t} value={t} className="bg-[#111]">{t}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Khu vực:</span>
                  <select value={selectedCountryKwd} onChange={(e) => setSelectedCountryKwd(e.target.value)} className="bg-[#111] text-[11px] font-bold text-white px-5 py-2.5 rounded-2xl border border-[#333] focus:outline-none cursor-pointer hover:border-red-600/30 transition-all">
                    {countriesList.map(c => <option key={c} value={c} className="bg-[#111]">{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {keywordTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
                {/* Gauge Score */}
                <div className="lg:col-span-4 bg-[#1a1a1a] rounded-[3rem] border border-[#2a2a2a] p-12 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 blur-[60px] rounded-full group-hover:bg-red-600/10 transition-colors"></div>
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-12">Chỉ số sức mạnh: <span className={keywordResult.overallScore > 70 ? 'text-green-500' : 'text-yellow-500'}>{keywordResult.overallScore > 70 ? 'Cực Tốt' : 'Khả quan'}</span></h3>
                  <div className="relative w-64 h-32 mb-10 scale-110 sm:scale-125">
                    <svg className="w-full h-full" viewBox="0 0 100 50">
                      <path d="M 10,50 A 40,40 0 0 1 90,50" fill="none" stroke="#222" strokeWidth="12" strokeLinecap="round" />
                      <path d="M 10,50 A 40,40 0 0 1 90,50" fill="none" stroke="url(#kwdGradientFinal)" strokeWidth="12" strokeLinecap="round" strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * keywordResult.overallScore / 100)} className="transition-all duration-1000 ease-out" />
                      <defs><linearGradient id="kwdGradientFinal" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#ef4444" /><stop offset="50%" stopColor="#eab308" /><stop offset="100%" stopColor="#22c55e" /></linearGradient></defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                      <span className="text-7xl font-black text-white leading-none">{keywordResult.overallScore}</span>
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Trending Master</span>
                    </div>
                  </div>
                  <div className="w-full space-y-8 mt-10">
                    <div className="space-y-3 text-left">
                      <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-tighter"><span>Lưu lượng (Volume)</span><span className="text-white">{keywordResult.volume}%</span></div>
                      <div className="h-2.5 bg-[#111] rounded-full border border-[#222]"><div className="h-full bg-gradient-to-r from-red-600 to-green-500 transition-all duration-1000 rounded-full" style={{ width: `${keywordResult.volume}%` }}></div></div>
                    </div>
                    <div className="space-y-3 text-left">
                      <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-tighter"><span>Độ khó (Difficulty)</span><span className={keywordResult.competition > 60 ? 'text-red-500' : 'text-green-500'}>{keywordResult.competition}%</span></div>
                      <div className="h-2.5 bg-[#111] rounded-full border border-[#222]"><div className="h-full bg-gradient-to-r from-green-500 to-red-600 transition-all duration-1000 rounded-full" style={{ width: `${keywordResult.competition}%` }}></div></div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 bg-[#1a1a1a] rounded-[3rem] border border-[#2a2a2a] p-12 shadow-2xl">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-10">Dữ liệu Master Real-time</h3>
                  <div className="space-y-6">
                    <div className="bg-[#111] p-5 rounded-[1.5rem] border border-[#222] flex justify-between items-center group hover:border-red-600/30 transition-all cursor-default">
                      <span className="text-xs text-red-600 font-black">#</span>
                      <span className="text-xs text-gray-200 font-black flex-grow px-4 truncate">{keywordResult.searchTerm}</span>
                      <span className="text-[9px] bg-red-600 text-white px-3 py-1 rounded-lg font-black uppercase tracking-tighter">Gốc</span>
                    </div>
                    <div className="space-y-5 px-3 text-xs">
                      <div className="flex justify-between py-2 border-b border-[#222]/50"><span className="text-gray-500 font-bold uppercase text-[9px]">Lượt xem kỷ lục:</span> <span className="font-black text-white">{keywordResult.highestViews.toLocaleString()}</span></div>
                      <div className="flex justify-between py-2 border-b border-[#222]/50"><span className="text-gray-500 font-bold uppercase text-[9px]">Lượt xem TB:</span> <span className="font-black text-white">{keywordResult.avgViews.toLocaleString()}</span></div>
                      <div className="flex justify-between py-2 border-b border-[#222]/50"><span className="text-gray-500 font-bold uppercase text-[9px]">Video mới (7 ngày):</span> <span className="font-black text-green-500">{keywordResult.addedLast7Days}</span></div>
                      <div className="flex justify-between py-2 border-b border-[#222]/50"><span className="text-gray-500 font-bold uppercase text-[9px]">Có trong Tiêu đề:</span> <span className="font-black text-white">{keywordResult.timesInTitle}</span></div>
                      <div className="flex justify-between py-2"><span className="text-gray-500 font-bold uppercase text-[9px]">Thống lĩnh thị trường:</span> <span className="font-black text-red-500 truncate max-w-[140px]">{keywordResult.topCreator}</span></div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 bg-[#1a1a1a] rounded-[3rem] border border-[#2a2a2a] p-12 shadow-2xl overflow-hidden flex flex-col">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-10">Căn cứ & Nguồn trích dẫn</h3>
                  <div className="space-y-4 overflow-y-auto pr-3 custom-scrollbar flex-grow">
                    {keywordResult.sources && keywordResult.sources.length > 0 ? keywordResult.sources.map((src, i) => (
                      <a key={i} href={src.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 bg-[#111] p-4 rounded-2xl border border-transparent hover:border-red-600/30 transition-all group">
                        <div className="w-10 h-10 rounded-2xl bg-[#1a1a1a] flex items-center justify-center text-red-600 font-black group-hover:scale-110 transition-transform shadow-lg border border-white/5">G</div>
                        <div className="flex-grow min-w-0">
                          <div className="text-xs font-black text-white line-clamp-1 group-hover:text-red-500 transition-colors uppercase tracking-tight">{src.title}</div>
                          <div className="text-[9px] text-gray-600 font-medium truncate mt-1">{src.uri}</div>
                        </div>
                      </a>
                    )) : (
                      <div className="text-center py-10">
                        <p className="text-gray-600 text-xs font-bold italic">Đang tổng hợp dữ liệu từ AI Master...</p>
                      </div>
                    )}
                    <div className="pt-8 border-t border-[#222] mt-6">
                      <h4 className="text-[10px] font-black text-gray-500 uppercase mb-5 tracking-widest">Từ khóa liên quan</h4>
                      <div className="flex flex-wrap gap-2">
                        {keywordResult.relatedKeywords.slice(0, 8).map((kw, i) => (
                          <span key={i} className="text-[10px] font-bold text-gray-400 bg-[#111] px-4 py-2 rounded-xl border border-[#222] hover:border-blue-600/40 transition-colors cursor-default">{kw.term}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {keywordTab === 'rising' && (
              <div className="bg-[#1a1a1a] rounded-[3rem] border border-[#2a2a2a] p-12 shadow-2xl animate-fade-in overflow-hidden">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Từ khóa bùng nổ <span className="text-red-600">(Trending Now)</span></h3>
                  <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Dữ liệu cập nhật mỗi 1 giờ</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-[#222] text-[10px] font-black text-gray-600 uppercase tracking-widest">
                      <tr>
                        <th className="pb-8 pl-6">Từ khóa</th>
                        <th className="pb-8">Lĩnh vực</th>
                        <th className="pb-8">Quốc gia</th>
                        <th className="pb-8 text-right pr-6">Thay đổi (Real-time)</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {filteredRising.length > 0 ? filteredRising.map((kw, i) => (
                        <tr key={i} className="border-b border-[#222]/30 hover:bg-[#111] transition-all group">
                          <td className="py-8 pl-6 font-black text-gray-200 group-hover:text-red-500 transition-colors">{kw.term}</td>
                          <td className="py-8"><span className="text-blue-500 font-black text-[9px] uppercase tracking-widest bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-500/10">{kw.topic}</span></td>
                          <td className="py-8 text-gray-500 font-bold uppercase tracking-tighter">{kw.country}</td>
                          <td className={`py-8 text-right pr-6 font-black text-lg ${kw.isUp ? 'text-green-500' : 'text-red-500'}`}>
                            {kw.isUp ? '↗' : '↘'} {kw.change}
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={4} className="py-32 text-center text-gray-600 italic font-bold">Không tìm thấy từ khóa nào phù hợp với bộ lọc hiện tại.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {keywordTab === 'opportunities' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
                {filteredOpportunities.length > 0 ? filteredOpportunities.map((op, i) => (
                  <div key={i} className="bg-[#1a1a1a] rounded-[3rem] border border-[#2a2a2a] p-10 hover:border-red-600/40 transition-all group flex flex-col h-full shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 blur-[50px] group-hover:bg-blue-600/10 transition-colors"></div>
                    <div className="flex justify-between items-start mb-10">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black bg-red-600/10 text-red-500 px-4 py-2 rounded-full border border-red-500/10 uppercase tracking-widest">Tiềm năng: {op.score}</span>
                        </div>
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{op.topic}</span>
                          <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                          <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{op.country}</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-[#111] flex items-center justify-center text-gray-700 group-hover:text-red-600 transition-all border border-white/5 shadow-inner">🎯</div>
                    </div>
                    <h4 className="text-2xl font-black text-white mb-6 group-hover:text-red-500 transition-colors leading-tight">{op.term}</h4>
                    <p className="text-sm text-gray-500 leading-relaxed italic mb-10 font-medium">"{op.reason}"</p>
                    <button className="mt-auto w-full py-5 bg-[#111] hover:bg-red-600 text-gray-600 hover:text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all shadow-xl border border-white/5 active:scale-95">Xây dựng nội dung này</button>
                  </div>
                )) : (
                  <div className="col-span-full py-40 text-center bg-[#1a1a1a] rounded-[3rem] border border-dashed border-[#2a2a2a]">
                    <p className="text-gray-600 font-black uppercase tracking-[0.2em] text-sm">Dữ liệu cơ hội chưa sẵn sàng cho vùng này.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Video Results Section */}
        {videos.length > 0 && (
          <div className="space-y-12 mb-20">
            <div className="flex flex-col xl:flex-row items-center justify-between px-6 gap-4">
              <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Thư viện Video liên quan ({filteredVideos.length})</h3>

              <div className="flex bg-[#1a1a1a] rounded-full p-1 border border-[#2a2a2a] shadow-lg overflow-x-auto">
                <button onClick={() => setVideoFilter('ALL')} className={`whitespace-nowrap px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${videoFilter === 'ALL' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Tất cả</button>
                <button onClick={() => setVideoFilter('SHORTS')} className={`whitespace-nowrap px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${videoFilter === 'SHORTS' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Shorts</button>
                <button onClick={() => setVideoFilter('UNDER_20')} className={`whitespace-nowrap px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${videoFilter === 'UNDER_20' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Dưới 20p</button>
                <button onClick={() => setVideoFilter('OVER_20')} className={`whitespace-nowrap px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${videoFilter === 'OVER_20' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Trên 20p</button>
              </div>

              <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest hidden lg:block">Nhấn vào ảnh để xem phân tích AI DNA</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
              {filteredVideos.map((video, idx) => (
                <ThumbnailCard key={`${video.id}-${idx}`} video={video} onShowAnalytics={(v) => { setSelectedVideo(v); setSelectedSavedAnalysis(null); }} />
              ))}
            </div>
          </div>
        )}

        {/* Kho lưu trữ (Saved Reports) Section */}
        {savedReports.length > 0 && (
          <div id="saved-reports" className="space-y-12 mb-20 pt-10 border-t border-[#2a2a2a]/50">
            <div className="flex items-center justify-between px-6">
              <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Kho Lưu Trữ ({savedReports.length})</h3>
              <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest hidden sm:block">Các báo cáo đã lưu</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
              {savedReports.map((report, idx) => (
                <ThumbnailCard
                  key={`saved-${report.video.id}-${idx}`}
                  video={report.video}
                  onShowAnalytics={(v) => {
                    setSelectedVideo(v);
                    setSelectedSavedAnalysis(report.analysis);
                  }}
                  onDelete={handleDeleteReport}
                />
              ))}
            </div>
          </div>
        )}

        {/* Modal phân tích video */}
        {selectedVideo && <VideoAnalyticsModal video={selectedVideo} initialAnalysis={selectedSavedAnalysis} onClose={() => { setSelectedVideo(null); setSelectedSavedAnalysis(null); fetchUsageInfo(); }} geminiModel={geminiModel} apiKey={geminiApiKey} />}

        {/* Custom Thumbnail Evaluator Modal */}
        {isEvaluatorOpen && (
          <CustomThumbnailEvaluator 
            onClose={() => { setIsEvaluatorOpen(false); fetchUsageInfo(); }} 
            geminiModel={geminiModel} 
            apiKey={geminiApiKey} 
          />
        )}

        {/* API Key Modal */}
        {isKeyModalOpen && (
          <ApiKeyModal
            onClose={() => setIsKeyModalOpen(false)}
            currentYtKey={youtubeApiKey}
            currentGeminiKeys={geminiApiKey}
            onSaveYtKey={setYoutubeApiKey}
            onSaveGeminiKey={setGeminiApiKey}
          />
        )}

        {/* Login Gate */}
        {!userEmail && (
          <LoginModal onLoginSuccess={(username) => setUserEmail(username)} />
        )}
      </main>

      {/* Floating Support Button */}
      <a
        href="https://matrix.to/#/@bescuong:chat.vfastsoft.com"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-red-600 to-orange-500 text-white rounded-full shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-transform hover:scale-110 group animate-bounce"
        title="Hỗ trợ khẩn cấp"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        <span className="absolute right-16 bg-black text-white border border-white/10 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
          Hỗ Trợ Khẩn Cấp
        </span>
      </a>

      <footer className="py-12 border-t border-[#2a2a2a] bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:row items-center justify-between gap-6">
          <div className="flex items-center gap-3 grayscale hover:grayscale-0 transition-all cursor-default">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 .6-.03 1.29-.1 2.09-.06.8-.15 1.43-.28 1.9-.13-.47-.29-.81-.48-1.01-.19-.2-.43-.32-.72-.36-.53-.08-1.5-.11-2.92-.11H6.5c-1.42 0-2.39-.03-2.92-.11-.29-.04-.53-.16-.72-.36-.19-.2-.35-.54-.48-1.01-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-.6.03-1.29.1-2.09.06-.8.15-1.43.28-.1.13-.47.29-.81.48-1.01.19-.2.43-.32.72-.36.53-.08 1.5-.11 2.92-.11h11c1.42 0 2.39.03 2.92.11.29.04.53.16.72.36.19.2.35.54.48 1.01z" /></svg>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">TubeThumb Master Analytics v1.1.3</span>
          </div>
          <p className="text-[10px] font-bold text-gray-700 uppercase tracking-widest text-center">© 2026 YouTube Data Insights Engine - Một Sản Phẩm Phát Triển Bới NEPTUNE STUIDO.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-[9px] font-black text-gray-600 uppercase hover:text-white transition-colors">Điều khoản</a>
            <a href="#" className="text-[9px] font-black text-gray-600 uppercase hover:text-white transition-colors">Bảo mật</a>
            <a href="#" className="text-[9px] font-black text-gray-600 uppercase hover:text-white transition-colors">API Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
