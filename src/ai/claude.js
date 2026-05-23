/**
 * AI client for NexusLife — calls the gemini-proxy Cloudflare Worker so the
 * Gemini API key stays server-side. The proxy verifies the caller's Google
 * OAuth access token (same one used for Drive) belongs to the allowed email
 * before forwarding to Gemini — safe to ship in a public bundle.
 *
 * Function names still start with `callClaude` for backwards compatibility
 * with all the feature helpers and external imports — only the implementation
 * underneath changed.
 *
 * All helpers return either a string/object or `null` on failure. They never
 * throw — UI code can safely render fallbacks.
 */

import { useDriveAuthStore } from '../store/useDriveAuthStore.js';

const PROXY_URL = import.meta.env.VITE_GEMINI_PROXY_URL;
const DEFAULT_MODEL =
  import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash-lite';
const HEAVY_MODEL = 'gemini-2.5-flash';

export function isAIAvailable() {
  return Boolean(PROXY_URL) && PROXY_URL.startsWith('http');
}

function currentAccessToken() {
  const t = useDriveAuthStore.getState().token;
  if (!t || !t.accessToken) return null;
  if (Date.now() >= t.expiresAt) return null;
  return t.accessToken;
}

/**
 * Translate a JSON-Schema-style object to Gemini's responseSchema format.
 * Gemini uses uppercase OpenAPI types and a subset of JSON Schema fields.
 */
function toGeminiSchema(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  const out = {};
  if (schema.type) {
    out.type =
      typeof schema.type === 'string' ? schema.type.toUpperCase() : schema.type;
  }
  if (schema.description) out.description = schema.description;
  if (schema.enum) out.enum = schema.enum;
  if (schema.properties) {
    out.properties = {};
    for (const [k, v] of Object.entries(schema.properties)) {
      out.properties[k] = toGeminiSchema(v);
    }
  }
  if (schema.items) out.items = toGeminiSchema(schema.items);
  if (schema.required) out.required = schema.required;
  // Skip additionalProperties / minItems / maxItems — Gemini ignores or rejects them
  return out;
}

/**
 * Translate Claude-style model names (kept around in case any caller still
 * passes one) to a sensible Gemini equivalent.
 */
function resolveModel(name) {
  if (!name) return DEFAULT_MODEL;
  if (name.startsWith('gemini-')) return name;
  // Anthropic naming → Gemini equivalent
  if (name.includes('opus')) return HEAVY_MODEL;
  if (name.includes('haiku')) return 'gemini-2.5-flash-lite';
  return DEFAULT_MODEL;
}

async function geminiGenerate({
  system,
  user,
  model,
  maxTokens = 1024,
  responseMimeType,
  responseSchema,
}) {
  if (!isAIAvailable()) return null;
  const token = currentAccessToken();
  if (!token) {
    console.warn('[gemini] no valid Google OAuth token — sign in to Drive first');
    return null;
  }

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: typeof user === 'string' ? user : String(user) }],
      },
    ],
    generationConfig: {
      maxOutputTokens: maxTokens,
    },
  };
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }
  if (responseMimeType) {
    body.generationConfig.responseMimeType = responseMimeType;
  }
  if (responseSchema) {
    body.generationConfig.responseSchema = responseSchema;
  }

  try {
    const res = await fetch(
      `${PROXY_URL}/v1beta/models/${resolveModel(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[gemini] HTTP', res.status, errText);
      return null;
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || '')
      .join('\n')
      .trim();
    return text || null;
  } catch (err) {
    console.error('[gemini] call failed', err);
    return null;
  }
}

/**
 * Low-level call. Returns the response text or null.
 * Signature preserved from the Claude version — `thinking` and `outputConfig`
 * params are accepted but ignored (Gemini handles reasoning internally).
 */
export async function callClaude({
  system,
  user,
  model,
  maxTokens = 1024,
  // eslint-disable-next-line no-unused-vars
  thinking = false,
  // eslint-disable-next-line no-unused-vars
  outputConfig,
}) {
  return geminiGenerate({ system, user, model, maxTokens });
}

/**
 * Call the model with a JSON schema for structured outputs. Returns the parsed
 * object or null on failure. Uses Gemini's responseMimeType + responseSchema.
 */
export async function callClaudeJSON({ system, user, schema, model, maxTokens }) {
  const text = await geminiGenerate({
    system,
    user,
    model,
    maxTokens: maxTokens || 1024,
    responseMimeType: 'application/json',
    responseSchema: schema ? toGeminiSchema(schema) : undefined,
  });
  if (!text) return null;
  try {
    const cleaned = text
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn('[gemini] JSON parse failed', err, text);
    return null;
  }
}

// ---------- Feature-specific helpers ----------

const QUOTE_SYSTEM = `You are NexusLife, a space-themed personal mission control AI for a single user named Nishanth.
Your tone is calm, motivating, and slightly futuristic — like a friendly mission control operator.
You write in concise, vivid English. Never use markdown formatting in your output.`;

/**
 * Personalized motivational quote for the Dashboard.
 * Pass in lightweight context — current streaks, active goals, recent mood.
 */
export async function motivationalQuote(context = {}) {
  const { activeGoals = [], topStreak = 0, recentMood = null } = context;
  const userMsg = `Generate one short (max 2 sentences) personalized motivational quote.

Context:
- Top habit streak: ${topStreak} day(s)
- Active goals: ${activeGoals.slice(0, 3).join('; ') || 'none yet'}
- Recent mood: ${recentMood || 'unknown'}

Output ONLY the quote text. No preamble, no quotation marks, no emojis.`;
  return callClaude({ system: QUOTE_SYSTEM, user: userMsg, maxTokens: 200 });
}

/**
 * Daily journaling prompt — a single thoughtful question.
 */
export async function reflectionPrompt(context = {}) {
  const { recentMood, hour = new Date().getHours() } = context;
  const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const userMsg = `Generate one reflective journal prompt for ${timeOfDay}.
Mood today: ${recentMood || 'unknown'}.
Output ONLY the question, no preamble. Max 20 words.`;
  return callClaude({ system: QUOTE_SYSTEM, user: userMsg, maxTokens: 120 });
}

/**
 * Generate a step-by-step roadmap (3-7 milestones) for a goal.
 * Returns an array of strings, or null.
 */
export async function goalRoadmap({ title, description, targetDate, category }) {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      milestones: {
        type: 'array',
        items: { type: 'string' },
        description: '3 to 7 ordered, action-oriented milestones to reach the goal.',
      },
    },
    required: ['milestones'],
  };
  const sys = `${QUOTE_SYSTEM}

You break goals into 3-7 concrete, ordered milestones.
Each milestone is one short imperative sentence ("Draft outline", "Ship MVP", etc.).
Output strict JSON matching the provided schema.`;

  const userMsg = `Goal: ${title}
${description ? `Description: ${description}` : ''}
${targetDate ? `Target date: ${targetDate}` : ''}
${category ? `Category: ${category}` : ''}

Generate the milestone list.`;
  const out = await callClaudeJSON({
    system: sys,
    user: userMsg,
    schema,
    maxTokens: 800,
  });
  return out?.milestones || null;
}

/**
 * Regex-based UPI SMS parser. Runs first so the amount fills in even if
 * Claude is unavailable or returns junk. Handles common Indian bank patterns.
 */
function parseUPIRegex(raw) {
  if (!raw) return null;
  const s = String(raw);

  // The transaction amount is whichever Rs.<n> is associated with an action
  // verb (debited/credited/paid/spent/sent). Avoid "Total Balance", "Avl Bal".
  let amount = 0;
  const verbAmount = s.match(
    /(?:debited(?:\s+by)?|credited(?:\s+by)?|paid|spent|sent|received|debit\s+of|credit\s+of|of)\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d+)?)/i
  );
  if (verbAmount) {
    amount = Number(verbAmount[1].replace(/,/g, ''));
  } else {
    // Fallback: first Rs amount that isn't immediately preceded by "balance"
    const all = [...s.matchAll(/(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d+)?)/gi)];
    for (const m of all) {
      const before = s.slice(Math.max(0, m.index - 25), m.index).toLowerCase();
      if (!/(balance|bal|avl)/.test(before)) {
        amount = Number(m[1].replace(/,/g, ''));
        break;
      }
    }
  }

  const isCredit = /credit/i.test(s) && !/debited/i.test(s);

  // Date: DD/MM/YYYY or DD-MM-YYYY or DD-MM-YY
  let date = '';
  const dm = s.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})/);
  if (dm) {
    const [, dd, mm, yy] = dm;
    const year = yy.length === 2 ? `20${yy}` : yy;
    date = `${year}-${mm}-${dd}`;
  }

  // Merchant: "at <MERCHANT>" or "to <MERCHANT>", uppercase token run
  let merchant = '';
  const mm2 = s.match(
    /(?:at|to|@)\s+([A-Z][A-Z0-9 .&\-_]{1,30}?)(?=\s+UPI|\s+Ref|\s+on|\s+Avl|\s+Total|\.|,|$)/
  );
  if (mm2) merchant = mm2[1].trim();

  return {
    amount: amount || 0,
    merchant,
    type: isCredit ? 'credit' : 'debit',
    date,
    category: 'others',
  };
}

const CATEGORY_LIST = [
  'food',
  'transport',
  'shopping',
  'entertainment',
  'health',
  'education',
  'others',
];

/**
 * Parse a raw UPI SMS body into structured fields.
 * Returns { amount, merchant, type, date, category } — never null. Falls back
 * to regex extraction if Claude is unavailable or returns unparseable output.
 */
export async function parseUPISMS(rawSMS) {
  const regex = parseUPIRegex(rawSMS) || {
    amount: 0,
    merchant: '',
    type: 'debit',
    date: '',
    category: 'others',
  };

  const sys = `You parse Indian bank / UPI SMS messages into JSON.

Output ONLY valid minified JSON. No markdown fences, no commentary, no preamble.

Schema:
{
  "amount":  <number>,        // The TRANSACTION amount in INR — NOT the account balance
  "merchant": "<string>",     // Payee/shop name if present, else ""
  "type":    "debit" | "credit",
  "date":    "YYYY-MM-DD",    // Transaction date if present, else ""
  "category": "food" | "transport" | "shopping" | "entertainment" | "health" | "education" | "others"
}

Critical rules:
- "amount" is the debited / credited / paid / spent value. NEVER use "Total Balance", "Avl Bal", "Clear Balance", or any balance figure.
- If multiple Rs amounts appear, pick the one tied to a verb like debited/credited/paid/spent.
- merchant is empty "" when the SMS is a generic bank notification with no payee.
- category guidance: food (Swiggy/Zomato/restaurants/grocery), transport (Uber/Ola/Metro/petrol/fuel), shopping (Amazon/Flipkart/retail), entertainment (Netflix/BookMyShow), health (pharmacy/hospital/clinic), education (Udemy/Coursera/books), others (default — bank-to-bank, ATM, unknown).

Examples:

SMS: "Rs.245.00 debited from a/c **1234 at SWIGGY UPI Ref 12345. Avl Bal Rs.18,432.00"
JSON: {"amount":245,"merchant":"SWIGGY","type":"debit","date":"","category":"food"}

SMS: "Your Account XXX260599 is debited by Rs. 1 Total Balance : Rs. 1,398.70 Clear Balance : Rs. 1,398.70 23/05/2026:12:49"
JSON: {"amount":1,"merchant":"","type":"debit","date":"2026-05-23","category":"others"}

SMS: "INR 500.00 credited to a/c via UPI Ref 99999 on 22-05-26"
JSON: {"amount":500,"merchant":"","type":"credit","date":"2026-05-22","category":"others"}

SMS: "Sent Rs.120 to OLA CABS via UPI on 21/05/2026. Avl Bal Rs.5,000"
JSON: {"amount":120,"merchant":"OLA CABS","type":"debit","date":"2026-05-21","category":"transport"}`;

  const out = await callClaude({
    system: sys,
    user: `SMS:\n${rawSMS}\n\nReturn the JSON now.`,
    maxTokens: 300,
  });

  if (!out) return regex;

  let parsed;
  try {
    const cleaned = out
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    parsed =
      firstBrace >= 0 && lastBrace > firstBrace
        ? JSON.parse(cleaned.slice(firstBrace, lastBrace + 1))
        : JSON.parse(cleaned);
  } catch (err) {
    console.warn('[parseUPISMS] JSON parse failed, using regex fallback', err);
    return regex;
  }

  const amt = Number(parsed.amount);
  const cat = CATEGORY_LIST.includes(parsed.category) ? parsed.category : regex.category;

  return {
    amount: Number.isFinite(amt) && amt > 0 ? amt : regex.amount,
    merchant: typeof parsed.merchant === 'string' ? parsed.merchant : regex.merchant,
    type: parsed.type === 'credit' ? 'credit' : 'debit',
    date: typeof parsed.date === 'string' && parsed.date ? parsed.date : regex.date,
    category: cat,
  };
}

/**
 * Weekly expense insights — 2-3 short tips based on recent spending.
 */
export async function expenseInsights({ totalThisWeek, byCategory = {}, topMerchants = [] }) {
  const userMsg = `Recent expense summary (in ₹):
- Total this week: ₹${totalThisWeek}
- By category: ${Object.entries(byCategory).map(([k, v]) => `${k}: ₹${v}`).join(', ')}
- Top merchants: ${topMerchants.slice(0, 5).join(', ')}

Give 2-3 short, specific saving tips. Each tip is one sentence, starts with a verb. No preamble.`;
  return callClaude({
    system: QUOTE_SYSTEM,
    user: userMsg,
    maxTokens: 400,
  });
}

/**
 * "What to study next" — picks the single most important learning item to focus on.
 * Returns { itemTitle, reason } or null.
 */
export async function studyNextMission({ items = [] }) {
  if (!items.length) return null;
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      itemTitle: { type: 'string', description: 'Exact title from the input list.' },
      reason: { type: 'string', description: 'One short sentence explaining why.' },
    },
    required: ['itemTitle', 'reason'],
  };
  const sys = `${QUOTE_SYSTEM}

You pick exactly ONE learning item from the user's list — the highest-leverage one to study next given their progress and last-studied dates.`;

  const itemsText = items
    .map(
      (i, idx) =>
        `${idx + 1}. "${i.title}" (${i.type}, ${i.progress}% done, last studied ${
          i.lastStudied || 'never'
        })`
    )
    .join('\n');

  return callClaudeJSON({
    system: sys,
    user: `Items:\n${itemsText}\n\nPick the one to study next.`,
    schema,
    maxTokens: 300,
  });
}

/**
 * Habit suggestion — 3 ideas tailored to existing habits.
 */
export async function habitSuggestions({ existing = [], goals = [] }) {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      suggestions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            category: {
              type: 'string',
              enum: ['health', 'learning', 'fitness', 'mindfulness', 'productivity'],
            },
            reason: { type: 'string' },
          },
          required: ['name', 'category', 'reason'],
        },
        minItems: 3,
        maxItems: 3,
      },
    },
    required: ['suggestions'],
  };
  const sys = `${QUOTE_SYSTEM}

Suggest 3 NEW daily habits that complement what the user already does and support their goals.`;
  const userMsg = `Existing habits: ${existing.join(', ') || 'none'}
Active goals: ${goals.join('; ') || 'none'}

Suggest 3 new habits.`;
  const out = await callClaudeJSON({ system: sys, user: userMsg, schema, maxTokens: 600 });
  return out?.suggestions || null;
}

/**
 * Bad habit quit strategy — 3-4 concrete tactics personalized to the bad habit.
 */
export async function quitStrategy({ name, why, daysClean }) {
  const sys = `${QUOTE_SYSTEM}

You are a calm, supportive coach helping the user quit a bad habit.
Output 3-4 concrete, immediate tactics they can use today. No preamble, no markdown.
Tone: encouraging, not preachy.`;
  const userMsg = `Bad habit: ${name}
Why they want to quit: ${why || 'not specified'}
Days clean so far: ${daysClean}

Give them 3-4 tactics.`;
  return callClaude({ system: sys, user: userMsg, maxTokens: 500 });
}

/**
 * Weekly full-life summary — combines all module data into a short report.
 * Uses Opus 4.7 for heavier reasoning.
 */
export async function weeklySummary(data) {
  const sys = `${QUOTE_SYSTEM}

You write a short weekly mission report (3-5 short paragraphs) covering habits, expenses, goals, learning, mood.
Be honest and warm. Highlight wins, name one or two areas to improve. No markdown, no bullet symbols.`;
  return callClaude({
    system: sys,
    user: `Here is this week's data (JSON):\n\n${JSON.stringify(data, null, 2)}\n\nWrite the report.`,
    model: 'claude-opus-4-7',
    maxTokens: 1200,
    thinking: true,
  });
}
