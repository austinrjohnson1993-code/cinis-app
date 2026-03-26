import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.cinis.www',
  appName: 'Cinis',
  webDir: 'out',
  server: {
    url: 'https://cinis.app',
    cleartext: false
  },
  ios: {
    contentInset: 'always'
  }
};

export default config;
