# CommonGround Mobile Apps

This directory contains the three CommonGround mobile applications built with Expo and React Native.

## Apps Overview

| App | Description | Bundle ID |
|-----|-------------|-----------|
| **parent-app** | Full co-parenting app for parents | `com.commonground.parent` |
| **kidscom-app** | Child-friendly app for kids | `com.commonground.kidscom` |
| **circle-app** | App for extended family (grandparents, etc.) | `com.commonground.circle` |

## Prerequisites

1. **Node.js 20+** and **pnpm**
2. **Expo CLI**: `npm install -g expo-cli`
3. **EAS CLI**: `npm install -g eas-cli`
4. **Xcode** (for iOS builds)
5. **Android Studio** (for Android builds)

## Development Setup

```bash
# Install dependencies from monorepo root
cd /path/to/CommonGround
pnpm install

# Start development server for an app
cd apps/parent-app
pnpm dev
```

## Building for App Stores

### 1. Configure EAS

```bash
# Login to Expo
eas login

# Configure each app (run in each app directory)
eas build:configure
```

### 2. Set Up Credentials

#### iOS (App Store Connect)
1. Create an App Store Connect account
2. Create app entries for each app
3. Update `eas.json` with your Apple Team ID and App IDs
4. Run `eas credentials` to set up signing

#### Android (Google Play)
1. Create a Google Play Developer account
2. Create app entries for each app
3. Generate a service account key JSON
4. Place key at `apps/[app-name]/google-services-key.json`
5. Run `eas credentials` to set up signing

### 3. Build Commands

```bash
# Development builds (internal testing)
eas build --profile development --platform all

# Preview builds (TestFlight/Internal testing)
eas build --profile preview --platform all

# Production builds (App Store/Play Store)
eas build --profile production --platform all
```

### 4. Submit to Stores

```bash
# Submit to App Store
eas submit --platform ios --latest

# Submit to Play Store
eas submit --platform android --latest
```

## Store Metadata

Each app has a `store/metadata.json` file containing:
- App name and description
- Keywords for search optimization
- Category and content rating
- Screenshots requirements
- What's new text

## App-Specific Notes

### Parent App
- Full featured co-parenting suite
- Recording capabilities for calls
- Schedule and expense management
- Primary account holder app

### Kidscom App
- PIN-based authentication (no email/password)
- Large, child-friendly UI elements
- Parent-controlled settings
- COPPA compliant

### Circle App
- Invitation code-based signup
- Simplified interface for grandparents
- Cannot record calls
- Limited to approved contacts only

## Environment Variables

Each app uses these environment variables (set in `eas.json`):

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Backend API URL |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |

## Shared Packages

The apps use these shared packages from `/packages`:

- `@commonground/api-client` - API communication
- `@commonground/daily-video` - Video calling with Daily.co
- `@commonground/notifications` - Push notifications
- `@commonground/types` - Shared TypeScript types
- `@commonground/utils` - Utility functions

## Troubleshooting

### Build Fails
1. Clear cache: `expo start -c`
2. Reinstall deps: `rm -rf node_modules && pnpm install`
3. Check EAS logs: `eas build:list`

### Signing Issues
1. Run `eas credentials` to verify setup
2. Check Apple Developer/Google Play Console
3. Ensure certificates are not expired

### Metro Bundler Issues
1. Clear Metro cache: `npx expo start --clear`
2. Reset watchman: `watchman watch-del-all`
