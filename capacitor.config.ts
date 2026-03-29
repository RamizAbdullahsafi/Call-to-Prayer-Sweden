import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "se.calltoprayer.sweden",
  appName: "Prayer Sweden",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
  },
  plugins: {
    LocalNotifications: {
      sound: "adhan_notify.wav",
      iconColor: "#2563EB",
    },
  },
};

export default config;
