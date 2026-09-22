import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alpercubukcu.ataimobil',
  appName: 'AT AI Mobil',
  webDir: 'www',
  server: {
    url: 'https://at-ai-mobil.vercel.app',
    cleartext: false,
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
