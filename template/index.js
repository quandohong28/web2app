const { app, BrowserWindow, session, shell, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// Config được sinh ra bởi CLI khi build project
const config = require('./app.config.json');

let mainWindow = null;

function isSameOrigin(targetUrl) {
  try {
    const a = new URL(targetUrl);
    const b = new URL(config.url);
    return a.hostname === b.hostname || a.hostname.endsWith('.' + b.hostname);
  } catch (e) {
    return false;
  }
}

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined;

  mainWindow = new BrowserWindow({
    ...(config.fullscreen
      ? { fullscreen: true }
      : { width: config.width || 1200, height: config.height || 800 }),
    minWidth: 480,
    minHeight: 360,
    title: config.title || 'App',
    icon,
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: 'persist:main-session',
      ...(config.userAgent ? {} : {}),
    },
  });

  if (config.userAgent) {
    mainWindow.webContents.setUserAgent(config.userAgent);
  }

  if (config.hideMenuBar) {
    mainWindow.setMenuBarVisibility(false);
    Menu.setApplicationMenu(null);
  }

  // Cấp / từ chối quyền truy cập theo cấu hình người dùng đã chọn lúc tạo app
  const allowed = new Set(config.permissions || []);
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(allowed.has(permission));
  });
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    return allowed.has(permission);
  });

  // Link cùng domain thì mở trong app, link ngoài (target=_blank, mở tab mới, v.v.) thì đẩy ra trình duyệt hệ thống
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSameOrigin(url)) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Điều hướng ra ngoài domain gốc (vd click link trong trang) cũng mở bằng trình duyệt ngoài
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isSameOrigin(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.loadURL(config.url);
}

app.whenReady().then(() => {
  if (config.appUserModelId && process.platform === 'win32') {
    app.setAppUserModelId(config.appUserModelId);
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Trên macOS, giữ app chạy trong Dock cho tới khi user Cmd+Q, giống hành vi app native
  if (process.platform !== 'darwin') app.quit();
});
