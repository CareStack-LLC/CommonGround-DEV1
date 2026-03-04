# CommonGround Mobile Apps - Publishing Guide

A comprehensive guide to getting the CommonGround mobile apps running locally and published to the Apple App Store and Google Play Store.

---

## Table of Contents

1. [Accounts Required](#1-accounts-required)
2. [Getting Apps Running Locally](#2-getting-apps-running-locally)
3. [Apple Developer Setup (iOS)](#3-apple-developer-setup-ios)
4. [Google Play Setup (Android)](#4-google-play-setup-android)
5. [Expo EAS Setup](#5-expo-eas-setup)
6. [Building the Apps](#6-building-the-apps)
7. [Submitting to Stores](#7-submitting-to-stores)
8. [Store Requirements Checklist](#8-store-requirements-checklist)
9. [Special Considerations for Kids App](#9-special-considerations-for-kids-app)
10. [Privacy & Compliance](#10-privacy--compliance)
11. [Timeline Estimate](#11-timeline-estimate)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Accounts Required

You will need the following accounts to publish the apps:

| Account | Cost | Purpose | Sign Up URL |
|---------|------|---------|-------------|
| **Apple Developer Program** | $99/year | Publish to iOS App Store | https://developer.apple.com/programs/ |
| **Google Play Developer** | $25 one-time | Publish to Google Play Store | https://play.google.com/console |
| **Expo Account** | Free (paid plans available) | EAS Build service | https://expo.dev/signup |

### Account Setup Order

1. **Expo Account** - Set up first, instant access
2. **Apple Developer** - Takes 24-48 hours for approval
3. **Google Play** - Takes 24-48 hours for identity verification

---

## 2. Getting Apps Running Locally

### Prerequisites

Ensure you have the following installed:

- **Node.js 20+**: https://nodejs.org/
- **pnpm**: `npm install -g pnpm`
- **Expo CLI**: `npm install -g expo-cli`
- **EAS CLI**: `npm install -g eas-cli`
- **Xcode** (macOS only, for iOS development)
- **Android Studio** (for Android development)

### Install Dependencies

```bash
# Navigate to the monorepo root
cd /path/to/CommonGround

# Install all dependencies
pnpm install
```

### Run Each App

#### Parent App (CommonGround)
```bash
cd apps/parent-app
pnpm dev
```

#### Kidscom App
```bash
cd apps/kidscom-app
pnpm dev
```

#### Circle App (My Circle)
```bash
cd apps/circle-app
pnpm dev
```

### Running on Devices

Once the development server starts:

| Key | Action |
|-----|--------|
| `i` | Open in iOS Simulator |
| `a` | Open in Android Emulator |
| `w` | Open in web browser |
| Scan QR | Open in Expo Go app on physical device |

### Testing on Physical Devices

1. Install **Expo Go** from App Store or Play Store
2. Scan the QR code shown in terminal
3. App will load on your device

> **Note**: Some features like push notifications and video calling require a development build, not Expo Go.

---

## 3. Apple Developer Setup (iOS)

### Step 1: Enroll in Apple Developer Program

1. Go to https://developer.apple.com/programs/
2. Click "Enroll"
3. Sign in with your Apple ID (or create one)
4. Choose enrollment type:
   - **Individual**: For personal use ($99/year)
   - **Organization**: For companies (requires D-U-N-S number, $99/year)
5. Complete payment
6. Wait 24-48 hours for approval

### Step 2: Create App IDs

Once enrolled:

1. Go to https://developer.apple.com/account/
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → **+** button
4. Select **App IDs** → **App**
5. Create three App IDs:

| App | Bundle ID | Description |
|-----|-----------|-------------|
| Parent App | `com.commonground.parent` | CommonGround Parent App |
| Kidscom App | `com.commonground.kidscom` | Kidscom by CommonGround |
| Circle App | `com.commonground.circle` | My Circle by CommonGround |

6. Enable these capabilities for each:
   - Push Notifications
   - Background Modes (for VoIP)

### Step 3: Create Apps in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Click **My Apps** → **+** → **New App**
3. For each app, fill in:
   - **Platform**: iOS
   - **Name**: (from store/metadata.json)
   - **Primary Language**: English
   - **Bundle ID**: Select the one you created
   - **SKU**: Unique identifier (e.g., `commonground-parent-001`)
   - **User Access**: Full Access

4. Note the **Apple ID** shown for each app (a numeric ID like `1234567890`)

### Step 4: Get Your Team ID

1. Go to https://developer.apple.com/account/
2. Click **Membership** in the sidebar
3. Note your **Team ID** (10-character string like `ABCD1234EF`)

### Step 5: Update EAS Configuration

Update `eas.json` in each app with your credentials:

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCD1234EF"
      }
    }
  }
}
```

---

## 4. Google Play Setup (Android)

### Step 1: Create Developer Account

1. Go to https://play.google.com/console
2. Sign in with your Google account
3. Pay the $25 one-time registration fee
4. Accept the Developer Distribution Agreement
5. Complete identity verification:
   - Personal account: Government ID verification
   - Organization: Business documentation required
6. Wait 24-48 hours for verification

### Step 2: Create App Listings

For each of the three apps:

1. Click **Create app**
2. Fill in:
   - **App name**: From `store/metadata.json`
   - **Default language**: English
   - **App or game**: App
   - **Free or paid**: Free (or Paid)
3. Accept declarations
4. Click **Create app**

### Step 3: Complete Store Listing

In each app's dashboard, complete:

1. **Main store listing**
   - Short description (80 characters)
   - Full description (4000 characters)
   - App icon (512x512 PNG)
   - Feature graphic (1024x500 PNG)
   - Screenshots (minimum 2, recommended 8)

2. **Content rating**
   - Complete the questionnaire
   - Get your rating certificate

3. **Target audience**
   - Select age groups
   - For Kidscom: Select children under 13

4. **Data safety**
   - Declare what data your app collects
   - Explain data handling practices

### Step 4: Create Service Account for Automated Uploads

This allows EAS to automatically upload builds to Play Store.

#### A. Create Google Cloud Project

1. Go to https://console.cloud.google.com
2. Create a new project (e.g., "CommonGround Apps")
3. Note the Project ID

#### B. Enable Google Play Developer API

1. In Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Google Play Android Developer API"
3. Click **Enable**

#### C. Create Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Name it (e.g., "eas-submit")
4. Click **Create and Continue**
5. Skip role assignment, click **Done**
6. Click on the created service account
7. Go to **Keys** tab → **Add Key** → **Create new key**
8. Select **JSON** and download the file

#### D. Link to Play Console

1. Go to https://play.google.com/console
2. Go to **Settings** → **API access**
3. Click **Link** next to your Cloud project
4. Find your service account and click **Manage Play Console permissions**
5. Grant these permissions:
   - **Release apps to testing tracks**
   - **Release to production**
   - **Manage app content**

### Step 5: Add Service Account Key to Apps

```bash
# Copy the downloaded JSON key to each app
cp ~/Downloads/your-service-account-key.json apps/parent-app/google-services-key.json
cp ~/Downloads/your-service-account-key.json apps/kidscom-app/google-services-key.json
cp ~/Downloads/your-service-account-key.json apps/circle-app/google-services-key.json
```

> **Important**: Add `google-services-key.json` to `.gitignore` to avoid committing secrets!

---

## 5. Expo EAS Setup

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
eas login
```

Enter your Expo account credentials.

### Step 3: Configure Each App

Run in each app directory:

```bash
# Parent App
cd apps/parent-app
eas build:configure

# Kidscom App
cd ../kidscom-app
eas build:configure

# Circle App
cd ../circle-app
eas build:configure
```

This will:
- Create/update `eas.json` if needed
- Link the app to your Expo account
- Set up project ID

### Step 4: Set Up Credentials

EAS can manage your signing credentials automatically:

```bash
# For iOS credentials
eas credentials --platform ios

# For Android credentials
eas credentials --platform android
```

Options:
- **Let EAS manage**: Recommended for most users
- **Provide your own**: If you have existing certificates/keystores

---

## 6. Building the Apps

### Build Profiles

Each app has three build profiles configured in `eas.json`:

| Profile | Purpose | Distribution |
|---------|---------|--------------|
| `development` | Local testing with dev client | Internal |
| `preview` | Beta testing (TestFlight/Internal) | Internal |
| `production` | App Store/Play Store release | Store |

### Development Build

For testing with development features:

```bash
cd apps/parent-app
eas build --profile development --platform all
```

### Preview Build

For beta testers:

```bash
cd apps/parent-app
eas build --profile preview --platform all
```

### Production Build

For store submission:

```bash
cd apps/parent-app
eas build --profile production --platform all
```

### Build All Apps Script

```bash
#!/bin/bash
# build-all.sh

APPS=("parent-app" "kidscom-app" "circle-app")
PROFILE=${1:-production}  # Default to production

for app in "${APPS[@]}"; do
  echo "Building $app..."
  cd /path/to/CommonGround/apps/$app
  eas build --profile $PROFILE --platform all --non-interactive
done
```

### Monitor Build Status

```bash
# View recent builds
eas build:list

# View specific build details
eas build:view [BUILD_ID]
```

---

## 7. Submitting to Stores

### Submit to App Store (iOS)

```bash
cd apps/parent-app

# Submit the latest build
eas submit --platform ios --latest

# Or submit a specific build
eas submit --platform ios --id [BUILD_ID]
```

You'll be prompted for:
- Apple ID credentials
- App-specific password (generate at appleid.apple.com)

### Submit to Play Store (Android)

```bash
cd apps/parent-app

# Submit the latest build
eas submit --platform android --latest

# Or submit a specific build
eas submit --platform android --id [BUILD_ID]
```

### Submit All Apps Script

```bash
#!/bin/bash
# submit-all.sh

APPS=("parent-app" "kidscom-app" "circle-app")

for app in "${APPS[@]}"; do
  echo "Submitting $app..."
  cd /path/to/CommonGround/apps/$app
  eas submit --platform ios --latest
  eas submit --platform android --latest
done
```

### After Submission

#### App Store
1. Go to App Store Connect
2. Select your app
3. Complete the "App Review Information" section
4. Add test account credentials if needed
5. Click "Submit for Review"

#### Play Store
1. Go to Play Console
2. Select your app
3. Go to **Release** → **Production** (or testing track)
4. Review the release
5. Click **Start rollout**

---

## 8. Store Requirements Checklist

### iOS App Store Requirements

#### App Icons
- [ ] 1024x1024 PNG (App Store icon)
- [ ] No alpha/transparency
- [ ] No rounded corners (added automatically)

#### Screenshots
Required sizes:
- [ ] 6.7" iPhone (1290 x 2796 pixels) - iPhone 15 Pro Max
- [ ] 6.5" iPhone (1284 x 2778 pixels) - iPhone 14 Plus
- [ ] 5.5" iPhone (1242 x 2208 pixels) - iPhone 8 Plus

Optional but recommended:
- [ ] 12.9" iPad Pro (2048 x 2732 pixels)

Minimum 2 screenshots, maximum 10 per size.

#### App Information
- [ ] App name (30 characters max)
- [ ] Subtitle (30 characters max)
- [ ] Description (4000 characters max)
- [ ] Keywords (100 characters max, comma-separated)
- [ ] Support URL
- [ ] Marketing URL (optional)
- [ ] Privacy Policy URL (required)

#### Other Requirements
- [ ] Age rating (complete questionnaire)
- [ ] Copyright information
- [ ] Contact information
- [ ] Demo account (if app requires login)

### Google Play Store Requirements

#### Graphics
- [ ] App icon: 512x512 PNG
- [ ] Feature graphic: 1024x500 PNG or JPG
- [ ] Screenshots:
  - Phone: 16:9 or 9:16, min 320px, max 3840px
  - 7" tablet: Same as phone
  - 10" tablet: Same as phone

Minimum 2 screenshots, maximum 8 per device type.

#### Store Listing
- [ ] App name (50 characters max)
- [ ] Short description (80 characters max)
- [ ] Full description (4000 characters max)

#### Policy Compliance
- [ ] Content rating (complete questionnaire)
- [ ] Target audience and content
- [ ] Data safety section
- [ ] Ads declaration
- [ ] Privacy policy URL

---

## 9. Special Considerations for Kids App

The Kidscom app is designed for children and has additional requirements.

### Apple App Store - Kids Category

1. **Age Band Declaration**
   - Select "Made for Kids" category
   - Choose age band: 5-8 or 9-11

2. **Restrictions**
   - No third-party analytics (only Apple's)
   - No third-party advertising
   - No links to external websites without parental gate
   - No social features that expose children to strangers
   - No in-app purchases without parental consent

3. **Parental Gate**
   - Required for any external links
   - Must be age-appropriate challenge

### Google Play - Designed for Families

1. **Enroll in Program**
   - Go to Play Console → Policy → App content
   - Complete "Designed for Families" section
   - Agree to family program requirements

2. **Requirements**
   - COPPA compliance
   - No behavioral advertising
   - No deceptive content
   - Age-appropriate content only
   - Clear privacy policy

3. **Teacher Approved** (Optional)
   - Additional review by educators
   - Gets "Teacher Approved" badge

### Implementation Notes

The Kidscom app already implements:
- PIN-based login (no email collection from children)
- Parent-controlled settings only
- No direct external links
- No social features with strangers
- Age-appropriate UI

---

## 10. Privacy & Compliance

### Required Legal Documents

#### Privacy Policy
- Must be publicly accessible (hosted URL)
- Must describe:
  - What data is collected
  - How data is used
  - How data is shared
  - How data is protected
  - User rights (deletion, access)
  - Contact information

Host at: `https://commonground.app/privacy`

#### Terms of Service
- Recommended for all apps
- Required if you have in-app purchases
- Should cover:
  - Usage rules
  - User responsibilities
  - Limitation of liability
  - Dispute resolution

Host at: `https://commonground.app/terms`

### Compliance Requirements

#### COPPA (Children's Online Privacy Protection Act)
Required for Kidscom app:
- [ ] Parental consent before collecting data from children under 13
- [ ] Limit data collection to what's necessary
- [ ] Secure storage of children's data
- [ ] Allow parents to review/delete data
- [ ] No behavioral advertising to children

#### GDPR (General Data Protection Regulation)
If serving EU users:
- [ ] Clear consent for data collection
- [ ] Right to access data
- [ ] Right to delete data
- [ ] Right to data portability
- [ ] Data breach notification

#### CCPA (California Consumer Privacy Act)
If serving California users:
- [ ] Disclose data collection practices
- [ ] Right to know what data is collected
- [ ] Right to delete data
- [ ] Right to opt-out of data sales

---

## 11. Timeline Estimate

### Initial Setup (One-time)

| Task | Estimated Time |
|------|----------------|
| Create Expo account | 5 minutes |
| Enroll in Apple Developer Program | 30 minutes + 24-48 hours approval |
| Create Google Play Developer account | 30 minutes + 24-48 hours verification |
| Set up App IDs and store listings | 2-3 hours |
| Create app icons and screenshots | 4-8 hours |
| Write descriptions and metadata | 2-3 hours |
| **Total setup time** | **~2-3 days** |

### Build & Submit (Per Release)

| Task | Estimated Time |
|------|----------------|
| EAS build (all platforms) | 20-40 minutes |
| Submit to stores | 10 minutes |
| App Store review | 24-48 hours |
| Play Store review | 1-7 days |
| **Total per release** | **1-7 days** |

### Typical Timeline to First Publish

| Day | Milestone |
|-----|-----------|
| Day 1 | Create accounts, start verification |
| Day 2-3 | Accounts approved, set up store listings |
| Day 3-4 | Create assets (icons, screenshots) |
| Day 4 | First production build |
| Day 5 | Submit to stores |
| Day 6-7 | App Store approval |
| Day 7-14 | Play Store approval |

---

## 12. Troubleshooting

### Common Issues

#### Build Fails

```bash
# Clear Expo cache
expo start -c

# Clear node_modules and reinstall
rm -rf node_modules
pnpm install

# Clear EAS cache
eas build --clear-cache --profile production --platform all
```

#### iOS Signing Issues

```bash
# Reset iOS credentials
eas credentials --platform ios

# Choose "Remove current credentials" and set up fresh
```

#### Android Signing Issues

```bash
# Reset Android credentials
eas credentials --platform android

# Check keystore
eas credentials --platform android
# Select "View credentials"
```

#### Submission Rejected

**App Store Common Rejections:**
- Missing privacy policy
- Crashes during review
- Broken links or features
- Guideline violations

**Play Store Common Rejections:**
- Policy violations
- Metadata issues
- Missing data safety information
- Insufficient permissions explanation

### Getting Help

- **Expo Forums**: https://forums.expo.dev
- **Expo Discord**: https://chat.expo.dev
- **Apple Developer Forums**: https://developer.apple.com/forums/
- **Google Play Help**: https://support.google.com/googleplay/android-developer/

---

## Quick Reference Commands

```bash
# === Development ===
pnpm dev                    # Start dev server
eas build:configure         # Configure EAS

# === Building ===
eas build --profile development --platform all    # Dev build
eas build --profile preview --platform all        # Beta build
eas build --profile production --platform all     # Store build

# === Submitting ===
eas submit --platform ios --latest      # Submit to App Store
eas submit --platform android --latest  # Submit to Play Store

# === Credentials ===
eas credentials --platform ios          # Manage iOS certs
eas credentials --platform android      # Manage Android keystore

# === Monitoring ===
eas build:list              # View recent builds
eas build:view [BUILD_ID]   # View build details
```

---

## Next Steps

1. [ ] Create accounts (Apple Developer, Google Play, Expo)
2. [ ] Wait for account approvals
3. [ ] Create app icons and screenshots
4. [ ] Set up store listings
5. [ ] Configure credentials with EAS
6. [ ] Create first production build
7. [ ] Submit to stores
8. [ ] Monitor review status
9. [ ] Celebrate your launch! 🎉

---

*Last updated: January 2025*
