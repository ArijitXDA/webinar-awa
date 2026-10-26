// Shared types for the landing1 paginated registration funnel.

export type Choice = {
  value: string;
  label: string;
  sub?: string;
};

export type QuestionStep = {
  kind: 'question';
  id: string;
  field: string; // key under which the answer is stored
  title: string;
  subtitle?: string;
  choices: Choice[];
  // When set, the chosen value is also mapped onto a first-class registration
  // field (e.g. the DB `age` bucket or `daily_goal_minutes`).
  mapTo?: 'age' | 'daily_goal_minutes';
};

export type StatementStep = {
  kind: 'statement';
  id: string;
  eyebrow?: string;
  title: string;
  body?: string;
  image?: string;
  cta?: string;
};

export type LoaderStep = {
  kind: 'loader';
  id: string;
  title: string;
  testimonial?: { quote: string; name: string; title: string };
};

export type InputStep = {
  kind: 'email' | 'name' | 'contact';
  id: string;
  title: string;
  subtitle?: string;
};

export type CourseStep = {
  kind: 'course';
  id: string;
  title: string;
  subtitle?: string;
};

export type SimpleStep = {
  kind: 'partnerIntro' | 'summary' | 'program' | 'learn' | 'proof';
  id: string;
};

export type Step =
  | QuestionStep
  | StatementStep
  | LoaderStep
  | InputStep
  | CourseStep
  | SimpleStep;

export type Answers = Record<string, string>;

export type PartnerCard = {
  display_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  whatsapp: string | null;
  partner_code: string | null;
  is_poc?: boolean | null;
  use_ostaran?: boolean | null;
};

export type WebinarCourse = {
  course_id: number;
  course_name: string;
  course_short_name?: string | null;
  webinar_date: string | null;
  webinar_time: string | null;
  timezone?: string | null;
  current_registrations?: number | null;
  max_registrations?: number | null;
};
