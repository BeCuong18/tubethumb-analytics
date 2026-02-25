@echo off
title TubeThumb Analytics Launcher
echo ===================================================
echo   KHOI DONG TUBETHUMB ANALYTICS
echo ===================================================
echo.
echo Dang kiem tra Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI] Chua cai dat Node.js! Vui long cai dat tai https://nodejs.org/
    pause
    exit
)

if not exist "node_modules" (
    echo [THONG BAO] Lan dau chay, dang cai dat thu vien (mat vai phut)...
    call npm install
)

echo.
echo Dang khoi dong Server...
echo Ung dung se tu dong mo trong trinh duyet.
echo.

start "" "http://localhost:5174"
call npm run dev
