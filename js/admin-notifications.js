// =============================================
// NOTIFICATIONS 2.0 — broadcast + log + recipients
// Replaces the bare broadcast form with:
//   - KPI strip
//   - Send broadcast card (audience, title, body, preview, send)
//   - Notification log feed (filterable by type, searchable, sortable)
//   - Top recipients sidebar
// Reuses sendPushToUser() from admin-extensions.js.
// =============================================

(function () {
    function safe(v) {
        if (v == null) return '';
        return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function fmtAgo(ts) {
        if (!ts || !ts.toDate) return '—';
        const d = ts.toDate();
        const sec = Math.floor((Date.now() - d.getTime()) / 1000);
        if (sec < 60) return 'just now';
        if (sec < 3600) return Math.floor(sec / 60) + ' min ago';
        if (sec < 86400) return Math.floor(sec / 3600) + ' h ago';
        if (sec < 604800) return Math.floor(sec / 86400) + ' d ago';
        return d.toLocaleDateString();
    }
    function avatarHtml(name, imgUrl, size) {
        const s = size || 36;
        if (imgUrl) {
            return `<img src="${safe(imgUrl)}" style="width:${s}px;height:${s}px;border-radius:50%;object-fit:cover;flex-shrink:0;"/>`;
        }
        const initial = (name || '?').trim().substring(0, 1).toUpperCase();
        return `<div style="width:${s}px;height:${s}px;border-radius:50%;background:linear-gradient(135deg,#D4A574,#C8602F);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:${Math.round(s * 0.4)}px;flex-shrink:0;">${safe(initial)}</div>`;
    }

    // ─── Notification type metadata (icon + colour + label) ─────
    const TYPE_META = {
        order_placed:      { icon: '🛍', color: '#2E86AB', label: 'Order placed' },
        order_accepted:    { icon: '✓',  color: '#10B981', label: 'Order accepted' },
        order_extended:    { icon: '⏰', color: '#F59E0B', label: 'Deadline extended' },
        order_shipped:     { icon: '📦', color: '#1B998B', label: 'Order shipped' },
        order_cancelled:   { icon: '✕',  color: '#ED4956', label: 'Order cancelled' },
        order_status:      { icon: '🚚', color: '#1B998B', label: 'Order update' },
        refund_issued:     { icon: '↩',  color: '#6366F1', label: 'Refund' },
        earnings_released: { icon: '$',  color: '#10B981', label: 'Earnings released' },
        payment_received:  { icon: '💳', color: '#10B981', label: 'Payment' },
        payout:            { icon: '🏦', color: '#C8A870', label: 'Payout' },
        post_removed:      { icon: '🗑',  color: '#ED4956', label: 'Post removed' },
        rating:            { icon: '★',  color: '#F59E0B', label: 'Rating' },
        message:           { icon: '💬', color: '#0EA5E9', label: 'Chat' },
        subscription:      { icon: '🎟',  color: '#8B5CF6', label: 'Subscription' },
        wallet_credit:     { icon: '＋', color: '#10B981', label: 'Wallet credit' },
    };
    function typeMeta(t) {
        return TYPE_META[t] || { icon: '🔔', color: '#8E8E8E', label: t || 'Other' };
    }

    let _allNotifs = [];
    let _userMap = {};
    let _activeType = 'all';

    function injectHtml() {
        const page = document.getElementById('broadcastPage');
        if (!page || page.dataset.v2 === '1') return;
        page.dataset.v2 = '1';
        page.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap" style="gap:10px;">
                <h2 class="page-title mb-0">Notifications</h2>
                <div class="filters" style="margin:0;">
                    <input type="text" id="notifSearch" class="form-control filter-select" placeholder="Search title, message, recipient…" style="min-width:240px;"/>
                    <select id="notifSort" class="form-select filter-select">
                        <option value="recent">Most recent</option>
                        <option value="oldest">Oldest first</option>
                    </select>
                    <button id="notifRefresh" class="btn btn-primary" style="padding:6px 16px;font-size:0.85rem;">Refresh</button>
                </div>
            </div>

            <!-- KPI strip -->
            <div class="row g-3 mb-3" id="notifKpis"></div>

            <div class="row g-3">
                <!-- LEFT: Compose + Log -->
                <div class="col-lg-8">
                    <!-- Compose card (collapsible) -->
                    <div class="chart-card mb-3" id="composeCard">
                        <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;" id="composeToggle">
                            <h5 style="margin:0;font-size:14px;color:#262626;">📢 Send broadcast notification</h5>
                            <span id="composeChevron" style="font-size:18px;color:#8E8E8E;">▾</span>
                        </div>
                        <div id="composeBody" style="margin-top:14px;">
                            <form id="broadcastForm">
                                <div class="row g-3 align-items-end">
                                    <div class="col-md-3">
                                        <label class="form-label" style="font-size:12px;">Audience</label>
                                        <select class="form-select" id="broadcastAudience" required>
                                            <option value="all">All users</option>
                                            <option value="customer">Customers only</option>
                                            <option value="artist">Artists only</option>
                                        </select>
                                    </div>
                                    <div class="col-md-9">
                                        <label class="form-label" style="font-size:12px;">Title</label>
                                        <input type="text" class="form-control" id="broadcastTitle" placeholder="e.g. Holiday sale starts tomorrow!" required maxlength="80">
                                    </div>
                                    <div class="col-12">
                                        <label class="form-label" style="font-size:12px;">Message</label>
                                        <textarea class="form-control" id="broadcastBody" rows="3" placeholder="Body of the notification" required maxlength="250"></textarea>
                                    </div>
                                    <div class="col-12 d-flex gap-2">
                                        <button type="button" class="btn btn-secondary" id="broadcastPreviewBtn">Preview audience</button>
                                        <button type="submit" class="btn btn-primary" id="broadcastSendBtn">📤 Send broadcast</button>
                                    </div>
                                </div>
                                <div id="broadcastResult" class="mt-3" style="display:none;"></div>
                            </form>
                        </div>
                    </div>

                    <!-- Filter chips -->
                    <div id="notifChips" class="mb-3" style="display:flex;gap:8px;flex-wrap:wrap;"></div>

                    <!-- Log feed -->
                    <div id="notifFeed" style="display:flex;flex-direction:column;gap:8px;"></div>
                </div>

                <!-- RIGHT: Top recipients + Type breakdown -->
                <div class="col-lg-4">
                    <div class="chart-card mb-3">
                        <h5 style="margin:0 0 10px;font-size:14px;color:#262626;">📊 By type (this batch)</h5>
                        <div id="notifTypeBreakdown" style="display:flex;flex-direction:column;gap:6px;"></div>
                    </div>
                    <div class="chart-card">
                        <h5 style="margin:0 0 10px;font-size:14px;color:#262626;">👥 Top recipients</h5>
                        <div id="notifTopRecipients" style="display:flex;flex-direction:column;gap:8px;"></div>
                    </div>
                </div>
            </div>
        `;

        // Compose toggle
        page.querySelector('#composeToggle').addEventListener('click', () => {
            const body = page.querySelector('#composeBody');
            const chev = page.querySelector('#composeChevron');
            const open = body.style.display !== 'none';
            body.style.display = open ? 'none' : 'block';
            chev.textContent = open ? '▸' : '▾';
        });

        // Filters + refresh
        page.querySelector('#notifSearch').addEventListener('input',
            debounce(() => renderFeed(), 250));
        page.querySelector('#notifSort').addEventListener('change', renderFeed);
        page.querySelector('#notifRefresh').addEventListener('click', runNotifications);

        // Broadcast form handlers (re-wire because we replaced the HTML)
        wireBroadcastHandlers(page);
    }

    function wireBroadcastHandlers(page) {
        page.querySelector('#broadcastPreviewBtn').addEventListener('click', async () => {
            const audience = page.querySelector('#broadcastAudience').value;
            try {
                let q = db.collection('users');
                if (audience === 'customer' || audience === 'artist') {
                    q = q.where('role', '==', audience);
                }
                const snap = await q.get();
                const withTokens = snap.docs.filter(d => ((d.data().fcmTokens || []).length > 0)).length;
                const result = page.querySelector('#broadcastResult');
                result.style.display = 'block';
                result.innerHTML =
                    '<div class="alert alert-info mb-0">' +
                    'Audience: <strong>' + snap.docs.length + '</strong> user(s). ' +
                    '<strong>' + withTokens + '</strong> will receive a real push (have FCM tokens).' +
                    '</div>';
            } catch (e) {
                console.error('preview audience', e);
                showToast('Could not preview audience.', 'error');
            }
        });

        page.querySelector('#broadcastForm').addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const audience = page.querySelector('#broadcastAudience').value;
            const title = page.querySelector('#broadcastTitle').value.trim();
            const body = page.querySelector('#broadcastBody').value.trim();
            if (!title || !body) return;

            const btn = page.querySelector('#broadcastSendBtn');
            btn.disabled = true;
            const original = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';

            try {
                let q = db.collection('users');
                if (audience === 'customer' || audience === 'artist') {
                    q = q.where('role', '==', audience);
                }
                const docs = (await q.get()).docs;
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
                        if (typeof sendPushToUser === 'function') {
                            const r = await sendPushToUser(uid, title, body);
                            pushSent += (r.sent || 0);
                        }
                    } catch (e) {
                        console.warn('broadcast item failed for', uid, e);
                    }
                }));

                try {
                    if (typeof logAuditAction === 'function') {
                        await logAuditAction('broadcast', 'all', 'notification', {
                            audience: audience, title: title, recipients: docs.length,
                        });
                    }
                } catch (_) {}

                const result = page.querySelector('#broadcastResult');
                result.style.display = 'block';
                result.innerHTML =
                    '<div class="alert alert-success mb-0">' +
                    'Delivered to <strong>' + inAppCreated + '</strong> in-app · ' +
                    '<strong>' + pushSent + '</strong> push notifications fired.' +
                    '</div>';
                showToast('Broadcast sent.', 'success');
                page.querySelector('#broadcastTitle').value = '';
                page.querySelector('#broadcastBody').value = '';
                // Refresh the log so the new broadcast appears
                runNotifications();
            } catch (e) {
                console.error('broadcast send error', e);
                showToast('Broadcast failed. See console.', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = original;
            }
        });
    }

    function renderChips() {
        const counts = { all: _allNotifs.length };
        _allNotifs.forEach(n => {
            const t = n.type || 'other';
            counts[t] = (counts[t] || 0) + 1;
        });
        const sortedTypes = Object.keys(counts)
            .filter(t => t !== 'all')
            .sort((a, b) => counts[b] - counts[a])
            .slice(0, 8); // top 8 types

        const chips = [{ id: 'all', label: 'All', n: counts.all }]
            .concat(sortedTypes.map(t => ({
                id: t,
                label: typeMeta(t).label,
                n: counts[t],
                color: typeMeta(t).color,
            })));

        const wrap = document.getElementById('notifChips');
        wrap.innerHTML = chips.map(c => {
            const sel = c.id === _activeType;
            const color = c.color || '#262626';
            return `<button class="notif-chip" data-id="${safe(c.id)}"
                style="padding:7px 14px;border-radius:18px;border:1.5px solid ${sel ? color : '#E6E6E6'};
                background:${sel ? color + '12' : 'white'};color:${sel ? color : '#555'};
                font-size:12px;font-weight:600;cursor:pointer;">${safe(c.label)} <span style="opacity:0.7;">${c.n}</span></button>`;
        }).join('');
        wrap.querySelectorAll('.notif-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                _activeType = btn.dataset.id;
                renderChips();
                renderFeed();
            });
        });
    }

    function renderKpis() {
        const total = _allNotifs.length;
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        let today = 0, month = 0, unread = 0;
        const typeCounts = {};
        _allNotifs.forEach(n => {
            if (n.createdAt && n.createdAt.toDate) {
                const t = n.createdAt.toDate().getTime();
                if (t >= todayStart.getTime()) today++;
                if (t >= monthStart.getTime()) month++;
            }
            if (n.isRead === false) unread++;
            const t = n.type || 'other';
            typeCounts[t] = (typeCounts[t] || 0) + 1;
        });
        const topType = Object.keys(typeCounts).sort((a, b) => typeCounts[b] - typeCounts[a])[0];
        const topLabel = topType ? typeMeta(topType).label : '—';

        document.getElementById('notifKpis').innerHTML = [
            kpi('Total (last 500)', total, '#2E86AB'),
            kpi('Sent today', today, '#10B981'),
            kpi('This month', month, '#84CC16'),
            kpi('Unread', unread, '#F59E0B'),
            kpi('Top type', topLabel, '#8B5CF6'),
        ].join('');

        // Type breakdown sidebar
        const tb = document.getElementById('notifTypeBreakdown');
        if (tb) {
            const sorted = Object.keys(typeCounts).sort((a, b) => typeCounts[b] - typeCounts[a]).slice(0, 8);
            if (sorted.length === 0) {
                tb.innerHTML = '<div style="font-size:12px;color:#8E8E8E;">No data.</div>';
            } else {
                tb.innerHTML = sorted.map(t => {
                    const meta = typeMeta(t);
                    const c = typeCounts[t];
                    const pct = total > 0 ? Math.round((c / total) * 100) : 0;
                    return `
                        <div style="display:flex;align-items:center;gap:8px;font-size:12px;">
                            <span style="width:22px;text-align:center;">${meta.icon}</span>
                            <div style="flex:1;min-width:0;">
                                <div style="display:flex;justify-content:space-between;color:#262626;font-weight:600;">
                                    <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safe(meta.label)}</span>
                                    <span style="color:#8E8E8E;">${c}</span>
                                </div>
                                <div style="height:4px;background:#F0F0F0;border-radius:2px;margin-top:2px;overflow:hidden;">
                                    <div style="width:${pct}%;height:100%;background:${meta.color};"></div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
    }

    function kpi(label, val, accent) {
        return `
            <div class="col-lg col-md-4 col-sm-6">
                <div class="kpi-card" style="${accent ? 'border-left:3px solid ' + accent + ';' : ''}">
                    <div class="kpi-details">
                        <h4 style="margin:0;">${safe(val)}</h4>
                        <p style="margin:0;font-size:11px;">${safe(label)}</p>
                    </div>
                </div>
            </div>
        `;
    }

    function renderFeed() {
        const feed = document.getElementById('notifFeed');
        if (!feed) return;
        const search = (document.getElementById('notifSearch').value || '').toLowerCase();
        const sort = document.getElementById('notifSort').value;

        let list = _allNotifs.filter(n => {
            if (_activeType !== 'all' && (n.type || 'other') !== _activeType) return false;
            if (search) {
                const u = _userMap[n.userId] || {};
                const hay = ((n.title || '') + ' ' + (n.message || '') + ' ' + (u.name || '') + ' ' + (u.email || '')).toLowerCase();
                if (!hay.includes(search)) return false;
            }
            return true;
        });

        if (sort === 'oldest') {
            list.sort((a, b) => {
                const ta = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
                const tb = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
                return ta - tb;
            });
        } else {
            list.sort((a, b) => {
                const ta = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
                const tb = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
                return tb - ta;
            });
        }

        if (list.length === 0) {
            feed.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#8E8E8E;font-size:13px;background:white;border-radius:10px;border:1px solid #ECECEC;">No notifications match these filters.</div>';
            return;
        }

        feed.innerHTML = list.slice(0, 80).map(n => {
            const u = _userMap[n.userId] || {};
            const meta = typeMeta(n.type);
            const isUnread = n.isRead === false;
            return `
                <div style="background:white;border:1px solid #ECECEC;border-left:4px solid ${meta.color};border-radius:10px;padding:12px 14px;opacity:${isUnread ? 1 : 0.85};">
                    <div style="display:flex;gap:12px;align-items:start;">
                        <div style="width:36px;height:36px;border-radius:50%;background:${meta.color}22;color:${meta.color};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">${meta.icon}</div>
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;margin-bottom:2px;">
                                <strong style="font-size:13px;color:#262626;">${safe(n.title || '')}</strong>
                                <span style="font-size:10px;color:#8E8E8E;white-space:nowrap;flex-shrink:0;">${fmtAgo(n.createdAt)}</span>
                            </div>
                            <div style="font-size:12px;color:#555;margin-bottom:6px;line-height:1.4;">${safe(n.message || '')}</div>
                            <div style="display:flex;gap:10px;align-items:center;font-size:11px;">
                                <span style="background:${meta.color}11;color:${meta.color};padding:2px 8px;border-radius:8px;font-weight:600;">${safe(meta.label)}</span>
                                <span style="color:#8E8E8E;cursor:pointer;text-decoration:underline;"
                                    onclick="window.showUserDetail && window.showUserDetail('${safe(n.userId)}')">
                                    → ${safe(u.name || 'Unknown user')}
                                </span>
                                ${isUnread ? '<span style="background:#2E86AB22;color:#2E86AB;padding:2px 8px;border-radius:8px;font-weight:600;">Unread</span>' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderTopRecipients() {
        const wrap = document.getElementById('notifTopRecipients');
        if (!wrap) return;
        const counts = {};
        _allNotifs.forEach(n => {
            counts[n.userId] = (counts[n.userId] || 0) + 1;
        });
        const top = Object.keys(counts)
            .sort((a, b) => counts[b] - counts[a])
            .slice(0, 8);

        if (top.length === 0) {
            wrap.innerHTML = '<div style="font-size:12px;color:#8E8E8E;">No data.</div>';
            return;
        }
        wrap.innerHTML = top.map(uid => {
            const u = _userMap[uid] || {};
            return `
                <div style="display:flex;align-items:center;gap:10px;padding:6px;border-radius:8px;cursor:pointer;"
                    onclick="window.showUserDetail && window.showUserDetail('${safe(uid)}')">
                    ${avatarHtml(u.name, u.profileImageUrl, 32)}
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:600;font-size:12px;color:#262626;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safe(u.name || 'Unknown')}</div>
                        <div style="font-size:11px;color:#8E8E8E;">${safe(u.role || '—')}</div>
                    </div>
                    <div style="font-size:13px;font-weight:700;color:#2E86AB;flex-shrink:0;">${counts[uid]}</div>
                </div>
            `;
        }).join('');
    }

    async function runNotifications() {
        injectHtml();
        try {
            const snap = await db.collection('notifications').orderBy('createdAt', 'desc').limit(500).get()
                .catch(async () => await db.collection('notifications').limit(500).get());
            let docs = snap.docs;
            if (typeof window.filterByDate === 'function') docs = window.filterByDate(docs, 'notifications');
            _allNotifs = docs.map(d => d.data());

            // Batch-fetch the unique users
            const userIds = [...new Set(_allNotifs.map(n => n.userId).filter(Boolean))];
            const userDocs = await Promise.all(
                userIds.map(id => db.collection('users').doc(id).get())
            );
            _userMap = {};
            userDocs.forEach(d => { if (d.exists) _userMap[d.id] = d.data(); });

            renderKpis();
            renderChips();
            renderFeed();
            renderTopRecipients();
        } catch (e) {
            console.error('notifications load error', e);
            showToast('Could not load notifications.', 'error');
        }
    }
    // Exposed for admin-date-filter.js to call when the date range changes.
    window._notifReload = runNotifications;

    // Override the page enter: when sidebar item "broadcast" is clicked,
    // the existing dashboard.js routing code calls nothing for that case
    // (we added it earlier as a no-op). Patch the case by overriding the
    // sidebar click handler for that single item.
    document.addEventListener('DOMContentLoaded', () => {
        const item = document.querySelector('.sidebar-menu li[data-page="broadcast"]');
        if (item) {
            // Update label to "Notifications"
            const textNode = Array.from(item.childNodes).find(n => n.nodeType === 3 && n.textContent.trim());
            if (textNode) textNode.textContent = ' Notifications';
            item.addEventListener('click', () => runNotifications());
        }
    });

    // Also run if the page is already active when this script loads
    if (document.querySelector('.page-content.active')?.id === 'broadcastPage') {
        runNotifications();
    }

    window.runNotifications = runNotifications;
})();
