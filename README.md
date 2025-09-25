# Amala Discovery Platform 🍽️

[![Amala Discovery Screenshot](./public/screenshot.png)](https://amala-hack.vercel.app)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black?logo=next.js)](https://nextjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=white)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PWA](https://img.shields.io/badge/PWA-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Production Ready](https://img.shields.io/badge/Production-Ready-green?logo=checkmarx)](https://github.com/ahmaddev-codes/amala-hack)

## 🎯 Overview

A Crowdsourcing platform that helps food enthusiasts discover the best Amala spots worldwide through an interactive map interface, intelligent filtering, and community-driven submissions. The platform features autonomous discovery capabilities, advanced moderation workflows, and comprehensive analytics.

## ✨ Core Features

### **🗺️ Interactive Map Experience**
- **Google Maps Integration** - Custom markers, info windows, and real-time location data
- **Advanced Search & Filtering** - Filter by cuisine, price, hours, ratings, and service type
- **Geolocation Support** - Find nearby Amala spots with location-based search
- **Mobile-First Design** - Touch-friendly interface optimized for all devices
- **Responsive Layout** - Seamless experience across desktop, tablet, and mobile

### **🤖 AI-Powered Discovery**
- **Autonomous Location Discovery** - Automated finding of new Amala restaurants from multiple sources
- **Gemini AI Integration** - Natural language location submission and data extraction
- **Smart Duplicate Detection** - Prevents redundant entries with similarity scoring
- **Regional Discovery Batching** - Global coverage with geographic distribution

### **👥 Advanced User Role System**
- **User Role** - Submit locations, write reviews, upload photos, search and filter
- **Scout Role** - Enhanced discovery tools, submission tracking, performance analytics
- **Moderator Role** - Content moderation, review approval, bulk operations
- **Admin Role** - System administration, user management, comprehensive analytics

### **📊 Real-Time Analytics & Monitoring**
- **Interactive Dashboards** - Live metrics with charts and visualizations
- **Performance Tracking** - Submission rates, approval times, user engagement
- **Moderation Analytics** - Pending content, action logs, system health
- **User Progression** - Scout levels, achievement tracking, leaderboards

### **🎨 Enhanced User Experience**
- **Toast Notifications** - Context-aware feedback for all user actions
- **Image Upload System** - Cloudinary Storage integration with optimization
- **Review System** - Comprehensive review submission with photo support
- **Search Interface** - Instant search with dropdown results and proper layering
- **Accessibility** - WCAG compliant with keyboard navigation support

## 🛠️ Tech Stack

### **Frontend Architecture**
- **Framework**: Next.js 15 with App Router & Server Components
- **Language**: TypeScript with strict type checking
- **Styling**:
  - Tailwind CSS with custom design system
  - Heroicons for consistent iconography
  - Radix UI for accessible components
- **State Management**: React Context + Zustand for complex state
- **Maps**: Google Maps JavaScript API with custom overlays
- **Charts**: Recharts for interactive analytics visualizations
- **Forms**: React Hook Form with Zod validation
- **Data Fetching**: SWR + Firebase SDK with caching strategies

### **Backend & Infrastructure**
- **Database**: Firebase Firestore with composite indexes
- **Authentication**: Firebase Auth with role-based access control
- **File Storage**: Firebase Storage with automatic optimization
- **AI/ML**: Google Gemini AI for natural language processing
- **APIs**: Google Maps Platform, Places API, Geocoding API
- **Caching**: Multi-layer caching (memory, API, database)
- **Background Jobs**: Parallel processing with job queues
- **Hosting**: Vercel (Frontend) + Firebase (Backend services)

### **Development & Production Tools**
- **Code Quality**: ESLint + Prettier + TypeScript strict mode
- **Testing**: Jest + React Testing Library + Playwright E2E
- **Performance**: Lighthouse CI, Web Vitals monitoring
- **Deployment**: Automated deployment with validation
- **Monitoring**: Real-time performance metrics and error tracking
- **Security**: Firebase Admin SDK, Bearer token authentication

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

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm (v9+) or yarn (v1.22+)
- Firebase account
- Google Cloud account (Maps API)
- Google AI Studio account (Gemini API)
- Git (for version control)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/ahmaddev-codes/amala-hack.git
   cd amala-hack
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Setup**
   Copy the example environment file and update with your credentials:
   ```bash
   cp .env.local.example .env.local
   ```

   Update `.env.local` with your Firebase and Google API credentials:
   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id_here

   # Google Maps API
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

   # Google Gemini AI
   GOOGLE_AI_API_KEY=your_gemini_api_key

   # Firebase Admin SDK (Required for server-side operations)
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

   # Google Services (Required)
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   GOOGLE_GEMINI_API_KEY=your_gemini_api_key

   # Feature flags
   FEATURE_DISCOVERY_ENABLED=true
   FEATURE_DISCOVERY_SOURCES=google_places,web_scraping

   # Development Settings
   NODE_ENV=development
   NEXT_PUBLIC_APP_URL=http://localhost:3000
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
| `FEATURE_DISCOVERY_ENABLED`                 | ⏳       | Toggle autonomous discovery       |
| `FEATURE_DISCOVERY_SOURCES`                 | ⏳       | Comma-separated discovery sources |

> **Note**: Role management is **database-driven**. New users automatically get the `user` role, and admins can assign additional roles (scout, mod, admin) through the User Management interface at `/admin`.

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
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

## 🚀 Production Deployment

### **Automated Deployment**
The platform includes optimized deployment with comprehensive validation:

```bash
# Deploy to production
npm run deploy
```

**Deployment Features:**
- ✅ **Environment Validation** - Checks all required variables
- ✅ **API Key Format Validation** - Ensures proper key formats
- ✅ **Build Optimization** - Production-ready build process
- ✅ **Firebase Deployment** - Deploys rules and indexes
- ✅ **Performance Validation** - Post-deployment health checks

### **Manual Deployment Steps**

#### **1. Vercel Deployment (Recommended)**
```bash
# Deploy to Vercel
vercel --prod

# Set environment variables in Vercel dashboard
# Navigate to Settings → Environment Variables
# Add all Firebase and Google API variables
```

#### **2. Firebase Backend Setup**
```bash
# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Deploy Storage security rules
firebase deploy --only storage
```

## 🛤️ Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
npm run deploy   # Deploy to production
```

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (38 endpoints)
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

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ for the lovers of Amala**

*For a food that knows no origin, bound or tribe.*

[**🏆 Amala Hackathon 2025**](https://the-amala-hackathon.devpost.com/)

**[🌍 Live Demo](https://amala-hack.vercel.app)** | **[📚 Documentation](https://github.com/ahmaddev-codes/amala-hack)** | **[🚀 Deploy Now](https://vercel.com/new/clone?repository-url=https://github.com/ahmaddev-codes/amala-hack)**

</div>