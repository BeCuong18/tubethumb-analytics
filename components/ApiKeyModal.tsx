import React, { useState, useEffect } from 'react';
import { saveYoutubeApiKey, getYoutubeApiKey, removeYoutubeApiKey, saveGeminiApiKey, getGeminiApiKey, removeGeminiApiKey } from '../services/storageService';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (ytKey: string, geminiKey: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave }) => {
    const [ytKey, setYtKey] = useState('');
    const [geminiKey, setGeminiKey] = useState('');
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const savedYt = getYoutubeApiKey();
            const savedGemini = getGeminiApiKey();
            if (savedYt) setYtKey(savedYt);
            if (savedGemini) setGeminiKey(savedGemini);
            if (savedYt || savedGemini) setIsSaved(true);
        }
    }, [isOpen]);

    const handleSave = () => {
        if (ytKey.trim()) saveYoutubeApiKey(ytKey);
        if (geminiKey.trim()) saveGeminiApiKey(geminiKey);
        setIsSaved(true);
        onSave(ytKey, geminiKey);
        onClose();
    };

    const handleClear = () => {
        removeYoutubeApiKey();
        removeGeminiApiKey();
        setYtKey('');
        setGeminiKey('');
        setIsSaved(false);
        onSave('', '');
    };

    if (!isOpen) return null;

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
                    {/* YouTube Data API Key Input */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                            YouTube Data API Key (v3)
                        </label>
                        <input
                            type="password"
                            value={ytKey}
                            onChange={(e) => setYtKey(e.target.value)}
                            placeholder="Nhập YouTube API Key..."
                            className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-600 transition-all font-mono"
                        />
                    </div>

                    {/* Gemini API Key Input */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                            Gemini AI API Key
                        </label>
                        <div className="relative">
                            <input
                                type="password"
                                value={geminiKey}
                                onChange={(e) => setGeminiKey(e.target.value)}
                                placeholder="Nhập Gemini API Key..."
                                className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-600 transition-all font-mono"
                            />
                            {isSaved && (
                                <div className="absolute right-3 top-3 text-green-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <p className="mt-2 text-[10px] text-gray-600">
                            Khóa API được lưu cục bộ trên máy và không bao giờ được chia sẻ.
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
