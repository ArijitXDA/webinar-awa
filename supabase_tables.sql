-- =====================================================
-- SUPABASE SQL SCRIPT FOR AI WEBINAR LANDING PAGE
-- AIwithArijit.com - QR Code Landing Page Tables
-- =====================================================

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
CREATE INDEX idx_webinar_links_active ON QR_landing_webinar_links(is_active);
CREATE INDEX idx_webinar_links_date ON QR_landing_webinar_links(webinar_date);

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
    course_id INTEGER REFERENCES QR_landing_webinar_links(course_id),
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
CREATE INDEX idx_registrations_email ON QR_landing_registrations(email);
CREATE INDEX idx_registrations_mobile ON QR_landing_registrations(mobile);
CREATE INDEX idx_registrations_course ON QR_landing_registrations(course_id);
CREATE INDEX idx_registrations_status ON QR_landing_registrations(registration_status);
CREATE INDEX idx_registrations_date ON QR_landing_registrations(registered_at);
CREATE INDEX idx_registrations_utm_source ON QR_landing_registrations(utm_source);
CREATE INDEX idx_registrations_utm_campaign ON QR_landing_registrations(utm_campaign);

-- =====================================================
-- INSERT SAMPLE DATA FOR 5 WEBINARS
-- (You can edit these later)
-- =====================================================

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
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on both tables
ALTER TABLE QR_landing_webinar_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE QR_landing_registrations ENABLE ROW LEVEL SECURITY;

-- Policy for webinar_links: Anyone can read active webinars
CREATE POLICY "Anyone can view active webinars" ON QR_landing_webinar_links
    FOR SELECT USING (is_active = true);

-- Policy for registrations: Allow inserts from anonymous users (for form submission)
CREATE POLICY "Anyone can register" ON QR_landing_registrations
    FOR INSERT WITH CHECK (true);

-- Policy for registrations: Only authenticated users can view registrations
-- (You'll need to set up authentication for admin access)
CREATE POLICY "Authenticated users can view registrations" ON QR_landing_registrations
    FOR SELECT USING (auth.role() = 'authenticated');

-- =====================================================
-- FUNCTION: Update registration count automatically
-- =====================================================

CREATE OR REPLACE FUNCTION update_registration_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE QR_landing_webinar_links 
    SET current_registrations = current_registrations + 1,
        updated_at = NOW()
    WHERE course_id = NEW.course_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update registration count
CREATE TRIGGER trigger_update_registration_count
    AFTER INSERT ON QR_landing_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_registration_count();

-- =====================================================
-- FUNCTION: Auto-update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-updating timestamps
CREATE TRIGGER trigger_webinar_links_updated_at
    BEFORE UPDATE ON QR_landing_webinar_links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_registrations_updated_at
    BEFORE UPDATE ON QR_landing_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- USEFUL VIEWS FOR ANALYTICS
-- =====================================================

-- View: Registration summary by course
CREATE OR REPLACE VIEW registration_summary AS
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

-- View: UTM Campaign performance
CREATE OR REPLACE VIEW utm_performance AS
SELECT 
    utm_source,
    utm_medium,
    utm_campaign,
    COUNT(*) as registrations,
    COUNT(DISTINCT email) as unique_emails
FROM QR_landing_registrations
WHERE utm_source IS NOT NULL
GROUP BY utm_source, utm_medium, utm_campaign
ORDER BY registrations DESC;

-- =====================================================
-- GRANT PERMISSIONS FOR ANON ACCESS (Form Submissions)
-- =====================================================

-- Allow anonymous users to read webinar links
GRANT SELECT ON QR_landing_webinar_links TO anon;

-- Allow anonymous users to insert registrations
GRANT INSERT ON QR_landing_registrations TO anon;

-- Allow sequence usage for serial columns
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- =====================================================
-- END OF SQL SCRIPT
-- =====================================================
