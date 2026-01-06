'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// Category and Sub-category options
const CATEGORIES = {
  'non_tech': {
    label: 'Non-Tech Professionals',
    icon: '💼',
    subCategories: ['Sales', 'Marketing', 'HR', 'Admin', 'Infra', 'Product', 'Project', 'Program', 'Legal', 'Operations']
  },
  'tech': {
    label: 'Tech Professionals',
    icon: '💻',
    subCategories: ['Software', 'Data', 'AI/ML', 'Cloud', 'Cybersecurity', 'DevOps', 'Full Stack', 'QA']
  },
  'freshers': {
    label: 'College Freshers & Job Seekers',
    icon: '🎓',
    subCategories: ['UG', 'PG', 'Diploma', 'Career Switchers', 'Entry-Level']
  },
  'leadership': {
    label: 'Leadership & Top Management',
    icon: '👔',
    subCategories: ['CXOs', 'Directors', 'VPs', 'Founders', 'Business Heads']
  }
}

const EXPERIENCE_OPTIONS = [
  'Fresher (0 years)',
  '0-1 years',
  '1-3 years',
  '3-5 years',
  '5-8 years',
  '8-12 years',
  '12-15 years',
  '15-20 years',
  '20+ years'
]

const SKILL_SUGGESTIONS = [
  // Tech Skills
  'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin',
  'React', 'Angular', 'Vue.js', 'Next.js', 'Node.js', 'Express.js', 'Django', 'Flask', 'Spring Boot', 'FastAPI',
  'HTML', 'CSS', 'Tailwind CSS', 'Bootstrap', 'SASS', 'Material UI',
  'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Oracle', 'SQL Server', 'Firebase',
  'AWS', 'Azure', 'Google Cloud', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'CI/CD', 'DevOps',
  'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Linux', 'Unix', 'Shell Scripting', 'Bash',
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn',
  'Data Science', 'Data Analysis', 'Data Engineering', 'ETL', 'Data Warehousing', 'Big Data', 'Spark', 'Hadoop',
  'Pandas', 'NumPy', 'Matplotlib', 'Seaborn', 'Jupyter', 'R Programming',
  'AI', 'Artificial Intelligence', 'ChatGPT', 'Prompt Engineering', 'LangChain', 'LLMs', 'Generative AI',
  'API Development', 'REST API', 'GraphQL', 'Microservices', 'System Design', 'Software Architecture',
  'Cybersecurity', 'Network Security', 'Penetration Testing', 'OWASP', 'Encryption',
  'Mobile Development', 'Android', 'iOS', 'React Native', 'Flutter', 'Xamarin',
  'QA', 'Testing', 'Selenium', 'Jest', 'Cypress', 'Unit Testing', 'Automation Testing',
  'Blockchain', 'Web3', 'Solidity', 'Smart Contracts', 'Cryptocurrency',
  
  // Business & Analytics
  'Excel', 'Advanced Excel', 'VBA', 'Macros', 'Google Sheets',
  'Power BI', 'Tableau', 'Looker', 'QlikView', 'Data Visualization', 'Business Intelligence',
  'SAP', 'Salesforce', 'HubSpot', 'Zoho', 'ServiceNow', 'Workday',
  'Financial Analysis', 'Financial Modeling', 'Accounting', 'Budgeting', 'Forecasting', 'Valuation',
  'Business Analysis', 'Requirements Gathering', 'Process Improvement', 'Six Sigma', 'Lean',
  
  // Management & Soft Skills
  'Project Management', 'Agile', 'Scrum', 'Kanban', 'JIRA', 'Trello', 'Asana', 'Monday.com',
  'Product Management', 'Product Strategy', 'Roadmapping', 'User Research', 'A/B Testing',
  'Team Management', 'Team Leadership', 'People Management', 'Mentoring', 'Coaching',
  'Communication', 'Presentation Skills', 'Public Speaking', 'Negotiation', 'Stakeholder Management',
  'Problem Solving', 'Critical Thinking', 'Decision Making', 'Strategic Thinking', 'Analytical Skills',
  'Time Management', 'Multitasking', 'Prioritization', 'Organization',
  
  // Sales & Marketing
  'Sales', 'B2B Sales', 'B2C Sales', 'Inside Sales', 'Field Sales', 'Account Management',
  'Lead Generation', 'CRM', 'Sales Strategy', 'Pipeline Management', 'Cold Calling',
  'Marketing', 'Digital Marketing', 'Content Marketing', 'Social Media Marketing', 'Email Marketing',
  'SEO', 'SEM', 'Google Ads', 'Facebook Ads', 'LinkedIn Ads', 'PPC', 'Performance Marketing',
  'Brand Management', 'Market Research', 'Competitive Analysis', 'Marketing Strategy',
  'Copywriting', 'Content Writing', 'Technical Writing', 'Blogging', 'Editing',
  'Graphic Design', 'Adobe Photoshop', 'Adobe Illustrator', 'Canva', 'Figma', 'Sketch', 'UI/UX Design',
  'Video Editing', 'Adobe Premiere', 'Final Cut Pro', 'After Effects', 'Motion Graphics',
  
  // HR & Admin
  'Recruitment', 'Talent Acquisition', 'Sourcing', 'Interviewing', 'Onboarding',
  'HR Management', 'Employee Relations', 'Performance Management', 'HRIS', 'Payroll',
  'Training & Development', 'Learning & Development', 'Instructional Design',
  'Office Administration', 'Executive Assistant', 'Calendar Management', 'Travel Coordination',
  
  // Operations & Supply Chain
  'Operations Management', 'Supply Chain', 'Logistics', 'Procurement', 'Vendor Management',
  'Inventory Management', 'Warehouse Management', 'Distribution', 'Shipping',
  'Quality Control', 'Quality Assurance', 'ISO', 'Compliance', 'Audit',
  
  // Legal & Finance
  'Contract Management', 'Legal Research', 'Corporate Law', 'Intellectual Property', 'Compliance',
  'Risk Management', 'Internal Audit', 'Due Diligence', 'Regulatory Compliance',
  'Investment Banking', 'Equity Research', 'Portfolio Management', 'Trading', 'Derivatives',
  
  // Industry Specific
  'Healthcare', 'Pharma', 'Clinical Research', 'Medical Writing', 'Regulatory Affairs',
  'Banking', 'Insurance', 'Fintech', 'Payments', 'Lending',
  'E-commerce', 'Retail', 'FMCG', 'Consumer Goods',
  'Manufacturing', 'Automotive', 'Aerospace', 'Electronics',
  'Real Estate', 'Construction', 'Infrastructure',
  'Media', 'Entertainment', 'Gaming', 'EdTech',
  
  // Tools & Platforms
  'Microsoft Office', 'Microsoft 365', 'SharePoint', 'Power Automate', 'Power Apps',
  'Slack', 'Microsoft Teams', 'Zoom', 'Google Workspace', 'Notion', 'Confluence',
  'WordPress', 'Shopify', 'Magento', 'WooCommerce',
  'Zapier', 'Make.com', 'n8n', 'Airtable', 'Automation'
]

const LOCATION_SUGGESTIONS = [
  // India - Major Cities
  'Mumbai, India', 'Delhi, India', 'Bangalore, India', 'Bengaluru, India', 'Hyderabad, India',
  'Chennai, India', 'Kolkata, India', 'Pune, India', 'Ahmedabad, India', 'Jaipur, India',
  'Surat, India', 'Lucknow, India', 'Kanpur, India', 'Nagpur, India', 'Indore, India',
  'Thane, India', 'Bhopal, India', 'Visakhapatnam, India', 'Patna, India', 'Vadodara, India',
  'Ghaziabad, India', 'Ludhiana, India', 'Agra, India', 'Nashik, India', 'Faridabad, India',
  'Meerut, India', 'Rajkot, India', 'Varanasi, India', 'Srinagar, India', 'Aurangabad, India',
  'Dhanbad, India', 'Amritsar, India', 'Navi Mumbai, India', 'Allahabad, India', 'Ranchi, India',
  'Howrah, India', 'Coimbatore, India', 'Jabalpur, India', 'Gwalior, India', 'Vijayawada, India',
  'Jodhpur, India', 'Madurai, India', 'Raipur, India', 'Kota, India', 'Chandigarh, India',
  'Guwahati, India', 'Solapur, India', 'Hubli, India', 'Mysore, India', 'Tiruchirappalli, India',
  'Bareilly, India', 'Aligarh, India', 'Tiruppur, India', 'Moradabad, India', 'Jalandhar, India',
  'Bhubaneswar, India', 'Salem, India', 'Warangal, India', 'Guntur, India', 'Bhiwandi, India',
  'Saharanpur, India', 'Gorakhpur, India', 'Bikaner, India', 'Amravati, India', 'Noida, India',
  'Jamshedpur, India', 'Bhilai, India', 'Cuttack, India', 'Firozabad, India', 'Kochi, India',
  'Nellore, India', 'Bhavnagar, India', 'Dehradun, India', 'Durgapur, India', 'Asansol, India',
  'Rourkela, India', 'Nanded, India', 'Kolhapur, India', 'Ajmer, India', 'Akola, India',
  'Gulbarga, India', 'Jamnagar, India', 'Ujjain, India', 'Loni, India', 'Siliguri, India',
  'Jhansi, India', 'Ulhasnagar, India', 'Jammu, India', 'Sangli, India', 'Mangalore, India',
  'Erode, India', 'Belgaum, India', 'Ambattur, India', 'Tirunelveli, India', 'Malegaon, India',
  'Gaya, India', 'Jalgaon, India', 'Udaipur, India', 'Maheshtala, India', 'Davanagere, India',
  'Kozhikode, India', 'Kurnool, India', 'Rajpur Sonarpur, India', 'Rajahmundry, India',
  'Bokaro, India', 'South Dumdum, India', 'Bellary, India', 'Patiala, India', 'Gopalpur, India',
  'Agartala, India', 'Bhagalpur, India', 'Muzaffarnagar, India', 'Bhatpara, India', 'Panihati, India',
  'Latur, India', 'Dhule, India', 'Rohtak, India', 'Korba, India', 'Bhilwara, India',
  'Berhampur, India', 'Muzaffarpur, India', 'Ahmednagar, India', 'Mathura, India', 'Kollam, India',
  'Avadi, India', 'Kadapa, India', 'Kamarhati, India', 'Sambalpur, India', 'Bilaspur, India',
  'Shahjahanpur, India', 'Satara, India', 'Bijapur, India', 'Rampur, India', 'Shivamogga, India',
  'Chandrapur, India', 'Junagadh, India', 'Thrissur, India', 'Alwar, India', 'Bardhaman, India',
  'Kulti, India', 'Kakinada, India', 'Nizamabad, India', 'Parbhani, India', 'Tumkur, India',
  'Hisar, India', 'Ozhukarai, India', 'Bihar Sharif, India', 'Panipat, India', 'Darbhanga, India',
  'Bally, India', 'Aizawl, India', 'Dewas, India', 'Ichalkaranji, India', 'Karnal, India',
  'Bathinda, India', 'Jalna, India', 'Eluru, India', 'Barasat, India', 'Kirari Suleman Nagar, India',
  'Purnia, India', 'Satna, India', 'Mau, India', 'Sonipat, India', 'Farrukhabad, India',
  'Puducherry, India', 'Imphal, India', 'Ratlam, India', 'Hapur, India', 'Arrah, India',
  'Karimnagar, India', 'Anantapur, India', 'Etawah, India', 'Ambernath, India', 'Gandhinagar, India',
  'Secunderabad, India', 'Gurugram, India', 'Gurgaon, India', 'Greater Noida, India',
  
  // USA - Major Cities
  'New York, USA', 'Los Angeles, USA', 'Chicago, USA', 'Houston, USA', 'Phoenix, USA',
  'Philadelphia, USA', 'San Antonio, USA', 'San Diego, USA', 'Dallas, USA', 'San Jose, USA',
  'Austin, USA', 'Jacksonville, USA', 'Fort Worth, USA', 'Columbus, USA', 'Charlotte, USA',
  'San Francisco, USA', 'Indianapolis, USA', 'Seattle, USA', 'Denver, USA', 'Boston, USA',
  'Washington DC, USA', 'Nashville, USA', 'Detroit, USA', 'Portland, USA', 'Las Vegas, USA',
  'Memphis, USA', 'Louisville, USA', 'Baltimore, USA', 'Milwaukee, USA', 'Albuquerque, USA',
  'Tucson, USA', 'Fresno, USA', 'Sacramento, USA', 'Atlanta, USA', 'Kansas City, USA',
  'Miami, USA', 'Oakland, USA', 'Minneapolis, USA', 'Cleveland, USA', 'Raleigh, USA',
  'Tampa, USA', 'Pittsburgh, USA', 'Cincinnati, USA', 'Orlando, USA', 'St. Louis, USA',
  
  // Canada
  'Toronto, Canada', 'Montreal, Canada', 'Vancouver, Canada', 'Calgary, Canada', 'Edmonton, Canada',
  'Ottawa, Canada', 'Winnipeg, Canada', 'Quebec City, Canada', 'Hamilton, Canada', 'Kitchener, Canada',
  'London, Canada', 'Victoria, Canada', 'Halifax, Canada', 'Oshawa, Canada', 'Windsor, Canada',
  'Saskatoon, Canada', 'Regina, Canada', 'Barrie, Canada', 'St. John\'s, Canada', 'Kelowna, Canada',
  
  // UK
  'London, UK', 'Birmingham, UK', 'Manchester, UK', 'Leeds, UK', 'Glasgow, UK',
  'Liverpool, UK', 'Newcastle, UK', 'Sheffield, UK', 'Bristol, UK', 'Edinburgh, UK',
  'Leicester, UK', 'Coventry, UK', 'Bradford, UK', 'Cardiff, UK', 'Belfast, UK',
  'Nottingham, UK', 'Kingston upon Hull, UK', 'Stoke-on-Trent, UK', 'Southampton, UK', 'Derby, UK',
  'Cambridge, UK', 'Oxford, UK', 'Reading, UK', 'Aberdeen, UK', 'Brighton, UK',
  
  // Europe
  'Berlin, Germany', 'Munich, Germany', 'Frankfurt, Germany', 'Hamburg, Germany', 'Cologne, Germany',
  'Paris, France', 'Lyon, France', 'Marseille, France', 'Toulouse, France', 'Nice, France',
  'Amsterdam, Netherlands', 'Rotterdam, Netherlands', 'The Hague, Netherlands', 'Utrecht, Netherlands',
  'Dublin, Ireland', 'Cork, Ireland', 'Galway, Ireland', 'Limerick, Ireland',
  'Zurich, Switzerland', 'Geneva, Switzerland', 'Basel, Switzerland', 'Bern, Switzerland',
  'Stockholm, Sweden', 'Gothenburg, Sweden', 'Malmö, Sweden',
  'Oslo, Norway', 'Bergen, Norway', 'Copenhagen, Denmark', 'Aarhus, Denmark',
  'Helsinki, Finland', 'Espoo, Finland', 'Vienna, Austria', 'Salzburg, Austria',
  'Brussels, Belgium', 'Antwerp, Belgium', 'Lisbon, Portugal', 'Porto, Portugal',
  'Madrid, Spain', 'Barcelona, Spain', 'Valencia, Spain', 'Seville, Spain',
  'Milan, Italy', 'Rome, Italy', 'Naples, Italy', 'Turin, Italy', 'Florence, Italy',
  'Warsaw, Poland', 'Krakow, Poland', 'Prague, Czech Republic', 'Brno, Czech Republic',
  'Budapest, Hungary', 'Bucharest, Romania', 'Athens, Greece', 'Thessaloniki, Greece',
  
  // Middle East
  'Dubai, UAE', 'Abu Dhabi, UAE', 'Sharjah, UAE', 'Ajman, UAE',
  'Riyadh, Saudi Arabia', 'Jeddah, Saudi Arabia', 'Dammam, Saudi Arabia', 'Mecca, Saudi Arabia',
  'Doha, Qatar', 'Kuwait City, Kuwait', 'Manama, Bahrain', 'Muscat, Oman',
  'Tel Aviv, Israel', 'Jerusalem, Israel', 'Haifa, Israel',
  'Amman, Jordan', 'Beirut, Lebanon', 'Cairo, Egypt', 'Alexandria, Egypt',
  
  // Asia Pacific
  'Singapore', 'Hong Kong', 'Tokyo, Japan', 'Osaka, Japan', 'Yokohama, Japan', 'Nagoya, Japan',
  'Seoul, South Korea', 'Busan, South Korea', 'Incheon, South Korea',
  'Beijing, China', 'Shanghai, China', 'Shenzhen, China', 'Guangzhou, China', 'Hangzhou, China',
  'Taipei, Taiwan', 'Kaohsiung, Taiwan',
  'Bangkok, Thailand', 'Chiang Mai, Thailand', 'Phuket, Thailand',
  'Kuala Lumpur, Malaysia', 'Penang, Malaysia', 'Johor Bahru, Malaysia',
  'Jakarta, Indonesia', 'Surabaya, Indonesia', 'Bandung, Indonesia', 'Bali, Indonesia',
  'Manila, Philippines', 'Cebu, Philippines', 'Davao, Philippines', 'Quezon City, Philippines',
  'Ho Chi Minh City, Vietnam', 'Hanoi, Vietnam', 'Da Nang, Vietnam',
  
  // Australia & New Zealand
  'Sydney, Australia', 'Melbourne, Australia', 'Brisbane, Australia', 'Perth, Australia',
  'Adelaide, Australia', 'Gold Coast, Australia', 'Canberra, Australia', 'Newcastle, Australia',
  'Auckland, New Zealand', 'Wellington, New Zealand', 'Christchurch, New Zealand',
  
  // Africa
  'Johannesburg, South Africa', 'Cape Town, South Africa', 'Durban, South Africa', 'Pretoria, South Africa',
  'Lagos, Nigeria', 'Abuja, Nigeria', 'Nairobi, Kenya', 'Mombasa, Kenya',
  'Accra, Ghana', 'Casablanca, Morocco', 'Tunis, Tunisia',
  
  // South America
  'São Paulo, Brazil', 'Rio de Janeiro, Brazil', 'Brasília, Brazil', 'Salvador, Brazil',
  'Buenos Aires, Argentina', 'Córdoba, Argentina', 'Rosario, Argentina',
  'Santiago, Chile', 'Lima, Peru', 'Bogotá, Colombia', 'Medellín, Colombia',
  'Caracas, Venezuela', 'Montevideo, Uruguay', 'Quito, Ecuador',
  
  // Remote
  'Remote', 'Work from Home', 'Remote - India', 'Remote - USA', 'Remote - Europe', 'Remote - Global'
]

interface FormData {
  fullName: string
  email: string
  mobile: string
  countryCode: string
  location: string
  experience: string
  category: string
  subCategory: string
  currentRole: string
  skills: string[]
  linkedinUrl: string
  portfolioUrl: string
  preferredLocations: string
  openToRemote: string
  consent: boolean
}

export default function ResumePage() {
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    mobile: '',
    countryCode: '+91',
    location: '',
    experience: '',
    category: '',
    subCategory: '',
    currentRole: '',
    skills: [],
    linkedinUrl: '',
    portfolioUrl: '',
    preferredLocations: '',
    openToRemote: '',
    consent: false
  })
  
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [skillInput, setSkillInput] = useState('')
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false)
  const [filteredSkills, setFilteredSkills] = useState<string[]>([])
  const [locationInput, setLocationInput] = useState('')
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)
  const [filteredLocations, setFilteredLocations] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const skillInputRef = useRef<HTMLInputElement>(null)
  const locationInputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleCategoryChange = (category: string) => {
    setFormData(prev => ({ ...prev, category, subCategory: '' }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      if (!validTypes.includes(file.type)) {
        setError('Please upload a PDF, DOC, or DOCX file')
        return
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB')
        return
      }
      setResumeFile(file)
      setError('')
    }
  }

  const addSkill = (skill: string) => {
    const trimmedSkill = skill.trim()
    if (trimmedSkill && !formData.skills.includes(trimmedSkill) && formData.skills.length < 15) {
      setFormData(prev => ({ ...prev, skills: [...prev.skills, trimmedSkill] }))
      setSkillInput('')
      setShowSkillSuggestions(false)
      setFilteredSkills([])
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skillToRemove) }))
  }

  const handleSkillInputChange = (value: string) => {
    setSkillInput(value)
    if (value.trim().length > 0) {
      const filtered = SKILL_SUGGESTIONS.filter(skill =>
        skill.toLowerCase().includes(value.toLowerCase()) &&
        !formData.skills.includes(skill)
      ).slice(0, 8)
      setFilteredSkills(filtered)
      setShowSkillSuggestions(true)
    } else {
      setFilteredSkills([])
      setShowSkillSuggestions(false)
    }
  }

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredSkills.length > 0) {
        addSkill(filteredSkills[0])
      } else if (skillInput.trim()) {
        addSkill(skillInput)
      }
    } else if (e.key === 'Escape') {
      setShowSkillSuggestions(false)
    }
  }

  const handleLocationInputChange = (value: string) => {
    setLocationInput(value)
    setFormData(prev => ({ ...prev, location: value }))
    if (value.trim().length > 0) {
      const filtered = LOCATION_SUGGESTIONS.filter(loc =>
        loc.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8)
      setFilteredLocations(filtered)
      setShowLocationSuggestions(true)
    } else {
      setFilteredLocations([])
      setShowLocationSuggestions(false)
    }
  }

  const selectLocation = (location: string) => {
    setLocationInput(location)
    setFormData(prev => ({ ...prev, location }))
    setShowLocationSuggestions(false)
    setFilteredLocations([])
  }

  const scrollToForm = () => {
    document.getElementById('upload-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  const validateForm = (): boolean => {
    if (!formData.fullName.trim()) { setError('Please enter your full name'); return false }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { setError('Please enter a valid email'); return false }
    if (!formData.mobile.trim() || formData.mobile.length < 10) { setError('Please enter a valid mobile number'); return false }
    if (!formData.location.trim()) { setError('Please enter your location'); return false }
    if (!formData.experience) { setError('Please select your experience'); return false }
    if (!formData.category) { setError('Please select a category'); return false }
    if (!formData.subCategory) { setError('Please select a sub-category'); return false }
    if (!formData.currentRole.trim()) { setError('Please enter your current role'); return false }
    if (formData.skills.length === 0) { setError('Please add at least one skill'); return false }
    if (!resumeFile) { setError('Please upload your resume'); return false }
    if (!formData.consent) { setError('Please accept the consent to proceed'); return false }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!validateForm()) return
    
    setIsSubmitting(true)

    try {
      // Check for duplicate entry
      const { data: existing } = await supabase
        .from('resume_repository')
        .select('id')
        .or(`email.eq.${formData.email},mobile.eq.${formData.countryCode}${formData.mobile}`)
        .single()

      if (existing) {
        setError('A profile with this email or mobile already exists. Please use different credentials or contact support.')
        setIsSubmitting(false)
        return
      }

      // Upload resume to Supabase Storage
      const fileExt = resumeFile!.name.split('.').pop()
      const fileName = `${Date.now()}_${formData.email.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`
      const filePath = `resumes/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('resume-uploads')
        .upload(filePath, resumeFile!, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        setError('Failed to upload resume. Please try again.')
        setIsSubmitting(false)
        return
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('resume-uploads')
        .getPublicUrl(filePath)

      // Insert metadata into database
      const { error: dbError } = await supabase
        .from('resume_repository')
        .insert([{
          full_name: formData.fullName.trim(),
          email: formData.email.toLowerCase().trim(),
          mobile: `${formData.countryCode}${formData.mobile}`,
          location: formData.location.trim(),
          experience: formData.experience,
          category: formData.category,
          sub_category: formData.subCategory,
          designation: formData.currentRole.trim(),
          skills: formData.skills,
          linkedin_url: formData.linkedinUrl.trim() || null,
          portfolio_url: formData.portfolioUrl.trim() || null,
          preferred_locations: formData.preferredLocations.trim() || null,
          open_to_remote: formData.openToRemote || null,
          resume_path: filePath,
          resume_url: urlData.publicUrl,
          resume_filename: resumeFile!.name,
          consent_given: true,
          source: 'website',
          status: 'active'
        }])

      if (dbError) {
        console.error('Database error:', dbError)
        setError('Failed to save your profile. Please try again.')
        setIsSubmitting(false)
        return
      }

      setSubmitSuccess(true)
    } catch (err) {
      console.error('Submission error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Success State
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            {/* Success Animation */}
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center animate-bounce">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">🎉 Resume Uploaded Successfully!</h1>
            <p className="text-gray-600 mb-8">Your profile is now part of our AI-driven talent repository.</p>

            {/* Next Steps */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 mb-8 text-left">
              <h2 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                <span className="text-xl">📋</span> What Happens Next?
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">✓</div>
                  <p className="text-gray-700">Your resume is <strong>securely stored</strong> in our encrypted repository</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">✓</div>
                  <p className="text-gray-700">Profile <strong>categorized</strong> for targeted recruiter matching</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">✓</div>
                  <p className="text-gray-700">You'll receive <strong>relevant opportunities</strong> via WhatsApp/Email</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">→</div>
                  <p className="text-gray-700">AI-aware profiles get <strong>3x more visibility</strong> with recruiters</p>
                </div>
              </div>
            </div>

            {/* AI Courses CTA */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 mb-6">
              <div className="text-4xl mb-3">🚀</div>
              <h3 className="text-xl font-bold text-amber-900 mb-2">Boost Your Career with AI Skills!</h3>
              <p className="text-amber-800 text-sm mb-4">
                Add <strong>AI & Agentic AI certifications</strong> to your resume and LinkedIn. 
                Stand out in the era of AI-first hiring and command <strong>30-50% higher salaries</strong>.
              </p>
              <a
                href="https://AIwithArijit.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg transition-all"
              >
                Explore AI Courses →
              </a>
            </div>

            {/* Social Links */}
            <div className="flex justify-center gap-4">
              <a
                href="https://AIwithArijit.com"
                target="_blank"
                className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors"
              >
                🌐 AIwithArijit.com
              </a>
              <a
                href="https://www.linkedin.com/in/arijit-chowdhury-86020b19/"
                target="_blank"
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
              >
                💼 LinkedIn
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDF6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50"></div>
        
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-24 relative">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">AI</span>
            </div>
            <span className="text-white font-semibold">WithArijit.com</span>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-indigo-200 text-sm mb-6">
              <span className="animate-pulse">🔥</span>
              <span>AI-Driven Talent Repository</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Upload Your Resume.<br/>
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Get Matched with High-Growth AI-Driven Roles.
              </span>
            </h1>
            
            <p className="text-xl text-indigo-200 mb-8 max-w-3xl mx-auto">
              AI skills are now required in every white-collar role. Global demand is growing at 
              <span className="text-amber-400 font-bold"> 17%+ month-on-month</span>.
            </p>

            <button
              onClick={scrollToForm}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg rounded-2xl hover:shadow-2xl hover:shadow-amber-500/30 transition-all transform hover:scale-105"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Your Resume Now
            </button>
          </div>
        </div>
      </section>

      {/* Trust Tiles */}
      <section className="py-12 bg-white/5 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center hover:bg-white/15 transition-colors">
              <div className="text-3xl mb-2">🌍</div>
              <h3 className="text-white font-semibold text-sm">Global Opportunities</h3>
              <p className="text-indigo-300 text-xs mt-1">India, USA, Canada, Europe</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center hover:bg-white/15 transition-colors">
              <div className="text-3xl mb-2">🤖</div>
              <h3 className="text-white font-semibold text-sm">AI-First Hiring Focus</h3>
              <p className="text-indigo-300 text-xs mt-1">Top priority matching</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center hover:bg-white/15 transition-colors">
              <div className="text-3xl mb-2">💰</div>
              <h3 className="text-white font-semibold text-sm">Higher Pay Potential</h3>
              <p className="text-indigo-300 text-xs mt-1">30-50% salary uplift</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center hover:bg-white/15 transition-colors">
              <div className="text-3xl mb-2">🔒</div>
              <h3 className="text-white font-semibold text-sm">Secure Repository</h3>
              <p className="text-indigo-300 text-xs mt-1">Encrypted & protected</p>
            </div>
          </div>
        </div>
      </section>

      {/* Upload Form */}
      <section id="upload-form" className="py-16">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Form Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
              <h2 className="text-2xl font-bold text-white">📄 Upload Your Resume</h2>
              <p className="text-indigo-200 text-sm mt-1">Join our AI-driven talent repository</p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                  <span>⚠️</span> {error}
                </div>
              )}

              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-sm">1</span>
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email ID *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                    <div className="flex gap-2">
                      <select
                        name="countryCode"
                        value={formData.countryCode}
                        onChange={handleInputChange}
                        className="w-24 px-2 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                      >
                        <option value="+91">🇮🇳 +91</option>
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+971">🇦🇪 +971</option>
                        <option value="+65">🇸🇬 +65</option>
                        <option value="+61">🇦🇺 +61</option>
                        <option value="+49">🇩🇪 +49</option>
                      </select>
                      <input
                        type="tel"
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleInputChange}
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="9876543210"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Location *</label>
                    <div className="relative">
                      <input
                        ref={locationInputRef}
                        type="text"
                        value={locationInput}
                        onChange={(e) => handleLocationInputChange(e.target.value)}
                        onFocus={() => {
                          if (locationInput.trim().length > 0 && filteredLocations.length > 0) {
                            setShowLocationSuggestions(true)
                          }
                        }}
                        onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Start typing city name..."
                      />
                      {/* Location Suggestions Dropdown */}
                      {showLocationSuggestions && filteredLocations.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                          {filteredLocations.map((loc, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => selectLocation(loc)}
                              className="w-full px-4 py-2.5 text-left hover:bg-indigo-50 flex items-center gap-2 text-sm border-b border-gray-100 last:border-b-0"
                            >
                              <span className="text-gray-400">📍</span>
                              <span>{loc}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Details */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-sm">2</span>
                  Professional Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience *</label>
                    <select
                      name="experience"
                      value={formData.experience}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Experience</option>
                      {EXPERIENCE_OPTIONS.map(exp => (
                        <option key={exp} value={exp}>{exp}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Role / Designation *</label>
                    <input
                      type="text"
                      name="currentRole"
                      value={formData.currentRole}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Senior Software Engineer"
                    />
                  </div>
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Category *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(CATEGORIES).map(([key, cat]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleCategoryChange(key)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          formData.category === key
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        <span className="text-2xl">{cat.icon}</span>
                        <p className={`text-sm font-medium mt-1 ${formData.category === key ? 'text-indigo-700' : 'text-gray-700'}`}>
                          {cat.label}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub-category */}
                {formData.category && (
                  <div className="animate-fadeIn">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sub-Category *</label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES[formData.category as keyof typeof CATEGORIES].subCategories.map(sub => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, subCategory: sub }))}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            formData.subCategory === sub
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-indigo-100'
                          }`}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Skills * (max 15)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.skills.map(skill => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="w-4 h-4 rounded-full bg-indigo-200 hover:bg-indigo-300 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="relative">
                    <input
                      ref={skillInputRef}
                      type="text"
                      value={skillInput}
                      onChange={(e) => handleSkillInputChange(e.target.value)}
                      onKeyDown={handleSkillKeyDown}
                      onFocus={() => {
                        if (skillInput.trim().length > 0 && filteredSkills.length > 0) {
                          setShowSkillSuggestions(true)
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowSkillSuggestions(false), 200)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Start typing a skill (e.g., Python, Excel, Sales)..."
                    />
                    {/* Skills Suggestions Dropdown */}
                    {showSkillSuggestions && filteredSkills.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {filteredSkills.map((skill, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => addSkill(skill)}
                            className="w-full px-4 py-2.5 text-left hover:bg-indigo-50 flex items-center gap-2 text-sm border-b border-gray-100 last:border-b-0"
                          >
                            <span className="text-indigo-500">+</span>
                            <span>{skill}</span>
                          </button>
                        ))}
                        {/* Option to add custom skill */}
                        {skillInput.trim() && !filteredSkills.includes(skillInput.trim()) && (
                          <button
                            type="button"
                            onClick={() => addSkill(skillInput)}
                            className="w-full px-4 py-2.5 text-left hover:bg-green-50 flex items-center gap-2 text-sm bg-green-50/50 text-green-700"
                          >
                            <span>✓</span>
                            <span>Add "{skillInput.trim()}" as custom skill</span>
                          </button>
                        )}
                      </div>
                    )}
                    {/* Show add custom option when no matches */}
                    {showSkillSuggestions && filteredSkills.length === 0 && skillInput.trim() && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg">
                        <button
                          type="button"
                          onClick={() => addSkill(skillInput)}
                          className="w-full px-4 py-2.5 text-left hover:bg-green-50 flex items-center gap-2 text-sm text-green-700"
                        >
                          <span>✓</span>
                          <span>Add "{skillInput.trim()}" as custom skill</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Type to search skills or add your own. Press Enter to add.</p>
                </div>
              </div>

              {/* Resume Upload */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-sm">3</span>
                  Resume Upload
                </h3>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    resumeFile
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {resumeFile ? (
                    <div className="text-green-700">
                      <div className="text-4xl mb-2">✅</div>
                      <p className="font-medium">{resumeFile.name}</p>
                      <p className="text-sm text-green-600 mt-1">
                        {(resumeFile.size / 1024 / 1024).toFixed(2)} MB • Click to change
                      </p>
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <div className="text-4xl mb-2">📄</div>
                      <p className="font-medium text-gray-700">Click to upload your resume</p>
                      <p className="text-sm mt-1">PDF, DOC, DOCX • Max 5MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Optional Fields */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span className="w-8 h-8 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center text-sm">4</span>
                  Additional Information
                  <span className="text-sm font-normal text-gray-500">(Optional)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                    <input
                      type="url"
                      name="linkedinUrl"
                      value={formData.linkedinUrl}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="https://linkedin.com/in/yourprofile"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio / GitHub / Website</label>
                    <input
                      type="url"
                      name="portfolioUrl"
                      value={formData.portfolioUrl}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="https://yourportfolio.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Job Locations</label>
                    <input
                      type="text"
                      name="preferredLocations"
                      value={formData.preferredLocations}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Mumbai, Bangalore, Remote"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Open to Remote Roles?</label>
                    <select
                      name="openToRemote"
                      value={formData.openToRemote}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select</option>
                      <option value="yes">Yes, open to remote</option>
                      <option value="no">No, prefer on-site</option>
                      <option value="hybrid">Prefer hybrid</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* AI Employability Block */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">🚀</div>
                  <div>
                    <h4 className="font-bold text-amber-900 mb-2">Why AI Skills Matter Now</h4>
                    <ul className="text-sm text-amber-800 space-y-1">
                      <li>• AI skills are becoming <strong>mandatory</strong> across all white-collar roles</li>
                      <li>• Recruiters prefer <strong>AI-aware professionals</strong> for new opportunities</li>
                      <li>• Uploading increases visibility for <strong>global, high-paying roles</strong></li>
                      <li>• AI-skilled professionals command <strong>30-50% higher salaries</strong></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Consent */}
              <div className="pt-4 border-t">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="consent"
                    checked={formData.consent}
                    onChange={handleInputChange}
                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">
                    I consent to my profile being stored securely and used for recruiter matching and career opportunities. 
                    I understand my data will be handled as per the privacy policy. *
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-xl hover:shadow-indigo-500/30 transform hover:scale-[1.02]'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Uploading...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Submit My Resume
                  </span>
                )}
              </button>

              {/* Security Note */}
              <p className="text-center text-xs text-gray-500 flex items-center justify-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Your data is encrypted and securely stored. We never share without consent.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/10">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <span className="text-white font-semibold">WithArijit.com</span>
          </div>
          <p className="text-indigo-300 text-sm">
            © {new Date().getFullYear()} AIwithArijit.com • AI & Agentic AI Training
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <a href="https://AIwithArijit.com" className="text-indigo-400 hover:text-white text-sm">Website</a>
            <a href="https://www.linkedin.com/in/arijit-chowdhury-86020b19/" className="text-indigo-400 hover:text-white text-sm">LinkedIn</a>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
