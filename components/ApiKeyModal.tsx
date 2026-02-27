import React, { useState, useEffect } from 'react';
import { saveYoutubeApiKey, getYoutubeApiKey, removeYoutubeApiKey, saveGeminiApiKey, getGeminiApiKey, removeGeminiApiKey } from '../services/storageService';

interface ApiKeyModalProps {
    onClose: () => void;
    currentYtKey?: string;
    currentGeminiKey?: string;
    onSaveYtKey?: (key: string) => void;
    onSaveGeminiKey?: (key: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onClose, currentYtKey, currentGeminiKey, onSaveYtKey, onSaveGeminiKey }) => {
    const [ytKey, setYtKey] = useState(currentYtKey || '');
    const [geminiKey, setGeminiKey] = useState(currentGeminiKey || '');
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        // Chỉ lấy key từ Firebase truyền qua props, không đọc từ local storage nữa
        if (currentYtKey) setYtKey(currentYtKey);
        if (currentGeminiKey) setGeminiKey(currentGeminiKey);
        if (currentYtKey || currentGeminiKey) setIsSaved(true);
    }, [currentYtKey, currentGeminiKey]);

    const handleSave = () => {
        if (ytKey.trim()) { saveYoutubeApiKey(ytKey); onSaveYtKey?.(ytKey); }
        if (geminiKey.trim()) { saveGeminiApiKey(geminiKey); onSaveGeminiKey?.(geminiKey); }
        setIsSaved(true);
        onClose();
    };

    const handleClear = () => {
        removeYoutubeApiKey();
        removeGeminiApiKey();
        setYtKey('');
        setGeminiKey('');
        setIsSaved(false);
        onSaveYtKey?.('');
        onSaveGeminiKey?.('');
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <h3 className="text-xl font-black text-white mb-6 uppercase tracking-tight">Quản lý API Key</h3>

                <div className="space-y-4">
                    {/* YouTube Data API Key Input Removed as per user request */}

                    {/* Gemini API Key Input */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex justify-between">
                            <span>Gemini AI API Key</span>
                            {isSaved && <span className="text-green-500 text-[9px] px-2 py-0.5 bg-green-500/10 rounded-full border border-green-500/20">Đã lưu</span>}
                        </label>
                        <div className="relative">
                            <input
                                type="password"
                                value={geminiKey}
                                onChange={(e) => {
                                    setGeminiKey(e.target.value);
                                    setIsSaved(false);
                                }}
                                placeholder="Nhập khóa API Gemini của bạn..."
                                className="w-full bg-[#0a0a0a] border border-[#333] hover:border-[#666] focus:border-red-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all font-mono"
                            />
                            {isSaved && (
                                <div className="absolute right-3 top-3 text-green-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <p className="mt-2 text-[10px] text-gray-500">
                            Khóa này sẽ được lưu trữ an toàn ngay trên trình duyệt của bạn.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={handleSave}
                            className="flex-1 bg-white hover:bg-gray-200 text-black px-4 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all"
                        >
                            Lưu Khóa
                        </button>
                        {isSaved && (
                            <button
                                onClick={handleClear}
                                className="px-4 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all border border-red-900/50 text-red-500 hover:bg-red-900/20"
                            >
                                Xóa
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyModal;
