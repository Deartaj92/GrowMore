import { reload } from '@capacitor/live-updates';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { Http } from '@capacitor-community/http';
import { FileOpener } from '@capacitor-community/file-opener';
import { getReleaseNotes } from '../utils/releaseNotes';

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  assets: Array<{
    name: string;
    label?: string;
    browser_download_url: string;
    size: number;
  }>;
}

export class UpdateService {
  private static instance: UpdateService;
  private updateProgressCallback?: (progress: number) => void;
  private readonly GITHUB_REPO = 'Deartaj92/GrowMore'; // Repository name
  private readonly BUNDLE_ASSET_NAME = 'app-bundle.zip'; // Name of your bundle asset
  private readonly GITHUB_TOKEN: string | null = null;

  static getInstance(): UpdateService {
    if (!UpdateService.instance) {
      UpdateService.instance = new UpdateService();
    }
    return UpdateService.instance;
  }

  constructor() {
    // Get GitHub token from environment variable (injected at build time)
    // Format: REACT_APP_GITHUB_TOKEN=ghp_xxx
    // Also try to read from window (for development mode)
    let token = process.env.REACT_APP_GITHUB_TOKEN;
    
    // In development mode, try to get token from window (injected by preload)
    if (!token && (window as any).__GITHUB_TOKEN__) {
      token = (window as any).__GITHUB_TOKEN__;
    }
    
    this.GITHUB_TOKEN = token || null;
    
    // Debug logging (remove in production if needed)
    if (this.GITHUB_TOKEN) {
      console.log('[UpdateService] GitHub token loaded, using authenticated API (5,000 req/hour)');
    } else {
      console.warn('[UpdateService] No GitHub token found, using unauthenticated API (60 req/hour limit)');
    }
  }

  // Get current app version from package.json
  private getCurrentVersion(): string {
    // Prefer injected build-time version from package.json via REACT_APP_VERSION
    const v = (process.env.REACT_APP_VERSION as string) || '0.0.0';
    return v;
  }

  // Compare semantic versions (e.g., "1.2.0" vs "1.1.5")
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    // Pad shorter version with zeros
    const maxLength = Math.max(v1Parts.length, v2Parts.length);
    while (v1Parts.length < maxLength) v1Parts.push(0);
    while (v2Parts.length < maxLength) v2Parts.push(0);
    
    for (let i = 0; i < maxLength; i++) {
      if (v1Parts[i] > v2Parts[i]) return 1;
      if (v1Parts[i] < v2Parts[i]) return -1;
    }
    return 0;
  }

  // Check if release has APK asset
  private hasApkAsset(release: GitHubRelease): boolean {
    return release.assets.some(a => 
      (a.name && a.name.toLowerCase().endsWith('.apk')) || 
      (a.label && a.label.toLowerCase().endsWith('.apk'))
    );
  }

  // Check if release has EXE asset
  private hasExeAsset(release: GitHubRelease): boolean {
    return release.assets.some(a => 
      (a.name && a.name.toLowerCase().endsWith('.exe') && a.name.toLowerCase().includes('setup')) ||
      (a.name && a.name.toLowerCase().includes('growmore') && a.name.toLowerCase().endsWith('.exe'))
    );
  }

  // Check for updates from GitHub releases - searches for appropriate asset type
  async checkForUpdates(): Promise<{ updateAvailable: boolean; release?: GitHubRelease; error?: string }> {
    try {
      const isDesktop = this.isElectron();
      const isCapacitor = !!(window as any).Capacitor;
      const currentVersion = this.getCurrentVersion();
      const currentVersionClean = currentVersion.replace(/^v/, '');
      
      // Determine what asset type we're looking for
      const lookingForApk = isCapacitor && !isDesktop; // Mobile
      const lookingForExe = isDesktop; // Desktop
      
      // Add cache-busting to force fresh data
      const cacheBuster = `?t=${Date.now()}`;
      
      // Prepare headers - add authorization if token is available
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json'
      };
      
      // Add GitHub token if available (for authenticated requests with higher rate limit)
      if (this.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${this.GITHUB_TOKEN}`;
      }
      
      // Fetch all releases (not just latest) to find the most recent one with appropriate asset
      const response = await fetch(`https://api.github.com/repos/${this.GITHUB_REPO}/releases${cacheBuster}`, {
        headers: headers
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return { 
            updateAvailable: false, 
            error: 'No releases found in repository. Please create a release on GitHub.' 
          };
        }
        
        // Handle rate limiting and access errors
        if (response.status === 403) {
          const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
          const rateLimitReset = response.headers.get('x-ratelimit-reset');
          
          let errorMessage = 'GitHub API rate limit exceeded. Please try again later.';
          
          // Check if it's a rate limit issue
          if (rateLimitRemaining === '0' || parseInt(rateLimitRemaining || '1') === 0) {
            if (rateLimitReset) {
              const resetTime = new Date(parseInt(rateLimitReset) * 1000);
              const minutesUntilReset = Math.ceil((resetTime.getTime() - Date.now()) / 60000);
              if (minutesUntilReset > 0) {
                errorMessage = `GitHub API rate limit exceeded. The rate limit will reset in approximately ${minutesUntilReset} minute(s). Please try again after that time.`;
              } else {
                errorMessage = 'GitHub API rate limit exceeded. Please try again in a few minutes.';
              }
            } else {
              errorMessage = 'GitHub API rate limit exceeded. Please try again in a few minutes.';
            }
          } else {
            // Not a rate limit issue - likely access denied
            errorMessage = 'GitHub API access denied. The repository may be private, or there may be network restrictions. Please check your internet connection and try again later.';
          }
          
          return { 
            updateAvailable: false, 
            error: errorMessage
          };
        }
        
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const releases: GitHubRelease[] = await response.json();
      
      if (!releases || releases.length === 0) {
        return { 
          updateAvailable: false, 
          error: 'No releases found in repository.' 
        };
      }

      // Sort releases by version (newest first)
      releases.sort((a, b) => {
        const versionA = a.tag_name.replace(/^v/, '');
        const versionB = b.tag_name.replace(/^v/, '');
        return -this.compareVersions(versionA, versionB); // Negative for descending order
      });

      // Find the first release with the appropriate asset type that's newer than current version
      for (const release of releases) {
        const releaseVersion = release.tag_name.replace(/^v/, '');
        
        // Check if this release has the asset we need
        const hasRequiredAsset = lookingForApk ? this.hasApkAsset(release) : 
                                  lookingForExe ? this.hasExeAsset(release) : false;
        
        if (!hasRequiredAsset) {
          // This release doesn't have the required asset, skip it
          continue;
        }
        
        // Compare versions - only return update if release version is newer than current
        const versionComparison = this.compareVersions(releaseVersion, currentVersionClean);
        
        if (versionComparison > 0) {
          // Found a newer version with the required asset
          return { updateAvailable: true, release };
        } else if (versionComparison === 0) {
          // Same version - up to date
          return { updateAvailable: false, release };
        }
        // If versionComparison < 0, this release is older, continue searching
      }
      
      // No newer version found with the required asset
      return { updateAvailable: false };
    } catch (error: any) {
      console.error('Update check failed:', error);
      return { 
        updateAvailable: false,
        error: error.message || 'Failed to check for updates. Please verify the repository exists and is accessible.'
      };
    }
  }

  // Check if running in Electron/Desktop
  private isElectron(): boolean {
    return !!(window as any).electronAPI || !!(window as any).require || navigator.userAgent.includes('Electron');
  }

  // Download update: Handles both mobile (APK) and desktop (Installer) updates
  async downloadUpdate(
    release: GitHubRelease,
    progressCb?: (progress: number) => void
  ): Promise<{ filePath?: string; fileName?: string }> {
    const isDesktop = this.isElectron();
    const platform = Capacitor.getPlatform();
    
    console.log('[Update] Detected platform:', platform, 'isDesktop:', isDesktop);

    if (isDesktop && window.electronAPI) {
      // Desktop/Electron: Look for installer (.exe)
      const installerAsset = release.assets.find(a => 
        (a.name && a.name.toLowerCase().endsWith('.exe') && a.name.toLowerCase().includes('setup')) ||
        (a.name && a.name.toLowerCase().includes('growmore') && a.name.toLowerCase().endsWith('.exe'))
      );
      
      if (!installerAsset) {
        console.error('No installer .exe found in the latest release.');
        alert('No installer found in the latest release. Please upload a valid installer.');
        throw new Error('No installer found in the latest release.');
      }

      console.log('[Update] Found installer:', installerAsset.name);
      
      // Use Electron's download API with progress tracking
      // Note: Save dialog is shown BEFORE download in electron.js handler
      try {
        // Start download (save dialog will be shown first by electron.js)
        const result = await window.electronAPI.downloadFile(
          installerAsset.browser_download_url,
          installerAsset.name
        );
        // Progress is handled via the onDownloadProgress listener in UpdateNotification
        return result;
      } catch (error: any) {
        console.error('[Update] Download failed:', error);
        throw new Error(`Download failed: ${error.message}`);
      }
    }
    
    // Fallback for desktop without Electron API or mobile
    if (isDesktop) {
      // Desktop but no Electron API - fallback to browser download
      const installerAsset = release.assets.find(a => 
        (a.name && a.name.toLowerCase().endsWith('.exe') && a.name.toLowerCase().includes('setup')) ||
        (a.name && a.name.toLowerCase().includes('growmore') && a.name.toLowerCase().endsWith('.exe'))
      );
      
      if (installerAsset) {
        window.open(installerAsset.browser_download_url, '_blank');
        alert(`Download started!\n\nOnce the download completes:\n1. Run the installer\n2. It will automatically replace the current version\n3. Launch Grow More again to use the updated version.`);
        return {};
      }
    }

    // Mobile: Look for APK
    const apkAsset = release.assets.find(a => 
      (a.name && a.name.toLowerCase().endsWith('.apk')) || 
      (a.label && a.label.toLowerCase().endsWith('.apk'))
    );
    
    if (!apkAsset) {
      console.error('No APK asset found in the latest release.');
      alert('No APK asset found in the latest release. Please upload a valid APK.');
      throw new Error('No APK asset found in the latest release.');
    }

    if (platform === 'android') {
      // Open in the external/default browser; this avoids APK download stuck issues on GitHub
      window.open(apkAsset.browser_download_url, '_blank');
      return {};
    }
    
    if (platform === 'ios') {
      try {
        await Browser.open({ url: apkAsset.browser_download_url });
      } catch (err: any) {
        alert('Could not open download link. Please try manually in your browser. ' + (err?.message || err));
      }
      return {};
    }
    
    console.log('[Update] Not Android/iOS, opening APK in browser tab.');
    window.open(apkAsset.browser_download_url, '_blank');
    return {};
  }

  // Show install prompt
  private async showInstallPrompt(release: GitHubRelease): Promise<void> {
    const releaseNotes = release.body || getReleaseNotes();
    const shouldInstall = confirm(
      `Update ${release.tag_name} downloaded!\n\nRelease Notes:\n${releaseNotes}\n\nRestart app to install?`
    );
    
    if (shouldInstall) {
      await reload();
    }
  }

  // Get release notes for display
  getReleaseNotes(release: GitHubRelease): string {
    // Always use GitHub release body as the source of truth
    // This ensures consistency across all platforms (mobile, desktop, web)
    const releaseBody = release.body?.trim() || '';
    
    // If release body is empty, fallback to default notes
    if (!releaseBody) {
      return getReleaseNotes();
    }
    
    // Return the GitHub release body (preserves formatting and line breaks)
    return releaseBody;
  }

  // Get release version
  getReleaseVersion(release: GitHubRelease): string {
    return release.tag_name;
  }
}
