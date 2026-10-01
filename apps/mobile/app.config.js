const { resolveSettings } = require("./config.cjs");
const en = require("../../messages/en.json");

const { locales } = require("../../src/i18n/locales.ts");

function permissionStrings(messages) {
  return {
    NSCameraUsageDescription: messages.native.cameraPermission,
    NSPhotoLibraryUsageDescription: messages.native.photoPermission,
    NSLocationWhenInUseUsageDescription: messages.native.locationBody,
  };
}

module.exports = function buildConfig() {
  const settings = resolveSettings(process.env);
  return {
    name: en.brand.name,
    slug: "luma-green",
    icon: "../../public/brand/app-icon.png",
    version: "0.1.0",
    scheme: "lumagreen",
    platforms: ["ios", "android"],
    locales: Object.fromEntries(
      locales.map((locale) => [
        locale,
        { ios: permissionStrings(require(`../../messages/${locale}.json`)) },
      ]),
    ),
    userInterfaceStyle: "light",
    runtimeVersion: { policy: "fingerprint" },
    ios: {
      bundleIdentifier: "green.luma.app",
      supportsTablet: true,
      infoPlist: {
        ...permissionStrings(en),
        ...(settings.allowLocalHttp && {
          NSAppTransportSecurity: {
            NSAllowsLocalNetworking: true,
            NSAllowsArbitraryLoadsInWebContent: true,
          },
        }),
      },
    },
    android: {
      package: "green.luma.app",
      allowBackup: false,
      adaptiveIcon: {
        foregroundImage: "../../public/brand/app-icon-foreground.png",
        backgroundColor: "#ffffff",
      },
      permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"],
      blockedPermissions: [
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
      ],
    },
    plugins: [
      "./plugins/with-camera-capture.cjs",
      [
        "expo-localization",
        { supportedLocales: { ios: locales, android: locales } },
      ],
      [
        "expo-location",
        { locationWhenInUsePermission: en.native.locationBody },
      ],
    ],
    updates: settings.projectId
      ? {
          enabled: true,
          url: `https://u.expo.dev/${settings.projectId}`,
          checkAutomatically: "ON_LOAD",
          fallbackToCacheTimeout: 0,
          ...settings.signing,
        }
      : { enabled: false },
    extra: {
      appOrigin: settings.origin,
      allowLocalHttp: settings.allowLocalHttp,
      ...(settings.projectId && { eas: { projectId: settings.projectId } }),
    },
  };
};
