// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onEvent: (name, handler) => ipcRenderer.on(name, handler),
  sendMessage: (channel, message) => ipcRenderer.send(channel, message),
});
