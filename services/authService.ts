import { saveAccountInfo } from './firebaseService';

export const API_URL = import.meta.env.VITE_API_URL || 'https://api.dashboard.yteco.live';

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
        throw new Error(`Login failed: ${response.status}`);
      }

      const result = await response.json();

      if (result && result.access_token) {
        const token = result.access_token;
        setStoredToken(token);
        localStorage.setItem('username', username);
        
        // Lưu thông tin người dùng vào Firebase và LocalStorage
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
      return { token: null, isLoggedIn: false };
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
