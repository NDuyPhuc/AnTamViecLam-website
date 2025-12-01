import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.antamvieclam.app',
  appName: 'An Tâm Việc Làm',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  // Cấu hình plugin nếu cần sau này (VD: Push Notification, Camera)
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;