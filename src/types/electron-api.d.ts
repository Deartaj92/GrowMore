export {};

declare global {
  interface Window {
    __GITHUB_TOKEN__?: string;
    electronAPI?: {
      minimize: () => void;
      maximize: () => void;
      unmaximize: () => void;
      close: () => void;
      isMaximized: () => Promise<boolean>;
      onMaximize: (callback: () => void) => void;
      onUnmaximize: (callback: () => void) => void;
      downloadFile: (url: string, fileName: string) => Promise<{ filePath: string; fileName: string }>;
      onDownloadProgress: (callback: (data: { progress: number; downloadedBytes: number; totalBytes: number; fileName: string; isPaused?: boolean; canceled?: boolean }) => void) => void;
      pauseDownload: (fileName: string) => Promise<{ success: boolean }>;
      resumeDownload: (fileName: string) => Promise<{ success: boolean }>;
      cancelDownload: (fileName: string) => Promise<{ success: boolean }>;
      showSaveDialog: (options: { title?: string; defaultPath?: string; fileName?: string; filters?: Array<{ name: string; extensions: string[] }> }) => Promise<{ canceled: boolean; filePath?: string }>;
      showItemInFolder: (filePath: string) => Promise<{ success: boolean; error?: string }>;
    };
  }
} 