import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'soozip-toss',
  brand: {
    displayName: '수근수근',
    primaryColor: '#2563EB',
    icon: 'https://raw.githubusercontent.com/yijun-wade/soozip-toss/main/public/icon.png',
  },
  web: {
    host: 'localhost',
    port: 5174,
    commands: {
      dev: 'vite --host',
      build: 'vite build',
    },
  },
  permissions: [],
  outdir: 'dist',
});
