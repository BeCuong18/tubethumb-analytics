
import React, { useState } from 'react';
import { VideoData } from '../types';

interface ThumbnailCardProps {
  video: VideoData;
  onShowAnalytics: (video: VideoData) => void;
  onDelete?: (video: VideoData) => void;
}

const ThumbnailCard: React.FC<ThumbnailCardProps> = ({ video, onShowAnalytics, onDelete }) => {
  const [imgSrc, setImgSrc] = useState(video.thumbnailUrl);
  const [isError, setIsError] = useState(false);

  const handleError = () => {
    if (!isError) {
      setImgSrc(`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`);
      setIsError(true);
    }
  };

  const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;

  return (
    <div className="group relative bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl border border-[#2a2a2a] flex flex-col h-full hover:border-red-600/30">
      {/* Thumbnail Image - Clickable */}
      <div
        onClick={() => onShowAnalytics(video)}
        className="block aspect-video w-full overflow-hidden bg-black relative cursor-pointer"
      >
        <img
          src={imgSrc}
          alt={video.title}
          onError={handleError}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100"
        />
        {/* Play Icon Overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-white text-[10px] font-bold uppercase tracking-widest bg-black/60 px-3 py-1 rounded-full backdrop-blur-md">Phân tích chuyên sâu</span>
          </div>
        </div>
        {/* Duration Badge */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-bold tracking-tighter">
            {video.duration}
          </div>
        )}

        {/* Delete Button overlay */}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(video); }}
            className="absolute top-2 right-2 bg-black/70 hover:bg-red-600/90 text-white p-1.5 rounded-full backdrop-blur-md transition-colors shadow-lg z-10 opacity-0 group-hover:opacity-100"
            title="Xóa khỏi kho lưu trữ"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter truncate max-w-[120px]" title={video.channelTitle}>{video.channelTitle}</span>
            {video.subscriberCount && video.subscriberCount !== "N/A" && (
              <span className="text-[9px] bg-[#222] text-gray-500 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">{video.subscriberCount} sub</span>
            )}
          </div>
          <span className="text-[10px] text-gray-600 font-mono shrink-0">{new Date(video.publishedAt).toLocaleDateString()}</span>
        </div>

        <h3
          onClick={() => onShowAnalytics(video)}
          className="text-sm font-semibold text-gray-100 line-clamp-2 leading-snug group-hover:text-red-400 transition-colors cursor-pointer mb-4"
          title={video.title}
        >
          {video.title}
        </h3>

        <div className="mt-auto space-y-3">
          {/* Stats Row */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400 border-t border-[#333] pt-3">
            <div className="flex items-center gap-1" title="Lượt xem">
              <span className="text-gray-600">👁️</span>
              <span className="font-bold text-white">{video.viewCount}</span>
            </div>
            {video.likeCount && video.likeCount !== '0' && (
              <div className="flex items-center gap-1" title="Lượt thích">
                <span className="text-gray-600">👍</span>
                <span className="font-bold text-white">{video.likeCount}</span>
              </div>
            )}
            <div className="flex items-center gap-1" title="Tương tác">
              <span className="text-gray-600">⚡</span>
              <span className="text-purple-400 font-bold">{video.engagementRate}%</span>
            </div>
            {video.vph !== undefined && video.vph > 0 && (
              <div className="flex items-center gap-1 ml-auto" title="Lượt xem mỗi giờ (VPH)">
                <span className="text-[9px] font-black bg-red-600/20 text-red-500 px-1.5 py-0.5 rounded border border-red-500/20 uppercase tracking-widest">{video.vph.toLocaleString('vi-VN')} vph</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onShowAnalytics(video)}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2 rounded-lg text-xs font-bold transition-all border border-white/5"
            >
              Analytics
            </button>
            <a
              href={imgSrc}
              download={`thumbnail-${video.id}.jpg`}
              className="p-2 bg-[#222] hover:bg-[#333] rounded-lg text-gray-400 hover:text-white transition-colors border border-white/5"
              title="Tải ảnh"
              onClick={(e) => e.stopPropagation()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThumbnailCard;
