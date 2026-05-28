// =============================================
// OVERVIEW 2.0 — operations command center
// "What needs my attention RIGHT NOW?"
//   - Today's pulse strip
//   - Action queue (overdue orders, pending reports, artists missing payout card)
//   - Live activity feed (recent events across the platform)
//   - Compact total-snapshot sidebar
// Overrides window.loadOverview() from dashboard.js.
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
    function money(v) { return '$' + (Number(v) || 0).toFixed(2); }
    function avatarHtml(name, imgUrl, size) {
        const s = size || 32;
        if (imgUrl) {
            return `<img src="${safe(imgUrl)}" style="width:${s}px;height:${s}px;border-radius:50%;object-fit:cover;flex-shrink:0;"/>`;
        }
        const initial = (name || '?').trim().substring(0, 1).toUpperCase();
        return `<div style="width:${s}px;height:${s}px;border-radius:50%;background:linear-gradient(135deg,#D4A574,#C8602F);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:${Math.round(s * 0.42)}px;flex-shrink:0;">${safe(initial)}</div>`;
    }

    let _userMap = {};

    function injectHtml() {
        const page = document.getElementById('overviewPage');
        if (!page || page.dataset.v2 === '1') return;
        page.dataset.v2 = '1';
        page.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap" style="gap:10px;">
                <div>
                    <h2 class="page-title mb-0">Operations</h2>
                    <p class="text-muted" style="font-size:12px;margin:0;">What needs your attention right now</p>
                </div>
                <div class="filters" style="margin:0;">
                    <span id="overviewClock" class="text-muted" style="font-size:12px;line-height:34px;"></span>
                    <button id="overviewRefresh" class="btn btn-primary" style="padding:6px 16px;font-size:0.85rem;">Refresh</button>
                </div>
            </div>

            <!-- Today's pulse strip -->
            <div class="row g-3 mb-3" id="todayPulse"></div>

            <div class="row g-3">
                <!-- LEFT: Action queue + activity feed -->
                <div class="col-lg-8">
                    <!-- Action queue cards (3 columns) -->
                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <div class="chart-card" id="overdueOrdersCard">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                                    <h5 style="margin:0;font-size:14px;color:#262626;">🚨 Overdue orders</h5>
                                    <span style="font-size:11px;color:#8E8E8E;cursor:pointer;text-decoration:underline;" onclick="document.querySelector('[data-page=&quot;deadlines&quot;]').click()">View all</span>
                                </div>
                                <div id="overdueList"></div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="chart-card" id="pendingReportsCard">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                                    <h5 style="margin:0;font-size:14px;color:#262626;">⚠ Pending reports</h5>
                                    <span style="font-size:11px;color:#8E8E8E;cursor:pointer;text-decoration:underline;" onclick="document.querySelector('[data-page=&quot;reports&quot;]').click()">View all</span>
                                </div>
                                <div id="pendingReportsList"></div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="chart-card">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                                    <h5 style="margin:0;font-size:14px;color:#262626;">💳 Artists missing payout card</h5>
                                    <span style="font-size:11px;color:#8E8E8E;">Blocks accepting orders</span>
                                </div>
                                <div id="noPayoutList"></div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="chart-card">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                                    <h5 style="margin:0;font-size:14px;color:#262626;">👋 New artists (last 7 days)</h5>
                                    <span style="font-size:11px;color:#8E8E8E;">Awaiting first sale</span>
                                </div>
                                <div id="newArtistsList"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Activity feed -->
                    <div class="chart-card">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                            <h5 style="margin:0;font-size:14px;color:#262626;">📡 Live activity</h5>
                            <span style="font-size:11px;color:#8E8E8E;">Last 24h across the platform</span>
                        </div>
                        <div id="activityStream"></div>
                    </div>
                </div>

                <!-- RIGHT: Compact stats snapshot -->
                <div class="col-lg-4">
                    <div class="chart-card mb-3">
                        <h5 style="margin:0 0 10px;font-size:14px;color:#262626;">📊 At a glance</h5>
                        <div id="snapshotList"></div>
                        <div style="border-top:1px solid #F0F0F0;margin-top:10px;padding-top:10px;font-size:11px;color:#8E8E8E;text-align:center;">
                            For trends and date-range analysis, open
                            <span style="color:#2E86AB;cursor:pointer;text-decoration:underline;" onclick="document.querySelector('[data-page=&quot;analytics&quot;]').click()">Analytics →</span>
                        </div>
                    </div>
                    <div class="chart-card" style="padding:14px;">
                        <h5 style="margin:0 0 12px;font-size:14px;color:#262626;display:flex;align-items:center;gap:6px;">
                            <span style="font-size:16px;">🎯</span> Quick actions
                        </h5>
                        <div class="quick-actions-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                            ${quickAction({
                                page: 'broadcast',
                                icon: '📢',
                                title: 'Send notification',
                                desc: 'Broadcast to users',
                                grad: 'linear-gradient(135deg,#0EA5E9,#0284C7)',
                                badge: null,
                            })}
                            ${quickAction({
                                page: 'deadlines',
                                icon: '⏰',
                                title: 'Deadlines',
                                desc: 'Monitor orders',
                                grad: 'linear-gradient(135deg,#F59E0B,#D97706)',
                                badge: 'deadlinesBadge',
                            })}
                            ${quickAction({
                                page: 'reports',
                                icon: '⚠',
                                title: 'Triage reports',
                                desc: 'Review flagged',
                                grad: 'linear-gradient(135deg,#ED4956,#BE123C)',
                                badge: 'reportsBadge',
                            })}
                            ${quickAction({
                                page: 'ratings',
                                icon: '★',
                                title: 'Reviews',
                                desc: 'Customer feedback',
                                grad: 'linear-gradient(135deg,#F59E0B,#EAB308)',
                                badge: null,
                            })}
                        </div>
                    </div>
                </div>
            </div>
        `;

        page.querySelector('#overviewRefresh').addEventListener('click', runOverview);

        // Live clock
        const clockEl = page.querySelector('#overviewClock');
        const tick = () => {
            const d = new Date();
            clockEl.textContent =
                d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) +
                ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        };
        tick(); setInterval(tick, 30000);
    }

    // Renders a single colourful Quick Action tile. Each tile has its own
    // gradient, big icon, title, description, and optionally a live badge
    // count pulled from one of the existing sidebar badge spans.
    function quickAction({ page, icon, title, desc, grad, badge }) {
        // Read the matching sidebar badge text so the tile mirrors it without
        // its own subscription. Stays 0 / hidden if the badge isn't there yet.
        let badgeHtml = '';
        if (badge) {
            const node = document.getElementById(badge);
            const txt = node && node.textContent && node.textContent.trim();
            const visible = node && node.style.display !== 'none' && Number(txt) > 0;
            if (visible) {
                badgeHtml = `<span class="qa-badge">${safe(txt)}</span>`;
            }
        }
        return `
            <button class="quick-action-tile"
                style="background:${grad};"
                onclick="document.querySelector('[data-page=&quot;${page}&quot;]').click()">
                <span class="qa-icon">${icon}</span>
                <span class="qa-title">${safe(title)}</span>
                <span class="qa-desc">${safe(desc)}</span>
                ${badgeHtml}
            </button>
        `;
    }

    // Inject the tile styles once. Pure CSS so hover/focus is GPU-cheap.
    if (!document.getElementById('quickActionStyles')) {
        const s = document.createElement('style');
        s.id = 'quickActionStyles';
        s.textContent = `
            .quick-action-tile {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                justify-content: center;
                gap: 4px;
                padding: 14px 12px;
                border: none;
                border-radius: 12px;
                color: white;
                text-align: left;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.10);
                transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
                overflow: hidden;
                min-height: 100px;
            }
            .quick-action-tile::before {
                content: "";
                position: absolute;
                inset: 0;
                background: radial-gradient(circle at top right, rgba(255,255,255,0.25), transparent 60%);
                pointer-events: none;
            }
            .quick-action-tile:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
                filter: brightness(1.05);
            }
            .quick-action-tile:active {
                transform: translateY(0);
                filter: brightness(0.95);
            }
            .quick-action-tile .qa-icon {
                font-size: 24px;
                line-height: 1;
                margin-bottom: 2px;
                filter: drop-shadow(0 1px 2px rgba(0,0,0,0.25));
            }
            .quick-action-tile .qa-title {
                font-size: 14px;
                font-weight: 700;
                letter-spacing: 0.1px;
            }
            .quick-action-tile .qa-desc {
                font-size: 11px;
                opacity: 0.85;
                font-weight: 500;
            }
            .quick-action-tile .qa-badge {
                position: absolute;
                top: 8px;
                right: 8px;
                background: white;
                color: #262626;
                font-size: 11px;
                font-weight: 800;
                padding: 2px 7px;
                border-radius: 10px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                min-width: 20px;
                text-align: center;
            }
        `;
        document.head.appendChild(s);
    }

    function pulseCard(label, val, accent, sublabel) {
        return `
            <div class="col-lg-2 col-md-4 col-sm-6">
                <div class="kpi-card" style="border-left:3px solid ${accent};">
                    <div class="kpi-details">
                        <h4 style="margin:0;">${safe(val)}</h4>
                        <p style="margin:0;font-size:11px;">${safe(label)}</p>
                        ${sublabel ? `<p style="margin:0;font-size:10px;color:#8E8E8E;">${safe(sublabel)}</p>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    function emptyState(msg) {
        return `<div style="text-align:center;padding:20px 10px;color:#8E8E8E;font-size:12px;">${safe(msg)}</div>`;
    }

    async function runOverview() {
        injectHtml();
        try {
            const now = Date.now();
            const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
            const tsToday = firebase.firestore.Timestamp.fromDate(todayStart);
            const sevenDays = new Date(now - 7 * 86400000);
            const tsSevenDays = firebase.firestore.Timestamp.fromDate(sevenDays);

            // Parallel-fetch everything we need
            const [
                todayOrdersSnap, todayUsersSnap, todayPostsSnap, pendingReportsSnap,
                inFlightOrdersSnap, recentArtistsSnap, allArtistsSnap,
            ] = await Promise.all([
                db.collection('orders').where('createdAt', '>=', tsToday).get().catch(() => ({ docs: [] })),
                db.collection('users').where('createdAt', '>=', tsToday).get().catch(() => ({ docs: [] })),
                db.collection('posts').where('createdAt', '>=', tsToday).get().catch(() => ({ docs: [] })),
                db.collection('reports').where('status', '==', 'pending').get().catch(() => ({ docs: [] })),
                Promise.all([
                    db.collection('orders').where('status', '==', 'in_progress').get().catch(() => ({ docs: [] })),
                    db.collection('orders').where('status', '==', 'processing').get().catch(() => ({ docs: [] })),
                ]).then(([a, b]) => ({ docs: [...a.docs, ...b.docs] })),
                db.collection('users').where('role', '==', 'artist').where('createdAt', '>=', tsSevenDays).get().catch(() => ({ docs: [] })),
                db.collection('users').where('role', '==', 'artist').limit(200).get().catch(() => ({ docs: [] })),
            ]);

            // Today's pulse counters
            const newOrders = todayOrdersSnap.docs.length;
            let todayRev = 0;
            todayOrdersSnap.docs.forEach(d => {
                const o = d.data();
                if (['shipping', 'delivered', 'shipped'].includes(o.status)) {
                    todayRev += (o.total || o.totalAmount || 0);
                }
            });

            // Overdue & urgent
            const overdue = [];
            const soonDue = [];
            inFlightOrdersSnap.docs.forEach(d => {
                const o = d.data();
                const dl = o.estimatedCompletionDate;
                if (!dl || !dl.toDate) return;
                const ms = dl.toDate().getTime();
                const remaining = ms - now;
                if (remaining < 0) overdue.push({ id: d.id, order: o, ms });
                else if (remaining < 48 * 3600 * 1000) soonDue.push({ id: d.id, order: o, ms });
            });
            overdue.sort((a, b) => a.ms - b.ms);

            // Build pulse strip
            document.getElementById('todayPulse').innerHTML = [
                pulseCard('New orders', newOrders, '#2E86AB', 'today'),
                pulseCard('Revenue', money(todayRev), '#10B981', 'today'),
                pulseCard('New users', todayUsersSnap.docs.length, '#84CC16', 'today'),
                pulseCard('New posts', todayPostsSnap.docs.length, '#1B998B', 'today'),
                pulseCard('Pending reports', pendingReportsSnap.docs.length, '#ED4956', 'awaiting review'),
                pulseCard('Overdue orders', overdue.length, '#F59E0B', soonDue.length + ' due in <48h'),
            ].join('');

            // Resolve user names for the cards
            const allUserIds = new Set();
            overdue.forEach(o => { allUserIds.add(o.order.artistId); allUserIds.add(o.order.customerId); });
            pendingReportsSnap.docs.forEach(d => allUserIds.add(d.data().reporterId));
            recentArtistsSnap.docs.forEach(d => allUserIds.add(d.id));
            const userDocs = await Promise.all([...allUserIds].filter(Boolean)
                .map(id => db.collection('users').doc(id).get()));
            _userMap = {};
            userDocs.forEach(d => { if (d.exists) _userMap[d.id] = d.data(); });

            // Overdue list (top 5)
            const overdueEl = document.getElementById('overdueList');
            if (overdue.length === 0) {
                overdueEl.innerHTML = emptyState('✓ No overdue orders. Nice.');
            } else {
                overdueEl.innerHTML = overdue.slice(0, 5).map(item => {
                    const days = Math.floor((now - item.ms) / 86400000);
                    const hrs = Math.floor((now - item.ms) / 3600000);
                    const u = _userMap[item.order.artistId] || {};
                    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 6px;border-bottom:1px solid #F5F5F7;cursor:pointer;"
                        onclick="window.viewOrderDetails && viewOrderDetails('${item.id}')">
                        ${avatarHtml(u.name, u.profileImageUrl, 32)}
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:600;font-size:12px;color:#262626;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safe(item.order.artistName || u.name || 'Artist')}</div>
                            <div style="font-size:11px;color:#8E8E8E;">→ ${safe(item.order.customerName || 'customer')}</div>
                        </div>
                        <span style="background:rgba(237,73,86,0.15);color:#ED4956;padding:3px 8px;border-radius:8px;font-size:11px;font-weight:700;white-space:nowrap;flex-shrink:0;">${days > 0 ? days + 'd' : hrs + 'h'} late</span>
                    </div>`;
                }).join('');
            }

            // Pending reports list (top 5)
            const reportsEl = document.getElementById('pendingReportsList');
            const pendingDocs = pendingReportsSnap.docs;
            if (pendingDocs.length === 0) {
                reportsEl.innerHTML = emptyState('✓ No pending reports.');
            } else {
                reportsEl.innerHTML = pendingDocs.slice(0, 5).map(d => {
                    const r = d.data();
                    const u = _userMap[r.reporterId] || {};
                    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 6px;border-bottom:1px solid #F5F5F7;cursor:pointer;"
                        onclick="window.showReportDetail360 && showReportDetail360('${d.id}')">
                        <div style="width:32px;height:32px;border-radius:50%;background:rgba(245,158,11,0.15);color:#F59E0B;display:flex;align-items:center;justify-content:center;flex-shrink:0;">⚠</div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:600;font-size:12px;color:#262626;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safe(r.reason || 'Report')}</div>
                            <div style="font-size:11px;color:#8E8E8E;">By ${safe(u.name || r.reporterName || 'someone')} · ${fmtAgo(r.createdAt)}</div>
                        </div>
                    </div>`;
                }).join('');
            }

            // Artists missing payout card (top 5)
            const noPayoutEl = document.getElementById('noPayoutList');
            const missing = allArtistsSnap.docs.filter(d => {
                const u = d.data();
                const pc = u.payoutCard;
                return !pc || typeof pc !== 'object' || !pc.last4;
            });
            if (missing.length === 0) {
                noPayoutEl.innerHTML = emptyState('✓ Every artist has a payout card.');
            } else {
                noPayoutEl.innerHTML = missing.slice(0, 5).map(d => {
                    const u = d.data();
                    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 6px;border-bottom:1px solid #F5F5F7;cursor:pointer;"
                        onclick="window.showUserDetail && showUserDetail('${d.id}')">
                        ${avatarHtml(u.name, u.profileImageUrl, 32)}
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:600;font-size:12px;color:#262626;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safe(u.name || 'Artist')}</div>
                            <div style="font-size:11px;color:#8E8E8E;">${safe(u.category || '—')}</div>
                        </div>
                        <span style="background:rgba(237,73,86,0.15);color:#ED4956;padding:3px 8px;border-radius:8px;font-size:11px;font-weight:700;white-space:nowrap;flex-shrink:0;">blocked</span>
                    </div>`;
                }).join('');
                if (missing.length > 5) {
                    noPayoutEl.innerHTML += `<div style="text-align:center;font-size:11px;color:#8E8E8E;padding:6px;">+ ${missing.length - 5} more</div>`;
                }
            }

            // New artists awaiting first sale (last 7 days)
            const newArtistsEl = document.getElementById('newArtistsList');
            const newArtists = recentArtistsSnap.docs;
            if (newArtists.length === 0) {
                newArtistsEl.innerHTML = emptyState('No new artists this week.');
            } else {
                newArtistsEl.innerHTML = newArtists.slice(0, 5).map(d => {
                    const u = d.data();
                    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 6px;border-bottom:1px solid #F5F5F7;cursor:pointer;"
                        onclick="window.showUserDetail && showUserDetail('${d.id}')">
                        ${avatarHtml(u.name, u.profileImageUrl, 32)}
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:600;font-size:12px;color:#262626;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safe(u.name || 'Artist')}</div>
                            <div style="font-size:11px;color:#8E8E8E;">${safe(u.category || '—')} · joined ${fmtAgo(u.createdAt)}</div>
                        </div>
                    </div>`;
                }).join('');
            }

            // Activity feed — recent events across the platform (last 24h)
            await renderActivityFeed();

            // At-a-glance snapshot (totals)
            await renderSnapshot();

        } catch (e) {
            console.error('overview load error', e);
            showToast('Could not load overview.', 'error');
        }
    }

    async function renderActivityFeed() {
        const wrap = document.getElementById('activityStream');
        if (!wrap) return;
        try {
            const since = firebase.firestore.Timestamp.fromDate(new Date(Date.now() - 86400000));
            const [orders, users, reports, ratings] = await Promise.all([
                db.collection('orders').where('createdAt', '>=', since).get().catch(() => ({ docs: [] })),
                db.collection('users').where('createdAt', '>=', since).get().catch(() => ({ docs: [] })),
                db.collection('reports').where('createdAt', '>=', since).get().catch(() => ({ docs: [] })),
                db.collection('ratings').where('createdAt', '>=', since).get().catch(() => ({ docs: [] })),
            ]);

            const events = [];
            orders.docs.forEach(d => {
                const o = d.data();
                events.push({
                    ts: o.createdAt && o.createdAt.toMillis ? o.createdAt.toMillis() : 0,
                    icon: '🛍', color: '#2E86AB',
                    text: `<strong>${safe(o.customerName || 'A customer')}</strong> ordered from <strong>${safe(o.artistName || 'an artist')}</strong>`,
                    sub: money(o.total || o.totalAmount || 0),
                    click: `viewOrderDetails('${d.id}')`,
                });
            });
            users.docs.forEach(d => {
                const u = d.data();
                events.push({
                    ts: u.createdAt && u.createdAt.toMillis ? u.createdAt.toMillis() : 0,
                    icon: u.role === 'artist' ? '🎨' : '👋', color: '#84CC16',
                    text: `New ${safe(u.role || 'user')}: <strong>${safe(u.name || 'someone')}</strong>`,
                    sub: u.category || u.email || '',
                    click: `showUserDetail('${d.id}')`,
                });
            });
            reports.docs.forEach(d => {
                const r = d.data();
                events.push({
                    ts: r.createdAt && r.createdAt.toMillis ? r.createdAt.toMillis() : 0,
                    icon: '⚠', color: '#ED4956',
                    text: `Report filed: <strong>${safe(r.reason || 'Report')}</strong>`,
                    sub: 'by ' + safe(r.reporterName || 'someone'),
                    click: `showReportDetail360('${d.id}')`,
                });
            });
            ratings.docs.forEach(d => {
                const r = d.data();
                const stars = (r.stars || 0);
                const isLow = stars <= 2;
                events.push({
                    ts: r.createdAt && r.createdAt.toMillis ? r.createdAt.toMillis() : 0,
                    icon: '★', color: isLow ? '#ED4956' : '#F59E0B',
                    text: `${stars}★ ${isLow ? '<strong style="color:#ED4956;">low</strong> ' : ''}rating for <strong>${safe(r.artistName || 'an artist')}</strong>`,
                    sub: (r.feedback || '').substring(0, 60) + ((r.feedback || '').length > 60 ? '…' : ''),
                    click: `showUserDetail('${r.artistId}')`,
                });
            });

            events.sort((a, b) => b.ts - a.ts);
            const top = events.slice(0, 20);

            if (top.length === 0) {
                wrap.innerHTML = emptyState('No activity in the last 24 hours.');
                return;
            }
            wrap.innerHTML = top.map(e => `
                <div style="display:flex;gap:12px;align-items:start;padding:8px 4px;border-bottom:1px solid #F5F5F7;cursor:pointer;"
                    onclick="${e.click}">
                    <div style="width:32px;height:32px;border-radius:50%;background:${e.color}22;color:${e.color};display:flex;align-items:center;justify-content:center;flex-shrink:0;">${e.icon}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:13px;color:#262626;line-height:1.4;">${e.text}</div>
                        ${e.sub ? `<div style="font-size:11px;color:#8E8E8E;margin-top:2px;">${safe(e.sub)}</div>` : ''}
                    </div>
                    <span style="font-size:10px;color:#8E8E8E;white-space:nowrap;flex-shrink:0;">${
                        e.ts ? fmtAgo({ toDate: () => new Date(e.ts) }) : ''
                    }</span>
                </div>
            `).join('');
        } catch (e) {
            console.error('activity feed error', e);
            wrap.innerHTML = emptyState('Could not load activity.');
        }
    }

    async function renderSnapshot() {
        const wrap = document.getElementById('snapshotList');
        if (!wrap) return;
        try {
            const [usersC, artistsC, postsC, activePostsC, ratingsSnap] = await Promise.all([
                db.collection('users').get().then(s => s.size),
                db.collection('users').where('role', '==', 'artist').get().then(s => s.size),
                db.collection('posts').get().then(s => s.size),
                db.collection('posts').where('status', '==', 'active').get().then(s => s.size),
                db.collection('ratings').get().catch(() => ({ docs: [] })),
            ]);

            let avg = 0;
            const ratings = ratingsSnap.docs || [];
            if (ratings.length > 0) {
                let sum = 0;
                ratings.forEach(d => { sum += (d.data().stars || 0); });
                avg = sum / ratings.length;
            }

            const items = [
                ['👥', 'Total users', usersC],
                ['🎨', 'Artists', artistsC],
                ['🖼', 'Posts', postsC],
                ['✓', 'Active posts', activePostsC],
                ['★', 'Avg rating', avg ? avg.toFixed(2) : '—'],
            ];
            wrap.innerHTML = items.map(([icon, label, val]) => `
                <div style="display:flex;align-items:center;gap:10px;padding:6px 4px;border-bottom:1px solid #F5F5F7;">
                    <span style="width:22px;text-align:center;font-size:14px;">${icon}</span>
                    <span style="flex:1;font-size:12px;color:#8E8E8E;">${safe(label)}</span>
                    <strong style="font-size:13px;color:#262626;">${safe(val)}</strong>
                </div>
            `).join('');
        } catch (e) {
            console.error('snapshot error', e);
            wrap.innerHTML = emptyState('Could not load snapshot.');
        }
    }

    // Override loadOverview
    window.loadOverview = runOverview;
})();
