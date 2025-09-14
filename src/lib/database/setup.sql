-- Amala Discovery Platform Database Setup
-- Complete fresh setup: Drops existing tables, recreates schema, enables RLS/policies/triggers
-- Populates with sample data (simple and complete): 2 pending locations (review queue), 3 approved, 6 reviews for approved, 2 submissions, 2 logs
-- priceInfo uses real Naira values; images use valid picsum.photos URLs
-- Run this in Supabase SQL editor after deleting all database contents

-- Drop all tables
DROP TABLE IF EXISTS moderation_logs CASCADE;
DROP TABLE IF EXISTS location_submissions CASCADE;
DROP TABLE IF EXISTS amala_reviews CASCADE;
DROP TABLE IF EXISTS amala_locations CASCADE;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create amala_locations table
CREATE TABLE amala_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  coordinates JSONB NOT NULL,
  phone TEXT,
  website TEXT,
  email TEXT,
  description TEXT,
  "isOpenNow" BOOLEAN DEFAULT true,
  "serviceType" TEXT CHECK ("serviceType" IN ('dine-in', 'takeaway', 'both')) DEFAULT 'both',
  "priceRange" TEXT CHECK ("priceRange" IN ('$', '$$', '$$$', '$$$$')) DEFAULT '$',
  "priceInfo" TEXT,
  cuisine TEXT[] DEFAULT '{}',
  dietary TEXT[] DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  hours JSONB DEFAULT '{}',
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  "submittedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "submittedBy" TEXT,
  "moderatedAt" TIMESTAMP WITH TIME ZONE,
  "moderatedBy" TEXT,
  rating DECIMAL(2, 1),
  "reviewCount" INTEGER DEFAULT 0,
  images TEXT[] DEFAULT '{}',
  "discoverySource" TEXT CHECK ("discoverySource" IN ('user-submitted', 'web-scraping', 'social-media', 'directory', 'autonomous-discovery')) DEFAULT 'user-submitted',
  "sourceUrl" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create amala_reviews table
CREATE TABLE amala_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES amala_locations(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  rating DECIMAL(3,2) CHECK (rating >= 1 AND rating <= 5),
  text TEXT,
  date_posted TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'approved',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for reviews
CREATE INDEX idx_amala_reviews_location_id ON amala_reviews (location_id);
CREATE INDEX idx_amala_reviews_date_posted ON amala_reviews (date_posted);
CREATE INDEX idx_amala_reviews_status ON amala_reviews (status);

-- Create location_submissions table
CREATE TABLE location_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_data JSONB NOT NULL,
  submitter_ip INET,
  submission_method TEXT CHECK (submission_method IN ('chat', 'form', 'voice', 'agent')) DEFAULT 'form',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending'
);

-- Create moderation_logs table
CREATE TABLE moderation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES amala_locations(id) ON DELETE CASCADE,
  moderator_id TEXT NOT NULL,
  action TEXT CHECK (action IN ('approve', 'reject', 'edit')) NOT NULL,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for main tables
CREATE INDEX idx_amala_locations_status ON amala_locations (status);
CREATE INDEX idx_amala_locations_coordinates ON amala_locations USING GIN (coordinates);
CREATE INDEX idx_amala_locations_cuisine ON amala_locations USING GIN (cuisine);
CREATE INDEX idx_amala_locations_submitted_at ON amala_locations ("submittedAt");
CREATE INDEX idx_location_submissions_status ON location_submissions (status);
CREATE INDEX idx_moderation_logs_location_id ON moderation_logs (location_id);
CREATE INDEX idx_amala_locations_name ON amala_locations (name);

-- Enable RLS
ALTER TABLE amala_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE amala_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for locations
CREATE POLICY "Public view approved" ON amala_locations FOR SELECT USING (status = 'approved');
CREATE POLICY "Insert pending" ON amala_locations FOR INSERT WITH CHECK (status = 'pending');
CREATE POLICY "Update pending" ON amala_locations FOR UPDATE USING (status = 'pending') WITH CHECK (status IN ('approved', 'rejected'));
CREATE POLICY "Update approved" ON amala_locations FOR UPDATE USING (status = 'approved') WITH CHECK (status = 'approved');

-- RLS Policies for reviews
CREATE POLICY "View approved reviews" ON amala_reviews FOR SELECT USING (status = 'approved');
CREATE POLICY "Insert reviews" ON amala_reviews FOR INSERT WITH CHECK (true);

-- RLS for submissions
CREATE POLICY "Read pending submissions" ON location_submissions FOR SELECT USING (status = 'pending');
CREATE POLICY "Update submissions" ON location_submissions FOR UPDATE USING (true) WITH CHECK (status IN ('approved', 'rejected'));

-- RLS for logs
CREATE POLICY "View logs" ON moderation_logs FOR ALL USING (true);

-- Auto-update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON amala_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON amala_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert 2 Pending locations (queue - not visible publicly)
INSERT INTO amala_locations (name, address, coordinates, phone, website, description, "serviceType", "priceRange", "priceInfo", cuisine, dietary, features, hours, status, "submittedAt", "submittedBy", images, "discoverySource", "sourceUrl") VALUES
('Pending Spot 1', 'Test Rd 1, Lagos', '{"lat": 6.52, "lng": 3.38}', '0800000001', NULL, 'From discovery', 'both', '$$', '₦1500-3000', ARRAY['Nigerian']::text[], ARRAY[]::text[], ARRAY['parking']::text[], '{"monday":{"open":"09:00","close":"21:00"}}', 'pending', NOW(), 'discovery', ARRAY['https://picsum.photos/seed/1/400/300']::text[], 'web-scraping', 'source1'),
('Pending Agent 2', 'Test Rd 2, Ikeja', '{"lat": 6.60, "lng": 3.34}', NULL, 'agent.com', 'From agent', 'takeaway', '$', '₦1000-2000', ARRAY['Yoruba']::text[], ARRAY['halal']::text[], ARRAY['wifi']::text[], '{"tuesday":{"open":"08:00","close":"20:00"}}', 'pending', NOW(), 'agent', ARRAY['https://picsum.photos/seed/2/400/300']::text[], 'autonomous-discovery', 'source2');

-- Insert 3 Approved locations (visible publicly)
INSERT INTO amala_locations (name, address, coordinates, phone, website, description, "serviceType", "priceRange", "priceInfo", cuisine, dietary, features, hours, status, "submittedAt", "submittedBy", "moderatedAt", "moderatedBy", images, "discoverySource", "sourceUrl") VALUES
('Approved Amala Spot 1', 'Approved Rd 1, Lagos', '{"lat": 6.50, "lng": 3.35}', '0801111111', 'spot1.com', 'Approved location 1', 'dine-in', '$$', '₦2000-3500', ARRAY['Amala', 'Nigerian']::text[], ARRAY['vegetarian']::text[], ARRAY['outdoor-seating']::text[], '{"monday":{"open":"10:00","close":"22:00"}}', 'approved', NOW() - INTERVAL '1 day', 'user', NOW(), 'admin', ARRAY['https://picsum.photos/seed/3/400/300']::text[], 'user-submitted', 'source3'),
('Approved Amala Spot 2', 'Approved Rd 2, VI', '{"lat": 6.43, "lng": 3.42}', '0802222222', NULL, 'Approved location 2', 'both', '$$$', '₦3000-5000', ARRAY['Yoruba']::text[], ARRAY['halal']::text[], ARRAY['wifi', 'parking']::text[], '{"tuesday":{"open":"11:00","close":"23:00"}}', 'approved', NOW() - INTERVAL '2 days', 'discovery', NOW() - INTERVAL '1 day', 'mod', ARRAY['https://picsum.photos/seed/4/400/300']::text[], 'web-scraping', 'source4'),
('Approved Amala Spot 3', 'Approved Rd 3, Ikeja', '{"lat": 6.59, "lng": 3.33}', NULL, 'spot3.com', 'Approved location 3', 'takeaway', '$', '₦1000-2500', ARRAY['Fusion']::text[], ARRAY[]::text[], ARRAY[]::text[], '{"wednesday":{"open":"09:00","close":"21:00"}}', 'approved', NOW() - INTERVAL '3 days', 'agent', NOW() - INTERVAL '2 days', 'admin', ARRAY['https://picsum.photos/seed/5/400/300']::text[], 'autonomous-discovery', 'source5');

-- Insert 6 Reviews for approved locations (2 per approved)
INSERT INTO amala_reviews (location_id, author, rating, text, date_posted, status) VALUES
((SELECT id FROM amala_locations WHERE name = 'Approved Amala Spot 1'), 'User1', 4.5, 'Great amala!', NOW() - INTERVAL '1 day', 'approved'),
((SELECT id FROM amala_locations WHERE name = 'Approved Amala Spot 1'), 'User2', 4.0, 'Good value', NOW() - INTERVAL '2 days', 'approved'),
((SELECT id FROM amala_locations WHERE name = 'Approved Amala Spot 2'), 'User3', 4.8, 'Upscale spot', NOW() - INTERVAL '1 day', 'approved'),
((SELECT id FROM amala_locations WHERE name = 'Approved Amala Spot 2'), 'User4', 4.6, 'Recommended', NOW() - INTERVAL '3 days', 'approved'),
((SELECT id FROM amala_locations WHERE name = 'Approved Amala Spot 3'), 'User5', 3.9, 'Quick takeaway', NOW() - INTERVAL '2 days', 'approved'),
((SELECT id FROM amala_locations WHERE name = 'Approved Amala Spot 3'), 'User6', 4.2, 'Affordable', NOW() - INTERVAL '1 day', 'approved');

-- Insert 2 Sample submissions
INSERT INTO location_submissions (location_data, submitter_ip, submission_method, status, created_at) VALUES
('{"name": "Sub 1", "address": "Sub Addr 1", "priceInfo": "₦2000"}', '192.168.1.1', 'form', 'pending', NOW()),
('{"name": "Sub 2", "address": "Sub Addr 2"}', '10.0.0.1', 'agent', 'approved', NOW() - INTERVAL '1 day');

-- Insert 2 Sample logs
INSERT INTO moderation_logs (location_id, moderator_id, action, reason, notes, created_at) VALUES
((SELECT id FROM amala_locations WHERE name = 'Approved Amala Spot 1'), 'admin', 'approve', 'Verified', 'OK', NOW() - INTERVAL '1 day'),
((SELECT id FROM amala_locations WHERE name = 'Approved Amala Spot 2'), 'mod', 'approve', 'Good data', 'Passed', NOW() - INTERVAL '1 day');

-- Aggregate ratings and counts for approved locations
UPDATE amala_locations 
SET 
  rating = (SELECT COALESCE(AVG(rating), 0) FROM amala_reviews r WHERE r.location_id = amala_locations.id AND r.status = 'approved'),
  "reviewCount" = (SELECT COUNT(*) FROM amala_reviews r WHERE r.location_id = amala_locations.id AND r.status = 'approved')
WHERE status = 'approved';

-- Setup complete: 3 approved locations visible; 2 pending in queue; restart app to see results
