import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, verifyAndBindDevice } from '../services/firebaseService';

interface LoginModalProps {
    onLoginSuccess: (userEmail: string) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 1. Authenticate with Firebase
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Get hardware ID securely from Electron IPC
            let machineId = "unknown-device";
            if (window.electronAPI && window.electronAPI.getMachineId) {
                machineId = await window.electronAPI.getMachineId();
            } else {
                console.warn("Electron API not found. Running in web mode fallback.");
                // In web mode, you might want to block or use a dummy ID.
                // For desktop, it should always be available.
            }

            // 3. Verify and Bind Device
            const isAllowed = await verifyAndBindDevice(user.uid, machineId, email, password);

            if (isAllowed) {
                onLoginSuccess(user.email || '');
            } else {
                // Log them back out if device doesn't match
                await auth.signOut();
                setError('Tài khoản này đã được liên kết và sử dụng trên một máy tính / thiết bị khác!');
            }

        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('Email hoặc mật khẩu không chính xác.');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Tài khoản tạm thời bị khóa do nhập sai quá nhiều lần. Thử lại sau.');
            } else {
                setError('Lỗi máy chủ rà soát. ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="bg-[#111] border border-[#333] w-full max-w-md rounded-2xl p-8 relative shadow-2xl shadow-indigo-500/10">

                {/* Header */}
                <div className="flex flex-col items-center justify-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
                        <span className="text-3xl text-white font-black mix-blend-overlay">T2</span>
                    </div>
                    <h2 className="text-2xl font-black text-white text-center">Đăng Nhập Ứng Dụng</h2>
                    <p className="text-sm text-gray-400 mt-2 text-center">Bản quyền phần mềm phân tích TubeThumb Analytics</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email Tài Khoản</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#1A1A1A] border border-[#333] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                            placeholder="nhap.email@cua-ban.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Mật khẩu</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#1A1A1A] border border-[#333] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl flex items-start gap-2 text-sm text-left">
                            <span className="shrink-0 mt-0.5">⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full font-bold text-white rounded-xl px-4 py-4 uppercase tracking-widest text-sm transition-all flex justify-center items-center gap-2 ${loading ? 'bg-indigo-600/50 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25'
                            }`}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Đang kiểm tra...
                            </>
                        ) : (
                            'Đăng Nhập'
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-[#222] text-center">
                    <p className="text-xs text-gray-500">Mọi hành vi đăng nhập trái phép sẽ bị theo dõi thiết bị ID.</p>
                </div>
            </div>
        </div>
    );
};

export default LoginModal;
