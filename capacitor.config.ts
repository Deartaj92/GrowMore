import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.growmore.app',
  appName: 'Grow More',
  webDir: 'build',
  server: {
    androidScheme: 'https',
    // Live reload configuration for development
    // Uncomment and set your IP address when you want live reload:
    // url: 'http://192.168.144.92:3000',
    // cleartext: true
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
      autoUpdateMethod: 'none', // Let user decide when to update
      strategy: 'zip'
    }
  }
};

export default config;
