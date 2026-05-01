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
      smallIcon: "ic_stat_prayer_bell",
      iconColor: "#126645",
    },
    SplashScreen: {
      backgroundColor: "#e5efe9",
      launchShowDuration: 0,
      launchAutoHide: false,
      launchFadeOutDuration: 280,
      showSpinner: false,
    },
  },
};

export default config;
