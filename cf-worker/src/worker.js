// Cloudflare Worker that sends FCM v1 push notifications.
//
// Triggered by POST from the Flutter app. Receives a list of FCM tokens, a
// title/body, and optional data payload. Signs a JWT with the Firebase
// service account, exchanges it for an OAuth2 access token, and calls
// FCM v1 once per token.
//
// Secrets (set via `wrangler secret put`):
//   - FIREBASE_CLIENT_EMAIL  — service account client_email
//   - FIREBASE_PRIVATE_KEY   — service account private_key (the full PEM)
//   - FIREBASE_PROJECT_ID    — Firebase project id (artisansmarket-5f2b6)
//   - PUSH_AUTH_TOKEN        — shared secret the Flutter app sends in the
//                              X-Push-Auth header so randoms can't spam your
//                              endpoint.

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    // Cheap auth: shared secret header. Anyone can hit a Worker URL otherwise.
    const auth = request.headers.get('X-Push-Auth');
    if (!auth || auth !== env.PUSH_AUTH_TOKEN) {
      return json({ error: 'Unauthorized' }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

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
  },
};

// FCM v1 requires all data values to be strings.
function stringifyValues(obj) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, String(v)]),
  );
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
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
