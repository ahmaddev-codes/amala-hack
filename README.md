# Amala Discovery Platform 🍽️

A modern web application for discovering authentic Amala restaurants across Lagos, Nigeria. Features autonomous location discovery, AI-powered submissions, and real-time moderation.

## 🎯 Overview

The Amala Discovery Platform helps food enthusiasts find the best Amala spots in Lagos through an interactive map interface, intelligent filtering, and community-driven submissions. The platform includes autonomous discovery capabilities that automatically find and validate new locations from various online sources.

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

- Supabase (Database & Auth)
- Google Maps API
- Google Gemini AI
- Vercel (Deployment)

**Key Libraries:**

- @googlemaps/react-wrapper
- @google/generative-ai
- @supabase/supabase-js
- Lucide React (Icons)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
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
   # Database (Required)
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

   # Google Services (Required)
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   GOOGLE_GEMINI_API_KEY=your_gemini_api_key
   ```

3. **Database Setup**

   Run the SQL schema in your Supabase project:

   ```sql
   -- See src/lib/database/setup.sql for complete schema
   ```

4. **Start Development**
   ```bash
   npm run dev
   ```

## 📋 Environment Variables

| Variable                          | Required | Description                    |
| --------------------------------- | -------- | ------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`        | ✅       | Supabase project URL           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | ✅       | Supabase anonymous key         |
| `SUPABASE_SERVICE_ROLE_KEY`       | ✅       | Supabase service role key      |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | ✅       | Google Maps JavaScript API key |
| `GOOGLE_GEMINI_API_KEY`           | ✅       | Google Gemini AI API key       |

### API Setup Instructions

**Supabase:**

1. Create project at [supabase.com](https://supabase.com)
2. Get URL and keys from Settings → API
3. Run database schema from `src/lib/database/setup.sql`

**Google Maps:**

1. Enable Maps JavaScript API in [Google Cloud Console](https://console.cloud.google.com)
2. Create API key and restrict to your domain
3. Enable Places API for enhanced features

**Google Gemini:**

1. Get API key from [Google AI Studio](https://aistudio.google.com)
2. Enable Gemini Pro model access

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js App   │    │   Supabase DB    │    │  Google APIs    │
│                 │    │                  │    │                 │
│ • Map Interface │◄──►│ • Locations      │    │ • Maps API      │
│ • AI Chat       │    │ • Moderation     │◄──►│ • Gemini AI     │
│ • Admin Panel   │    │ • User Sessions  │    │ • Places API    │
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
- **FilterSidebar** - Advanced filtering and search capabilities

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
│   ├── services/         # Business logic
│   ├── database/         # Supabase operations
│   └── config/           # Environment setup
├── types/                # TypeScript definitions
└── data/                 # Static/fallback data
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Deploy to Vercel**

   ```bash
   npm install -g vercel
   vercel --prod
   ```

2. **Set Environment Variables**

   In Vercel dashboard, add all environment variables from `.env.local`

3. **Configure Domain**

   Update Google Maps API key restrictions to include your production domain

### Alternative Platforms

The app can be deployed to any platform supporting Next.js:

- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 📱 Features in Detail

### Autonomous Discovery System

- Automatically discovers Amala locations from Google Places API
- AI validation ensures quality and relevance
- Duplicate detection prevents redundant entries
- Configurable discovery sources and frequency

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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for the Amalanians**
- For a food that knows to origin or tribe, created by the Ijinle Yorubas, made for all**
