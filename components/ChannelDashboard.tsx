import React, { useMemo, useState } from 'react';
import { VideoData, ChannelExtendedDetails } from '../types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell, Legend } from 'recharts';
import GoogleTrendsChart from './GoogleTrendsChart';

interface ChannelDashboardProps {
  channelDetails: ChannelExtendedDetails;
  videos: VideoData[]; // The 50-100 videos recently fetched, used for generating charts
}

const formatNumber = (numStr: string | number | undefined): string => {
  if (numStr === undefined || numStr === null) return "0";
  const num = typeof numStr === 'string' ? parseInt(numStr, 10) : numStr;
  if (isNaN(num)) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "tr";
  if (num >= 1000) return (num / 1000).toFixed(1) + "n";
  return num.toLocaleString('vi-VN');
};

const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN');
};

const ChannelDashboard: React.FC<ChannelDashboardProps> = ({ channelDetails, videos }) => {
  const [freqMode, setFreqMode] = useState<'MONTH' | 'DAY'>('MONTH');
  const [selectedTrendKeyword, setSelectedTrendKeyword] = useState<string | null>(null);

  // 1. Biểu diễn hiệu suất video gần đây
  const performanceData = useMemo(() => {
    // Chúng ta lật ngược mảng để video cũ nhất hiện trước, video mới nhất hiện sau trên trục X
    const sortedVideos = [...videos].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
    return sortedVideos.map((v, i) => ({
      name: `V${i + 1}`,
      title: v.title,
      views: v.viewCountRaw || 0,
      vph: v.vph || 0
    }));
  }, [videos]);

  // 2. Thống kê theo tháng / ngày (Upload Frequency)
  const frequencyData = useMemo(() => {
    const counts: Record<string, number> = {};
    videos.forEach(v => {
      const d = new Date(v.publishedAt);
      const key = freqMode === 'MONTH' 
           ? `${d.getMonth() + 1}/${d.getFullYear()}` 
           : `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
      counts[key] = (counts[key] || 0) + 1;
    });

    // Sắp xếp các chuỗi tháng/năm theo thứ tự thời gian
    const sortedKeys = Object.keys(counts).sort((a, b) => {
      if (freqMode === 'MONTH') {
        const [mA, yA] = a.split('/').map(Number);
        const [mB, yB] = b.split('/').map(Number);
        return yA !== yB ? yA - yB : mA - mB;
      } else {
        const [dA, mA, yA] = a.split('/').map(Number);
        const [dB, mB, yB] = b.split('/').map(Number);
        if (yA !== yB) return yA - yB;
        if (mA !== mB) return mA - mB;
        return dA - dB;
      }
    });

    return sortedKeys.map(k => ({
      timeLabel: k,
      count: counts[k]
    }));
  }, [videos, freqMode]);

  // 3. Khung Giờ Đăng (Upload Hour Heatmap/Bar)
  const uploadHourData = useMemo(() => {
    const hours = Array(24).fill(0);
    videos.forEach(v => {
      const d = new Date(v.publishedAt);
      hours[d.getHours()]++; // getHours() trả về giờ theo local time của người dùng (VN)
    });
    return hours.map((count, hr) => ({
        hour: `${hr}h`,
        count
    }));
  }, [videos]);

  // 4. Biểu đồ Tương Tác Sống (Live Engagement)
  const engagementData = useMemo(() => {
    const sortedVideos = [...videos].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
    return sortedVideos.map((v, i) => {
       const engRateStr = v.engagementRate || "0";
       const engRateFloat = parseFloat(engRateStr);
       return {
         name: `V${i + 1}`,
         title: v.title,
         engagementRate: isNaN(engRateFloat) ? 0 : engRateFloat,
       }
    });
  }, [videos]);

  // 5. Phân phối Định Dạng Content (Format Breakdown)
  const formatData = useMemo(() => {
    let shorts = 0;
    let medium = 0;
    let long = 0;

    const getSeconds = (str?: string) => {
      if (!str) return 0;
      const p = str.split(':').map(Number);
      if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
      if (p.length === 2) return p[0] * 60 + p[1];
      return p[0] || 0;
    };

    videos.forEach(v => {
       const sec = getSeconds(v.duration);
       if (sec <= 60) shorts++;
       else if (sec <= 480) medium++; // 1 - 8 min
       else long++;
    });

    return [
      { name: 'Shorts (<1p)', value: shorts, color: '#ef4444' }, // Red
      { name: 'Ngắn-Vừa (1-8p)', value: medium, color: '#3b82f6' }, // Blue
      { name: 'Dài (>8p)', value: long, color: '#10b981' } // Green
    ].filter(i => i.value > 0);
  }, [videos]);

  // 6. Cụm Từ Khóa Tiêu Đề Yêu Thích (Top Keywords)
  const topKeywords = useMemo(() => {
    const stopwords = ["và", "của", "là", "trong", "cho", "với", "để", "một", "các", "những", "thì", "mà", "có", "rất", "này", "khi", "sẽ", "được", "ra", "về", "cũng", "đã", "từ", "lại", "đến", "trên", "tại", "nhiều", "hơn", "như", "nào", "hay", "cách", "cái", "thế", "theo", "sau", "chỉ", "có thể", "không", "nhưng", "tôi", "bạn", "người", "video", "-", "|", "!", "?", "the", "to", "in", "and", "of", "a", "for", "is", "on"];
    const wordCounts: Record<string, number> = {};

    videos.forEach(v => {
       const words = v.title.toLowerCase().split(/[\s,.\-!|?()[\]{}]+/);
       // We can look for bigrams (2-word phrases) to make it more meaningful
       for (let i = 0; i < words.length - 1; i++) {
           if (words[i].length < 2 || words[i+1].length < 2) continue;
           if (stopwords.includes(words[i]) || stopwords.includes(words[i+1])) continue;
           const phrase = `${words[i]} ${words[i+1]}`;
           wordCounts[phrase] = (wordCounts[phrase] || 0) + 1;
       }
    });

    return Object.entries(wordCounts)
      .filter(([_, count]) => count > 1) // Only show phrases that appeared more than once
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8); // Top 8 phrases
  }, [videos]);

  // Lấy ảnh avatar chất lượng cao nhất
  const avatarUrl = channelDetails.thumbnails?.high?.url || channelDetails.thumbnails?.medium?.url || channelDetails.thumbnails?.default?.url;

  return (
    <div className="w-full bg-[#1a1a1a] rounded-[2rem] overflow-hidden border border-[#2a2a2a] shadow-2xl mb-12 animate-fade-in font-inter">
      {/* Banner */}
      <div 
        className="w-full h-40 sm:h-56 bg-cover bg-center bg-[#111] relative"
        style={{ backgroundImage: channelDetails.bannerExternalUrl ? `url(${channelDetails.bannerExternalUrl})` : 'none' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-black/40 to-transparent"></div>
      </div>

      <div className="px-6 sm:px-12 pb-10 relative">
        {/* Avatar & Title Row */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-16 sm:-mt-20 mb-8 z-10 relative">
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-[#1a1a1a] bg-[#111] overflow-hidden shadow-2xl shadow-black/50">
            {avatarUrl ? (
              <img src={avatarUrl} alt={channelDetails.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl text-gray-500">?</div>
            )}
          </div>
          <div className="flex-grow text-center sm:text-left">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center justify-center sm:justify-start gap-3">
               {channelDetails.title}
               {channelDetails.country && (
                  <span className="text-[10px] font-black uppercase bg-[#222] border border-[#333] px-2 py-1 rounded text-red-500 tracking-widest leading-none mt-1">
                      {channelDetails.country}
                  </span>
               )}
            </h2>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-2 text-sm text-gray-400 font-medium">
              <span>{channelDetails.customUrl || `@${channelDetails.id}`}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
              <span>Tham gia: {formatDate(channelDetails.publishedAt)}</span>
              {channelDetails.madeForKids && (
                 <>
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                  <span className="text-yellow-500 font-bold text-xs uppercase bg-yellow-500/10 px-2 rounded">Kids</span>
                 </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-[#111] p-5 rounded-2xl border border-[#2a2a2a] group hover:border-red-600/30 transition-all text-center sm:text-left">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Người đăng ký</h4>
            <div className="text-2xl sm:text-3xl font-black text-white group-hover:text-red-500 transition-colors">
              {channelDetails.hiddenSubscriberCount ? "Đã ẩn" : formatNumber(channelDetails.subscriberCount)}
            </div>
          </div>
          <div className="bg-[#111] p-5 rounded-2xl border border-[#2a2a2a] group hover:border-blue-500/30 transition-all text-center sm:text-left">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Tổng lượt xem</h4>
            <div className="text-2xl sm:text-3xl font-black text-white group-hover:text-blue-500 transition-colors">
              {formatNumber(channelDetails.viewCount)}
            </div>
          </div>
          <div className="bg-[#111] p-5 rounded-2xl border border-[#2a2a2a] group hover:border-green-500/30 transition-all text-center sm:text-left">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Số lượng Video</h4>
            <div className="text-2xl sm:text-3xl font-black text-white group-hover:text-green-500 transition-colors">
              {formatNumber(channelDetails.videoCount)}
            </div>
          </div>
          <div className="bg-[#111] p-5 rounded-2xl border border-[#2a2a2a] group hover:border-purple-500/30 transition-all text-center sm:text-left">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Trung bình View/Video</h4>
            <div className="text-2xl sm:text-3xl font-black text-white group-hover:text-purple-500 transition-colors">
              {formatNumber(Math.round(parseInt(channelDetails.viewCount || "0", 10) / Math.max(1, parseInt(channelDetails.videoCount || "1", 10))))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 mb-10">
            {/* Description Details */}
            <div className="bg-[#111] p-6 rounded-2xl border border-[#2a2a2a]">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Mô tả kênh</h4>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap line-clamp-6 hover:line-clamp-none transition-all cursor-pointer" title="Nhấn để xem toàn bộ">
                  {channelDetails.description || "Kênh này chưa cập nhật mô tả."}
              </p>
              
              {channelDetails.keywords && (
                 <div className="mt-6 pt-4 border-t border-[#222]">
                    <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Từ khóa nhúng (Hidden Tags)</h4>
                    <div className="flex flex-wrap gap-2">
                        {channelDetails.keywords.match(/(?:"[^"]*"|^[^"]*$|[^ ]+)/g)?.map(k => k.replace(/"/g, '')).filter(k => k).map((kw, i) => (
                            <span key={i} className="text-[10px] font-bold text-gray-400 bg-[#1a1a1a] px-3 py-1.5 rounded-lg border border-[#2a2a2a]">{kw}</span>
                        ))}
                    </div>
                 </div>
              )}
            </div>

            {/* Quick Links & Topics */}
            <div className="space-y-4">
                {channelDetails.topicCategories && channelDetails.topicCategories.length > 0 && (
                   <div className="bg-[#111] p-6 rounded-2xl border border-[#2a2a2a]">
                       <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Chủ Đề (Wikipedia)</h4>
                       <div className="flex flex-col gap-2">
                          {channelDetails.topicCategories.map((url, i) => {
                              const topicName = url.split('/').pop()?.replace(/_/g, ' ') || url;
                              return <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">↗ {decodeURIComponent(topicName)}</a>
                          })}
                       </div>
                   </div>
                )}
                
                {channelDetails.unsubscribedTrailer && (
                    <a href={`https://www.youtube.com/watch?v=${channelDetails.unsubscribedTrailer}`} target="_blank" rel="noopener noreferrer" className="block w-full bg-[#111] p-5 rounded-2xl border border-[#2a2a2a] hover:border-red-600/30 transition-all text-center group cursor-pointer">
                       <span className="text-xl mb-2 block group-hover:scale-110 transition-transform">🎬</span>
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-red-500 transition-colors">Xem Video Trailer</span>
                    </a>
                )}
            </div>
        </div>

        {/* --- CHARTS AREA --- */}
        <div className="space-y-6">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter border-b border-[#2a2a2a] pb-4 mb-6">Trí Tuệ Mật (Top {videos.length} Video Mới Nhất)</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Chart 1: Upload Hour */}
                <div className="bg-[#111] p-6 rounded-[2rem] border border-[#2a2a2a] min-h-[300px] flex flex-col">
                  <div className="mb-6">
                    <h4 className="text-sm font-black text-white uppercase tracking-tight">Khung Giờ Vàng Đăng Bài</h4>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Lịch đăng bài ưa thích (Giờ Local VN)</p>
                  </div>
                  <div className="flex-grow w-full h-full min-h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={uploadHourData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                        <XAxis dataKey="hour" stroke="#666" tick={{fill: '#666', fontSize: 10}} tickLine={false} axisLine={false} />
                        <YAxis stroke="#666" tick={{fill: '#666', fontSize: 10}} tickLine={false} axisLine={false} />
                        <Tooltip 
                            cursor={{fill: '#1a1a1a'}} 
                            contentStyle={{backgroundColor: '#0a0a0a', borderColor: '#333', borderRadius: '12px', fontSize: '12px'}} 
                            itemStyle={{color: '#fff', fontWeight: 'bold'}}
                            formatter={(value: any) => [`${value} videos`, 'Đăng tải']}
                            labelStyle={{color: '#888', marginBottom: '4px'}}
                        />
                        <Bar dataKey="count" fill="#eab308" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Upload Frequency */}
                <div className="bg-[#111] p-6 rounded-[2rem] border border-[#2a2a2a] min-h-[300px] flex flex-col relative">
                  <div className="mb-6 flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-tight">Tần Suất Đăng Bài</h4>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Năng suất sản xuất nội dung</p>
                    </div>
                    {/* Toggle Button */}
                    <div className="flex bg-[#222] rounded-lg p-1 border border-[#333]">
                        <button 
                            onClick={() => setFreqMode('DAY')}
                            className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${freqMode === 'DAY' ? 'bg-[#3b82f6] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            Ngày
                        </button>
                        <button 
                            onClick={() => setFreqMode('MONTH')}
                            className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${freqMode === 'MONTH' ? 'bg-[#3b82f6] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            Tháng
                        </button>
                    </div>
                  </div>
                  <div className="flex-grow w-full h-full min-h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={frequencyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                        <XAxis dataKey="timeLabel" stroke="#666" tick={{fill: '#666', fontSize: 10}} tickLine={false} axisLine={false} />
                        <YAxis stroke="#666" tick={{fill: '#666', fontSize: 10}} tickLine={false} axisLine={false} />
                        <Tooltip 
                            contentStyle={{backgroundColor: '#0a0a0a', borderColor: '#333', borderRadius: '12px', fontSize: '12px'}} 
                            itemStyle={{color: '#fff', fontWeight: 'bold'}}
                            formatter={(value: any) => [`${value} videos`, 'Sản lượng']}
                            labelStyle={{color: '#888', marginBottom: '4px'}}
                        />
                        <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 3: Format Breakdown (Donut) */}
                <div className="bg-[#111] p-6 rounded-[2rem] border border-[#2a2a2a] min-h-[300px] flex flex-col">
                  <div className="mb-6">
                    <h4 className="text-sm font-black text-white uppercase tracking-tight">Chiến Lược Nội Dung</h4>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Tỷ trọng các định dạng Video (Số lượng)</p>
                  </div>
                  <div className="flex-grow w-full h-full min-h-[250px] flex flex-col items-center justify-center">
                    {formatData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={formatData}
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                              stroke="none"
                            >
                              {formatData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{backgroundColor: '#0a0a0a', borderColor: '#333', borderRadius: '12px', fontSize: '12px'}} 
                                itemStyle={{color: '#fff', fontWeight: 'bold'}}
                                formatter={(value: any) => [`${value} videos`]}
                            />
                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} iconType="circle"/>
                          </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-sm text-gray-400">Không đủ dữ liệu</p>
                    )}
                  </div>
                </div>

                {/* Chart 4: Engagement Rate Line Chart */}
                <div className="bg-[#111] p-6 rounded-[2rem] border border-[#2a2a2a] min-h-[300px] flex flex-col">
                  <div className="mb-6 flex justify-between items-end">
                      <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-tight">Tỷ Lệ Tương Tác Cốt Lõi</h4>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">(Like + Cmt) / Views</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">% ER</span>
                      </div>
                  </div>
                  <div className="flex-grow w-full h-full min-h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={engagementData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                        <XAxis dataKey="name" stroke="#666" tick={{fill: '#666', fontSize: 10}} tickLine={false} axisLine={false} />
                        <YAxis stroke="#666" tick={{fill: '#666', fontSize: 10}} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                        <Tooltip 
                            contentStyle={{backgroundColor: '#0a0a0a', borderColor: '#333', borderRadius: '12px', fontSize: '12px'}} 
                            itemStyle={{color: '#fff', fontWeight: 'bold'}}
                            formatter={(value: any, name: string) => {
                                if (name === 'engagementRate') return [`${value}%`, 'Tương Tác'];
                                return [value, name];
                            }}
                            labelFormatter={(label: string, payload: any[]) => {
                                if (payload && payload.length > 0) return payload[0].payload.title;
                                return label;
                            }}
                            labelStyle={{color: '#888', marginBottom: '8px', maxWidth: '250px', whiteSpace: 'normal'}}
                        />
                        <Line type="monotone" dataKey="engagementRate" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#111', stroke: '#10b981', strokeWidth: 2}} activeDot={{r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 5: Performance Line Chart */}
                <div className="lg:col-span-2 bg-[#111] p-6 rounded-[2rem] border border-[#2a2a2a] min-h-[350px] flex flex-col">
                  <div className="mb-6 flex justify-between items-end">
                      <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-tight">Phong Độ Lượt Xem (Views)</h4>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Xu hướng tăng trưởng của các video theo dòng thời gian (Bên trái: cũ, Bên phải: mới)</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-600"></span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Views</span>
                      </div>
                  </div>
                  <div className="flex-grow w-full h-full min-h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={performanceData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                        <XAxis dataKey="name" stroke="#666" tick={{fill: '#666', fontSize: 10}} tickLine={false} axisLine={false} />
                        <YAxis stroke="#666" tick={{fill: '#666', fontSize: 10}} tickLine={false} axisLine={false} tickFormatter={(val) => formatNumber(val)} />
                        <Tooltip 
                            contentStyle={{backgroundColor: '#0a0a0a', borderColor: '#333', borderRadius: '12px', fontSize: '12px'}} 
                            itemStyle={{color: '#fff', fontWeight: 'bold'}}
                            formatter={(value: any, name: string) => {
                                if (name === 'views') return [formatNumber(value), 'Lượt Xem'];
                                return [value, name];
                            }}
                            labelFormatter={(label: string, payload: any[]) => {
                                if (payload && payload.length > 0) return payload[0].payload.title;
                                return label;
                            }}
                            labelStyle={{color: '#888', marginBottom: '8px', maxWidth: '250px', whiteSpace: 'normal'}}
                        />
                        <Line type="monotone" dataKey="views" stroke="#dc2626" strokeWidth={3} dot={{r: 4, fill: '#111', stroke: '#dc2626', strokeWidth: 2}} activeDot={{r: 6, fill: '#dc2626', stroke: '#fff', strokeWidth: 2}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Section 6: Top Keywords Phrase */}
                {topKeywords.length > 0 && (
                    <div className="lg:col-span-2 bg-[#111] p-6 rounded-[2rem] border border-[#2a2a2a] flex flex-col items-start transition-all">
                        <div className="w-full">
                            <h4 className="text-sm font-black text-white uppercase tracking-tight mb-2">Công Thức Giật Tít (Top Cụm Từ Tiêu Đề)</h4>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">Nhấn vào từ khóa để xem Cơn Sốt Google Trends</p>
                            <div className="flex flex-wrap gap-3">
                                {topKeywords.map(([phrase, count], i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => setSelectedTrendKeyword(phrase)}
                                        className={`flex items-center rounded-xl border overflow-hidden group transition-all text-left ${selectedTrendKeyword === phrase ? 'bg-blue-600/10 border-blue-500' : 'bg-[#1a1a1a] border-[#333] hover:border-yellow-500/50'}`}
                                    >
                                        <span className={`px-4 py-2 text-sm font-bold capitalize transition-colors ${selectedTrendKeyword === phrase ? 'text-blue-400' : 'text-gray-300 group-hover:text-yellow-400'}`}>
                                            {phrase}
                                        </span>
                                        <span className={`px-3 py-2 text-xs font-black border-l transition-colors ${selectedTrendKeyword === phrase ? 'bg-blue-600/20 text-blue-500 border-blue-500/50' : 'bg-[#222] text-gray-500 border-[#333]'}`}>
                                            x{count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Google Trends Panel under Keywords when active */}
                        {selectedTrendKeyword && (
                            <div className="w-full mt-6 animate-fade-in border-t border-[#333] pt-2">
                                <GoogleTrendsChart keyword={selectedTrendKeyword} region={channelDetails.country || 'ALL'} timeframe={365} />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

export default ChannelDashboard;
