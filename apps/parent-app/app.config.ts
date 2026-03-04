/**
 * Dynamic Expo Configuration
 *
 * Extends app.json with environment-specific values
 */

import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const isProduction = process.env.APP_ENV === 'production';
  const isStaging = process.env.APP_ENV === 'staging';

  // Determine app variant for different builds
  const appVariant = isProduction ? '' : isStaging ? ' (Staging)' : ' (Dev)';
  const bundleIdSuffix = isProduction ? '' : isStaging ? '.staging' : '.dev';

  return {
    ...config,
    name: `CommonGround${appVariant}`,
    slug: 'commonground-parent',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'commonground',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#2563eb',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: `com.commonground.parent${bundleIdSuffix}`,
      buildNumber: '1',
      infoPlist: {
        NSCameraUsageDescription: 'CommonGround needs camera access for video calls',
        NSMicrophoneUsageDescription: 'CommonGround needs microphone access for calls',
        NSPhotoLibraryUsageDescription: 'CommonGround needs photo access to share images',
        NSFaceIDUsageDescription: 'CommonGround uses Face ID for secure login',
        UIBackgroundModes: ['audio', 'voip', 'remote-notification'],
      },
      associatedDomains: [
        'applinks:app.commonground.co',
        'webcredentials:app.commonground.co',
      ],
      usesAppleSignIn: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#2563eb',
      },
      package: `com.commonground.parent${bundleIdSuffix.replace(/\./g, '')}`,
      versionCode: 1,
      permissions: [
        'CAMERA',
        'RECORD_AUDIO',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'VIBRATE',
        'RECEIVE_BOOT_COMPLETED',
        'USE_BIOMETRIC',
        'USE_FINGERPRINT',
      ],
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            { scheme: 'commonground' },
            {
              scheme: 'https',
              host: 'app.commonground.co',
              pathPrefix: '/',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './google-services.json',
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#2563eb',
          sounds: ['./assets/sounds/notification.wav'],
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'Allow CommonGround to access your camera for video calls',
        },
      ],
      [
        'expo-av',
        {
          microphonePermission: 'Allow CommonGround to access your microphone for calls',
        },
      ],
      [
        'expo-local-authentication',
        {
          faceIDPermission: 'Allow CommonGround to use Face ID for secure login',
        },
      ],
      'expo-apple-authentication',
      '@react-native-community/datetimepicker',
    ],
    experiments: {
      typedRoutes: true,
      tsconfigPaths: true,
    },
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || 'your-project-id',
      },
      // Environment-specific config
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      enableBiometric: process.env.EXPO_PUBLIC_ENABLE_BIOMETRIC === 'true',
      enableOAuth: process.env.EXPO_PUBLIC_ENABLE_OAUTH === 'true',
      enableMFA: process.env.EXPO_PUBLIC_ENABLE_MFA === 'true',
    },
    updates: {
      url: `https://u.expo.dev/${process.env.EXPO_PUBLIC_EAS_PROJECT_ID || 'your-project-id'}`,
      enabled: isProduction || isStaging,
      fallbackToCacheTimeout: 0,
    },
    runtimeVersion: {
      policy: 'sdkVersion',
    },
    owner: 'commonground',
  };
};
