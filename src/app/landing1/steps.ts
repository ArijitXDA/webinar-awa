import type { Step } from './types';

// Ordered funnel definition. Interstitial "statement" screens, the loader, the
// email/name/contact/course inputs and the summary/program/learn/proof screens
// are interleaved with the single-select questions. Each question auto-advances
// on selection. No emoji, no robot imagery — professional throughout.

const UNSPLASH = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const STEPS: Step[] = [
  { kind: 'partnerIntro', id: 'partner-intro' },

  // 1
  {
    kind: 'question',
    id: 'self',
    field: 'self_description',
    title: 'How would you describe yourself?',
    choices: [
      { value: 'I work for a company', label: 'I work for a company' },
      { value: 'I work for myself', label: 'I work for myself' },
    ],
  },

  // 2 — social proof (real oStaran figure)
  {
    kind: 'statement',
    id: 'proof-1',
    eyebrow: 'You are in good company',
    title: '50,000+ learners have trained with oStaran',
    body: 'Across India, the USA and Canada, professionals and students are building real AI skills with us. Millions more are racing to learn AI worldwide — this is your moment to start.',
    image: UNSPLASH('1522071820081-009f0129c71c'),
    cta: 'Continue',
  },

  // 3
  {
    kind: 'question',
    id: 'age',
    field: 'age',
    mapTo: 'age',
    title: 'How old are you?',
    subtitle: 'We will personalize your AI program based on your answers.',
    choices: [
      { value: '18-24', label: '18 – 24' },
      { value: '25-34', label: '25 – 34' },
      { value: '35-44', label: '35 – 44' },
      { value: '45-54', label: '45 – 54' },
      { value: '55+', label: '55+' },
    ],
  },

  // 4
  {
    kind: 'question',
    id: 'goal',
    field: 'goal',
    title: 'What is your main goal with AI?',
    choices: [
      { value: 'Grow in my current role', label: 'Grow in my current role' },
      { value: 'Switch to a new career', label: 'Switch to a new career' },
      { value: 'Build skills for freelance work', label: 'Build skills for freelance work' },
      { value: 'Work remotely or independently', label: 'Work remotely or independently' },
      { value: 'Use AI for personal projects', label: 'Use AI for personal projects' },
      { value: 'Other', label: 'Other' },
    ],
  },

  // 5
  {
    kind: 'question',
    id: 'industry',
    field: 'industry',
    title: 'What industry do you work in?',
    choices: [
      { value: 'Tech / IT', label: 'Tech / IT' },
      { value: 'Finance / Accounting', label: 'Finance / Accounting' },
      { value: 'Marketing / Media', label: 'Marketing / Media' },
      { value: 'Healthcare', label: 'Healthcare' },
      { value: 'Education', label: 'Education' },
      { value: 'Sales / Business Dev', label: 'Sales / Business Dev' },
      { value: 'Operations / Management', label: 'Operations / Management' },
      { value: 'Other', label: 'Other' },
    ],
  },

  // 6
  {
    kind: 'question',
    id: 'overwhelmed',
    field: 'overwhelmed',
    title: 'Do you feel overwhelmed by AI?',
    choices: [
      { value: 'Always', label: 'Always' },
      { value: 'Often', label: 'Often' },
      { value: 'Sometimes', label: 'Sometimes' },
      { value: 'Not really', label: 'Not really' },
    ],
  },

  // 7
  {
    kind: 'question',
    id: 'comfort',
    field: 'comfort',
    title: 'How comfortable are you using AI tools right now?',
    choices: [
      { value: "I'm comfortable", label: "I'm comfortable" },
      { value: 'I struggle sometimes', label: 'I struggle sometimes' },
      { value: 'I struggle a lot', label: 'I struggle a lot' },
      { value: "I don't know anything", label: "I don't know anything" },
    ],
  },

  // 8 — reassurance
  {
    kind: 'statement',
    id: 'reassure',
    eyebrow: 'You are not behind',
    title: 'Worry no more — we will help you gain your confidence back',
    body: 'We have helped tens of thousands of adults master AI, and we can help you too. Every program is backed by hours of research and content crafted to your needs and skill level.',
    image: UNSPLASH('1600880292203-757bb62b4baf'),
    cta: 'Continue',
  },

  // 9
  {
    kind: 'question',
    id: 'afraid',
    field: 'afraid',
    title: 'Are you afraid to fall behind the AI trend?',
    choices: [
      { value: 'Always', label: 'Always' },
      { value: 'Often', label: 'Often' },
      { value: 'Sometimes', label: 'Sometimes' },
      { value: 'Not really', label: 'Not really' },
    ],
  },

  // 10
  {
    kind: 'question',
    id: 'experience',
    field: 'experience',
    title: 'What best describes your experience with AI?',
    choices: [
      { value: 'Completely new to AI', label: 'Completely new to AI' },
      { value: 'Tried a few times for simple tasks', label: 'Tried a few times for simple tasks' },
      { value: 'Use AI regularly for work or personal projects', label: 'Use AI regularly for work or personal projects' },
      { value: 'I build AI workflows for complex tasks', label: 'I build AI workflows for complex tasks' },
    ],
  },

  // 11
  {
    kind: 'question',
    id: 'blocker',
    field: 'blocker',
    title: "What's the #1 thing holding you back from using AI effectively?",
    choices: [
      { value: 'No clear system or roadmap', label: 'No clear system or roadmap' },
      { value: 'Not enough time', label: 'Not enough time' },
      { value: 'Too complicated for me', label: 'Too complicated for me' },
      { value: "Don't know where to start", label: "Don't know where to start" },
    ],
  },

  // 12
  {
    kind: 'question',
    id: 'career_level',
    field: 'career_level',
    title: 'What best describes your career level?',
    choices: [
      { value: 'Student or early career', label: 'Student or early career' },
      { value: 'Individual contributor', label: 'Individual contributor' },
      { value: 'Manager / Team lead', label: 'Manager / Team lead' },
      { value: 'Executive / Business owner', label: 'Executive / Business owner' },
      { value: 'Retired', label: 'Retired' },
    ],
  },

  // 13
  {
    kind: 'question',
    id: 'concern',
    field: 'concern',
    title: 'When you think about AI and your career, what concerns you most?',
    choices: [
      { value: 'Falling behind colleagues who use AI', label: 'Falling behind colleagues who use AI' },
      { value: 'My job becoming automated', label: 'My job becoming automated' },
      { value: 'Not having the right skills for my job', label: 'Not having the right skills for my job' },
      { value: 'Nothing — I see AI as an opportunity', label: 'Nothing — I see AI as an opportunity' },
    ],
  },

  // 14 — encouragement
  {
    kind: 'statement',
    id: 'hardest-part',
    eyebrow: 'Good news',
    title: "You've got the hardest part already",
    body: "You're approaching AI the right way — as something to use, not fear. A structured path turns that mindset into hands-on skills and a certificate you can show.",
    image: UNSPLASH('1517245386807-bb43f82c33c4'),
    cta: 'Continue',
  },

  // 15
  {
    kind: 'question',
    id: 'tried_courses',
    field: 'tried_courses',
    title: 'Have you tried other courses or resources to learn AI?',
    choices: [
      { value: 'No, this is my first time', label: 'No, this is my first time' },
      { value: 'Free resources (YouTube, articles)', label: 'Free resources (YouTube, articles)' },
      { value: 'Paid course on another platform', label: 'Paid course on another platform' },
      { value: 'I use AI but want structured learning', label: 'I use AI but want structured learning' },
    ],
  },

  // 16
  {
    kind: 'question',
    id: 'comfortable_online',
    field: 'comfortable_online',
    title: 'Are you comfortable learning new skills online?',
    choices: [
      { value: 'Yes', label: 'Yes' },
      { value: 'Not sure', label: 'Not sure' },
      { value: 'No', label: 'No' },
    ],
  },

  // 17
  {
    kind: 'question',
    id: 'first_week',
    field: 'first_week_result',
    title: 'What result do you want in your first week?',
    choices: [
      { value: 'Write my first AI prompt', label: 'Write my first AI prompt' },
      { value: 'Automate tasks at work', label: 'Automate tasks at work' },
      { value: 'Create new content', label: 'Create new content' },
      { value: 'Launch a side project with AI', label: 'Launch a side project with AI' },
    ],
  },

  // 18 — daily goal (daily practice on real projects; weekly equivalent shown)
  {
    kind: 'question',
    id: 'daily_goal',
    field: 'daily_goal',
    mapTo: 'daily_goal_minutes',
    title: "Let's set your daily AI mastering goal",
    subtitle: 'Short, consistent practice on real projects beats long, rare sessions.',
    choices: [
      { value: '10', label: '10 min / day', sub: 'about 70 min a week' },
      { value: '20', label: '20 min / day', sub: 'about 140 min a week' },
      { value: '30', label: '30 min / day', sub: 'about 210 min a week' },
      { value: '60', label: '60 min / day', sub: 'about 420 min a week' },
    ],
  },

  // 19
  {
    kind: 'question',
    id: 'celebrate',
    field: 'celebrate',
    title: 'How would you celebrate your first results with AI?',
    subtitle: 'Setting goals and rewarding yourself keeps you motivated.',
    choices: [
      { value: 'Pay off some bills', label: 'Pay off some bills' },
      { value: 'Add to a retirement fund', label: 'Add to a retirement fund' },
      { value: 'Add to an emergency fund', label: 'Add to an emergency fund' },
      { value: 'Plan a vacation', label: 'Plan a vacation' },
      { value: 'Other', label: 'Other' },
    ],
  },

  // 20 — progress
  {
    kind: 'statement',
    id: 'progress',
    eyebrow: 'Momentum matters',
    title: "You're already making progress",
    body: 'Research shows that clear goals and small rewards boost motivation and consistency. We will help you set targets, highlight small wins and keep your momentum going.',
    image: UNSPLASH('1434030216411-0b793f4b4173'),
    cta: 'Continue',
  },

  // 21 — analyzing loader
  {
    kind: 'loader',
    id: 'analyzing',
    title: 'Analyzing your answers to personalize your AI Certificate Program',
    testimonial: {
      quote: 'Clear, practical and genuinely useful. I finally understand how to put AI to work in my own job.',
      name: 'Dakshayani B P',
      title: 'Scientist, ISRO',
    },
  },

  // 22
  {
    kind: 'email',
    id: 'email',
    title: 'Enter your email to get your personalized AI program',
    subtitle: 'We respect your privacy and protect your personal data. Your details are processed per our Privacy Policy.',
  },

  // 23
  {
    kind: 'name',
    id: 'name',
    title: 'What should we call you?',
    subtitle: 'We will use this to personalize your program and certificate.',
  },

  // added — phone + course selection (needed for the real webinar registration)
  {
    kind: 'contact',
    id: 'contact',
    title: 'Where should we send your joining link?',
    subtitle: 'Your WhatsApp number is used only for your webinar reminders and joining link.',
  },
  {
    kind: 'course',
    id: 'course',
    title: 'Choose your free webinar',
    subtitle: 'Pick the track that fits you best.',
  },

  // 24
  { kind: 'summary', id: 'summary' },
  // 25
  { kind: 'program', id: 'program' },
  // 26
  { kind: 'learn', id: 'learn' },
  // 27
  { kind: 'proof', id: 'proof' },
];
