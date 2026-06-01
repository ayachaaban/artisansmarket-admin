// =============================================
// ADMIN AI ASSISTANT (side panel)
// =============================================
// Triggered by the ✨ button in the dashboard header (next to dark theme).
// Slides in from the right with a chat box wired to the Cloudflare Worker
// /ai proxy. Same Groq Llama 3.3 model the mobile app uses — no API key in
// the frontend, the Worker holds it as an encrypted secret.
//
// Admin context: the system prompt below tells the model it's helping a
// platform operator (not an end user), so answers lean toward operational
// guidance — moderation calls, refund explanations, policy summaries.

(function () {
  const AI_ENDPOINT = 'https://artisans-push.artisansmarket.workers.dev/ai';
  const AI_AUTH = 'f59d5b3cb8b2c54a2fea349b000ffeede367b8d3f6f7997a21f453f10fe180cf';

  const SYSTEM_PROMPT = `You are the internal assistant for the admin dashboard of "Artisans Market", a mobile handmade-art marketplace. The user is a platform admin (or super-admin) — they handle moderation, dispute resolution, broadcasts, and operational questions. They are NOT an end user. Answer operationally.

================================================================
PLATFORM OVERVIEW
================================================================
- Two end-user roles: customer (buyer) and artist (seller). Customers self-upgrade to artist.
- Mobile-first: Flutter app, Firebase backend (Firestore + Auth + FCM), Supabase storage for media.
- Two admin roles: admin and super_admin. Super-admins additionally manage Admin Management page.

================================================================
DATA MODEL (Firestore collections you can reference)
================================================================
- users: {name, email, phone, role, status (active/suspended), category, profileImageUrl, bio, averageRating, createdAt, fcmTokens[], payoutCard{last4,brand,holderName,expMonth,expYear,addedAt}}
- posts: {artistId, artistName, description, category, price, imageUrl, mediaType (post|reel), thumbnailUrl, videoUrl, videoDurationSec, status (active|sold|removed|reported), createdAt}
- orders: {customerId, customerName, customerEmail, artistId, artistName, items[], subtotal, platformFee, total, status, paymentMethod, payoutStatus, deliveryAddress{street,building,apartment,nickname,phone,instructions,lat,lng,resolvedAddress}, acceptedAt, estimatedCompletionDate, originalCompletionDate, extensions[{reason,previousDeadline,newDeadline}], cancelledAt, refundAmount, cancellationArtistShare, cancellationTier, lastViewedByCustomer, lastViewedByArtist, createdAt}
- reports: {reporterId, reporterName, postId, reason, description, status (pending|reviewed|resolved), createdAt, resolvedAt}
- ratings: {customerId, customerName, artistId, artistName, orderId, stars (1–5), comment, createdAt}
- subscriptions: {artistId, plan (free|pro), status (active|expired), startDate, expiresAt}
- wallets: {balance, updatedAt} doc id = artistId
- payouts: {artistId, amount, status, createdAt}
- notifications: {userId, title, message, type, isRead, createdAt}
- chats / chat messages: real-time per pair.

================================================================
ORDER LIFECYCLE & ESCROW
================================================================
Status flow: pending → in_progress (artist accepted) → shipping (artist sent it) → delivered (customer confirmed).
Legacy statuses still in DB: paid, processing, shipped — treat paid/processing as in_progress, shipped as shipping.
- Money held in escrow from checkout until "shipping" — then released to artist's wallet (minus platform fee).
- Artist commits to estimatedCompletionDate when accepting.
- Extensions: max 3 OR +14 cumulative days, whichever first. Beyond that, customer can cancel with NO penalty regardless of timing.
- Auto-deliver: if customer never confirms after a grace period, system marks delivered.

================================================================
CANCELLATION POLICY (penalty tiers stored as cancellationTier)
================================================================
- "full_refund": pre-acceptance OR within first 24h → customer gets 100%, artist gets 0.
- "small_penalty" (~10%): lots of time remaining → customer gets ~90%, artist gets ~10%.
- "mid_penalty" (~25–50%): around halfway → split per percent elapsed.
- "max_penalty" (~75% capped): very close to deadline → customer gets ~25%, artist gets ~75%.
- After "shipping" status → no cancellation, no refund.
- Field reference: refundAmount = customer refund, cancellationArtistShare = artist comp.

================================================================
MODERATION ACTIONS (reports)
================================================================
- Dismiss: report is frivolous / no policy violation. No user impact.
- Warn artist: minor issue, send notification. No content change.
- Remove post: clear policy violation in the content (e.g. NSFW, misleading). Post status → removed.
- Suspend user: only for repeat offenses, harassment, fraud, hate speech. user.status → suspended.
Recommend ONE action per report with a one-line justification. Suspend is severe — require clear cause.

================================================================
ADMIN DASHBOARD PAGES (sidebar)
================================================================
1. Overview — Operations Command Center: KPIs, pending workload, recent activity.
2. Users / Artists — full user list, filter by role/status, View opens User 360° modal (Profile, Orders, Posts, Ratings, Reports, Notifications, Wallet tabs). Push button sends a targeted FCM push. Suspend/Activate toggles status.
3. Posts — table of posts/reels with Remove / Reactivate actions, opens Post 360°.
4. Reports — pending + resolved reports. View opens Report 360° with reported post inline. Mark resolved / Remove post.
5. Ratings — ratings table.
6. Analytics — charts and trends. Date filter All-time + Custom.
7. Subscriptions — artist plans (free/pro), expiration tracking.
8. Orders — full order list. Filter by status, payment method, search by customer/artist. View opens Order Details with timeline, extensions, cancellation breakdown, delivery info.
9. Deadlines — orders with upcoming or overdue deadlines.
10. Broadcast (Notifications) — compose + log. Send to all / role / individual user. Logs every sent notification with audience size.
11. Payments & Payouts — payment list, payout list, wallet snapshots. "Cancel order" action exists here (no separate Refund button — cancellation handles refund per policy).
12. Admin Management (super-admin only) — manage admin accounts.

All list pages support an Excel export (top-right) and a date-range filter (From/To).

================================================================
COMMON ADMIN QUESTIONS — HOW TO ANSWER
================================================================
- "How do I refund?" → No standalone refund. Cancel the order from the Payments page; the system computes refund + artist compensation per cancellationTier and updates wallets.
- "Customer says artist hasn't shipped after deadline." → Check order extensions[] and estimatedCompletionDate. If artist used all extensions and still missed deadline, customer can cancel with full refund. Recommend reaching out to artist first.
- "Can I delete a user?" → No hard delete. Suspend instead (status=suspended). Suspended users can't log in or interact.
- "Why is an artist not receiving payments?" → Check users.payoutCard. If absent or expired, they can't be paid. Tell them to add one in the mobile app.
- "How do I send a push notification?" → Broadcast page, or Push button inside a User 360° modal for a single user.
- "What's escrow holding right now?" → Sum of order.total for orders with status in (pending, in_progress).

================================================================
STYLE
================================================================
- Concise and operational. Typically 2–4 sentences.
- Bullets only for lists. Bold key terms with **markdown**.
- If data is provided via the live snapshot or ID lookups (above your messages), use those numbers verbatim — do NOT invent.
- If asked something the snapshot doesn't cover, say what page in the admin dashboard would show it.
- For moderation: lead with **Recommendation:** <action>, then **Why:** <one line>.`;

  const STORAGE_KEY = 'adminAiChat';
  let history = [];
  try { history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (_) { history = []; }

  let panelEl = null;
  let toggleBtn = null;

  function init() {
    toggleBtn = document.getElementById('aiAssistantToggle');
    if (!toggleBtn) return;
    toggleBtn.addEventListener('click', openPanel);
  }

  function buildPanel() {
    const panel = document.createElement('div');
    panel.id = 'adminAiPanel';
    panel.className = 'admin-ai-panel';
    // Mirrors the mobile AI screen: nested-circles avatar (primary outer
    // ring → white spacer → tinted-primary fill) with a sparkles glyph, a
    // slate-grey subtitle, and a primary-blue circular send button. All
    // unicode chars (✨/⟳/×/➤) swapped for inline SVGs so they look the
    // same on every OS / font.
    panel.innerHTML = `
      <div class="admin-ai-header">
        <div class="admin-ai-title">
          <span class="admin-ai-avatar">
            <span class="admin-ai-avatar-inner">
              <!-- Material auto_awesome_rounded — same as mobile -->
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zM11.5 9.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25z"/></svg>
              <!-- 22x22 inline width matches the .admin-ai-avatar-inner > svg rule above -->

            </span>
          </span>
          <div>
            <div class="admin-ai-title-main">AI Assistant</div>
            <div class="admin-ai-title-sub">Llama 3.3 · for admins</div>
          </div>
        </div>
        <div class="admin-ai-header-actions">
          <button id="adminAiClear" title="Clear conversation" class="admin-ai-icon-btn" aria-label="Clear conversation">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
          <button id="adminAiClose" title="Close" class="admin-ai-icon-btn" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div class="admin-ai-messages" id="adminAiMessages"></div>
      <div class="admin-ai-suggestions" id="adminAiSuggestions">
        <button class="admin-ai-chip" data-prompt="Explain the cancellation policy to me in one paragraph.">Explain cancellation policy</button>
        <button class="admin-ai-chip" data-prompt="How should I handle a customer who wants a refund 3 days after shipping?">Refund after shipping?</button>
        <button class="admin-ai-chip" data-prompt="What's the difference between dismissing a report vs warning the artist?">Dismiss vs warn?</button>
        <button class="admin-ai-chip" data-prompt="When can an artist be suspended automatically?">When to suspend?</button>
      </div>
      <form class="admin-ai-input-row" id="adminAiForm">
        <textarea id="adminAiInput" placeholder="Ask about artwork, artists, orders…" rows="1"></textarea>
        <button type="submit" id="adminAiSend" title="Send" aria-label="Send">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </form>
    `;
    document.body.appendChild(panel);

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'adminAiBackdrop';
    backdrop.className = 'admin-ai-backdrop';
    backdrop.addEventListener('click', closePanel);
    document.body.appendChild(backdrop);

    panel.querySelector('#adminAiClose').addEventListener('click', closePanel);
    panel.querySelector('#adminAiClear').addEventListener('click', () => {
      history = [];
      localStorage.removeItem(STORAGE_KEY);
      renderMessages();
    });

    const form = panel.querySelector('#adminAiForm');
    const input = panel.querySelector('#adminAiInput');
    input.addEventListener('input', autoSize);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
      }
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      autoSize();
      sendMessage(text);
    });

    panel.querySelectorAll('.admin-ai-chip').forEach((chip) => {
      chip.addEventListener('click', () => sendMessage(chip.dataset.prompt));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('open')) closePanel();
    });

    return panel;
  }

  function autoSize() {
    const input = document.getElementById('adminAiInput');
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 140) + 'px';
  }

  function openPanel() {
    if (!panelEl) panelEl = buildPanel();
    renderMessages();
    requestAnimationFrame(() => {
      panelEl.classList.add('open');
      document.getElementById('adminAiBackdrop').classList.add('open');
      document.getElementById('adminAiInput').focus();
    });
  }

  function closePanel() {
    if (!panelEl) return;
    panelEl.classList.remove('open');
    document.getElementById('adminAiBackdrop').classList.remove('open');
  }

  function renderMessages() {
    const container = document.getElementById('adminAiMessages');
    const suggestions = document.getElementById('adminAiSuggestions');
    if (!container) return;

    if (history.length === 0) {
      container.innerHTML = `
        <div class="admin-ai-welcome">
          <div class="admin-ai-welcome-spark" aria-hidden="true">
            <!-- Material auto_awesome_rounded — same as mobile -->
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zM11.5 9.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25z"/></svg>
          </div>
          <div class="admin-ai-welcome-title">How can I help?</div>
          <div class="admin-ai-welcome-sub">Ask about policies, refunds, moderation, or paste an order/report and I'll explain it.</div>
        </div>`;
      if (suggestions) suggestions.style.display = 'flex';
      return;
    }
    if (suggestions) suggestions.style.display = 'none';

    container.innerHTML = history.map((m) => {
      const cls = m.role === 'user' ? 'msg-user' : 'msg-assistant';
      return `<div class="admin-ai-msg ${cls}"><div class="admin-ai-msg-body">${formatBody(m.content)}</div></div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function formatBody(text) {
    let html = escapeHtml(text);
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Bullet lists: lines starting with - or •
    html = html.replace(/(^|\n)[\-•]\s+(.+)/g, (_, p, t) => `${p}<div class="ai-bullet">• ${t}</div>`);
    html = html.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
    return `<p>${html}</p>`;
  }

  async function sendMessage(text) {
    history.push({ role: 'user', content: text });
    renderMessages();
    persist();

    // Append a pending assistant slot
    const container = document.getElementById('adminAiMessages');
    const pending = document.createElement('div');
    pending.className = 'admin-ai-msg msg-assistant pending';
    pending.innerHTML = '<div class="admin-ai-msg-body"><span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span></div>';
    container.appendChild(pending);
    container.scrollTop = container.scrollHeight;

    // Pull live platform data the AI can reason over. We do this on every
    // turn (not once at panel open) so counts stay fresh and we can also
    // detect ID-shaped tokens in the user's message for targeted lookups.
    let dataContext = '';
    try { dataContext = await gatherContext(text); }
    catch (e) { console.warn('AI context gather failed', e); }

    try {
      const res = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Push-Auth': AI_AUTH },
        body: JSON.stringify({
          temperature: 0.4,
          max_tokens: 600,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...(dataContext ? [{ role: 'system', content: dataContext }] : []),
            ...history,
          ],
        }),
      });
      if (!res.ok) throw new Error('AI ' + res.status);
      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content?.trim() || '(no reply)';
      history.push({ role: 'assistant', content: reply });
      persist();
    } catch (e) {
      history.push({
        role: 'assistant',
        content: 'Could not reach the AI service. ' + (e.message || ''),
      });
    } finally {
      pending.remove();
      renderMessages();
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // LIVE DATA CONTEXT
  // ────────────────────────────────────────────────────────────────────
  // Two layers:
  //  1) A short platform-wide snapshot (counts + recent items) cached for
  //     30 s so the admin can chat rapid-fire without hammering Firestore.
  //  2) Per-message ID detection: if the admin pastes a Firestore doc ID
  //     (20+ alnum chars) we try fetching it from users / orders / posts /
  //     reports and attach whatever we find.

  let _snapshotCache = null;
  let _snapshotAt = 0;
  const SNAPSHOT_TTL_MS = 30000;

  async function gatherContext(userMessage) {
    // `db` is the firebase Firestore instance set up by firebase-config.js.
    if (typeof db === 'undefined') return '';
    const parts = [];

    const snap = await getSnapshot();
    if (snap) parts.push('PLATFORM SNAPSHOT (live):\n' + snap);

    const looked = await lookupIdsIn(userMessage);
    if (looked) parts.push('LOOKED UP FROM THE ADMIN\'S MESSAGE:\n' + looked);

    if (parts.length === 0) return '';
    return (
      'You have access to the following live data from the Firestore database. ' +
      'Use it when answering. Do NOT invent numbers beyond what is shown here.\n\n' +
      parts.join('\n\n')
    );
  }

  async function getSnapshot() {
    const now = Date.now();
    if (_snapshotCache && now - _snapshotAt < SNAPSHOT_TTL_MS) return _snapshotCache;

    try {
      // Parallel fetches. We cap at small `limit`s and use server-side
      // aggregation where possible (.count()), falling back to .get() size
      // for browsers/SDKs that don't support count.
      const [
        usersSnap,
        ordersRecent,
        ordersAll,
        reportsPending,
        postsRecent,
        ratingsRecent,
      ] = await Promise.all([
        db.collection('users').limit(500).get(),
        db.collection('orders').orderBy('createdAt', 'desc').limit(10).get().catch(() => null),
        db.collection('orders').limit(500).get(),
        db.collection('reports').where('status', '==', 'pending').limit(20).get(),
        db.collection('posts').orderBy('createdAt', 'desc').limit(5).get().catch(() => null),
        db.collection('ratings').limit(200).get().catch(() => null),
      ]);

      const userCounts = { total: 0, artist: 0, customer: 0, active: 0, suspended: 0 };
      usersSnap.forEach(d => {
        const u = d.data();
        userCounts.total++;
        if (u.role === 'artist') userCounts.artist++;
        else userCounts.customer++;
        if ((u.status || 'active') === 'active') userCounts.active++;
        else userCounts.suspended++;
      });

      const orderCounts = { total: 0, pending: 0, in_progress: 0, shipping: 0, delivered: 0, cancelled: 0 };
      let grossRevenue = 0;
      let revenueToday = 0;

      const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
      const startOf7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const ordersToday = [];
      const ordersThisWeek = [];

      ordersAll.forEach(d => {
        const o = d.data();
        orderCounts.total++;
        const s = (o.status || 'pending');
        if (orderCounts[s] !== undefined) orderCounts[s]++;
        // Legacy statuses
        if (s === 'paid' || s === 'processing') orderCounts.in_progress++;
        if (s === 'shipped') orderCounts.shipping++;
        const amt = (o.total || o.totalAmount || 0);
        if (s !== 'cancelled') grossRevenue += amt;
        // Bucket by createdAt
        let dt = null;
        try { dt = o.createdAt && o.createdAt.toDate ? o.createdAt.toDate() : null; } catch (_) { dt = null; }
        if (dt) {
          if (dt >= startOfToday) {
            ordersToday.push({ id: d.id, o, dt });
            if (s !== 'cancelled') revenueToday += amt;
          }
          if (dt >= startOf7d) ordersThisWeek.push({ id: d.id, o, dt });
        }
      });

      const todayStr = startOfToday.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      const lines = [];
      lines.push(`Current date/time: ${new Date().toLocaleString()} (today = ${todayStr}).`);
      lines.push(`Users: ${userCounts.total} total (${userCounts.artist} artists, ${userCounts.customer} customers, ${userCounts.active} active, ${userCounts.suspended} suspended).`);
      lines.push(`Orders: ${orderCounts.total} total — pending ${orderCounts.pending}, in-progress ${orderCounts.in_progress}, shipping ${orderCounts.shipping}, delivered ${orderCounts.delivered}, cancelled ${orderCounts.cancelled}.`);
      lines.push(`Orders placed today: ${ordersToday.length} ($${revenueToday.toFixed(2)} non-cancelled).`);
      lines.push(`Orders placed in last 7 days: ${ordersThisWeek.length}.`);
      lines.push(`Gross revenue all-time (non-cancelled): $${grossRevenue.toFixed(2)}.`);
      lines.push(`Pending reports awaiting review: ${reportsPending.size}.`);

      if (ordersToday.length > 0) {
        lines.push('Today\'s orders:');
        ordersToday.slice(0, 10).forEach(({ id, o, dt }) => {
          lines.push(`  • ${id}: ${o.customerName || '?'} → ${o.artistName || '?'} · $${(o.total || 0).toFixed(2)} · ${o.status || 'pending'} · ${dt.toLocaleTimeString()}`);
        });
      }

      if (reportsPending.size > 0) {
        lines.push('Top pending reports:');
        reportsPending.docs.slice(0, 5).forEach(d => {
          const r = d.data();
          lines.push(`  • ${d.id}: "${(r.reason || 'no reason').slice(0, 60)}" on post ${r.postId || '?'}`);
        });
      }

      if (ordersRecent && !ordersRecent.empty) {
        lines.push('Recent orders:');
        ordersRecent.docs.slice(0, 5).forEach(d => {
          const o = d.data();
          lines.push(`  • ${d.id}: ${o.customerName || '?'} → ${o.artistName || '?'} · $${(o.total || 0).toFixed(2)} · ${o.status || 'pending'}`);
        });
      }

      if (postsRecent && !postsRecent.empty) {
        lines.push('Newest posts/reels:');
        postsRecent.docs.forEach(d => {
          const p = d.data();
          lines.push(`  • ${d.id}: "${(p.description || '').slice(0, 40)}" by ${p.artistName || '?'} (${p.category || 'N/A'}, $${(p.price || 0).toFixed(2)})`);
        });
      }

      if (ratingsRecent) {
        let sum = 0, n = 0;
        ratingsRecent.forEach(d => { const s = d.data().stars; if (typeof s === 'number') { sum += s; n++; } });
        if (n > 0) lines.push(`Average rating across last ${n} ratings: ${(sum / n).toFixed(2)}/5.`);
      }

      _snapshotCache = lines.join('\n');
      _snapshotAt = now;
      return _snapshotCache;
    } catch (e) {
      console.warn('snapshot error', e);
      return null;
    }
  }

  async function lookupIdsIn(message) {
    // Firestore auto-IDs are 20-char base-58-ish strings. We grab any
    // 18-30 char alnum token and try each known collection.
    const ids = (message.match(/\b[A-Za-z0-9]{18,30}\b/g) || []).slice(0, 3);
    if (ids.length === 0) return '';
    const out = [];
    for (const id of ids) {
      const found = await Promise.all([
        tryDoc('users', id, u => `USER ${id}: name=${u.name || '?'}, email=${u.email || '?'}, role=${u.role || 'customer'}, status=${u.status || 'active'}, category=${u.category || '—'}, avgRating=${u.averageRating ?? '—'}`),
        tryDoc('orders', id, o => `ORDER ${id}: ${o.customerName || '?'} → ${o.artistName || '?'}, total $${(o.total || 0).toFixed(2)}, status ${o.status}, items ${(o.items || []).length}${o.estimatedCompletionDate ? ', deadline ' + tryDate(o.estimatedCompletionDate) : ''}${o.cancellationTier ? ', cancel tier ' + o.cancellationTier : ''}`),
        tryDoc('posts', id, p => `POST ${id}: by ${p.artistName || '?'}, "${(p.description || '').slice(0, 80)}", ${p.category || '—'}, $${(p.price || 0).toFixed(2)}, status ${p.status || 'active'}, type ${p.mediaType || 'post'}`),
        tryDoc('reports', id, r => `REPORT ${id}: reporter ${r.reporterName || r.reporterId || '?'}, reason "${(r.reason || '').slice(0, 80)}", post ${r.postId || '?'}, status ${r.status || 'pending'}`),
      ]);
      found.filter(Boolean).forEach(f => out.push(f));
    }
    return out.join('\n');
  }

  async function tryDoc(coll, id, fmt) {
    try {
      const d = await db.collection(coll).doc(id).get();
      if (!d.exists) return null;
      return fmt(d.data());
    } catch (_) { return null; }
  }

  function tryDate(ts) {
    try { return ts.toDate().toLocaleDateString(); } catch (_) { return '?'; }
  }

  function persist() {
    try {
      // Cap stored history at last 40 messages so localStorage doesn't bloat.
      const tail = history.slice(-40);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tail));
    } catch (_) { /* quota — ignore */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
