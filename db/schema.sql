-- ==============================================================================
-- Veyra Trails - Supabase PostgreSQL Database Schema
-- Run this SQL in your Supabase SQL Editor to initialize all tables & buckets.
-- ==============================================================================

-- 1. Admin Users Table
CREATE TABLE IF NOT EXISTS admin (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'Owner',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Public Enquiries Table
CREATE TABLE IF NOT EXISTS enquiry (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(100),
  subject VARCHAR(255) DEFAULT 'General Inquiry',
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'New',
  ip_address VARCHAR(100) DEFAULT '127.0.0.1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Contact Messages Table
CREATE TABLE IF NOT EXISTS contact_message (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(100),
  subject VARCHAR(255) DEFAULT 'General Inquiry',
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'New',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Website Visitors / Traffic Analytics Table
CREATE TABLE IF NOT EXISTS website_visitor (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  page_visited VARCHAR(500) NOT NULL,
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  referrer TEXT,
  user_agent TEXT,
  ip_address VARCHAR(100) DEFAULT '127.0.0.1'
);

-- 5. Videos Table
CREATE TABLE IF NOT EXISTS video (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(100) DEFAULT 'Travel',
  destination VARCHAR(255),
  thumbnail TEXT,
  video_url TEXT NOT NULL,
  platform VARCHAR(50) DEFAULT 'YouTube',
  duration VARCHAR(50) DEFAULT '10:00',
  status VARCHAR(50) DEFAULT 'active',
  featured INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Destinations Table
CREATE TABLE IF NOT EXISTS destination (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  tag VARCHAR(255),
  description TEXT NOT NULL,
  image TEXT,
  video_url TEXT,
  video_id VARCHAR(255),
  food TEXT,
  places TEXT,
  experiences TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Articles / Journal Blog Table
CREATE TABLE IF NOT EXISTS article (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  image TEXT,
  category VARCHAR(100) DEFAULT 'Travel Essay',
  read_time VARCHAR(50) DEFAULT '5 min read',
  date VARCHAR(100) DEFAULT 'Sept 2026',
  video_id VARCHAR(255),
  quote TEXT,
  status VARCHAR(50) DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Global Settings Table
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT
);

-- 9. Activity Log Table
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  action VARCHAR(255) NOT NULL,
  entity VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for optimal querying performance
CREATE INDEX IF NOT EXISTS idx_video_status ON video(status);
CREATE INDEX IF NOT EXISTS idx_destination_status ON destination(status);
CREATE INDEX IF NOT EXISTS idx_article_status ON article(status);
CREATE INDEX IF NOT EXISTS idx_enquiry_status ON enquiry(status);
CREATE INDEX IF NOT EXISTS idx_visitor_session ON website_visitor(session_id);

-- Storage Buckets Creation (Public Access Enabled)
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('article-images', 'article-images', true) ON CONFLICT (id) DO NOTHING;
