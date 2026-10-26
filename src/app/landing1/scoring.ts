import type { Answers } from './types';

// Computes an honest AI-readiness score (0-100) from the quiz answers.
// The rubric is weighted toward self-reported comfort / experience, so true
// beginners genuinely land in the low-to-medium band while advanced builders
// score higher. Nothing is hard-coded — the number reflects what they told us.

const POINTS: Record<string, Record<string, number>> = {
  comfort: {
    "I'm comfortable": 22,
    'I struggle sometimes': 14,
    'I struggle a lot': 7,
    "I don't know anything": 2,
  },
  experience: {
    'Completely new to AI': 3,
    'Tried a few times for simple tasks': 10,
    'Use AI regularly for work or personal projects': 18,
    'I build AI workflows for complex tasks': 25,
  },
  afraid: {
    Always: 3,
    Often: 6,
    Sometimes: 10,
    'Not really': 15,
  },
  overwhelmed: {
    Always: 3,
    Often: 6,
    Sometimes: 10,
    'Not really': 15,
  },
  tried_courses: {
    'No, this is my first time': 3,
    'Free resources (YouTube, articles)': 7,
    'Paid course on another platform': 11,
    'I use AI but want structured learning': 13,
  },
  comfortable_online: {
    Yes: 10,
    'Not sure': 5,
    No: 2,
  },
};

const MAX = 22 + 25 + 15 + 15 + 13 + 10; // = 100

export function computeReadiness(answers: Answers): number {
  let total = 0;
  for (const field of Object.keys(POINTS)) {
    const val = answers[field];
    if (val && POINTS[field][val] != null) total += POINTS[field][val];
  }
  const pct = Math.round((total / MAX) * 100);
  // Clamp to a sensible visible range (never a scary 0, never a complacent 100).
  return Math.max(12, Math.min(96, pct));
}

export function readinessBand(score: number): 'Low' | 'Medium' | 'High' {
  if (score < 40) return 'Low';
  if (score < 70) return 'Medium';
  return 'High';
}
