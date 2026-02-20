declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void;
      maximize: () => void;
      unmaximize: () => void;
      close: () => void;
      isMaximized: () => Promise<boolean>;
      onMaximize: (callback: () => void) => void;
      onUnmaximize: (callback: () => void) => void;
      downloadFile: (url: string, fileName: string) => Promise<{ filePath: string; fileName: string }>;
      onDownloadProgress: (callback: (data: { progress: number; downloadedBytes: number; totalBytes: number; fileName: string }) => void) => void;
      showSaveDialog: (options: { title?: string; defaultPath?: string; fileName?: string; filters?: Array<{ name: string; extensions: string[] }> }) => Promise<{ canceled: boolean; filePath?: string }>;
      showItemInFolder: (filePath: string) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

export {};
