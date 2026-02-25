# Hướng dẫn Cài đặt & Sử dụng TubeThumb Analytics trên máy khác

TubeThumb Analytics là một ứng dụng web (ReactJS). Để chạy trên máy tính khác, bạn có 2 cách chính:

---

## Cách 1: Đưa lên mạng (Khuyên dùng)
Cách đơn giản nhất để người khác dùng là đưa thư mục `dist` (đã tạo ở bước build) lên các dịch vụ hosting miễn phí.
- **Vercel / Netlify / GitHub Pages**: Chỉ cần kéo thả thư mục `dist` lên hoặc kết nối với GitHub repository.
- **Ưu điểm**: Không cần cài đặt gì trên máy người dùng, chỉ cần mở trình duyệt.

---

## Cách 2: Chạy trực tiếp trên máy tính (Local)

Nếu bạn muốn chạy ứng dụng này như một phần mềm trên máy tính (Windows/Mac/Linux) mà không cần internet hosting:

### Yêu cầu:
Máy tính đó cần cài đặt **Node.js** (Tải tại: https://nodejs.org/).

### Các bước thực hiện:

#### A. Dành cho Người phát triển (Giữ nguyên mã nguồn)
1. Copy toàn bộ thư mục dự án (trừ `node_modules`) sang máy mới.
2. Mở Terminal/CMD tại thư mục đó.
3. Chạy lệnh:
   ```cmd
   npm install
   npm run dev
   ```
4. Truy cập: `http://localhost:5173`.

#### B. Dành cho Người dùng cuối (Chạy bản nhẹ)
1. Copy thư mục dự án sang máy mới.
2. Mở CMD, cài đặt gói `serve` (chỉ cần làm 1 lần):
   ```cmd
   npm install -g serve
   ```
3. Sau khi build (`npm run build`), chạy lệnh:
   ```cmd
   serve -s dist
   ```
4. Ứng dụng sẽ chạy tại `http://localhost:3000`.

---

## Mẹo: Tạo file chạy nhanh (Windows)
Bạn có thể tạo một file `start_app.bat` với nội dung sau để click đúp là chạy:

```bat
@echo off
echo Dang khoi dong TubeThumb Analytics...
start http://localhost:5173
npm run dev
pause
```
