const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { execSync } = require('child_process');

function getMachineUUID() {
    if (process.platform === 'win32') {
        try {
            const output = execSync('wmic csproduct get uuid').toString();
            const uuidLine = output.split('\n').find(line => line.trim().length > 0 && line.trim() !== 'UUID');
            return uuidLine ? uuidLine.trim() : 'UNKNOWN_UUID';
        } catch (error) {
            console.error('Failed to get machine UUID:', error);
            return 'ERROR_GETTING_UUID';
        }
    }
    // Add logic for other platforms if needed, or return a placeholder
    return 'NON_WINDOWS_PLATFORM';
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        title: "TubeThumb Analytics",
        icon: path.join(__dirname, '../public/vite.svg') // Verify icon path later
    });

    // Remove menu bar for cleaner look (optional)
    win.setMenuBarVisibility(false);

    // Load app based on environment
    if (process.env.NODE_ENV === 'development') {
        win.loadURL('http://localhost:5173');
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

    const { ipcMain } = require('electron');
    ipcMain.handle('get-machine-id', () => {
        return getMachineUUID();
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
