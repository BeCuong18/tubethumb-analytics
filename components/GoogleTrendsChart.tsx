import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface GoogleTrendsChartProps {
  keyword: string;
  region?: string;
  timeframe?: number;
}

const GoogleTrendsChart: React.FC<GoogleTrendsChartProps> = ({ keyword, region = 'ALL', timeframe = 365 }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrends = async () => {
      if (!keyword) return;

      setLoading(true);
      setError(null);

      try {
        // Build options for google-trends-api
        const options: any = {
          keyword: keyword,
          property: 'youtube' // Focus search specifically on YouTube
        };

        if (region && region !== 'ALL') {
            options.geo = region;
        }

        const endTime = new Date();
        const startTime = new Date();
        if (timeframe === 3650) {
            startTime.setFullYear(2004, 0, 1); // "All time" in normal YouTube term. Google Trends starts from 2004
        } else if (timeframe === 0.0416) {
            startTime.setHours(startTime.getHours() - 1); // 1 hour ago
        } else {
            startTime.setDate(startTime.getDate() - timeframe); // Default days
        }
        
        options.startTime = startTime;
        options.endTime = endTime;

        const resultStr = await window.electronAPI.fetchGoogleTrends(options);
        
        // google-trends-api returns a JSON string, let's parse it
        // Note: the backend is already parsing it, so it might be an object. Let's handle both.
        const response = typeof resultStr === 'string' ? JSON.parse(resultStr) : resultStr;

        if (response && response.default && response.default.timelineData) {
            const formattedData = response.default.timelineData.map((item: any) => {
                // Formatting Date
                const date = new Date(item.time * 1000);
                return {
                    timeLabel: `${date.getMonth() + 1}/${date.getFullYear()}`,
                    interest: item.value[0], // Extract the single value
                    formattedAxisTime: item.formattedAxisTime
                };
            });
            setData(formattedData);
        } else {
            setError("Không tìm thấy dữ liệu xu hướng.");
        }

      } catch (err: any) {
        console.error("Failed to fetch Google Trends:", err);
        setError("Lỗi khi kết nối đến Google Trends.");
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, [keyword]);

  if (!keyword) return null;

  return (
    <div className="bg-[#111] p-6 rounded-[2rem] border border-[#2a2a2a] w-full mt-6 flex flex-col mb-6 relative overflow-hidden group">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -z-10 group-hover:bg-blue-500/20 transition-all duration-700"></div>
      
      <div className="mb-6 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
             <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
               </svg>
             </div>
             <h4 className="text-sm font-black text-white uppercase tracking-tight">Cơn Sốt Google Trends</h4>
          </div>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-1">
             Từ khóa: <span className="text-yellow-400">"{keyword}"</span> 
             {region !== 'ALL' ? ` (${region})` : ' (Toàn Cầu)'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="w-full h-[250px] flex flex-col items-center justify-center">
            <div className="w-8 h-8 rounded-full border-t-2 border-b-2 border-blue-500 animate-spin mb-4"></div>
            <p className="text-xs text-blue-400 font-bold uppercase tracking-widest animate-pulse">Đang định vị dữ liệu Google...</p>
        </div>
      ) : error ? (
        <div className="w-full h-[250px] flex items-center justify-center">
            <div className="text-center">
                <p className="text-sm text-red-400 font-bold mb-2">⚠️ {error}</p>
                <p className="text-xs text-gray-500">Thử tìm kiếm với một từ khóa khác có xu hướng rõ ràng hơn.</p>
            </div>
        </div>
      ) : data.length > 0 ? (
        <div className="w-full h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                  <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="formattedAxisTime" stroke="#666" tick={{fill: '#666', fontSize: 10}} tickLine={false} axisLine={false} />
              <YAxis stroke="#666" tick={{fill: '#666', fontSize: 10}} tickLine={false} axisLine={false} />
              <Tooltip 
                  contentStyle={{backgroundColor: '#0a0a0a', borderColor: '#333', borderRadius: '12px', fontSize: '12px'}} 
                  itemStyle={{color: '#3b82f6', fontWeight: 'bold'}}
                  formatter={(value: any) => [`${value}/100`, 'Độ Hot']}
                  labelFormatter={(label: any) => `Thời gian: ${label}`}
                  labelStyle={{color: '#888', marginBottom: '4px'}}
              />
              <Area type="monotone" dataKey="interest" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorInterest)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
          <div className="w-full h-[250px] flex items-center justify-center">
             <p className="text-sm text-gray-500 font-bold">Không có dữ liệu hiển thị.</p>
          </div>
      )}
    </div>
  );
};

export default GoogleTrendsChart;
