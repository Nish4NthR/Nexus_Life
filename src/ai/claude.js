/**
 * NexusLife AI client.
 *
 * The browser calls the same-origin Vercel function at /api/gemini. The
 * function validates the Supabase session and calls Gemini server-side.
 * Function names retain the old callClaude names for UI compatibility.
 */
import { supabase } from '../lib/supabase.js';

const AI_ENDPOINT = '/api/gemini';
const DEFAULT_MODEL = 'gemini-2.5-flash-lite';
const HEAVY_MODEL = 'gemini-2.5-pro';

export function isAIAvailable() {
  return Boolean(supabase);
}

function resolveModel(name) {
  if (!name) return DEFAULT_MODEL;
  if (name.includes('pro') || name.includes('opus')) return HEAVY_MODEL;
  if (name.includes('flash')) return DEFAULT_MODEL;
  return name.startsWith('gemini-') ? name : DEFAULT_MODEL;
}

async function generate({ system, user, model, maxTokens = 1024, jsonMode = false }) {
  if (!isAIAvailable()) throw new Error('AI is not configured.');
  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sign in again before using AI features.');

  let response;
  try {
    response = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        model: resolveModel(model),
        system,
        user: typeof user === 'string' ? user : String(user),
        max_tokens: maxTokens,
        json_mode: jsonMode,
      }),
    });
  } catch {
    throw new Error('Unable to reach the AI service. Please try again.');
  }

  if (!response.ok) {
    let detail = '';
    try { detail = (await response.json()).error || ''; } catch { /* safe generic message */ }
    throw new Error(typeof detail === 'string' && detail ? detail : 'The AI service is unavailable. Please try again.');
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('The AI returned an empty response.');
  return content;
}

export async function callClaude({ system, user, model, maxTokens = 1024 }) {
  return generate({ system, user, model, maxTokens });
}

export async function callClaudeJSON({ system, user, schema, model, maxTokens }) {
  const schemaHint = schema ? `\n\nRespond with ONLY valid minified JSON matching this schema:\n${JSON.stringify(schema, null, 2)}` : '';
  const raw = await generate({ system: (system || '') + schemaHint, user, model, maxTokens: maxTokens || 1024, jsonMode: true });
  try {
    const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    const firstBrace = cleaned.indexOf('{'); const firstBracket = cleaned.indexOf('[');
    const start = firstBrace === -1 ? firstBracket : firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket);
    const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    return JSON.parse(start >= 0 && end >= start ? cleaned.slice(start, end + 1) : cleaned);
  } catch { throw new Error('The AI returned invalid structured data.'); }
}

// ---------- Existing feature helpers ----------
export async function motivationalQuote(context = {}) { return callClaude({ system: 'Give one concise motivational quote for a productivity dashboard. Return only the quote.', user: JSON.stringify(context), maxTokens: 200 }); }
export async function reflectionPrompt(context = {}) { return callClaude({ system: 'Give one concise journal reflection prompt. Return only the prompt.', user: JSON.stringify(context), maxTokens: 120 }); }
export async function goalRoadmap({ title, description, targetDate, category }) { return callClaude({ system: 'Create a practical numbered roadmap for this goal.', user: JSON.stringify({ title, description, targetDate, category }), maxTokens: 700 }); }
export async function parseUPISMS(rawSMS) { return callClaudeJSON({ system: 'Parse this payment SMS into JSON with amount, merchant, date, category, and note. Use null when unknown.', user: rawSMS, schema: { amount: 'number|null', merchant: 'string|null', date: 'YYYY-MM-DD|null', category: 'string', note: 'string|null' }, maxTokens: 400 }); }
export async function expenseInsights({ totalThisWeek, byCategory = {}, topMerchants = [] }) { return callClaude({ system: 'Give concise, practical spending insights.', user: JSON.stringify({ totalThisWeek, byCategory, topMerchants }), maxTokens: 500 }); }
export async function studyNextMission({ items = [] }) { return callClaude({ system: 'Suggest the next focused learning mission from these items.', user: JSON.stringify(items), maxTokens: 400 }); }
export async function habitSuggestions({ existing = [], goals = [] }) { return callClaudeJSON({ system: 'Suggest useful daily habits based on the existing habits and goals.', user: JSON.stringify({ existing, goals }), schema: { suggestions: [{ name: 'string', category: 'string', reason: 'string' }] }, maxTokens: 600 }); }
export async function quitStrategy({ name, why, daysClean }) { return callClaude({ system: 'Give a supportive, practical strategy for quitting a bad habit.', user: JSON.stringify({ name, why, daysClean }), maxTokens: 500 }); }
export async function weeklySummary(data) { return callClaude({ system: 'Summarize this productivity week with encouragement and three actionable improvements.', user: JSON.stringify(data), maxTokens: 700 }); }
