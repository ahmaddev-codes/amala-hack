# Amala Discovery Platform 🍽️

[image](./public/screenshot.png)

A modern web application for discovering authentic Amala restaurants across the globe. Features autonomous location discovery, AI-powered submissions, and real-time moderation.

## 🎯 Overview

The Amala Discovery Platform helps food enthusiasts find the best Amala spots worldwide through an interactive map interface, intelligent filtering, and community-driven submissions. The platform includes autonomous discovery capabilities that automatically find and validate new locations from various online sources.

## ✨ Key Features

- **Interactive Google Maps** - Browse locations with custom markers and info windows
- **Autonomous Discovery** - AI-powered system discovers new locations from web sources
- **Smart Filtering** - Filter by hours, price range, service type, and cuisine
- **AI-Powered Submissions** - Natural language location submission with Gemini AI
- **Real-time Moderation** - Admin panel for reviewing and approving submissions
- **Mobile Responsive** - Optimized for all devices with touch-friendly interface

## 🛠️ Tech Stack

**Frontend:**

- Next.js 15 with App Router
- TypeScript
- Tailwind CSS
- Radix UI Components

**Backend & Services:**

- **Firebase** (Database, Auth & Storage)
- Google Maps API
- Google Gemini AI
- Vercel (Deployment)

**Key Libraries:**

- @googlemaps/react-wrapper
- @google/generative-ai
- firebase (v10+)
- Lucide React (Icons)

## 🔥 Firebase Migration

### Why We Migrated from Supabase to Firebase

**Previous Issues with Supabase:**
- **SSR Authentication Problems**: Supabase's server-side rendering authentication was causing hydration mismatches and session inconsistencies
- **Complex Cookie Management**: Managing auth cookies across server and client components was error-prone
- **Image Upload Reliability**: Supabase Storage had intermittent upload failures and slow response times
- **Toast Notification Issues**: Authentication state changes weren't properly triggering UI updates

**Firebase Benefits:**
- **Client-Side Auth**: Firebase handles authentication entirely on the client side, eliminating SSR issues
- **Reliable File Storage**: Firebase Storage provides more consistent image upload performance
- **Better Real-time Updates**: Firestore's real-time capabilities improve user experience
- **Simplified Architecture**: No need for complex server-side auth middleware

**Migration Impact:**
- ✅ **Fixed**: Review system now works properly with image uploads
- ✅ **Fixed**: Toast notifications display correctly based on user actions
- ✅ **Fixed**: Authentication state is consistent across all components
- ✅ **Fixed**: No more placeholder images where real images should appear
- ✅ **Improved**: Better error handling and user feedback
- ✅ **Improved**: Faster image upload and processing

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase account
- Google Cloud account (Maps API)
- Google AI Studio account (Gemini API)

### Installation

1. **Clone and install**

   ```bash
   git clone <repository-url>
   cd amala-hack
   npm install
   ```

2. **Environment Setup**

   Create `.env.local` with the following variables:

   ```env
   # Firebase Configuration (Required)
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id_here

   # Firebase Admin SDK (Required for server-side operations)
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

   # Google Services (Required)
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   GOOGLE_GEMINI_API_KEY=your_gemini_api_key

   # Auth roles (comma-separated emails)
   ADMIN_EMAILS=you@domain.com,other@domain.com
   MODERATOR_EMAILS=moderator@domain.com
   SCOUT_EMAILS=

   # Feature flags
   FEATURE_DISCOVERY_ENABLED=true
   FEATURE_DISCOVERY_SOURCES=google_places,web_scraping

   # Development Settings
   NODE_ENV=development
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **Firebase Setup**

   1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   2. Enable Authentication, Firestore Database, and Storage
   3. Set up Firestore security rules:

   ```javascript
   // Firestore Security Rules
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Locations collection
       match /locations/{locationId} {
         allow read: if true;
         allow write: if request.auth != null;
       }
       
       // Reviews collection
       match /reviews/{reviewId} {
         allow read: if resource.data.status == 'approved';
         allow write: if request.auth != null;
       }
       
       // Analytics events
       match /analytics_events/{eventId} {
         allow read, write: if request.auth != null;
       }
       
       // Restaurant photos
       match /restaurant_photos/{photoId} {
         allow read: if resource.data.status == 'approved';
         allow write: if request.auth != null;
       }
       
       // Moderation logs (admin/mod only)
       match /moderation_logs/{logId} {
         allow read, write: if request.auth != null && 
           ('admin' in request.auth.token.roles || 'mod' in request.auth.token.roles);
       }
     }
   }
   ```

   4. Set up Firebase Storage security rules:

   ```javascript
   // Storage Security Rules
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /restaurant-photos/{allPaths=**} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

4. **Start Development**
   ```bash
   npm run dev
   ```

## 📋 Environment Variables

| Variable                                    | Required | Description                       |
| ------------------------------------------- | -------- | --------------------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`              | ✅       | Firebase Web API key              |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`          | ✅       | Firebase Auth domain              |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`           | ✅       | Firebase project ID               |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`       | ✅       | Firebase Storage bucket           |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`  | ✅       | Firebase messaging sender ID      |
| `NEXT_PUBLIC_FIREBASE_APP_ID`               | ✅       | Firebase app ID                   |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`       | ⏳       | Firebase Analytics measurement ID |
| `FIREBASE_PROJECT_ID`                       | ✅       | Firebase project ID (server-side) |
| `FIREBASE_CLIENT_EMAIL`                     | ✅       | Firebase Admin SDK client email   |
| `FIREBASE_PRIVATE_KEY`                      | ✅       | Firebase Admin SDK private key    |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`           | ✅       | Google Maps JavaScript API key    |
| `GOOGLE_GEMINI_API_KEY`                     | ✅       | Google Gemini AI API key          |
| `ADMIN_EMAILS`                              | ⏳       | Comma-separated admin emails      |
| `MODERATOR_EMAILS`                          | ⏳       | Comma-separated moderator emails  |
| `SCOUT_EMAILS`                              | ⏳       | Comma-separated scout emails      |
| `FEATURE_DISCOVERY_ENABLED`                 | ⏳       | Toggle autonomous discovery       |
| `FEATURE_DISCOVERY_SOURCES`                 | ⏳       | Comma-separated discovery sources |

### API Setup Instructions

**Firebase:**

1. Create project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Google OAuth), Firestore Database, and Storage
3. Get configuration from Project Settings → General → Your apps
4. Generate Admin SDK private key from Project Settings → Service accounts
5. Set up security rules as shown above

**Google Maps:**

1. Enable Maps JavaScript API in [Google Cloud Console](https://console.cloud.google.com)
2. Create API key and restrict to your domain
3. Enable Places API for enhanced features

**Google Gemini:**

1. Get API key from [Google AI Studio](https://aistudio.google.com)
2. Enable Gemini Pro model access

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ��─────────────────┐
│   Next.js App   │    │   Firebase       │    │  Google APIs    │
│                 │    │                  │    │                 │
│ • Map Interface │◄──►│ • Firestore DB   │    │ • Maps API      │
│ • AI Chat       │    │ • Authentication │◄──►│ • Gemini AI     │
│ • Admin Panel   │    │ • Storage        │    │ • Places API    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                    ┌─────────────────────────┐
                    │  Autonomous Discovery   │
                    │                         │
                    │ • Web Scraping         │
                    │ • API Integration      │
                    │ • AI Validation        │
                    └─────────────────────────┘
```

### Core Components

- **MapContainer** - Google Maps integration with custom markers
- **AutonomousDiscovery** - Background service for finding new locations
- **AgenticIntake** - AI-powered location submission interface
- **ModerationPanel** - Admin interface for reviewing submissions
- **CentralFilters** - Google-style centered filter bar with cuisine, rating, price, and status filters

## 🚦 Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   └── page.tsx           # Main application
├── components/            # React components
├── lib/
│   ├── firebase/         # Firebase configuration & operations
│   ├── services/         # Business logic
│   └── config/           # Environment setup
├── contexts/             # React contexts (Auth, Toast)
├── types/                # TypeScript definitions
└── data/                 # Static/fallback data
```

## 🚀 Deployment

### Vercel Deployment (Recommended)

This app is optimized for Vercel deployment with Firebase backend:

1. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

2. **Set Environment Variables in Vercel:**
   - Go to your Vercel project dashboard
   - Navigate to Settings → Environment Variables
   - Add all the Firebase and Google API variables

3. **Deploy Firebase Rules:**
   ```bash
   firebase deploy --only firestore:rules,storage
   ```

**Architecture Benefits:**
- ✅ **Vercel** handles Next.js hosting and serverless functions
- ✅ **Firebase** provides reliable backend services
- ✅ **Best performance** with global CDN and edge functions
- ✅ **Automatic scaling** based on traffic

## 📱 Features in Detail

### Autonomous Discovery System

- Automatically discovers Amala locations from configured sources
- AI validation ensures quality and relevance
- Duplicate detection prevents redundant entries
- Configurable discovery sources and frequency via feature flags

### AI-Powered Submissions

- Natural language processing with Google Gemini
- Extracts structured data from conversational input
- Fallback to manual form for edge cases
- Real-time validation and suggestions

### Advanced Moderation

- Pending submissions queue with notifications
- Detailed location information review
- One-click approve/reject workflow
- Audit trail for all moderation actions

### Image Upload System

- **Firebase Storage** integration for reliable uploads
- **Automatic image optimization** and resizing
- **Real-time upload progress** with user feedback
- **Fallback to placeholder** only when no image is available

### Toast Notification System

- **Context-based notifications** for user actions
- **Auto-dismiss** with configurable timeout
- **Success, error, and info** message types
- **Consistent UI feedback** across all operations

## 🛤️ Routes

### Frontend Routes

- `/` - Home page with interactive map, search, and location browsing
- `/login` - User authentication page
- `/admin/metrics` - Admin dashboard for viewing platform metrics and analytics

### Backend API Routes

- `POST /api/ai/extract` - Extract structured location information from natural language messages using Google Gemini AI. Supports conversation history for context-aware extraction.
- `PUT /api/ai/extract` - Detect potential duplicates for an AI-extracted location against existing locations.
- `POST /api/analytics` - Log an analytics event (e.g., submission created, location moderated) to Firebase.
- `GET /api/analytics` - Retrieve a basic summary of analytics events over the last 7 days, including event type counts.
- `GET /api/analytics/metrics` - Fetch detailed performance metrics such as submissions per day, verification rate, average time to approval, dedup rate, and event counts for a specified number of days.
- `GET /api/auth/user` - Get information about the current authenticated user from Firebase token.
- `POST /api/discovery` - Trigger autonomous discovery of new Amala locations from configured sources (e.g., Google Places, web scraping). Requires moderator or admin role. Returns saved locations and summary of duplicates/errors.
- `GET /api/discovery` - Get the status of the autonomous discovery system, including last run time, next scheduled run, and enabled sources.
- `GET /api/locations` - Query and retrieve locations with advanced filters (search, open now, service type, price, cuisine, etc.). Supports including reviews and auto-enriches with Google Places data.
- `POST /api/locations` - Submit a new location for moderation. Validates input, checks for duplicates, enriches with Google data, and logs analytics.
- `GET /api/moderation` - Retrieve pending locations for review (moderator/admin only).
- `POST /api/moderation` - Moderate a pending location (approve or reject). Requires moderator or admin role. Logs the action to analytics.
- `POST /api/photos` - Upload photos for restaurants using Firebase Storage.
- `GET /api/photos` - Get approved photos for a specific location.
- `POST /api/reviews` - Submit a new review with optional image upload.
- `GET /api/reviews` - Get approved reviews for a location.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p class="text-center font-bold">Built with ❤️ for the lovers of Amala</p>
<p class="text-center">For a food that knows no origin, bound or tribe.</p>
<p class="text-center"><a href="https://hack.google.com/" target="_blank" rel="noopener noreferrer">Amala Hackathon 2025</a></p>