# Hướng dẫn Đóng gói Ứng dụng Desktop (Electron)

File cài đặt `.exe` đã được tạo thành công tại thư mục `dist_electron`.

## Vị trí file cài đặt
- **File cài đặt**: `dist_electron/TubeThumb Analytics Setup 0.0.0.exe`
- **Thư mục chạy trực tiếp (không cần cài)**: `dist_electron/win-unpacked/TubeThumb Analytics.exe`

## Cách tạo file cài đặt mới
Khi bạn sửa code và muốn tạo file cài đặt mới:

1. Mở Terminal tại thư mục dự án.
2. Chạy lệnh:
   ```cmd
   npm run electron:build
   ```
3. Đợi khoảng 1-2 phút, file `.exe` mới sẽ ghi đè vào thư mục `dist_electron`.

## Cách chạy thử chế độ Desktop khi đang lập trình
Để mở cửa sổ ứng dụng giống như thật khi đang sửa code:
```cmd
npm run electron:dev
```

## Lưu ý quan trọng
- **Icon ứng dụng**: Hiện tại đang dùng icon mặc định của Electron. Để đổi icon, bạn cần chuẩn bị file `.ico` kích thước 256x256, đặt vào thư mục `public` và sửa đường dẫn trong `electron/main.js` và `package.json`.
- **API Key**: API Key được lưu riêng cho bản Desktop, độc lập với trình duyệt.
