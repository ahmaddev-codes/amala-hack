# Amala Discovery Platform 🍽️

[![Amala Discovery Screenshot](./public/screenshot.png)](https://amala-hack.vercel.app)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black?logo=next.js)](https://nextjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=white)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PWA](https://img.shields.io/badge/PWA-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Production Ready](https://img.shields.io/badge/Production-Ready-green?logo=checkmarx)](https://github.com/ahmaddev-codes/amala-hack)

## 🎯 Overview

A Platform that helps food enthusiasts find the best Amala spots worldwide through an interactive map interface, intelligent filtering, and community-driven submissions. The platform includes autonomous discovery capabilities that automatically find and validate new locations from various online sources.

## ✨ Core Features

### **🗺️ Interactive Map Experience**
- **Google Maps Integration** - Custom markers, info windows, and real-time location data
- **Advanced Search & Filtering** - Filter by cuisine, price, hours, ratings, and service type
- **Geolocation Support** - Find nearby Amala spots with location-based search
- **Mobile-First Design** - Touch-friendly interface optimized for all devices

### **🤖 AI-Powered Discovery**
- **Autonomous Location Discovery** - Automated finding of new Amala restaurants from multiple sources
- **Gemini AI Integration** - Natural language location submission and data extraction
- **Smart Duplicate Detection** - Prevents redundant entries with similarity scoring
- **Regional Discovery Batching** - Global coverage with geographic distribution

### **👥 User Role System**
- **User Role** - Submit locations, write reviews, upload photos
- **Scout Role** - Enhanced discovery tools, submission tracking, performance analytics
- **Moderator Role** - Content moderation, review approval, bulk operations
- **Admin Role** - System administration, user management, comprehensive analytics

### **📊 Real-Time Analytics**
- **Interactive Dashboards** - Live metrics with charts and visualizations
- **Performance Tracking** - Submission rates, approval times, user engagement
- **Moderation Analytics** - Pending content, action logs, system health
- **User Progression** - Scout levels, achievement tracking, leaderboards

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
- **Deployment**: Automated deployment script with validation
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
| `FEATURE_DISCOVERY_ENABLED`                 | ⏳       | Toggle autonomous discovery       |
| `FEATURE_DISCOVERY_SOURCES`                 | ⏳       | Comma-separated discovery sources |

> **Note**: Role management is now **database-driven**. New users automatically get the `user` role, and admins can assign additional roles (scout, mod, admin) through the User Management interface at `/admin`.

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

## 🚀 Production Deployment

### **Automated Deployment Script**

The platform includes an optimized deployment script with comprehensive validation:

```bash
# Run the automated deployment script
./scripts/deploy-optimized.sh
```

**Script Features:**
- ✅ **Environment Validation** - Checks all required variables
- ✅ **API Key Format Validation** - Ensures proper key formats
- ✅ **Dependency Installation** - Automated npm ci
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

#### **3. Database Initialization**
```bash
# The first admin user will be created automatically
# Additional roles can be assigned via the User Management interface at /admin
```

### **Production Architecture Benefits**
- ✅ **Vercel Edge Functions** - Global CDN with 99.99% uptime
- ✅ **Firebase Backend** - Auto-scaling, real-time database
- ✅ **Multi-layer Caching** - 90% reduction in API costs
- ✅ **Database-Driven Roles** - Dynamic user management
- ✅ **Performance Monitoring** - Real-time metrics and alerts
- ✅ **Enterprise Security** - Role-based access control with audit trails

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

## 🛤️ Application Routes

### **Frontend Routes**

#### **Public Routes**
- `/` - Interactive map with location browsing, search, and filtering
- `/login` - User authentication (email/password + Google OAuth)

#### **Protected Routes (Role-Based Access)**
- `/admin` - **Admin Dashboard** with system overview, analytics, user management
- `/admin/metrics` - **Analytics Dashboard** with interactive charts and metrics
- `/moderator` - **Moderator Dashboard** with content moderation and review tools
- `/scout` - **Scout Dashboard** with submission tracking and performance analytics

### **🔗 Complete API Reference**

The Amala platform features **38 comprehensive API endpoints** organized into logical categories. All endpoints use proper authentication, rate limiting, and Zod validation.

#### **🤖 AI & Discovery APIs**

| Endpoint | Method | Auth Required | Role Required | Description | Used By |
|----------|--------|---------------|---------------|-------------|----------|
| `/api/ai/extract` | POST | ❌ | None | Extract structured location data from natural language using Gemini AI | `agentic-intake.tsx`, `location-assistant.tsx` |
| `/api/ai/extract` | PUT | ❌ | None | Detect potential duplicates for AI-extracted locations | `agentic-intake.tsx` |
| `/api/ai/location-search` | POST | ✅ | User+ | AI-powered location search with web scraping | `location-assistant.tsx` |
| `/api/discovery` | POST | ✅ | Mod/Admin | Trigger autonomous discovery with geographic targeting | `discovery-panel.tsx`, Admin/Mod/Scout dashboards |
| `/api/discovery` | GET | ❌ | None | Get autonomous discovery system status | `discovery-panel.tsx` |
| `/api/discovery/stats` | GET | ✅ | Mod/Admin | Get discovery statistics and performance metrics | Admin dashboard |

#### **📍 Location Management APIs**

| Endpoint | Method | Auth Required | Role Required | Description | Used By |
|----------|--------|---------------|---------------|-------------|----------|
| `/api/locations` | GET | ❌ | None | Query locations with advanced filtering, search, and pagination | `map-container.tsx`, `location-list.tsx`, `enrichment-manager.tsx` |
| `/api/locations` | POST | ✅ | User+ | Submit new location for moderation with auto-enrichment | `agentic-intake.tsx`, location submission forms |
| `/api/locations/enrich` | POST | ❌ | None | Force enrichment of specific location with Google Places data | `enrichment-manager.tsx`, `location-enrichment.ts` |
| `/api/locations/[locationId]/reviews` | GET | ❌ | None | Get reviews for specific location | `location-list.tsx` |
| `/api/moderation` | GET | ✅ | Mod/Admin | Get pending locations for review with pagination | `moderation-panel.tsx`, Moderator dashboard |
| `/api/moderation` | POST | ✅ | Mod/Admin | Approve/reject locations with scout tracking | `moderation-panel.tsx`, Moderator dashboard |
| `/api/moderation/history` | GET | ✅ | Mod/Admin | Get moderation action history with filtering | `moderation-history.tsx`, Moderator dashboard |
| `/api/moderation/stats` | GET | ✅ | Mod/Admin | Get moderation statistics and performance metrics | `moderation-dashboard.tsx` |

#### **⭐ Review & Photo APIs**

| Endpoint | Method | Auth Required | Role Required | Description | Used By |
|----------|--------|---------------|---------------|-------------|----------|
| `/api/reviews` | GET | ❌ | None (Public: approved only) | Get approved reviews, or filter by status (mod/admin only) | `location-list.tsx`, review displays |
| `/api/reviews` | POST | ✅ | User+ | Submit new review with rating, text, and images | `review-submission.tsx` |
| `/api/reviews` | PATCH | ✅ | Mod/Admin | Moderate reviews (approve/reject) | Moderator dashboard |
| `/api/reviews/upload-image` | POST | ✅ | User+ | Upload review images to Firebase Storage | `review-submission.tsx` |
| `/api/reviews/moderate` | POST | ✅ | Mod/Admin | Bulk review moderation operations | Moderator dashboard |
| `/api/photos` | GET | ❌ | None | Get approved photos for locations | Photo galleries |
| `/api/photos` | POST | ✅ | User+ | Upload restaurant photos with metadata | `photo-upload.tsx` |

#### **👥 User & Role Management APIs**

| Endpoint | Method | Auth Required | Role Required | Description | Used By |
|----------|--------|---------------|---------------|-------------|----------|
| `/api/auth/roles` | POST | ✅ | User+ | Get user roles from database (database-driven system) | `FirebaseAuthContext.tsx` |
| `/api/users/manage` | GET | ✅ | Admin | Search and list users with role filtering | Admin dashboard user management |
| `/api/users/manage` | POST | ✅ | Admin | Add/remove user roles with audit logging | Admin dashboard user management |
| `/api/users/roles` | GET | ✅ | User+ | Get current user's roles and permissions | Role-based UI components |
| `/api/user/roles` | GET | ✅ | User+ | Alternative user role endpoint | Legacy compatibility |

#### **🛡️ Moderation & Flagging APIs**

| Endpoint | Method | Auth Required | Role Required | Description | Used By |
|----------|--------|---------------|---------------|-------------|----------|
| `/api/flagged` | GET | ✅ | Mod/Admin | Get flagged content by status with filtering | `flagged-content-panel.tsx` |
| `/api/flagged` | POST | ✅ | User+ (report), Mod/Admin (moderate) | Create flag report or moderate flagged content | `flagged-content-panel.tsx`, user reporting |

#### **📊 Analytics & Metrics APIs**

| Endpoint | Method | Auth Required | Role Required | Description | Used By |
|----------|--------|---------------|---------------|-------------|----------|
| `/api/analytics` | GET | ❌ | None | Get analytics summary (7-day overview) | `firebase-analytics-data.ts` |
| `/api/analytics` | POST | ❌ | None | Log analytics events (user actions, system events) | `utils.ts`, throughout platform |
| `/api/analytics/metrics` | GET | ❌ | None | Get detailed performance metrics with date ranges | `metrics-dashboard.tsx`, Admin dashboard |
| `/api/analytics/comprehensive` | GET | ✅ | Admin | Get comprehensive analytics with advanced metrics | Admin analytics dashboard |
| `/api/analytics/firebase-data` | GET | ❌ | None | Get Firebase Analytics data with caching | `firebase-analytics-data.ts` |
| `/api/analytics/firebase-data/timeseries` | GET | ❌ | None | Get time series analytics data | `firebase-analytics-dashboard.tsx` |
| `/api/analytics/firebase-data/demographics` | GET | ❌ | None | Get user demographics data | `firebase-analytics-dashboard.tsx` |
| `/api/analytics/firebase-data/events` | GET | ❌ | None | Get event analytics data | `firebase-analytics-dashboard.tsx` |
| `/api/analytics/firebase-data/pages` | GET | ❌ | None | Get top pages analytics data | `firebase-analytics-dashboard.tsx` |
| `/api/analytics/user/[userId]` | GET | ✅ | User+ (own data), Admin (any user) | Get user-specific analytics | User profile pages |

#### **🎯 Role-Specific Dashboard APIs**

| Endpoint | Method | Auth Required | Role Required | Description | Used By |
|----------|--------|---------------|---------------|-------------|----------|
| `/api/admin/stats` | GET | ✅ | Admin | Get admin dashboard statistics | Admin dashboard |
| `/api/admin/users` | GET | ✅ | Admin | Get user management data | Admin dashboard |
| `/api/scout/stats` | GET | ✅ | Scout+ | Get scout performance statistics | `scout-dashboard.tsx` |
| `/api/scout/submissions` | GET | ✅ | Scout+ | Get scout submission history | `scout-dashboard.tsx` |

#### **🔧 Utility & Background APIs**

| Endpoint | Method | Auth Required | Role Required | Description | Used By |
|----------|--------|---------------|---------------|-------------|----------|
| `/api/places` | GET | ❌ | None | Google Places API proxy for location search | Map components |
| `/api/proxy/google-photo` | GET | ❌ | None | Proxy for Google Photos with caching and optimization | Image displays throughout platform |
| `/api/jobs/enrichment` | POST | ✅ | Admin | Trigger background enrichment jobs | Admin dashboard |
| `/api/performance/metrics` | GET | ✅ | Admin | Get performance monitoring metrics | Performance dashboard |
| `/api/init` | POST | ✅ | Admin | Initialize platform data and settings | Setup and deployment |

### **🔐 Authentication & Authorization**

#### **Authentication Methods:**
- **Bearer Token**: All protected endpoints use `Authorization: Bearer <firebase-id-token>`
- **Firebase Admin SDK**: Server-side operations use admin privileges
- **Rate Limiting**: All endpoints have appropriate rate limits (5-50 requests/minute)

#### **Role Hierarchy:**
- **👤 User** (Default): Location submission, reviews, photos
- **🔍 Scout** (User +): Enhanced discovery tools, submission tracking
- **🛡️ Moderator** (Scout +): Content moderation, review approval
- **👑 Admin** (Moderator +): User management, system administration

#### **Database-Driven Roles:**
The platform uses a **fully database-driven role system**:
- New users automatically get `user` role
- Admins assign additional roles via User Management interface
- All role checks query Firestore `users` collection
- No environment variables needed for role management

### **📱 Frontend Integration Patterns**

#### **Authentication Pattern:**
```typescript
const { getIdToken } = useAuth();
const token = await getIdToken();

const response = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

#### **Error Handling:**
- **401 Unauthorized**: Redirect to login
- **403 Forbidden**: Show role requirement message
- **429 Rate Limited**: Show retry message
- **500 Server Error**: Show error toast with retry option

#### **Real-time Updates:**
- Analytics events logged via `logAnalyticsEvent()` utility
- Toast notifications for all user actions
- Live data refresh after moderation actions
- Optimistic UI updates with error rollback

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

1. **Report Bugs**: Open an issue with detailed steps to reproduce
2. **Suggest Features**: Share your ideas for new features
3. **Submit Pull Requests**: Follow our development workflow

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat(scope): add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ for the lovers of Amala**

*For a food that knows no origin, bound or tribe.*

[**🏆 Amala Hackathon 2025**](https://the-amala-hackathon.devpost.com/)

**[🌍 Live Demo](https://amala-hack.vercel.app)** | **[📚 Documentation](https://github.com/ahmaddev-codes/amala-hack)** | **[🚀 Deploy Now](https://vercel.com/new/clone?repository-url=https://github.com/ahmaddev-codes/amala-hack)**

</div>