import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.school.management',
  appName: 'Grow More',
  webDir: 'build',
  server: {
    androidScheme: 'https',
    // Live reload configuration for development
    url: 'http://192.168.144.208:3000', // Your actual IP address
    cleartext: true
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
    }
  },
  plugins: {
    LiveUpdates: {
      appId: 'com.school.management',
      channel: 'production',
      autoUpdate: false, // Let user decide when to update
      bundlePath: 'bundles/latest.zip',
      updateUrl: 'https://api.github.com/repos/Deartaj92/DearTaj/releases/latest'
    }
  }
};

export default config;
