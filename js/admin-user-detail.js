// =============================================
// USER 360° DETAIL VIEW
// One modal showing everything the database knows about a user:
//   - Profile + stats header
//   - Tabs: Orders (as customer + as artist), Posts/Reels, Ratings,
//           Reports, Notifications, Wallet & Payouts
// Load this AFTER dashboard.js and admin-extensions.js.
// =============================================

(function () {
    const M_OVERLAY = 'user360-overlay';

    function fmtDate(ts) {
        if (!ts) return '—';
        try { return ts.toDate().toLocaleDateString(); } catch (_) { return '—'; }
    }
    function fmtDateTime(ts) {
        if (!ts) return '—';
        try { return ts.toDate().toLocaleString(); } catch (_) { return '—'; }
    }
    function money(v) { return '$' + (Number(v) || 0).toFixed(2); }
    function safe(v) {
        if (v == null) return '';
        return String(v)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    async function showUserDetail(userId) {
        document.getElementById(M_OVERLAY)?.remove();

        // Fetch the user doc first so we can render a skeleton with the
        // right name immediately.
        let userDoc;
        try {
            userDoc = await db.collection('users').doc(userId).get();
        } catch (e) {
            console.error('user fetch error', e);
            showToast('Could not load user.', 'error');
            return;
        }
        if (!userDoc.exists) {
            showToast('User not found.', 'error');
            return;
        }
        const user = userDoc.data();
        const role = user.role || 'customer';
        const isArtist = role === 'artist';

        const overlay = document.createElement('div');
        overlay.id = M_OVERLAY;
        overlay.className = 'detail-modal-overlay';
        overlay.innerHTML = `
            <div class="detail-modal user360-modal" style="max-width:920px;width:96%;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;">
                <div class="detail-modal-header" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                    <h3 style="margin:0;">User Profile</h3>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <button id="u360RefreshBtn" title="Reload data" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.45rem 1rem;font-size:0.82rem;font-weight:600;color:#2E86AB;background:transparent;border:1.5px solid #2E86AB;border-radius:8px;cursor:pointer;line-height:1;">Refresh</button>
                        <button class="detail-modal-close">&times;</button>
                    </div>
                </div>
                <!-- Header card (static, outside scroll area so the avatar,
                     name and KPI strip stay visible while the tab content
                     scrolls underneath). -->
                <div style="padding:24px;border-bottom:1px solid #ECECEC;background:linear-gradient(135deg,#FAFAFC 0%, #F5F5F7 100%);flex-shrink:0;">
                        <div style="display:flex;gap:18px;align-items:center;">
                            <div style="position:relative;">
                                ${user.profileImageUrl ? `
                                  <img id="u360Avatar" src="${safe(user.profileImageUrl)}"
                                      style="width:80px;height:80px;border-radius:50%;object-fit:cover;background:rgba(111,143,163,0.12);"/>
                                ` : `
                                  <div id="u360Avatar"
                                      style="width:80px;height:80px;border-radius:50%;background:rgba(111,143,163,0.12);display:inline-flex;align-items:center;justify-content:center;color:#6F8FA3;font-weight:700;font-size:34px;line-height:1;">
                                    ${safe(((user.name || '?').trim().charAt(0) || '?').toUpperCase())}
                                  </div>
                                `}
                            </div>
                            <div style="flex:1;min-width:0;">
                                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px;">
                                    <h4 style="margin:0;font-size:20px;font-weight:700;color:#262626;">${safe(user.name || 'Unnamed')}</h4>
                                    <span class="status-badge" style="${
                                        (user.status || 'active') === 'active'
                                            ? 'background:rgba(27,153,139,0.10);color:#1B998B;border:1.5px solid rgba(27,153,139,0.45);'
                                            : 'background:rgba(165,58,51,0.10);color:#A53A33;border:1.5px solid rgba(165,58,51,0.45);'
                                    }text-transform:uppercase;">${safe(user.status || 'active')}</span>
                                </div>
                                <div style="color:#8E8E8E;font-size:13px;margin-bottom:6px;">${safe(user.email || 'no email')}</div>
                                <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                                    <span class="status-badge" style="background:rgba(46,134,171,0.12);color:#2E86AB;">${isArtist ? 'Artist' : 'Customer'}</span>
                                    ${user.category ? `<span class="status-badge" style="background:rgba(245,158,11,0.12);color:#F59E0B;">${safe(user.category)}</span>` : ''}
                                    ${typeof user.averageRating === 'number' ? `<span class="status-badge" style="background:rgba(227,169,60,0.10);color:#E3A93C;border:1.5px solid rgba(227,169,60,0.45);">★ ${user.averageRating.toFixed(1)}</span>` : ''}
                                </div>
                            </div>
                            <div style="display:flex;flex-direction:column;gap:6px;">
                                <button class="btn-action btn-view" id="u360PushBtn" title="Send push to this user">Push</button>
                                ${
                                    (user.status || 'active') === 'active'
                                        ? '<button class="btn-action btn-suspend" id="u360SuspendBtn">Suspend</button>'
                                        : '<button class="btn-action btn-activate" id="u360ActivateBtn">Activate</button>'
                                }
                            </div>
                        </div>
                        <!-- KPI strip -->
                        <div id="u360Kpis" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-top:18px;"></div>
                    </div>

                <!-- Tabs (static, fixed below the header). -->
                <div class="user360-tabs" style="display:flex;gap:2px;background:white;overflow-x:auto;white-space:nowrap;scrollbar-width:none;-ms-overflow-style:none;padding:0 8px;flex-shrink:0;">
                    ${tabHeader('overview', 'Overview', true)}
                    ${tabHeader('orders', 'Orders')}
                    ${isArtist ? tabHeader('posts', 'Posts & Reels') : ''}
                    ${tabHeader('ratings', 'Ratings')}
                    ${tabHeader('reports', 'Reports')}
                    ${tabHeader('notifications', 'Notifications')}
                    ${tabHeader('wallet', 'Wallet')}
                </div>

                <!-- Tab body — the ONLY scrollable region inside the modal. -->
                <div id="u360TabBody" style="padding:20px;min-height:260px;overflow-y:auto;flex:1;"></div>
            </div>
        `;

        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('active'));

        const onEsc = (e) => { if (e.key === 'Escape') close(); };
        const close = () => {
            document.removeEventListener('keydown', onEsc);
            overlay.remove();
        };
        document.addEventListener('keydown', onEsc);
        overlay.querySelector('.detail-modal-close').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

        // Refresh: drop cache + re-render currently active tab + KPI strip
        overlay.querySelector('#u360RefreshBtn')?.addEventListener('click', async () => {
            const btn = overlay.querySelector('#u360RefreshBtn');
            btn.disabled = true;
            const oldText = btn.textContent;
            btn.textContent = '⟳ …';
            try {
                Object.keys(cachedTabs).forEach(k => delete cachedTabs[k]);
                const activeBtn = overlay.querySelector('.user360-tab.active');
                const activeTab = activeBtn ? activeBtn.dataset.tab : 'overview';
                await Promise.all([
                    renderKpis(overlay, userId, user, isArtist),
                    renderTab(activeTab, userId, user, isArtist, overlay, cachedTabs),
                ]);
            } finally {
                btn.disabled = false;
                btn.textContent = oldText;
            }
        });

        // Header buttons
        overlay.querySelector('#u360PushBtn').addEventListener('click', () => {
            if (typeof window.sendPushPrompt === 'function') {
                window.sendPushPrompt(userId, user.name || 'user');
            }
        });
        overlay.querySelector('#u360SuspendBtn')?.addEventListener('click', () => {
            if (typeof suspendUser === 'function') {
                suspendUser(userId, user.name || 'Unknown');
            }
        });
        overlay.querySelector('#u360ActivateBtn')?.addEventListener('click', () => {
            if (typeof activateUser === 'function') {
                activateUser(userId, user.name || 'Unknown');
            }
        });

        // Tab clicks
        const cachedTabs = {};
        overlay.querySelectorAll('.user360-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                overlay.querySelectorAll('.user360-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tab = btn.dataset.tab;
                renderTab(tab, userId, user, isArtist, overlay, cachedTabs);
            });
        });

        // Initial render
        renderKpis(overlay, userId, user, isArtist);
        renderTab('overview', userId, user, isArtist, overlay, cachedTabs);
    }

    function tabHeader(id, label, active) {
        return `<button class="user360-tab ${active ? 'active' : ''}" data-tab="${id}"
            style="background:none;border:none;padding:12px 14px;cursor:pointer;font-size:13px;font-weight:600;color:#8E8E8E;border-bottom:3px solid transparent;white-space:nowrap;line-height:1.2;flex:1 1 auto;text-align:center;">${label}</button>`;
    }

    // CSS tweak via JS so we don't have to edit styles.css
    if (!document.getElementById('u360StyleInject')) {
        const s = document.createElement('style');
        s.id = 'u360StyleInject';
        s.textContent = `
            .user360-tabs { box-shadow: inset 0 -1px 0 #ECECEC; }
            .user360-tab { transition:color .15s ease, background .15s ease; position:relative; min-height:42px; }
            .user360-tab.active { color:#262626 !important; }
            .user360-tab.active::after { content:''; position:absolute; left:10%; right:10%; bottom:0; height:3px; background:#6F8FA3; border-radius:2px 2px 0 0; }
            .user360-tab:hover:not(.active) { color:#262626 !important; background:rgba(111,143,163,0.06); }
            .u360-card { background:white; border:1px solid #ECECEC; border-radius:10px; padding:14px; margin-bottom:10px; }
            .u360-row { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #F5F5F7; }
            .u360-row:last-child { border-bottom:none; }
            .u360-row .lbl { color:#8E8E8E; font-size:12px; font-weight:500; }
            .u360-row .val { color:#262626; font-weight:600; font-size:13px; }
            .u360-kpi { background:white; padding:12px; border-radius:10px; border:1px solid #ECECEC; }
            .u360-kpi h5 { font-size:18px; font-weight:700; margin:0 0 2px 0; color:#262626; }
            .u360-kpi p { font-size:11px; color:#8E8E8E; margin:0; text-transform:uppercase; letter-spacing:0.5px; }
            .u360-empty { text-align:center; padding:32px 12px; color:#8E8E8E; font-size:13px; }
        `;
        document.head.appendChild(s);
    }

    async function renderKpis(overlay, userId, user, isArtist) {
        const kpisEl = overlay.querySelector('#u360Kpis');
        kpisEl.innerHTML =
            '<div class="u360-kpi"><h5>…</h5><p>loading</p></div>'.repeat(4);

        try {
            const fcmCount = Array.isArray(user.fcmTokens) ? user.fcmTokens.length : 0;
            const joined = fmtDate(user.createdAt);

            const ordersQuery = isArtist
                ? db.collection('orders').where('artistId', '==', userId)
                : db.collection('orders').where('customerId', '==', userId);
            const ordersSnap = await ordersQuery.get();
            const orderCount = ordersSnap.size;
            let totalAmount = 0;
            ordersSnap.forEach(d => {
                totalAmount += (d.data().total || d.data().totalAmount || 0);
            });

            let postsCount = 0, reelsCount = 0;
            if (isArtist) {
                const postsSnap = await db.collection('posts').where('artistId', '==', userId).get();
                postsSnap.forEach(d => {
                    if (d.data().mediaType === 'reel') reelsCount++;
                    else postsCount++;
                });
            }

            const cards = [];
            cards.push(kpi('Joined', joined));
            cards.push(kpi('Orders', orderCount));
            cards.push(kpi(isArtist ? 'Total Earned' : 'Total Spent', money(totalAmount)));
            if (isArtist) cards.push(kpi('Posts', postsCount));
            if (isArtist) cards.push(kpi('Reels', reelsCount));
            cards.push(kpi('Devices', fcmCount));
            kpisEl.innerHTML = cards.join('');
        } catch (e) {
            console.error('kpi error', e);
            kpisEl.innerHTML = '<div class="u360-empty">Could not load stats.</div>';
        }
    }
    function kpi(label, val) {
        return `<div class="u360-kpi"><h5>${val}</h5><p>${label}</p></div>`;
    }

    async function renderTab(tab, userId, user, isArtist, overlay, cache) {
        const body = overlay.querySelector('#u360TabBody');
        if (cache[tab]) { body.innerHTML = cache[tab]; return; }
        body.innerHTML = '<div class="u360-empty">Loading…</div>';

        try {
            let html = '';
            switch (tab) {
                case 'overview':       html = await renderOverview(userId, user, isArtist); break;
                case 'orders':         html = await renderOrders(userId, isArtist); break;
                case 'posts':          html = await renderPosts(userId); break;
                case 'ratings':        html = await renderRatings(userId, isArtist); break;
                case 'reports':        html = await renderReports(userId); break;
                case 'notifications':  html = await renderNotifications(userId); break;
                case 'wallet':         html = await renderWallet(userId); break;
                default:               html = '<div class="u360-empty">Coming soon</div>';
            }
            cache[tab] = html;
            body.innerHTML = html;
        } catch (e) {
            console.error('tab render error', tab, e);
            body.innerHTML = '<div class="u360-empty">Error loading this section.</div>';
        }
    }

    async function renderOverview(userId, user, isArtist) {
        const subDoc = await db.collection('subscriptions').doc(userId).get().catch(() => null);
        const sub = subDoc && subDoc.exists ? subDoc.data() : null;
        const rows = [
            ['User ID', safe(userId)],
            ['Phone', safe(user.phone || '—')],
            ['Bio', safe(user.bio || '—')],
            ['Category', safe(user.category || '—')],
            ['Created', fmtDateTime(user.createdAt)],
            ['Last Updated', fmtDateTime(user.updatedAt)],
        ];
        if (isArtist) {
            rows.push(['Avg Rating', typeof user.averageRating === 'number' ? user.averageRating.toFixed(2) + ' / 5' : '—']);
            rows.push(['Plan', sub ? safe(sub.plan || 'free') : 'free']);
            rows.push(['Plan Status', sub ? safe(sub.status || 'active') : '—']);
            if (sub && sub.expiresAt) rows.push(['Plan Expires', fmtDate(sub.expiresAt)]);
        }
        rows.push(['FCM Tokens', String(Array.isArray(user.fcmTokens) ? user.fcmTokens.length : 0)]);

        let html = '<div class="u360-card"><h5 style="margin:0 0 10px;font-size:14px;color:#262626;">Profile</h5>';
        rows.forEach(([l, v]) => {
            html += `<div class="u360-row"><span class="lbl">${l}</span><span class="val">${v}</span></div>`;
        });
        html += '</div>';

        // ── Payout card status (artists only) ──────────────────────
        // Highlights whether the artist can actually be paid — a missing
        // card means they can't accept orders in the mobile app.
        if (isArtist) {
            const card = user.payoutCard;
            const hasCard = card && typeof card === 'object' && card.last4;
            html += '<div class="u360-card" style="margin-top:10px;border-left:4px solid ' +
                (hasCard ? '#10B981' : '#ED4956') + ';">';
            html += '<h5 style="margin:0 0 10px;font-size:14px;color:#262626;">' +
                (hasCard ? '💳 Payout Card Linked' : '⚠ No Payout Card') + '</h5>';
            if (hasCard) {
                const brandLabel = card.brand === 'virtual_visa' ? 'Virtual Visa' : 'Virtual Card';
                const exp = (String(card.expMonth || '').padStart(2, '0')) + '/' +
                    String((card.expYear || 0) % 100).padStart(2, '0');
                html += `<div class="u360-row"><span class="lbl">Brand</span><span class="val">${safe(brandLabel)}</span></div>`;
                html += `<div class="u360-row"><span class="lbl">Number</span><span class="val">•••• •••• •••• ${safe(card.last4)}</span></div>`;
                html += `<div class="u360-row"><span class="lbl">Holder</span><span class="val">${safe(card.holderName || '—')}</span></div>`;
                html += `<div class="u360-row"><span class="lbl">Expiry</span><span class="val">${safe(exp)}</span></div>`;
                if (card.addedAt) {
                    html += `<div class="u360-row"><span class="lbl">Linked</span><span class="val">${fmtDateTime(card.addedAt)}</span></div>`;
                }
            } else {
                html += '<div style="font-size:13px;color:#8E8E8E;line-height:1.5;">' +
                    'This artist <strong>cannot accept orders</strong> until they link a virtual ' +
                    'payout card in the mobile app. Earnings have nowhere to go without one.' +
                    '</div>';
            }
            html += '</div>';
        }

        return html;
    }

    async function renderOrders(userId, isArtist) {
        const q = isArtist
            ? db.collection('orders').where('artistId', '==', userId)
            : db.collection('orders').where('customerId', '==', userId);
        const snap = await q.orderBy('createdAt', 'desc').limit(50).get().catch(async () => {
            // Fallback without orderBy in case index missing
            return await q.limit(50).get();
        });
        if (snap.empty) return '<div class="u360-empty">No orders yet.</div>';

        let html = '<div class="u360-card" style="padding:0;"><table class="table custom-table" style="margin:0;"><thead><tr>' +
            '<th>ID</th><th>' + (isArtist ? 'Customer' : 'Artist') + '</th><th>Total</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody>';
        snap.docs.forEach(doc => {
            const o = doc.data();
            const status = o.status || 'pending';
            html += `<tr>
                <td>${safe(doc.id.substring(0, 8))}…</td>
                <td>${safe((isArtist ? o.customerName : o.artistName) || 'N/A')}</td>
                <td>${money(o.total || o.totalAmount)}</td>
                <td><span class="status-badge status-${getOrderStatusClass(status)}">${safe(getOrderStatusLabel(status))}</span></td>
                <td>${fmtDate(o.createdAt)}</td>
                <td><button class="btn-action btn-view-paid" onclick="viewOrderDetails('${doc.id}')">View</button></td>
            </tr>`;
        });
        html += '</tbody></table></div>';
        return html;
    }

    async function renderPosts(userId) {
        const snap = await db.collection('posts').where('artistId', '==', userId).get();
        if (snap.empty) return '<div class="u360-empty">No posts or reels.</div>';
        let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;">';
        snap.docs.forEach(doc => {
            const p = doc.data();
            const isReel = p.mediaType === 'reel';
            const src = isReel ? (p.thumbnailUrl || p.imageUrl) : p.imageUrl;
            html += `<div style="position:relative;aspect-ratio:1;border-radius:8px;overflow:hidden;background:#f0f0f0;cursor:pointer;" onclick="showPostDetail('${doc.id}', null)">
                <img src="${safe(src || 'https://via.placeholder.com/140')}" style="width:100%;height:100%;object-fit:cover;"/>
                ${isReel ? '<div style="position:absolute;inset:0;background:rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:white;font-size:26px;">▶</div>' : ''}
                <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.7));color:white;font-size:10px;padding:6px 8px;">
                    ${isReel ? 'Reel · ' : ''}${safe(p.category || '')}
                </div>
            </div>`;
        });
        html += '</div>';
        return html;
    }

    async function renderRatings(userId, isArtist) {
        // For artists: ratings *received* (artistId = userId)
        // For customers: ratings *given* (customerId = userId)
        const field = isArtist ? 'artistId' : 'customerId';
        const snap = await db.collection('ratings').where(field, '==', userId).limit(50).get();
        if (snap.empty) {
            return `<div class="u360-empty">No ratings ${isArtist ? 'received' : 'given'}.</div>`;
        }
        let html = '';
        snap.docs.forEach(doc => {
            const r = doc.data();
            const stars = '★'.repeat(r.stars || 0) + '☆'.repeat(5 - (r.stars || 0));
            html += `<div class="u360-card">
                <div style="display:flex;justify-content:space-between;">
                    <span style="color:#E3A93C;font-size:16px;">${stars}</span>
                    <span style="color:#8E8E8E;font-size:11px;">${fmtDate(r.createdAt)}</span>
                </div>
                <div style="margin-top:6px;font-size:13px;color:#262626;">${safe(r.comment || '(no comment)')}</div>
                <div style="margin-top:6px;color:#8E8E8E;font-size:11px;">
                    ${isArtist ? 'From: ' + safe(r.customerName || 'Customer') : 'To: ' + safe(r.artistName || 'Artist')}
                </div>
            </div>`;
        });
        return html;
    }

    async function renderReports(userId) {
        // Reports filed by this user AND reports filed against their posts.
        // We resolve "against" by first finding the user's posts, then querying
        // reports with those postIds (chunked in groups of 10 for Firestore's
        // `in` limit).
        const [byMeSnap, postsSnap] = await Promise.all([
            db.collection('reports').where('reporterId', '==', userId).limit(30).get(),
            db.collection('posts').where('artistId', '==', userId).limit(200).get(),
        ]);
        const myPostIds = postsSnap.docs.map(d => d.id);
        const againstDocs = [];
        for (let i = 0; i < myPostIds.length; i += 10) {
            const chunk = myPostIds.slice(i, i + 10);
            if (chunk.length === 0) break;
            const snap = await db.collection('reports').where('postId', 'in', chunk).get();
            snap.docs.forEach(d => againstDocs.push(d));
        }

        if (byMeSnap.empty && againstDocs.length === 0) {
            return '<div class="u360-empty">No reports involving this user.</div>';
        }

        const renderCard = (doc, kind) => {
            const r = doc.data();
            const statusClass = r.status === 'pending' ? 'pending' : 'reviewed';
            return `<div class="u360-card">
                <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;">
                    <strong style="font-size:13px;">${safe(r.reason || 'Report')}</strong>
                    <span class="status-badge status-${statusClass}">${safe(r.status || 'pending')}</span>
                </div>
                <div style="margin-top:6px;font-size:12px;color:#8E8E8E;">
                    ${kind === 'against' ? 'On their post' : 'Filed by user'} · ${safe((r.postId || '—').slice(0, 10))}… · ${fmtDate(r.createdAt)}
                </div>
                ${r.description ? `<div style="margin-top:6px;font-size:12px;color:#555;">${safe(r.description)}</div>` : ''}
            </div>`;
        };

        let html = '';
        if (!byMeSnap.empty) {
            html += '<h5 style="font-size:12px;color:#8E8E8E;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.5px;">Filed by this user</h5>';
            byMeSnap.docs.forEach(d => html += renderCard(d, 'by'));
        }
        if (againstDocs.length > 0) {
            html += '<h5 style="font-size:12px;color:#8E8E8E;margin:18px 0 10px;text-transform:uppercase;letter-spacing:0.5px;">Filed against this user</h5>';
            againstDocs.forEach(d => html += renderCard(d, 'against'));
        }
        return html;
    }

    async function renderNotifications(userId) {
        const snap = await db.collection('notifications').where('userId', '==', userId)
            .orderBy('createdAt', 'desc').limit(40).get().catch(async () => {
                return await db.collection('notifications').where('userId', '==', userId).limit(40).get();
            });
        if (snap.empty) return '<div class="u360-empty">No notifications.</div>';
        let html = '';
        snap.docs.forEach(doc => {
            const n = doc.data();
            html += `<div class="u360-card" style="opacity:${n.isRead ? 0.7 : 1};">
                <div style="display:flex;justify-content:space-between;align-items:start;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:600;font-size:13px;color:#262626;">${safe(n.title || '')}</div>
                        <div style="font-size:12px;color:#555;margin-top:2px;">${safe(n.message || '')}</div>
                        <div style="font-size:10px;color:#8E8E8E;margin-top:4px;text-transform:uppercase;">${safe(n.type || '')} · ${fmtDateTime(n.createdAt)}</div>
                    </div>
                    ${n.isRead ? '' : '<span style="width:8px;height:8px;border-radius:50%;background:#2E86AB;margin-left:8px;margin-top:4px;flex-shrink:0;"></span>'}
                </div>
            </div>`;
        });
        return html;
    }

    async function renderWallet(userId) {
        const walletDoc = await db.collection('wallets').doc(userId).get().catch(() => null);
        const wallet = walletDoc && walletDoc.exists ? walletDoc.data() : null;
        const payoutsSnap = await db.collection('payouts').where('artistId', '==', userId).limit(20).get().catch(() => null);

        let html = '<div class="u360-card">' +
            '<h5 style="font-size:13px;color:#8E8E8E;margin:0 0 8px;text-transform:uppercase;">Wallet</h5>' +
            '<div style="font-size:28px;font-weight:700;color:#262626;">' +
            money(wallet ? wallet.balance : 0) +
            '</div>' +
            '<div style="font-size:12px;color:#8E8E8E;margin-top:4px;">' +
            (wallet && wallet.updatedAt ? 'Last updated ' + fmtDateTime(wallet.updatedAt) : 'No wallet record yet') +
            '</div>' +
            '</div>';

        if (payoutsSnap && !payoutsSnap.empty) {
            html += '<h5 style="font-size:13px;color:#8E8E8E;margin:14px 0 8px;text-transform:uppercase;">Payouts</h5>';
            payoutsSnap.docs.forEach(doc => {
                const p = doc.data();
                html += `<div class="u360-card">
                    <div class="u360-row"><span class="lbl">Amount</span><span class="val">${money(p.amount)}</span></div>
                    <div class="u360-row"><span class="lbl">Status</span><span class="val">${safe(p.status || '—')}</span></div>
                    <div class="u360-row"><span class="lbl">Date</span><span class="val">${fmtDate(p.createdAt)}</span></div>
                </div>`;
            });
        }

        return html;
    }

    // Expose
    window.showUserDetail = showUserDetail;
})();
