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

  static getInstance(): UpdateService {
    if (!UpdateService.instance) {
      UpdateService.instance = new UpdateService();
    }
    return UpdateService.instance;
  }

  async checkForUpdates(): Promise<{ updateAvailable: boolean; release?: GitHubRelease; error?: string }> {
    // Web version auto-update check is disabled. Updates are distributed via server deploys.
    return { updateAvailable: false };
  }

  async downloadUpdate(
    release: GitHubRelease,
    progressCb?: (progress: number) => void
  ): Promise<{ filePath?: string; fileName?: string }> {
    return {};
  }

  getReleaseNotes(release: GitHubRelease): string {
    return release.body || getReleaseNotes();
  }

  getReleaseVersion(release: GitHubRelease): string {
    return release.tag_name;
  }
}
