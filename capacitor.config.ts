import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.cinis.app',
  appName: 'Cinis',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
