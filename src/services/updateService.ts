import { reload } from '@capacitor/live-updates';
import { Filesystem, Directory } from '@capacitor/filesystem';

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
}

export class UpdateService {
  private static instance: UpdateService;
  private updateProgressCallback?: (progress: number) => void;
  private readonly GITHUB_REPO = 'Deartaj92/DearTaj'; // Replace with your actual repo
  private readonly BUNDLE_ASSET_NAME = 'app-bundle.zip'; // Name of your bundle asset

  static getInstance(): UpdateService {
    if (!UpdateService.instance) {
      UpdateService.instance = new UpdateService();
    }
    return UpdateService.instance;
  }

  // Get current app version from package.json
  private getCurrentVersion(): string {
    return '1.0.0'; // You can get this from package.json or build info
  }

  // Check for updates from GitHub releases
  async checkForUpdates(): Promise<{ updateAvailable: boolean; release?: GitHubRelease }> {
    try {
      const response = await fetch(`https://api.github.com/repos/${this.GITHUB_REPO}/releases/latest`);
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const release: GitHubRelease = await response.json();
      const currentVersion = this.getCurrentVersion();
      
      // Compare versions (simple string comparison for now)
      const updateAvailable = release.tag_name !== currentVersion;
      
      if (updateAvailable) {
        // Check if bundle asset exists
        const bundleAsset = release.assets.find(asset => 
          asset.name === this.BUNDLE_ASSET_NAME
        );
        
        if (!bundleAsset) {
          console.warn('No bundle asset found in release');
          return { updateAvailable: false };
        }
        
        return { updateAvailable: true, release };
      }
      
      return { updateAvailable: false };
    } catch (error) {
      console.error('Update check failed:', error);
      return { updateAvailable: false };
    }
  }

  // Download update with progress
  async downloadUpdate(release: GitHubRelease, onProgress?: (progress: number) => void): Promise<void> {
    this.updateProgressCallback = onProgress;
    
    try {
      const bundleAsset = release.assets.find(asset => 
        asset.name === this.BUNDLE_ASSET_NAME
      );
      
      if (!bundleAsset) {
        throw new Error('Bundle asset not found');
      }

      // Download the bundle
      const response = await fetch(bundleAsset.browser_download_url);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const contentLength = response.headers.get('Content-Length');
      const total = parseInt(contentLength || '0', 10);
      
      let receivedLength = 0;
      const chunks: Uint8Array[] = [];
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          chunks.push(value);
          receivedLength += value.length;
          
          if (this.updateProgressCallback && total > 0) {
            this.updateProgressCallback((receivedLength / total) * 100);
          }
        }
      }

      // Convert to blob and save
      const blob = new Blob(chunks);
      const arrayBuffer = await blob.arrayBuffer();
      
      // Convert Uint8Array to base64 safely
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);
      
      // Save bundle using Capacitor Filesystem
      await Filesystem.writeFile({
        path: 'bundles/latest.zip',
        data: base64,
        directory: Directory.Documents
      });

      // Show install prompt
      this.showInstallPrompt(release);
      
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }

  // Show install prompt
  private async showInstallPrompt(release: GitHubRelease): Promise<void> {
    const releaseNotes = release.body || 'Bug fixes and improvements';
    const shouldInstall = confirm(
      `Update ${release.tag_name} downloaded!\n\nRelease Notes:\n${releaseNotes}\n\nRestart app to install?`
    );
    
    if (shouldInstall) {
      await reload();
    }
  }

  // Get release notes for display
  getReleaseNotes(release: GitHubRelease): string {
    return release.body || 'Bug fixes and improvements';
  }

  // Get release version
  getReleaseVersion(release: GitHubRelease): string {
    return release.tag_name;
  }
}
