import pkg from 'electron';
const { app, BrowserWindow } = pkg;

app.whenReady().then(() => {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach(win => {
    win.webContents.openDevTools();
  });
});
