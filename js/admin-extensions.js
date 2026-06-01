// =============================================
// ADMIN EXTENSIONS
//   - Phase B: Deadlines command center
//   - Phase C: Broadcast notification + per-user push
// Depends on: db, firebase, createEl, createSkeletonRows, createEmptyRow,
//             createErrorRow, getOrderStatusClass, getOrderStatusLabel,
//             showToast, logAuditAction, viewOrderDetails, debounce,
//             exportTableToCSV, currentAdminRole.
// All those are defined in dashboard.js. Load this file AFTER dashboard.js.
// =============================================

// ---------- Deadlines ----------

const DEADLINE_SOON_HOURS = 48;

async function loadDeadlines() {
    const tbody = document.getElementById('deadlinesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    tbody.appendChild(createSkeletonRows(5, 8));

    try {
        const statuses = ['pending', 'in_progress', 'paid', 'processing'];
        const snapshots = await Promise.all(
            statuses.map(s => db.collection('orders').where('status', '==', s).get())
        );

        const now = Date.now();
        const rows = [];
        let overdue = 0, soon = 0, extended = 0, onTrack = 0;

        snapshots.forEach(snap => {
            // Apply the shared date-range filter so the Deadlines page
            // honours the From/To pickers like every other admin list.
            let docs = snap.docs;
            if (typeof window.filterByDate === 'function') {
                docs = window.filterByDate(docs, 'deadlines');
            }
            docs.forEach(doc => {
                const o = doc.data();
                const deadlineTs = o.estimatedCompletionDate;
                if (!deadlineTs || !deadlineTs.toDate) {
                    if (o.status === 'pending' || o.status === 'paid') {
                        rows.push({ id: doc.id, order: o, deadlineMs: null, urgency: 'pending' });
                    }
                    return;
                }
                const deadlineMs = deadlineTs.toDate().getTime();
                const remaining = deadlineMs - now;
                let urgency;
                if (remaining < 0) { urgency = 'overdue'; overdue++; }
                else if (remaining < DEADLINE_SOON_HOURS * 3600 * 1000) { urgency = 'soon'; soon++; }
                else { urgency = 'ok'; onTrack++; }
                if (Array.isArray(o.extensions) && o.extensions.length > 0) extended++;
                rows.push({ id: doc.id, order: o, deadlineMs, urgency });
            });
        });

        rows.sort((a, b) => {
            const score = u => u === 'overdue' ? 0 : u === 'soon' ? 1 : u === 'ok' ? 2 : 3;
            const diff = score(a.urgency) - score(b.urgency);
            if (diff !== 0) return diff;
            return (a.deadlineMs || Infinity) - (b.deadlineMs || Infinity);
        });

        const search = (document.getElementById('deadlineSearch') ? document.getElementById('deadlineSearch').value : '').toLowerCase();
        const urgencyFilter = document.getElementById('deadlineUrgencyFilter') ? document.getElementById('deadlineUrgencyFilter').value : '';
        const filtered = rows.filter(r => {
            if (urgencyFilter && r.urgency !== urgencyFilter) return false;
            if (search) {
                const hay = ((r.order.customerName || '') + ' ' + (r.order.artistName || '')).toLowerCase();
                if (!hay.includes(search)) return false;
            }
            return true;
        });

        const setText = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        setText('overdueCount', overdue);
        setText('dueSoonCount', soon);
        setText('extendedCount', extended);
        setText('onTrackCount', onTrack);

        const badge = document.getElementById('deadlinesBadge');
        if (badge) {
            const urgent = overdue + soon;
            badge.style.display = urgent > 0 ? 'flex' : 'none';
            badge.textContent = urgent;
        }

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.appendChild(createEmptyRow(8, 'No deadlines to monitor'));
            return;
        }

        filtered.forEach(item => {
            const id = item.id;
            const order = item.order;
            const deadlineMs = item.deadlineMs;
            const urgency = item.urgency;
            const tr = document.createElement('tr');

            tr.appendChild(createEl('td', {}, id.substring(0, 8) + '...'));
            tr.appendChild(createEl('td', {}, order.customerName || 'N/A'));
            tr.appendChild(createEl('td', {}, order.artistName || 'N/A'));
            tr.appendChild(createEl('td', {},
                deadlineMs ? new Date(deadlineMs).toLocaleDateString() : '—'));

            // Time-left pill
            const tdTime = document.createElement('td');
            const pill = document.createElement('span');
            pill.className = 'status-badge';
            if (urgency === 'overdue') {
                const hours = Math.round((Date.now() - deadlineMs) / 3600000);
                pill.style.cssText = 'background:rgba(165,58,51,0.10);color:#A53A33;border:1.5px solid rgba(165,58,51,0.45);';
                pill.textContent = hours > 24
                    ? Math.floor(hours / 24) + 'd overdue'
                    : hours + 'h overdue';
            } else if (urgency === 'soon') {
                const hours = Math.round((deadlineMs - Date.now()) / 3600000);
                pill.style.cssText = 'background:rgba(227,169,60,0.10);color:#E3A93C;border:1.5px solid rgba(227,169,60,0.45);';
                pill.textContent = hours + 'h left';
            } else if (urgency === 'ok') {
                const days = Math.floor((deadlineMs - Date.now()) / 86400000);
                pill.style.cssText = 'background:rgba(27,153,139,0.10);color:#1B998B;border:1.5px solid rgba(27,153,139,0.45);';
                pill.textContent = days + 'd left';
            } else {
                pill.style.cssText = 'background:rgba(111,143,163,0.10);color:#6F8FA3;border:1.5px solid rgba(111,143,163,0.45);';
                pill.textContent = 'Awaiting accept';
            }
            tdTime.appendChild(pill);
            tr.appendChild(tdTime);

            // Extensions
            const exCount = Array.isArray(order.extensions) ? order.extensions.length : 0;
            const tdEx = document.createElement('td');
            if (exCount > 0) {
                tdEx.appendChild(createEl('span', {
                    className: 'status-badge',
                    style: 'background:rgba(184,92,56,0.10);color:#B85C38;border:1.5px solid rgba(184,92,56,0.45);',
                }, exCount + '/3 used'));
            } else {
                tdEx.textContent = '—';
            }
            tr.appendChild(tdEx);

            // Status pill
            const tdStatus = document.createElement('td');
            tdStatus.appendChild(createEl('span', {
                className: 'status-badge status-' + getOrderStatusClass(order.status),
            }, getOrderStatusLabel(order.status)));
            tr.appendChild(tdStatus);

            // Actions
            const tdActions = document.createElement('td');
            const viewBtn = createEl('button', { className: 'btn-action btn-view-paid' }, 'View');
            viewBtn.addEventListener('click', () => viewOrderDetails(id));
            tdActions.appendChild(viewBtn);
            tr.appendChild(tdActions);

            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error('loadDeadlines error', e);
        tbody.innerHTML = '';
        tbody.appendChild(createErrorRow(8, 'Error loading deadlines'));
    }
}

document.getElementById('deadlineSearch') &&
    document.getElementById('deadlineSearch').addEventListener('input', debounce(loadDeadlines, 300));
document.getElementById('deadlineUrgencyFilter') &&
    document.getElementById('deadlineUrgencyFilter').addEventListener('change', loadDeadlines);

// Auto-refresh deadlines once a minute so the sidebar badge stays live.
setInterval(() => {
    const active = document.querySelector('.page-content.active');
    if (active && active.id !== 'deadlinesPage') {
        loadDeadlines();
    }
}, 60000);

// Initial badge population — fire once after page loads, regardless of tab.
setTimeout(() => { try { loadDeadlines(); } catch (_) {} }, 2500);


// ---------- Broadcast + push ----------

const PUSH_WORKER_URL = 'https://artisans-push.artisansmarket.workers.dev';
// Shared secret — only protects the Worker from random hits. FCM credentials
// live encrypted inside Cloudflare; never expose them client-side.
const PUSH_AUTH_TOKEN =
    'f59d5b3cb8b2c54a2fea349b000ffeede367b8d3f6f7997a21f453f10fe180cf';

async function sendPushToUser(userId, title, body, referenceId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const tokens = (userDoc.data() && userDoc.data().fcmTokens) || [];
        const valid = tokens.filter(t => typeof t === 'string' && t.length > 0);
        if (valid.length === 0) return { sent: 0, failed: 0 };
        const payload = { tokens: valid, title, body };
        if (referenceId) payload.data = { referenceId };
        const res = await fetch(PUSH_WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Push-Auth': PUSH_AUTH_TOKEN,
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            console.warn('Push worker non-200', res.status, await res.text());
            return { sent: 0, failed: valid.length };
        }
        return await res.json();
    } catch (e) {
        console.error('sendPushToUser error', e);
        return { sent: 0, failed: 0 };
    }
}

async function broadcastFetchUsers(audience) {
    let query = db.collection('users');
    if (audience === 'customer' || audience === 'artist') {
        query = query.where('role', '==', audience);
    }
    const snap = await query.get();
    return snap.docs;
}

document.getElementById('broadcastPreviewBtn') &&
document.getElementById('broadcastPreviewBtn').addEventListener('click', async () => {
    const audience = document.getElementById('broadcastAudience').value;
    try {
        const docs = await broadcastFetchUsers(audience);
        const withTokens = docs.filter(d => ((d.data().fcmTokens || []).length > 0)).length;
        const result = document.getElementById('broadcastResult');
        result.style.display = 'block';
        result.innerHTML =
            '<div class="alert alert-info mb-0">' +
            'Audience: <strong>' + docs.length + '</strong> user(s). ' +
            '<strong>' + withTokens + '</strong> will receive a real push (have FCM tokens). ' +
            'The rest will only get the in-app notification.' +
            '</div>';
    } catch (e) {
        console.error('preview audience error', e);
        showToast('Could not preview audience.', 'error');
    }
});

document.getElementById('broadcastForm') &&
document.getElementById('broadcastForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const audience = document.getElementById('broadcastAudience').value;
    const title = document.getElementById('broadcastTitle').value.trim();
    const body = document.getElementById('broadcastBody').value.trim();
    if (!title || !body) return;

    const btn = document.getElementById('broadcastSendBtn');
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';

    try {
        const docs = await broadcastFetchUsers(audience);
        let inAppCreated = 0;
        let pushSent = 0;

        await Promise.all(docs.map(async (userDoc) => {
            const uid = userDoc.id;
            try {
                await db.collection('notifications').add({
                    userId: uid,
                    title: title,
                    message: body,
                    type: 'order_status',
                    referenceId: '',
                    isRead: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
                inAppCreated++;
                const r = await sendPushToUser(uid, title, body);
                pushSent += (r.sent || 0);
            } catch (e) {
                console.warn('broadcast item failed for', uid, e);
            }
        }));

        try {
            await logAuditAction('broadcast', 'all', 'notification', {
                audience: audience, title: title, recipients: docs.length,
            });
        } catch (_) {}

        const result = document.getElementById('broadcastResult');
        result.style.display = 'block';
        result.innerHTML =
            '<div class="alert alert-success mb-0">' +
            'Delivered to <strong>' + inAppCreated + '</strong> in-app · ' +
            '<strong>' + pushSent + '</strong> push notifications fired.' +
            '</div>';
        showToast('Broadcast sent.', 'success');
        document.getElementById('broadcastTitle').value = '';
        document.getElementById('broadcastBody').value = '';
    } catch (e) {
        console.error('broadcast send error', e);
        showToast('Broadcast failed. See console.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
    }
});


// ---------- Per-user push prompt ----------
// Small modal that lets an admin send a one-off push (in-app + system tray)
// to a single user. Wired to the "Push" button on every user/artist row.

function sendPushPrompt(userId, userName) {
    document.querySelector('.detail-modal-overlay:not(#user360-overlay)')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'detail-modal-overlay';
    overlay.innerHTML =
        '<div class="detail-modal" style="max-width:480px;">' +
            '<div class="detail-modal-header">' +
                '<h3>Send notification to ' + (userName || 'user') + '</h3>' +
                '<button class="detail-modal-close">&times;</button>' +
            '</div>' +
            '<div class="detail-modal-body">' +
                '<div class="mb-3">' +
                    '<label class="form-label">Title</label>' +
                    '<input type="text" class="form-control" id="pushPromptTitle" maxlength="80" placeholder="e.g. Welcome to Artisans Market"/>' +
                '</div>' +
                '<div class="mb-3">' +
                    '<label class="form-label">Message</label>' +
                    '<textarea class="form-control" id="pushPromptBody" rows="3" maxlength="250" placeholder="Body of the notification"></textarea>' +
                '</div>' +
                '<div class="d-flex gap-2 justify-content-end">' +
                    '<button id="pushPromptCancel" style="padding:8px 18px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;background:transparent;color:#B85C38;border:1.5px solid rgba(184,92,56,0.45);transition:background 0.2s,border-color 0.2s;" onmouseover="this.style.background=\'rgba(184,92,56,0.10)\';this.style.borderColor=\'rgba(184,92,56,0.65)\';" onmouseout="this.style.background=\'transparent\';this.style.borderColor=\'rgba(184,92,56,0.45)\';">Cancel</button>' +
                    '<button id="pushPromptSend" style="padding:8px 18px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;background:transparent;color:#B85C38;border:1.5px solid rgba(184,92,56,0.45);transition:background 0.2s,border-color 0.2s;" onmouseover="this.style.background=\'rgba(184,92,56,0.10)\';this.style.borderColor=\'rgba(184,92,56,0.65)\';" onmouseout="this.style.background=\'transparent\';this.style.borderColor=\'rgba(184,92,56,0.45)\';">Send</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    const close = () => overlay.remove();
    overlay.querySelector('.detail-modal-close').addEventListener('click', close);
    overlay.querySelector('#pushPromptCancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    overlay.querySelector('#pushPromptSend').addEventListener('click', async () => {
        const title = overlay.querySelector('#pushPromptTitle').value.trim();
        const body = overlay.querySelector('#pushPromptBody').value.trim();
        if (!title || !body) {
            showToast('Title and message are required.', 'warning');
            return;
        }
        const btn = overlay.querySelector('#pushPromptSend');
        btn.disabled = true;
        btn.textContent = 'Sending...';
        try {
            // 1. In-app notification doc
            await db.collection('notifications').add({
                userId: userId,
                title: title,
                message: body,
                type: 'order_status',
                referenceId: '',
                isRead: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            // 2. Real push via the Cloudflare Worker
            const r = await sendPushToUser(userId, title, body);
            try {
                await logAuditAction('push_user', userId, 'user',
                    { title: title, sent: r.sent || 0 });
            } catch (_) {}
            showToast('Sent — ' + (r.sent || 0) + ' device(s) reached.', 'success');
            close();
        } catch (e) {
            console.error('per-user push error', e);
            showToast('Failed to send.', 'error');
            btn.disabled = false;
            btn.textContent = 'Send';
        }
    });
}

// Expose globally so dashboard.js inline handlers can call it.
window.sendPushPrompt = sendPushPrompt;


// =============================================
// SAFE AVATAR HELPERS
// Patches the user/artist tables so a broken profileImageUrl (e.g. dead
// Supabase host or a 404'd CDN file) automatically swaps to the generated
// ui-avatars initial circle — same look as users who never uploaded a photo.
// =============================================

const _DEAD_AVATAR_HOSTS = [
    'kkclietlnrumhptdyguj.supabase.co', // old/deleted Supabase project
];

function _isDeadAvatarUrl(url) {
    if (!url || typeof url !== 'string') return true;
    for (const host of _DEAD_AVATAR_HOSTS) {
        if (url.includes(host)) return true;
    }
    return false;
}

/// Builds the default ui-avatars URL for a given user name.
function defaultAvatarUrl(name, bg) {
    const enc = encodeURIComponent(name || '?');
    const color = bg || '5B9BB5';
    return `https://ui-avatars.com/api/?name=${enc}&background=${color}&color=fff&size=80`;
}

/// Computes the best avatar URL for a user. If the stored profileImageUrl
/// is empty OR points at a known-dead host, returns the generated fallback.
function safeAvatarSrc(profileImageUrl, name, bg) {
    return _isDeadAvatarUrl(profileImageUrl) ? defaultAvatarUrl(name, bg) : profileImageUrl;
}

/// Once the table rows are rendered by dashboard.js, walk every <img.user-avatar>
/// element and rewrite its src so dead URLs are replaced AND attach an
/// onerror handler so a 404 at runtime also falls back gracefully.
function patchUserAvatars() {
    document.querySelectorAll('img.user-avatar').forEach((img) => {
        if (img.dataset.patched === '1') return;
        img.dataset.patched = '1';

        const name = img.getAttribute('alt') || '?';
        const fallback = defaultAvatarUrl(name);

        // Replace known-dead hosts immediately, before the browser tries them.
        if (_isDeadAvatarUrl(img.src)) {
            img.src = fallback;
        }
        img.addEventListener('error', () => {
            if (img.src !== fallback) img.src = fallback;
        });
    });
}

// Run after every table reload. We patch on a MutationObserver against the
// known table tbodies so newly-rendered rows pick up the fix without us
// hooking into every loader.
function _installAvatarObserver() {
    const targets = ['customersTableBody', 'allUsersTableBody', 'artistsTableBody'];
    targets.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const obs = new MutationObserver(() => patchUserAvatars());
        obs.observe(el, { childList: true, subtree: true });
    });
    // Initial pass for whatever is already on screen.
    patchUserAvatars();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _installAvatarObserver);
} else {
    _installAvatarObserver();
}

// =============================================
// Generic broken-image fallback for all modal content.
// Watches the document for any modal overlay added by the admin and attaches
// an onerror handler to every <img> inside — so post images / report previews
// / 360° modal media gracefully degrade to a placeholder if the source is
// dead. Cheap: only runs when a modal opens, and only on its descendants.
// =============================================
const _GENERIC_IMG_FALLBACK = 'https://via.placeholder.com/240?text=No+Image';

function _patchModalImages(modal) {
    if (!modal) return;
    modal.querySelectorAll('img').forEach((img) => {
        if (img.dataset.imgPatched === '1') return;
        img.dataset.imgPatched = '1';
        // Avatars already have their own fallback path — skip them.
        if (img.classList.contains('user-avatar')) return;
        // Replace known-dead Supabase host immediately.
        if (_isDeadAvatarUrl(img.src)) {
            img.src = _GENERIC_IMG_FALLBACK;
        }
        img.addEventListener('error', () => {
            if (img.src !== _GENERIC_IMG_FALLBACK) img.src = _GENERIC_IMG_FALLBACK;
        });
    });
}

const _modalObserver = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
        m.addedNodes.forEach((node) => {
            if (node.nodeType !== 1) return;
            if (node.classList && node.classList.contains('detail-modal-overlay')) {
                _patchModalImages(node);
                // Also re-patch when the modal's contents change (tab switches).
                const inner = new MutationObserver(() => _patchModalImages(node));
                inner.observe(node, { childList: true, subtree: true });
            }
        });
    });
});
_modalObserver.observe(document.body, { childList: true });

window.safeAvatarSrc = safeAvatarSrc;
window.defaultAvatarUrl = defaultAvatarUrl;
window.patchUserAvatars = patchUserAvatars;

