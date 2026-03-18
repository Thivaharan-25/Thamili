# Thamili Mobile App

A React Native mobile application for a fish and vegetables store, built with Expo.

## Features

- **Customer Features:**
  - Browse products (fresh fish & vegetables)
  - Country-specific pricing (Germany/Norway)
  - Shopping cart
  - Order placement with pre-order scheduling
  - Order history and tracking
  - Profile management

- **Admin Features:**
  - Dashboard with statistics
  - Product management
  - Order management
  - Pickup point management

## Tech Stack

- **Framework:** React Native with Expo (SDK 54)
- **Language:** TypeScript
- **State Management:** Zustand
- **Navigation:** React Navigation
- **UI Library:** React Native Paper
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Payments:** Stripe
- **Notifications:** Firebase Cloud Messaging (FCM)
- **WhatsApp:** Twilio API

## Prerequisites

- Node.js >= 20
- npm or yarn
- Expo Go app on your mobile device (iOS/Android)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Fill in your Supabase, Stripe, and Twilio credentials

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Run on your device:**
   - Scan the QR code with Expo Go (iOS) or Camera app (Android)
   - The app will load on your device

## Project Structure

```
ThamiliApp/
├── src/
│   ├── components/       # Reusable UI components
│   ├── screens/          # Screen components
│   │   ├── auth/        # Authentication screens
│   │   ├── customer/    # Customer screens
│   │   └── admin/       # Admin screens
│   ├── navigation/       # Navigation configuration
│   ├── services/         # API services (Supabase)
│   ├── store/           # Zustand stores
│   ├── types/           # TypeScript types
│   ├── constants/       # App constants
│   └── config/          # Configuration files
├── App.tsx              # Root component
├── index.ts            # Entry point
└── app.json            # Expo configuration
```

## Development

- **Start development server:** `npm start`
- **Run on Android:** `npm run android`
- **Run on iOS:** `npm run ios`
- **Run on Web:** `npm run web`

## Building for Production

For production builds, you'll need to use Expo Application Services (EAS):

1. Install EAS CLI: `npm install -g eas-cli`
2. Login: `eas login`
3. Configure: `eas build:configure`
4. Build: `eas build --platform android` or `eas build --platform ios`

## Notes

- This app is designed to work with Expo Go for development
- For native modules (Stripe, FCM), you'll need to create a development build using `expo-dev-client`
- Make sure your Supabase database is set up with the required tables and RLS policies

## License

Private
