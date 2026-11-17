import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1, 'Mongodb_URI is empty in Backend/.env'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  GROQ_API_KEY: z.string().optional(),
  /** Chosen by evaluation, behind the provider interface so it can be swapped (ADR 0004). */
  GROQ_MODEL: z.string().default('openai/gpt-oss-120b'),
  /** Suggestions per signed in account per day. */
  AI_DAILY_LIMIT: z.coerce.number().int().min(1).max(500).default(25),
  /** Email through Resend. Both must be set, otherwise messages are only logged (development). */
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  /**
   * Keep 'lax' when the app and API share a registrable domain (app.example.org and api.example.org).
   * Use 'none' only when they are on different sites, for example two onrender.com subdomains,
   * and accept that browsers that block third party cookies will break sign in.
   */
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(30),
});

// The provisioned .env uses mixed case names; accept both spellings.
const source = {
  ...process.env,
  MONGODB_URI: process.env.MONGODB_URI ?? process.env.Mongodb_URI,
  GROQ_API_KEY: process.env.GROQ_API_KEY ?? process.env.Groq_API_KEY,
};

const testDefaults = {
  MONGODB_URI: 'mongodb://127.0.0.1/selah-test',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
  JWT_REFRESH_SECRET: 'y'.repeat(32),
};

// ?? so an undefined value never overwrites a default (a plain spread would).
const input =
  process.env.NODE_ENV === 'test'
    ? {
        ...source,
        // Tests never use the real database, whatever .env says. They start their own in memory one.
        MONGODB_URI: testDefaults.MONGODB_URI,
        JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? testDefaults.JWT_ACCESS_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? testDefaults.JWT_REFRESH_SECRET,
      }
    : source;

const parsed = schema.safeParse(input);

if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
  // Fail fast at boot, a half configured API is worse than one that refuses to start.
  console.error(`Invalid environment configuration:\n${lines.join('\n')}`);
  process.exit(1);
}

// Render sets RENDER. Running there without NODE_ENV=production would log reset links to the console.
if (process.env.RENDER && process.env.NODE_ENV !== 'production') {
  console.error('NODE_ENV must be production on Render. Refusing to start.');
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
