import type { IElectronAPI } from '../renderer';

const unsupported = (feature: string) =>
  new Error(`${feature} is only available in the Electron desktop app.`);

const createBrowserFallbackApi = (): IElectronAPI => ({
  openFileDialog: async () => null,
  onProgress: () => {},
  saveCredentials: async () => {},
  loadCredentials: async () => null,
  getHistory: async () => [],
  addHistory: async () => {},
  updateHistoryItem: async () => {},
  deleteHistoryItem: async () => false,
  minimizeWindow: () => {},
  maximizeWindow: () => {},
  closeWindow: () => {},
  quitApp: () => {},
  openExternalLink: (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  },
  configureAkave: async () => false,
  uploadFileToAkave: async () => {
    throw unsupported('Akave upload');
  },
  uploadDatasetToAkave: async () => {
    throw unsupported('Akave dataset upload');
  },
  listFilesFromAkave: async () => [],
  fetchFileFromAkave: async () => {
    throw unsupported('Akave file fetch');
  },
  onAkaveProgress: () => {},
  startLogSubscription: () => {},
  stopLogSubscription: () => {},
  getLogs: async () => [],
  onNewLog: () => () => {},
  downloadFile: async () => ({
    success: false,
    reason: 'Download is only available in the Electron desktop app.',
  }),
});

if (typeof window !== 'undefined' && !window.electronAPI) {
  window.electronAPI = createBrowserFallbackApi();
}
