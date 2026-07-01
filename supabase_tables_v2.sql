-- =====================================================
-- SUPABASE SQL SCRIPT FOR AI WEBINAR LANDING PAGE
-- AIwithArijit.com - QR Code Landing Page Tables
-- VERSION 2.0 - With Admin & UTM Management
-- =====================================================

-- DROP existing tables if you want to start fresh (UNCOMMENT IF NEEDED)
-- DROP TABLE IF EXISTS QR_landing_registrations CASCADE;
-- DROP TABLE IF EXISTS QR_landing_webinar_links CASCADE;
-- DROP TABLE IF EXISTS QR_utm_campaigns CASCADE;
-- DROP VIEW IF EXISTS registration_summary CASCADE;
-- DROP VIEW IF EXISTS utm_performance CASCADE;

-- =====================================================
-- TABLE 1: QR_landing_webinar_links
-- Stores the 5 webinar course details
-- =====================================================

CREATE TABLE IF NOT EXISTS QR_landing_webinar_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id SERIAL UNIQUE,
    course_name TEXT NOT NULL,
    course_short_name TEXT NOT NULL,
    duration_minutes INTEGER DEFAULT 90,
    target_audience TEXT NOT NULL,
    age_group TEXT NOT NULL,
    webinar_date DATE NOT NULL,
    webinar_time TIME NOT NULL,
    timezone TEXT DEFAULT 'IST',
    registration_link TEXT,
    ms_teams_link TEXT,
    is_active BOOLEAN DEFAULT true,
    max_registrations INTEGER DEFAULT 500,
    current_registrations INTEGER DEFAULT 0,
    course_description TEXT,
    benefits JSONB DEFAULT '[]'::jsonb,
    course_order INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_webinar_links_active ON QR_landing_webinar_links(is_active);
CREATE INDEX IF NOT EXISTS idx_webinar_links_date ON QR_landing_webinar_links(webinar_date);
CREATE INDEX IF NOT EXISTS idx_webinar_links_order ON QR_landing_webinar_links(course_order);

-- =====================================================
-- TABLE 2: QR_landing_registrations
-- Stores user registrations from the landing page form
-- =====================================================

CREATE TABLE IF NOT EXISTS QR_landing_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    registration_id SERIAL UNIQUE,
    
    -- User Information
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    mobile TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    profession_choice TEXT NOT NULL,
    other_profession_description TEXT,
    
    -- Course Information
    course_id INTEGER,
    course_name TEXT NOT NULL,
    webinar_date DATE,
    webinar_time TIME,
    timezone TEXT DEFAULT 'IST',
    
    -- Consent & Status
    marketing_consent BOOLEAN DEFAULT true,
    registration_status TEXT DEFAULT 'registered' CHECK (registration_status IN ('registered', 'confirmed', 'attended', 'no_show', 'cancelled')),
    
    -- UTM Tracking Fields
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    referrer_url TEXT,
    landing_page_url TEXT,
    
    -- Device & Location Info
    user_agent TEXT,
    ip_address TEXT,
    device_type TEXT,
    browser TEXT,
    country TEXT,
    city TEXT,
    
    -- Timestamps
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    attended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Email & Communication Tracking
    confirmation_email_sent BOOLEAN DEFAULT false,
    reminder_email_sent BOOLEAN DEFAULT false,
    whatsapp_sent BOOLEAN DEFAULT false,
    teams_link_sent BOOLEAN DEFAULT false
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_registrations_email ON QR_landing_registrations(email);
CREATE INDEX IF NOT EXISTS idx_registrations_mobile ON QR_landing_registrations(mobile);
CREATE INDEX IF NOT EXISTS idx_registrations_course ON QR_landing_registrations(course_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON QR_landing_registrations(registration_status);
CREATE INDEX IF NOT EXISTS idx_registrations_date ON QR_landing_registrations(registered_at);
CREATE INDEX IF NOT EXISTS idx_registrations_utm_source ON QR_landing_registrations(utm_source);
CREATE INDEX IF NOT EXISTS idx_registrations_utm_campaign ON QR_landing_registrations(utm_campaign);

-- =====================================================
-- TABLE 3: QR_utm_campaigns
-- Stores UTM campaign configurations for QR codes
-- =====================================================

CREATE TABLE IF NOT EXISTS QR_utm_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id SERIAL UNIQUE,
    
    -- Campaign Details
    campaign_name TEXT NOT NULL,
    campaign_description TEXT,
    
    -- UTM Parameters
    utm_source TEXT NOT NULL,
    utm_medium TEXT DEFAULT 'qr_code',
    utm_campaign TEXT NOT NULL,
    utm_term TEXT,
    utm_content TEXT,
    
    -- Generated URL & QR
    base_url TEXT DEFAULT 'https://a-iwith-arijit-qr-landing.vercel.app',
    full_url TEXT,
    qr_code_data TEXT,
    
    -- Location/Placement Info
    placement_location TEXT,
    placement_city TEXT,
    placement_description TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    start_date DATE,
    end_date DATE,
    
    -- Stats (updated via triggers or manually)
    total_scans INTEGER DEFAULT 0,
    total_registrations INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT DEFAULT 'admin'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_utm_campaigns_active ON QR_utm_campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_utm_campaigns_source ON QR_utm_campaigns(utm_source);

-- =====================================================
-- TABLE 4: QR_admin_sessions (for simple auth)
-- =====================================================

CREATE TABLE IF NOT EXISTS QR_admin_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
    is_valid BOOLEAN DEFAULT true
);

-- =====================================================
-- DISABLE RLS FOR THESE TABLES (Simpler approach)
-- =====================================================

ALTER TABLE QR_landing_webinar_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE QR_landing_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE QR_utm_campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE QR_admin_sessions DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- GRANT FULL PERMISSIONS TO ANON ROLE
-- =====================================================

GRANT ALL ON QR_landing_webinar_links TO anon;
GRANT ALL ON QR_landing_registrations TO anon;
GRANT ALL ON QR_utm_campaigns TO anon;
GRANT ALL ON QR_admin_sessions TO anon;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- =====================================================
-- DELETE EXISTING DATA AND INSERT FRESH
-- =====================================================

DELETE FROM QR_landing_webinar_links;

INSERT INTO QR_landing_webinar_links (
    course_name,
    course_short_name,
    duration_minutes,
    target_audience,
    age_group,
    webinar_date,
    webinar_time,
    timezone,
    registration_link,
    ms_teams_link,
    is_active,
    course_description,
    benefits,
    course_order
) VALUES 
(
    'Agentic AI Certification for Working Professionals',
    'Agentic AI - Professionals',
    90,
    'Working Professionals across all industries - IT, Finance, Healthcare, Manufacturing, Retail, Education, and more. Perfect for those looking to upskill and stay relevant in the AI era.',
    '24 to 60 years',
    '2025-01-19',
    '11:00:00',
    'IST',
    NULL,
    NULL,
    true,
    'Master Agentic AI concepts and learn how AI Agents are transforming businesses. Understand how to leverage AI in your current role and boost your career prospects.',
    '["Official AI Certification from AIwithArijit.com", "Opportunity to build AI Agents yourself", "Training by Industry Experts & AI Researchers", "Chance to join the full-length AI Program at discounted rates", "Lifetime FREE access to AI Library, Books & Articles", "Resume & LinkedIn Profile Enhancement Tips", "Access to Exclusive AI Job Opportunities"]'::jsonb,
    1
),
(
    'AI for School Students & Future Readiness',
    'AI for Schools',
    90,
    'School students who want to get ahead of the curve and understand AI early. Parents are encouraged to join along with their children.',
    '10 to 16 years',
    '2025-01-19',
    '15:00:00',
    'IST',
    NULL,
    NULL,
    true,
    'Fun and engaging introduction to AI for young minds. Learn what AI is, how it works, and how it will shape your future career. Includes hands-on activities!',
    '["Certificate of Participation", "Introduction to AI concepts in simple language", "Fun AI activities and demonstrations", "Guidance for AI-ready career paths", "Free access to student AI resources", "Parent guidance on supporting AI education", "Early bird advantage for future AI courses"]'::jsonb,
    2
),
(
    'AI Certification for College Students & Job Seekers',
    'AI for College & Job Seekers',
    90,
    'College students, fresh graduates, and job seekers looking to stand out in the competitive job market with AI skills.',
    '17 to 23 years',
    '2025-01-19',
    '17:00:00',
    'IST',
    NULL,
    NULL,
    true,
    'Get job-ready with AI skills that employers are actively seeking. Learn how to use AI tools effectively and make your resume stand out.',
    '["Official AI Certification for your Resume", "AI tools training for productivity", "Resume building with AI skills highlighted", "LinkedIn optimization for AI job market", "Access to AI internship opportunities", "Interview preparation for AI-related questions", "Lifetime access to AI learning resources"]'::jsonb,
    3
),
(
    'Agentic AI Development for Tech Professionals',
    'Agentic AI - Tech Dev',
    90,
    'Software Developers, Data Engineers, Data Scientists, ML Engineers, DevOps Engineers, and Tech Leads who want to build AI Agents.',
    '20 to 55 years',
    '2025-01-19',
    '19:00:00',
    'IST',
    NULL,
    NULL,
    true,
    'Deep dive into Agentic AI development. Learn architectures, frameworks (LangChain, AutoGen, CrewAI), and build production-ready AI Agents.',
    '["Advanced AI Developer Certification", "Hands-on Agentic AI development workshop", "Access to code repositories and templates", "Training on LangChain, AutoGen, CrewAI frameworks", "Architecture patterns for AI Agents", "Production deployment strategies", "Access to exclusive developer community"]'::jsonb,
    4
),
(
    'Digital & Generative AI Transformation for Business Leaders',
    'AI for Business Leaders',
    90,
    'CXOs, Directors, VPs, General Managers, Business Unit Heads, Aspiring Leaders, and Entrepreneurs who want to drive AI transformation.',
    '30 to 65 years',
    '2025-01-19',
    '21:00:00',
    'IST',
    NULL,
    NULL,
    true,
    'Strategic overview of AI transformation for business leadership. Learn how to evaluate AI opportunities, build AI strategy, and lead AI initiatives.',
    '["Executive AI Leadership Certificate", "AI Strategy Framework & Templates", "ROI calculation models for AI projects", "Case studies from global AI transformations", "Networking with fellow business leaders", "1-on-1 consultation opportunity", "Access to executive AI briefings"]'::jsonb,
    5
);

-- =====================================================
-- INSERT SAMPLE UTM CAMPAIGN
-- =====================================================

DELETE FROM QR_utm_campaigns;

INSERT INTO QR_utm_campaigns (
    campaign_name,
    campaign_description,
    utm_source,
    utm_medium,
    utm_campaign,
    placement_location,
    placement_city,
    base_url,
    is_active
) VALUES 
(
    'Mumbai Local Standee - Jan 2025',
    'QR Code standee placed in Mumbai local train stations',
    'qr_standee',
    'offline',
    'mumbai_local_jan2025',
    'Mumbai Local Train Stations',
    'Mumbai',
    'https://a-iwith-arijit-qr-landing.vercel.app',
    true
),
(
    'LinkedIn Campaign - Jan 2025',
    'LinkedIn post sharing campaign',
    'linkedin',
    'social',
    'linkedin_jan2025',
    'LinkedIn Posts',
    'Online',
    'https://a-iwith-arijit-qr-landing.vercel.app',
    true
);

-- Update full_url for campaigns
UPDATE QR_utm_campaigns 
SET full_url = base_url || '?utm_source=' || utm_source || '&utm_medium=' || utm_medium || '&utm_campaign=' || utm_campaign;

-- =====================================================
-- USEFUL VIEWS FOR ANALYTICS
-- =====================================================

DROP VIEW IF EXISTS registration_summary;
CREATE VIEW registration_summary AS
SELECT 
    w.course_id,
    w.course_short_name,
    w.webinar_date,
    w.webinar_time,
    COUNT(r.id) as total_registrations,
    COUNT(CASE WHEN r.registration_status = 'confirmed' THEN 1 END) as confirmed,
    COUNT(CASE WHEN r.registration_status = 'attended' THEN 1 END) as attended,
    COUNT(CASE WHEN r.registration_status = 'no_show' THEN 1 END) as no_shows
FROM QR_landing_webinar_links w
LEFT JOIN QR_landing_registrations r ON w.course_id = r.course_id
GROUP BY w.course_id, w.course_short_name, w.webinar_date, w.webinar_time;

DROP VIEW IF EXISTS utm_performance;
CREATE VIEW utm_performance AS
SELECT 
    utm_source,
    utm_medium,
    utm_campaign,
    COUNT(*) as registrations,
    COUNT(DISTINCT email) as unique_emails,
    MIN(registered_at) as first_registration,
    MAX(registered_at) as last_registration
FROM QR_landing_registrations
WHERE utm_source IS NOT NULL
GROUP BY utm_source, utm_medium, utm_campaign
ORDER BY registrations DESC;

-- Grant view permissions
GRANT SELECT ON registration_summary TO anon;
GRANT SELECT ON utm_performance TO anon;

-- =====================================================
-- VERIFY DATA
-- =====================================================

SELECT 'Webinar Links Count: ' || COUNT(*) FROM QR_landing_webinar_links;
SELECT 'UTM Campaigns Count: ' || COUNT(*) FROM QR_utm_campaigns;

-- =====================================================
-- END OF SQL SCRIPT
-- =====================================================
