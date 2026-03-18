import { saveAccountInfo, verifyAndBindDevice } from './firebaseService';

export const API_URL = import.meta.env.VITE_API_URL;

// Helpers
const setStoredToken = (token: string) => localStorage.setItem('access_token', token);
const getStoredToken = () => localStorage.getItem('access_token');
const removeStoredToken = () => {
  localStorage.removeItem('access_token');
  // localStorage.removeItem('username'); // Giữ lại username để hiển thị lần sau
  // password cũng sẽ được giữ lại nếu đã lưu (được xử lý ở phần login)
};

export const authService = {
  login: async (username: string, password: string, computerId: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login-tool`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, computerId }),
      });

      if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Invalid credentials');
        }
        throw new Error(`Login failed: ${response.status}`);
      }

      const result = await response.json();

      if (result && result.access_token) {
        const token = result.access_token;
        setStoredToken(token);
        localStorage.setItem('username', username);
        
        // Xác minh và liên kết thiết bị trên Firebase
        const isBound = await verifyAndBindDevice(username, computerId, username, password);
        
        if (!isBound) {
            // Nếu thiết bị không khớp với thiết bị đã liên kết trước đó trên Firebase
            removeStoredToken();
            throw new Error('Device mismatch. This account is bound to another device.');
        }

        // Lưu thông tin người dùng vào Firebase (cập nhật lastLoginAt)
        await saveAccountInfo(username, password, computerId);
        localStorage.setItem('saved_password', password); // Lưu password để hiển thị lần sau
        
        return {
          token,
          isLoggedIn: true,
        };
      }

      return { token: null, isLoggedIn: false };
    } catch (error: any) {
      console.error("Login API call failed:", error);
      removeStoredToken();
      // Ném lỗi ra ngoài thay vì chỉ return false, để Modal có thể hiển thị chính xác lỗi
      throw error;
    }
  },
  
  getLoginStatus: () => {
    const token = getStoredToken();
    const username = localStorage.getItem('username');
    if (!token) return { isLoggedIn: false, token: null, username: null };
    return { isLoggedIn: true, token, username };
  },
  
  logout: async () => {
    removeStoredToken();
    return Promise.resolve();
  }
};
