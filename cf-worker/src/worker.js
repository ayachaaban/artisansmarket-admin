// Cloudflare Worker that powers two backend functions for the Artisans Market
// mobile app, with a single shared auth header.
//
//   POST /              → FCM v1 push notification fan-out (legacy default)
//   POST /fcm           → same as above, explicit route
//   POST /ai            → Groq Llama chat-completions proxy
//
// Secrets (set via Cloudflare dashboard / API):
//   - FIREBASE_CLIENT_EMAIL  — service account client_email
//   - FIREBASE_PRIVATE_KEY   — service account private_key (the full PEM)
//   - FIREBASE_PROJECT_ID    — Firebase project id
//   - PUSH_AUTH_TOKEN        — shared secret the Flutter app sends in
//                              X-Push-Auth so randoms can't spam the endpoint.
//   - GROQ_API_KEY           — Groq Llama key, used by /ai

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Push-Auth',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env) {
    // CORS preflight — browser sends this before the real POST from the
    // admin web app. The mobile app doesn't trigger it (no CORS in Flutter).
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    // Shared-secret auth for every route.
    const auth = request.headers.get('X-Push-Auth');
    if (!auth || auth !== env.PUSH_AUTH_TOKEN) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { pathname } = new URL(request.url);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    // ── Route: /ai → Groq proxy ─────────────────────────────────────────
    if (pathname === '/ai') {
      return handleAi(body, env);
    }

    // ── Route: / or /fcm → FCM push (default) ──────────────────────────
    return handleFcm(body, env);
  },
};


// ────────────────────────────────────────────────────────────────────
// /ai — Groq Llama chat-completions proxy
// ────────────────────────────────────────────────────────────────────

async function handleAi(body, env) {
  if (!env.GROQ_API_KEY) {
    return json({ error: 'AI not configured' }, 500);
  }
  // We accept the OpenAI-style chat-completions shape verbatim and forward
  // it to Groq. Keeps the Flutter side dead simple.
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: 'messages array required' }, 400);
  }
  const model = body.model || 'llama-3.3-70b-versatile';
  const temperature = typeof body.temperature === 'number' ? body.temperature : 0.7;
  const max_tokens = typeof body.max_tokens === 'number' ? body.max_tokens : 1024;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens }),
    });
    const text = await res.text();
    // Pass Groq's status code through so the client can react to rate limits,
    // bad model names, etc. The response body is already JSON.
    return new Response(text, {
      status: res.status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (e) {
    return json({ error: 'Upstream error', detail: String(e) }, 502);
  }
}


// ────────────────────────────────────────────────────────────────────
// /fcm (or default /) — FCM v1 push notification fan-out
// ────────────────────────────────────────────────────────────────────

async function handleFcm(body, env) {
  const { tokens, title, body: msgBody, data } = body;
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return json({ error: 'tokens array required' }, 400);
  }
  if (!title || !msgBody) {
    return json({ error: 'title and body required' }, 400);
  }

  let accessToken;
  try {
    accessToken = await getAccessToken(env);
  } catch (e) {
    return json({ error: 'Auth failed', detail: String(e) }, 500);
  }

  const url = `https://fcm.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/messages:send`;
  const results = await Promise.all(
    tokens.map(async (token) => {
      const payload = {
        message: {
          token,
          notification: { title, body: msgBody },
          data: stringifyValues(data || {}),
          android: {
            priority: 'HIGH',
            notification: {
              channel_id: 'orders',
              sound: 'default',
            },
          },
          apns: {
            payload: {
              aps: { sound: 'default', badge: 1 },
            },
          },
        },
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      return { token, status: res.status, ok: res.ok };
    }),
  );

  const sent = results.filter((r) => r.ok).length;
  return json({ sent, failed: results.length - sent, results });
}

// FCM v1 requires all data values to be strings.
function stringifyValues(obj) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, String(v)]),
  );
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// ── OAuth2 access token via service account JWT ────────────────────────

async function getAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: env.FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const header = { alg: 'RS256', typ: 'JWT' };
  const enc = (obj) => base64urlString(JSON.stringify(obj));
  const signingInput = `${enc(header)}.${enc(claim)}`;

  const key = await importPrivateKey(env.FIREBASE_PRIVATE_KEY);
  const sigBuf = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput),
  );
  const sig = base64urlBytes(new Uint8Array(sigBuf));
  const jwt = `${signingInput}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function importPrivateKey(pem) {
  const cleaned = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\\n/g, '\n')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    der.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

function base64urlString(s) {
  return base64urlBytes(new TextEncoder().encode(s));
}
function base64urlBytes(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
