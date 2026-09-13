const JSON_HEADERS = { 'Content-Type': 'application/json' };

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json').send(body);
}

async function authenticated(req) {
  const authorization = req.headers.authorization;
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!authorization?.startsWith('Bearer ') || !supabaseUrl || !anonKey) return false;
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { Authorization: authorization, apikey: anonKey } });
  return response.ok;
}

function modelName(model) {
  if (typeof model !== 'string' || !model) return 'gemini-2.5-flash-lite';
  if (model.includes('pro') || model.includes('opus')) return 'gemini-2.5-pro';
  return model.startsWith('gemini-') ? model : 'gemini-2.5-flash-lite';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!(await authenticated(req))) return json(res, 401, { error: 'Please sign in to use AI features.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json(res, 503, { error: 'AI service is not configured.' });

  const body = req.body || {};
  if (!body.user || typeof body.user !== 'string') return json(res, 400, { error: 'Invalid AI request.' });

  const contents = [{ role: 'user', parts: [{ text: body.user }] }];
  const requestBody = {
    contents,
    generationConfig: {
      maxOutputTokens: Math.min(Number(body.max_tokens) || 1024, 4096),
      ...(body.json_mode ? { responseMimeType: 'application/json' } : {}),
    },
  };
  if (body.system) requestBody.systemInstruction = { parts: [{ text: String(body.system) }] };

  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName(body.model))}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(requestBody),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return json(res, upstream.status >= 500 ? 502 : upstream.status, { error: 'Gemini request failed. Please try again.' });
    const content = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
    if (!content) return json(res, 502, { error: 'Gemini returned an empty response.' });
    return json(res, 200, { choices: [{ message: { role: 'assistant', content }, finish_reason: data.candidates?.[0]?.finishReason || 'STOP' }] });
  } catch {
    return json(res, 502, { error: 'Unable to reach Gemini. Please try again.' });
  }
}
