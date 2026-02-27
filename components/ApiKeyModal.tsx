import React, { useState, useEffect } from 'react';
import { saveYoutubeApiKey, getYoutubeApiKey, removeYoutubeApiKey, saveGeminiApiKey, getGeminiApiKey, removeGeminiApiKey } from '../services/storageService';

interface ApiKeyModalProps {
    onClose: () => void;
    currentYtKey?: string;
    currentGeminiKeys?: string[];
    onSaveYtKey?: (key: string) => void;
    onSaveGeminiKey?: (keys: string[]) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onClose, currentYtKey, currentGeminiKeys, onSaveYtKey, onSaveGeminiKey }) => {
    const [ytKey, setYtKey] = useState(currentYtKey || '');
    const [geminiKeys, setGeminiKeys] = useState<string[]>(currentGeminiKeys?.length ? currentGeminiKeys : ['']);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        if (currentYtKey) setYtKey(currentYtKey);
        if (currentGeminiKeys && currentGeminiKeys.length > 0) setGeminiKeys(currentGeminiKeys);
        if (currentYtKey || (currentGeminiKeys && currentGeminiKeys.length > 0 && currentGeminiKeys[0] !== '')) setIsSaved(true);
    }, [currentYtKey, currentGeminiKeys]);

    const handleSave = () => {
        const validKeys = geminiKeys.filter(k => k.trim() !== '');

        if (ytKey.trim()) { saveYoutubeApiKey(ytKey); onSaveYtKey?.(ytKey); }
        if (validKeys.length > 0) {
            saveGeminiApiKey(validKeys);
            onSaveGeminiKey?.(validKeys);
        } else {
            removeGeminiApiKey();
            onSaveGeminiKey?.([]);
        }
        setIsSaved(true);
        onClose();
    };

    const handleClear = () => {
        removeYoutubeApiKey();
        removeGeminiApiKey();
        setYtKey('');
        setGeminiKeys(['']);
        setIsSaved(false);
        onSaveYtKey?.('');
        onSaveGeminiKey?.([]);
    };

    const handleKeyChange = (index: number, value: string) => {
        const newKeys = [...geminiKeys];
        newKeys[index] = value;
        setGeminiKeys(newKeys);
        setIsSaved(false);
    };

    const addKeyField = () => {
        if (geminiKeys.length < 5) { // Limit to max 5 keys
            setGeminiKeys([...geminiKeys, '']);
            setIsSaved(false);
        }
    };

    const removeKeyField = (index: number) => {
        const newKeys = [...geminiKeys];
        newKeys.splice(index, 1);
        if (newKeys.length === 0) newKeys.push('');
        setGeminiKeys(newKeys);
        setIsSaved(false);
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
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex justify-between">
                            <span>Gemini AI API Keys (Tối đa 5)</span>
                            {isSaved && <span className="text-green-500 text-[9px] px-2 py-0.5 bg-green-500/10 rounded-full border border-green-500/20">Đã lưu</span>}
                        </label>

                        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                            {geminiKeys.map((key, index) => (
                                <div key={index} className="flex gap-2 relative">
                                    <input
                                        type="password"
                                        value={key}
                                        onChange={(e) => handleKeyChange(index, e.target.value)}
                                        placeholder={`Nhập khóa API Gemini thứ ${index + 1}...`}
                                        className="w-full bg-[#0a0a0a] border border-[#333] hover:border-[#666] focus:border-red-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all font-mono"
                                    />
                                    {geminiKeys.length > 1 && (
                                        <button
                                            onClick={() => removeKeyField(index)}
                                            className="px-3 bg-red-900/20 text-red-500 border border-red-900/50 rounded-xl hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"
                                            title="Xóa khóa này"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {geminiKeys.length < 5 && (
                            <button
                                onClick={addKeyField}
                                className="mt-3 text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Thêm API Key phụ
                            </button>
                        )}

                        <p className="mt-2 text-[10px] text-gray-500 leading-relaxed">
                            Khi một khóa API đạt giới hạn (Quota Exceeded), hệ thống sẽ tự động chuyển sang khóa tiếp theo trong danh sách. Lượt phân tích hàng ngày độc lập với số khóa API.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-[#333]">
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
                                Xóa Tất Cả
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyModal;
