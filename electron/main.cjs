const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const { machineIdSync } = require('node-machine-id');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');

// Configure autoUpdater logging
log.transports.file.level = "info";
autoUpdater.logger = log;

// Register IPC handler for machine ID
ipcMain.handle('get-machine-id', async () => {
    return machineIdSync();
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

    // Remove menu bar for cleaner look (optional)
    win.setMenuBarVisibility(false);

    // Load app based on environment
    if (process.env.NODE_ENV === 'development') {
        win.loadURL('http://localhost:5174');
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
