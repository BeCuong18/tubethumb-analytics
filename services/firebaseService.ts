import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

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

// Helper function to handle machine binding logic
export const verifyAndBindDevice = async (uid: string, machineId: string, email?: string, password?: string): Promise<boolean> => {
    // Dùng email làm tên Document thay vì UID (chuỗi ngẫu nhiên dài) để dễ theo dõi trong bảng danh sách
    const accountId = email || uid;
    const accountRef = doc(db, 'accounts', accountId);
    const accountSnap = await getDoc(accountRef);

    if (accountSnap.exists()) {
        const data = accountSnap.data();
        // Device is already bound. Check if this machine is the bound machine.
        if (data.machineId === machineId) {
            return true; // Match, allow login
        } else {
            return false; // Mismatch, deny login
        }
    } else {
        // No device bound yet. Bind this machine to this user.
        await setDoc(accountRef, {
            machineId: machineId,
            email: email || "unknown",
            password: password || "hidden",
            uid: uid, // Lưu thêm uid gốc vào để phòng hờ cần đối chiếu
            boundAt: new Date().toISOString()
        });
        return true; // Bound successfully, allow login
    }
};
