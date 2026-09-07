import { z } from 'zod';
import { CITY_BY_ID } from './cities';
export const QUESTIONS = [
  {
    id: 'spark',
    title: 'Any sparks in the forecast?',
    question: 'How easy is it to meet someone you want to meet again?',
    low: 'Painfully difficult',
    high: 'Surprisingly easy',
    icon: 'sparkles',
    aside: 'A second date. Ambitious. We like it.',
  },
  {
    id: 'followThrough',
    title: 'Do plans leave the group chat?',
    question: 'How often do date plans actually happen?',
    low: 'Almost never',
    high: 'Almost always',
    icon: 'calendar',
    aside: '“We should grab a drink” is not a legally binding contract.',
  },
  {
    id: 'affordability',
    title: 'Romance or a small bank loan?',
    question: 'How affordable is a first date that feels good to you?',
    low: 'Very unaffordable',
    high: 'Very affordable',
    icon: 'coffee',
    aside: 'A park bench can have excellent chemistry.',
  },
  {
    id: 'clarity',
    title: 'What are we, meteorologically?',
    question: 'How clear are people about what they are looking for?',
    low: 'Fog machine',
    high: 'Crystal clear',
    icon: 'cloud',
    aside: 'A situationship is not an official weather system. Yet.',
  },
  {
    id: 'authenticity',
    title: 'Can you bring your whole weird self?',
    question: 'How comfortable do you feel being yourself on dates?',
    low: 'Not comfortable',
    high: 'Completely myself',
    icon: 'heart',
    aside: 'Yes, including your very specific Wikipedia interests.',
  },
  {
    id: 'ghosting',
    title: 'Any paranormal activity?',
    question: 'How often do conversations vanish without a goodbye?',
    low: 'Never',
    high: 'Very often',
    icon: 'ghost',
    aside: 'We are measuring the weather. No exes will be subpoenaed.',
  },
  {
    id: 'logistics',
    title: 'Is the commute the third person?',
    question: 'How much do distance and travel make dating harder?',
    low: 'Hardly at all',
    high: 'A great deal',
    icon: 'train',
    aside: 'Long distance, but somehow you are both in the same city.',
  },
  {
    id: 'hope',
    title: 'Would you send a friend into this?',
    question: 'Would you recommend dating here to a friend you actually like?',
    low: 'Definitely not',
    high: 'Absolutely',
    icon: 'sun',
    aside: 'The friend you like. That part is important.',
  },
] as const;
export type QuestionId = (typeof QUESTIONS)[number]['id'];
export type Answers = Record<QuestionId, number | null>;
export const EMPTY_ANSWERS: Answers = {
  spark: null,
  followThrough: null,
  affordability: null,
  clarity: null,
  authenticity: null,
  ghosting: null,
  logistics: null,
  hope: null,
};
const score = z.number().int().min(1).max(5).nullable();
export const draftAnswersSchema = z
  .object({
    spark: score,
    followThrough: score,
    affordability: score,
    clarity: score,
    authenticity: score,
    ghosting: score,
    logistics: score,
    hope: score,
  })
  .strict();
export const answersSchema = draftAnswersSchema.refine(
  (a) => Object.values(a).filter((v) => v !== null).length >= 4,
  'Please answer at least four questions.',
);
export const submissionSchema = z
  .object({
    cityId: z
      .string()
      .refine((id) => CITY_BY_ID.has(id), 'Choose a city in the atlas.'),
    answers: answersSchema,
    habitat: z.enum(['apps', 'friends', 'irl', 'hobbies', 'none']),
    adult: z.literal(true),
    resident: z.literal(true),
    consent: z.literal(true),
    idempotencyKey: z.uuid(),
    website: z.string().max(0).optional(),
  })
  .strict();
export type Submission = z.infer<typeof submissionSchema>;
export const HABITATS = [
  {
    id: 'apps',
    label: 'The apps',
    detail: 'Dating apps or dating websites',
    emoji: '📱',
  },
  {
    id: 'friends',
    label: 'Friends of friends',
    detail: 'Introductions through people you know',
    emoji: '🤝',
  },
  {
    id: 'irl',
    label: 'Out in the wild',
    detail: 'Cafés, gigs, happy accidents',
    emoji: '☕',
  },
  {
    id: 'hobbies',
    label: 'Shared interests',
    detail: 'Hobbies, clubs or shared activities',
    emoji: '🎨',
  },
  {
    id: 'none',
    label: 'Still looking',
    detail: 'I have not found a usual way to meet people',
    emoji: '🪐',
  },
] as const;
