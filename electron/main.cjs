const { app, BrowserWindow, shell, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const { execSync } = require('child_process');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');

// Configure autoUpdater logging
log.transports.file.level = "info";
autoUpdater.logger = log;

// Register IPC handler for machine ID
ipcMain.handle('get-machine-id', async () => {
    if (process.platform === 'win32') {
        try {
            const output = execSync('wmic csproduct get uuid').toString();
            // Lọc ra chuỗi UUID thật sự, bỏ header "UUID" và khoảng trắng dư
            const uuidLine = output.split('\n').find(line => line.trim().length > 0 && !line.trim().includes('UUID'));
            return uuidLine ? uuidLine.trim() : 'UNKNOWN_UUID';
        } catch (error) {
            log.error('Failed to get machine UUID:', error);
            return 'ERROR_GETTING_UUID';
        }
    }
    return 'NON_WINDOWS_PLATFORM';
});

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

ipcMain.handle('check-for-updates', () => {
    autoUpdater.checkForUpdatesAndNotify();
});

ipcMain.handle('reload-app', (event) => {
    const webContents = event.sender;
    const win = BrowserWindow.fromWebContents(webContents);
    if (win) {
        win.reload();
    }
});

// Import google-trends-api
const googleTrends = require('google-trends-api');

// Setup Google Trends handler
ipcMain.handle('fetch-google-trends', async (event, options) => {
    try {
        const results = await googleTrends.interestOverTime(options);
        return JSON.parse(results);
    } catch (error) {
        log.error("Google Trends API Error:", error);
        throw error;
    }
});

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        title: "TubeThumb Analytics",
        icon: path.join(__dirname, '../public/icon.png')
    });

    // Setup Custom Application Menu
    const template = [
        {
            label: 'Tùy chọn',
            submenu: [
                {
                    label: 'Tải lại ứng dụng',
                    accelerator: 'CmdOrCtrl+R',
                    click(item, focusedWindow) {
                        if (focusedWindow) focusedWindow.reload()
                    }
                },
                { type: 'separator' },
                {
                    label: 'Thoát',
                    accelerator: 'CmdOrCtrl+Q',
                    click() { app.quit() }
                }
            ]
        },
        {
            label: 'Trợ giúp',
            submenu: [
                {
                    label: 'Kiểm tra bản cập nhật',
                    click() {
                        autoUpdater.checkForUpdatesAndNotify();
                    }
                }
            ]
        }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    // Load app based on environment
    if (process.env.NODE_ENV === 'development') {
        win.loadURL('http://127.0.0.1:5174');
        // Open DevTools in dev mode
        // win.webContents.openDevTools();
    } else {
        // In production, load the built index.html
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Open external links in default browser
    win.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

app.whenReady().then(() => {
    createWindow();

    // Check for updates after the window is created
    autoUpdater.checkForUpdatesAndNotify();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Auto Updater Events
autoUpdater.on('update-available', () => {
    log.info('Update available.');
});

autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded.');
    const dialogOpts = {
        type: 'info',
        buttons: ['Khởi động lại & Cài đặt', 'Để sau'],
        title: 'Bản cập nhật Ứng dụng',
        message: 'Có một bản cập nhật mới (Phiên bản ' + info.version + ') đã được tải về hoàn tất.',
        detail: 'Hệ thống sẽ cài đặt và khởi động lại ngay để trải nghiệm tính năng mới nha!'
    };

    dialog.showMessageBox(dialogOpts).then((returnValue) => {
        if (returnValue.response === 0) {
            autoUpdater.quitAndInstall();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
