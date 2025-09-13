-- Amala Discovery Platform Database Schema
-- Run this in your Supabase SQL editor to set up the database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create amala_locations table
CREATE TABLE IF NOT EXISTS amala_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  coordinates JSONB NOT NULL,
  phone TEXT,
  website TEXT,
  email TEXT,
  description TEXT,
  
  -- Core filters
  "isOpenNow" BOOLEAN DEFAULT true,
  "serviceType" TEXT CHECK ("serviceType" IN ('dine-in', 'takeaway', 'both')) DEFAULT 'both',
  "priceRange" TEXT CHECK ("priceRange" IN ('$', '$$', '$$$', '$$$$')) DEFAULT '$',
  
  -- Additional metadata
  cuisine TEXT[] DEFAULT '{}',
  dietary TEXT[] DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  
  -- Hours of operation (JSON object)
  hours JSONB DEFAULT '{}',
  
  -- Moderation status
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  "submittedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "submittedBy" TEXT,
  "moderatedAt" TIMESTAMP WITH TIME ZONE,
  "moderatedBy" TEXT,
  
  -- Ratings and reviews
  rating DECIMAL(2,1),
  "reviewCount" INTEGER DEFAULT 0,
  
  -- Image URLs
  images TEXT[] DEFAULT '{}',
  
  -- Source information
  "discoverySource" TEXT CHECK ("discoverySource" IN ('user-submitted', 'web-scraping', 'social-media', 'directory')) DEFAULT 'user-submitted',
  "sourceUrl" TEXT,
  
  -- Timestamps
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create location_submissions table for tracking submissions
CREATE TABLE IF NOT EXISTS location_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_data JSONB NOT NULL,
  submitter_ip INET,
  submission_method TEXT CHECK (submission_method IN ('chat', 'form', 'voice')) DEFAULT 'form',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending'
);

-- Create moderation_logs table
CREATE TABLE IF NOT EXISTS moderation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES amala_locations(id) ON DELETE CASCADE,
  moderator_id TEXT NOT NULL,
  action TEXT CHECK (action IN ('approve', 'reject', 'edit')) NOT NULL,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_amala_locations_status ON amala_locations(status);
CREATE INDEX IF NOT EXISTS idx_amala_locations_coordinates ON amala_locations USING GIN (coordinates);
CREATE INDEX IF NOT EXISTS idx_amala_locations_cuisine ON amala_locations USING GIN (cuisine);
CREATE INDEX IF NOT EXISTS idx_amala_locations_submitted_at ON amala_locations("submittedAt");
CREATE INDEX IF NOT EXISTS idx_location_submissions_status ON location_submissions(status);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_location_id ON moderation_logs(location_id);

-- Insert sample data (only if table is empty)
INSERT INTO amala_locations (
  name, address, coordinates, phone, website, description,
  "isOpenNow", "serviceType", "priceRange", cuisine, status,
  rating, "reviewCount", "discoverySource"
) 
SELECT * FROM (VALUES
  (
    'Amala Palace',
    '23 Ikorodu Road, Fadeyi, Lagos, Nigeria',
    '{"lat": 6.5359, "lng": 3.3692}',
    '+234 801 234 5678',
    'https://amalapalace.ng',
    'Authentic Amala with variety of traditional soups including Ewedu, Gbegiri, and Ila',
    true,
    'both',
    '$',
    ARRAY['Nigerian', 'Yoruba', 'Traditional'],
    'approved',
    4.5,
    127,
    'user-submitted'
  ),
  (
    'Mama Sidi Amala Spot',
    '45 Allen Avenue, Ikeja, Lagos, Nigeria',
    '{"lat": 6.6018, "lng": 3.3515}',
    '+234 802 345 6789',
    null,
    'Local favorite known for fresh Amala and authentic Ewedu soup. Family-owned since 1995',
    false,
    'dine-in',
    '$',
    ARRAY['Nigerian', 'Yoruba', 'Home-style'],
    'approved',
    4.2,
    89,
    'web-scraping'
  ),
  (
    'Lagos Island Amala Hub',
    '12 Broad Street, Lagos Island, Lagos, Nigeria',
    '{"lat": 6.4541, "lng": 3.3947}',
    '+234 803 456 7890',
    'https://lagosislandamala.com',
    'Premium Amala experience in the heart of Lagos Island with air-conditioned dining',
    true,
    'both',
    '$$',
    ARRAY['Nigerian', 'Yoruba', 'Fusion'],
    'approved',
    4.7,
    203,
    'social-media'
  ),
  (
    'Bukky Amala Express',
    '78 Adeniran Ogunsanya Street, Surulere, Lagos, Nigeria',
    '{"lat": 6.4969, "lng": 3.3602}',
    '+234 804 567 8901',
    null,
    'Fast-casual Amala spot popular with office workers. Known for quick service and consistent quality',
    true,
    'takeaway',
    '$',
    ARRAY['Nigerian', 'Fast-casual'],
    'approved',
    4.1,
    156,
    'user-submitted'
  ),
  (
    'Victoria Island Amala Lounge',
    '15 Adeola Odeku Street, Victoria Island, Lagos, Nigeria',
    '{"lat": 6.4281, "lng": 3.4219}',
    '+234 805 678 9012',
    'https://viamala.com',
    'Upscale Amala restaurant with modern ambiance and traditional flavors. Perfect for business meals',
    true,
    'dine-in',
    '$$',
    ARRAY['Nigerian', 'Contemporary', 'Fine-dining'],
    'approved',
    4.8,
    342,
    'social-media'
  )
) AS sample_data(name, address, coordinates, phone, website, description, "isOpenNow", "serviceType", "priceRange", cuisine, status, rating, "reviewCount", "discoverySource")
WHERE NOT EXISTS (SELECT 1 FROM amala_locations LIMIT 1);

-- Enable Row Level Security (RLS)
ALTER TABLE amala_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to approved locations
CREATE POLICY "Public can view approved locations" ON amala_locations
  FOR SELECT USING (status = 'approved');

-- Create policies for authenticated users to submit locations
CREATE POLICY "Anyone can submit locations" ON amala_locations
  FOR INSERT WITH CHECK (status = 'pending');

-- Create policies for location submissions
CREATE POLICY "Anyone can submit location data" ON location_submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view submissions" ON location_submissions
  FOR SELECT USING (true);

-- Update function to automatically update updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updatedAt
CREATE TRIGGER update_amala_locations_updated_at 
  BEFORE UPDATE ON amala_locations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();