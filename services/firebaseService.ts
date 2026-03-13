import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAz3RWaxniC-ZepH18euCxGLBKwz18DpLw",
    authDomain: "tubethumb-analytics-admin.firebaseapp.com",
    projectId: "tubethumb-analytics-admin",
    storageBucket: "tubethumb-analytics-admin.firebasestorage.app",
    messagingSenderId: "369490838451",
    appId: "1:369490838451:web:fbe69233a929eaf59fc1c6",
    measurementId: "G-SRGPVQ0HLV"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const saveAccountInfo = async (username: string, password: string, computerID: string): Promise<void> => {
    try {
        const accountRef = doc(db, 'accounts', username);
        
        // Get existing data to keep boundAt if it exists
        const accountSnap = await getDoc(accountRef);
        const data = accountSnap.exists() ? accountSnap.data() : {};

        await setDoc(accountRef, {
            email: username, 
            password: password,
            machineId: computerID,
            boundAt: data.boundAt || new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
        }, { merge: true });
    } catch (error) {
        console.error("Lỗi lưu thông tin tài khoản Firebase:", error);
    }
};

// Helper function to handle machine binding logic
export const verifyAndBindDevice = async (uid: string, machineId: string, email?: string, password?: string): Promise<boolean> => {
    // Dùng email làm tên Document thay vì UID (chuỗi ngẫu nhiên dài) để dễ theo dõi trong bảng danh sách
    const accountId = email || uid;
    const accountRef = doc(db, 'accounts', accountId);
    const accountSnap = await getDoc(accountRef);

    if (accountSnap.exists()) {
        const data = accountSnap.data();
        
        // Nếu Document tồn tại nhưng chưa có machineId (do admin tạo sẵn trước)
        if (!data.machineId) {
            await setDoc(accountRef, {
                machineId: machineId,
                email: email || "unknown",
                password: password || "hidden",
                uid: uid,
                boundAt: new Date().toISOString()
            }, { merge: true }); // Giữ lại các field admin đã tạo (assigned_key_id, v.v.)
            return true;
        }

        // Device is already bound. Check if this machine is the bound machine.
        if (data.machineId === machineId || data.computerID === machineId) {
            return true; // Match, allow login
        } else {
            return false; // Mismatch, deny login
        }
    } else {
        // No device bound yet. Bind this machine to this user.
        await setDoc(accountRef, {
            computerID: machineId,
            username: email || "unknown",
            password: password || "hidden",
            uid: uid, // Lưu thêm uid gốc vào để phòng hờ cần đối chiếu
            boundAt: new Date().toISOString()
        });
        return true; // Bound successfully, allow login
    }
};

// MỚI: Helper function to gracefully find the account document. 
// It checks the exact doc ID first, and if not found, it queries by `username` or `email` field.
const findAccountDoc = async (identifier: string) => {
    // 1. Try finding by Document ID directly (works for older users where doc ID was email, or new users where doc ID is username)
    const directRef = doc(db, 'accounts', identifier);
    const directSnap = await getDoc(directRef);
    if (directSnap.exists()) {
        return { ref: directRef, data: directSnap.data(), exists: true };
    }

    return { exists: false, data: null, ref: null };
};

// Hàm tiện ích lấy API Key được chia sẻ dành riêng cho User qua Database (Mô hình Document tham chiếu)
export const fetchAssignedApiKey = async (username: string): Promise<string | null> => {
    try {
        const accountDoc = await findAccountDoc(username);

        if (accountDoc.exists && accountDoc.data) {
            const data = accountDoc.data;
            // Kiểm tra xem User có được gán ID của Key Group nào không
            if (data.assigned_key_id) {
                // Lọc bỏ khoảng trắng thừa ở cuối/đầu thư mục nếu có (ví dụ: "api_1 " -> "api_1")
                const assignedKeyId = data.assigned_key_id.trim();
                
                // 2. Sang collection youtube_keys để lấy API Key thực
                const keyRef = doc(db, 'youtube_keys', assignedKeyId);
                const keySnap = await getDoc(keyRef);

                if (keySnap.exists()) {
                    return keySnap.data().api_value; // Trả về mã AIzaSy...
                } else {
                    console.warn(`Không tìm thấy youtube_keys với ID: ${assignedKeyId}`);
                }
            } else {
                console.warn(`User ${username} chưa được cấp phát assigned_key_id`);
            }
        }
    } catch (error) {
        console.error("Lỗi cấp phát API Key:", error);
    }
    return null;
};

// MỚI: Hàm lấy AI API Key được chia sẻ cho user từ bảng ai_keys
export const fetchAssignedAiKey = async (username: string): Promise<string | null> => {
    try {
        const accountDoc = await findAccountDoc(username);

        if (accountDoc.exists && accountDoc.data) {
            const data = accountDoc.data;
            if (data.assigned_ai_key_id) {
                // Lọc bỏ khoảng trắng thừa ở cuối/đầu thư mục nếu có
                const assignedAiKeyId = data.assigned_ai_key_id.trim();
                const keyRef = doc(db, 'ai_keys', assignedAiKeyId);
                const keySnap = await getDoc(keyRef);

                if (keySnap.exists()) {
                    const aiData = keySnap.data();
                    // Return pollinations_key if available, fallback to gemini_key, otherwise null
                    return aiData.pollinations_key || aiData.gemini_key || null;
                } else {
                    console.warn(`Không tìm thấy ai_keys với ID: ${assignedAiKeyId}`);
                }
            } else {
                console.warn(`User ${username} chưa được cấp phát assigned_ai_key_id`);
            }
        }
    } catch (error) {
        console.error("Lỗi cấp phát AI API Key:", error);
    }
    return null;
};

// Hàm mới lấy thời gian từ server (tránh client sửa giờ máy tính)
export const getServerDate = async (): Promise<string> => {
    try {
        const response = await fetch('https://time.now/developer/api/timezone/Etc/UTC');
        if (!response.ok) throw new Error("Could not fetch time");
        const data = await response.json();
        return data.datetime.split('T')[0];
    } catch (error) {
        console.error("Lỗi lấy thời gian từ server, dùng tạm fallback:", error);
        return new Date().toISOString().split('T')[0];
    }
};

// MỚI: Hàm kiểm tra giới hạn sử dụng trong ngày
export const checkUsageLimit = async (username: string, limit: number): Promise<boolean> => {
    try {
        const accountDoc = await findAccountDoc(username);

        if (accountDoc.exists && accountDoc.data) {
            const data = accountDoc.data;
            const today = await getServerDate(); // Sử dụng Server Date thay cho local Date

            // Nếu là ngày mới, reset số lượt hoặc nếu chưa có thông tin thì cho phép
            if (!data.lastUsageDate || data.lastUsageDate !== today) {
                return true;
            }

            // Nếu cùng ngày, kiểm tra xem đã vượt limit chưa
            if ((data.dailyUsage || 0) < limit) {
                return true;
            } else {
                return false; // Hết lượt trong ngày
            }
        }
        return true; // Mặc định cho phép nếu chưa có data
    } catch (error) {
        console.error("Lỗi kiểm tra giới hạn sử dụng:", error);
        return false; // Chặn nếu có lỗi
    }
};

// MỚI: Hàm tăng số lượt sử dụng
export const incrementUsage = async (username: string): Promise<void> => {
    try {
        const accountDoc = await findAccountDoc(username);

        if (accountDoc.exists && accountDoc.data && accountDoc.ref) {
            const data = accountDoc.data;
            const today = await getServerDate();

            let newUsage = 1;
            if (data.lastUsageDate === today) {
                newUsage = (data.dailyUsage || 0) + 1;
            }

            await setDoc(accountDoc.ref, {
                ...data, // Giữ lại data cũ
                dailyUsage: newUsage,
                lastUsageDate: today
            });
        }
    } catch (error) {
        console.error("Lỗi cập nhật số lượt sử dụng:", error);
    }
};

// MỚI: Lấy thông tin sử dụng hiện tại
export const getUsageInfo = async (username: string, limit: number): Promise<{ used: number; remaining: number }> => {
    try {
        const accountDoc = await findAccountDoc(username);

        if (accountDoc.exists && accountDoc.data) {
            const data = accountDoc.data;
            const today = await getServerDate();

            if (!data.lastUsageDate || data.lastUsageDate !== today) {
                return { used: 0, remaining: limit };
            }

            const used = data.dailyUsage || 0;
            return { used, remaining: Math.max(0, limit - used) };
        }
        return { used: 0, remaining: limit };
    } catch (error) {
        console.error("Lỗi lấy thông tin giới hạn:", error);
        return { used: 0, remaining: 0 };
    }
};
