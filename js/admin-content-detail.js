// =============================================
// POST 360° + REPORT 360° detail modals
// Mirror the design language of admin-user-detail.js:
//   header card → KPI strip → tabs.
// Overrides showPostDetail() and showReportDetail() from dashboard.js.
// Load AFTER dashboard.js + admin-user-detail.js.
// =============================================

(function () {
    function safe(v) {
        if (v == null) return '';
        return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function fmtDate(ts) {
        if (!ts) return '—';
        try { return ts.toDate().toLocaleDateString(); } catch (_) { return '—'; }
    }
    function fmtDateTime(ts) {
        if (!ts) return '—';
        try { return ts.toDate().toLocaleString(); } catch (_) { return '—'; }
    }
    function money(v) { return '$' + (Number(v) || 0).toFixed(2); }

    function tabHeader(id, label, active) {
        return `<button class="user360-tab ${active ? 'active' : ''}" data-tab="${id}"
            style="background:none;border:none;padding:12px 14px;cursor:pointer;font-size:13px;font-weight:600;color:#8E8E8E;border-bottom:3px solid transparent;white-space:nowrap;line-height:1.2;flex:1 1 auto;text-align:center;">${label}</button>`;
    }
    function imgFallback(name) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '?')}&background=D4A574&color=fff&size=240`;
    }
    function kpi(label, val, accent) {
        return `<div class="u360-kpi" style="${accent ? 'border-left:3px solid ' + accent + ';' : ''}">
            <h5>${safe(val)}</h5><p>${safe(label)}</p></div>`;
    }

    // =====================================================
    // POST 360°
    // =====================================================
    async function showPostDetail360(postId, prefetched) {
        document.getElementById('post360-overlay')?.remove();

        let post = prefetched;
        if (!post) {
            try {
                const doc = await db.collection('posts').doc(postId).get();
                if (!doc.exists) { showToast('Post not found.', 'error'); return; }
                post = doc.data();
            } catch (e) {
                console.error('post fetch error', e);
                showToast('Could not load post.', 'error');
                return;
            }
        }

        const isReel = post.mediaType === 'reel';
        const status = post.status || 'active';
        const statusColor = status === 'active' ? '#1B998B' :
            status === 'reported' ? '#E3A93C' : '#A53A33';

        const overlay = document.createElement('div');
        overlay.id = 'post360-overlay';
        overlay.className = 'detail-modal-overlay';
        overlay.innerHTML = `
            <div class="detail-modal user360-modal" style="max-width:920px;width:96%;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;">
                <div class="detail-modal-header" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                    <h3 style="margin:0;">${isReel ? 'Reel' : 'Post'} Details</h3>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <button id="post360RefreshBtn" title="Reload data" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.45rem 1rem;font-size:0.82rem;font-weight:600;color:#2E86AB;background:transparent;border:1.5px solid #2E86AB;border-radius:8px;cursor:pointer;line-height:1;">Refresh</button>
                        <button class="detail-modal-close">&times;</button>
                    </div>
                </div>
                <!-- Header card -->
                <div style="flex-shrink:0;padding:24px;border-bottom:1px solid #ECECEC;background:linear-gradient(135deg,#FAFAFC 0%, #F5F5F7 100%);">
                    <div style="display:flex;gap:18px;align-items:flex-start;">
                        <div style="position:relative;width:120px;flex-shrink:0;border-radius:10px;overflow:hidden;background:#000;aspect-ratio:1;">
                                ${
                                    isReel
                                        ? `<img src="${safe(post.thumbnailUrl || post.imageUrl || 'https://via.placeholder.com/240')}" onerror="this.onerror=null;this.src='https://via.placeholder.com/240?text=No+Image';" style="width:100%;height:100%;object-fit:cover;"/>
                                           <div style="position:absolute;inset:0;background:rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:white;font-size:32px;">▶</div>
                                           ${typeof post.videoDurationSec === 'number' ? `<span style="position:absolute;right:6px;bottom:6px;background:rgba(0,0,0,0.7);color:white;font-size:10px;padding:2px 7px;border-radius:8px;">${post.videoDurationSec}s</span>` : ''}`
                                        : `<img src="${safe(post.imageUrl || 'https://via.placeholder.com/240')}" onerror="this.onerror=null;this.src='https://via.placeholder.com/240?text=No+Image';" style="width:100%;height:100%;object-fit:cover;"/>`
                                }
                            </div>
                            <div style="flex:1;min-width:0;">
                                <h4 style="margin:0 0 4px;font-size:17px;font-weight:700;color:#262626;">${safe(post.description ? (post.description.length > 90 ? post.description.substring(0, 90) + '…' : post.description) : '(no description)')}</h4>
                                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
                                    <span style="color:#8E8E8E;font-size:13px;cursor:pointer;" onclick="window.showUserDetail && window.showUserDetail('${safe(post.artistId)}')">
                                        by <strong style="color:#262626;text-decoration:underline;">${safe(post.artistName || 'Unknown artist')}</strong>
                                    </span>
                                    <span style="background:${statusColor}1A;color:${statusColor};border:1px solid ${statusColor}73;border-radius:10px;padding:1px 8px;font-size:10px;font-weight:600;text-transform:capitalize;">${safe(status)}</span>
                                </div>
                                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                    <span class="status-badge" style="background:rgba(245,158,11,0.15);color:#F59E0B;">${safe(post.category || 'Uncategorised')}</span>
                                </div>
                            </div>
                            <div style="display:flex;flex-direction:column;gap:6px;">
                                ${status !== 'removed'
                                    ? '<button class="btn-action btn-delete" id="post360RemoveBtn">Delete</button>'
                                    : '<button class="btn-action btn-activate" id="post360ReactivateBtn">Reactivate</button>'
                                }
                                <button class="btn-action btn-view" id="post360OpenArtistBtn">Artist 360°</button>
                            </div>
                        </div>
                        <div id="post360Kpis" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-top:18px;"></div>
                    </div>

                <!-- Tabs -->
                <div class="user360-tabs" style="flex-shrink:0;display:flex;gap:2px;background:white;border-bottom:1px solid #ECECEC;overflow-x:auto;white-space:nowrap;scrollbar-width:none;-ms-overflow-style:none;padding:0 8px;">
                    ${tabHeader('overview', 'Overview', true)}
                    ${tabHeader('media', 'Media')}
                    ${tabHeader('orders', 'Orders')}
                    ${tabHeader('reports', 'Reports')}
                </div>
                <div id="post360TabBody" style="flex:1;overflow-y:auto;padding:20px;min-height:240px;"></div>
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

        overlay.querySelector('#post360RefreshBtn')?.addEventListener('click', async () => {
            const btn = overlay.querySelector('#post360RefreshBtn');
            btn.disabled = true;
            const old = btn.textContent; btn.textContent = '⟳ …';
            try {
                Object.keys(cache).forEach(k => delete cache[k]);
                const fresh = await db.collection('posts').doc(postId).get();
                if (fresh.exists) post = fresh.data();
                const activeBtn = overlay.querySelector('.user360-tab.active');
                const activeTab = activeBtn ? activeBtn.dataset.tab : 'overview';
                await Promise.all([
                    renderPostKpis(overlay, postId),
                    renderPostTab(activeTab, postId, post, overlay, cache),
                ]);
            } finally {
                btn.disabled = false; btn.textContent = old;
            }
        });

        overlay.querySelector('#post360OpenArtistBtn').addEventListener('click', () => {
            if (typeof window.showUserDetail === 'function') {
                close();
                window.showUserDetail(post.artistId);
            }
        });
        overlay.querySelector('#post360RemoveBtn')?.addEventListener('click', () => {
            if (typeof deletePost === 'function') {
                deletePost(postId);
            }
        });
        overlay.querySelector('#post360ReactivateBtn')?.addEventListener('click', async () => {
            try {
                await db.collection('posts').doc(postId).update({ status: 'active' });
                if (typeof logAuditAction === 'function') {
                    await logAuditAction('reactivate_post', postId, 'post', {});
                }
                showToast('Post reactivated.', 'success');
                close();
                if (typeof loadPosts === 'function') loadPosts('first');
            } catch (e) {
                console.error('reactivate error', e);
                showToast('Could not reactivate.', 'error');
            }
        });

        const cache = {};
        overlay.querySelectorAll('.user360-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                overlay.querySelectorAll('.user360-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderPostTab(btn.dataset.tab, postId, post, overlay, cache);
            });
        });

        renderPostKpis(overlay, postId);
        renderPostTab('overview', postId, post, overlay, cache);
    }

    async function renderPostKpis(overlay, postId) {
        const el = overlay.querySelector('#post360Kpis');
        el.innerHTML = kpi('Loading', '…') + kpi('Loading', '…') + kpi('Loading', '…');
        try {
            const [ordersSnap, reportsSnap] = await Promise.all([
                // Posts can appear in order.items[].postId — fetch all orders
                // (acceptable for FYP). Real prod: keep a counter on the post.
                db.collection('orders').get(),
                db.collection('reports').where('postId', '==', postId).get().catch(() => ({ docs: [] })),
            ]);
            let orderCount = 0, revenue = 0;
            ordersSnap.docs.forEach(d => {
                const items = (d.data().items || []);
                if (items.some(i => i.postId === postId)) {
                    orderCount++;
                    items.forEach(i => {
                        if (i.postId === postId) revenue += (i.price || 0) * (i.quantity || 1);
                    });
                }
            });
            el.innerHTML =
                kpi('Times Ordered', orderCount, '#2E86AB') +
                kpi('Generated Revenue', money(revenue), '#10B981') +
                kpi('Reports', reportsSnap.docs.length, '#A53A33');
        } catch (e) {
            console.error('post kpi error', e);
            el.innerHTML = '<div class="u360-empty">Could not load stats.</div>';
        }
    }

    async function renderPostTab(tab, postId, post, overlay, cache) {
        const body = overlay.querySelector('#post360TabBody');
        if (cache[tab]) { body.innerHTML = cache[tab]; return; }
        body.innerHTML = '<div class="u360-empty">Loading…</div>';
        try {
            let html = '';
            switch (tab) {
                case 'overview': html = postOverview(post); break;
                case 'media':    html = postMedia(post); break;
                case 'orders':   html = await postOrders(postId); break;
                case 'reports':  html = await postReports(postId); break;
            }
            cache[tab] = html;
            body.innerHTML = html;
        } catch (e) {
            console.error('post tab error', tab, e);
            body.innerHTML = '<div class="u360-empty">Error loading.</div>';
        }
    }

    function postOverview(post) {
        const rows = [
            ['Description', safe(post.description || '—')],
            ['Category', safe(post.category || '—')],
            ['Price', money(post.price)],
            ['Status', safe(post.status || 'active')],
            ['Media Type', safe(post.mediaType || 'post')],
            ['Created', fmtDateTime(post.createdAt)],
        ];
        if (post.mediaType === 'reel') {
            if (post.videoDurationSec != null) rows.push(['Duration', post.videoDurationSec + ' seconds']);
            if (post.videoUrl) rows.push(['Video URL', `<a href="${safe(post.videoUrl)}" target="_blank" style="color:#2E86AB;">open</a>`]);
            if (post.thumbnailUrl) rows.push(['Thumbnail', `<a href="${safe(post.thumbnailUrl)}" target="_blank" style="color:#2E86AB;">open</a>`]);
        } else if (post.imageUrl) {
            rows.push(['Image URL', `<a href="${safe(post.imageUrl)}" target="_blank" style="color:#2E86AB;">open</a>`]);
        }
        let html = '<div class="u360-card"><h5 style="margin:0 0 10px;font-size:14px;color:#262626;">Details</h5>';
        rows.forEach(([l, v]) =>
            html += `<div class="u360-row"><span class="lbl">${l}</span><span class="val">${v}</span></div>`);
        html += '</div>';
        return html;
    }

    function postMedia(post) {
        if (post.mediaType === 'reel') {
            return `<div style="background:#000;border-radius:10px;overflow:hidden;display:flex;align-items:center;justify-content:center;">
                <video src="${safe(post.videoUrl || '')}" poster="${safe(post.thumbnailUrl || '')}" controls preload="metadata"
                    style="width:100%;max-height:520px;object-fit:contain;background:#000;"></video>
            </div>`;
        }
        return `<div style="display:flex;justify-content:center;background:#F5F5F7;border-radius:10px;padding:10px;">
            <img src="${safe(post.imageUrl || '')}" style="max-width:100%;max-height:520px;object-fit:contain;border-radius:8px;"/>
        </div>`;
    }

    async function postOrders(postId) {
        const snap = await db.collection('orders').get();
        const hits = snap.docs.filter(d => (d.data().items || []).some(i => i.postId === postId));
        if (hits.length === 0) return '<div class="u360-empty">No orders for this post yet.</div>';
        let html = '<div class="u360-card" style="padding:0;"><table class="table custom-table" style="margin:0;"><thead><tr>' +
            '<th>Order</th><th>Customer</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody>';
        hits.slice(0, 50).forEach(d => {
            const o = d.data();
            const status = o.status || 'pending';
            const label = typeof getOrderStatusLabel === 'function' ? getOrderStatusLabel(status) : status;
            const cls = typeof getOrderStatusClass === 'function' ? getOrderStatusClass(status) : 'pending';
            html += `<tr>
                <td>${safe(d.id.substring(0, 8))}…</td>
                <td>${safe(o.customerName || 'N/A')}</td>
                <td><span class="status-badge status-${cls}">${safe(label)}</span></td>
                <td>${fmtDate(o.createdAt)}</td>
                <td><button class="btn-action btn-view-paid" onclick="viewOrderDetails('${d.id}')">View</button></td>
            </tr>`;
        });
        html += '</tbody></table></div>';
        return html;
    }

    async function postReports(postId) {
        const snap = await db.collection('reports').where('postId', '==', postId).get();
        if (snap.empty) return '<div class="u360-empty">No reports on this post.</div>';
        let html = '';
        snap.docs.forEach(doc => {
            const r = doc.data();
            html += `<div class="u360-card" style="cursor:pointer;" onclick="window.showReportDetail360 && window.showReportDetail360('${doc.id}')">
                <div style="display:flex;justify-content:space-between;align-items:start;">
                    <strong style="font-size:13px;color:#262626;">${safe(r.reason || 'Report')}</strong>
                    <span class="status-badge status-${r.status === 'pending' ? 'pending' : 'reviewed'}">${safe(r.status || 'pending')}</span>
                </div>
                <div style="margin-top:6px;font-size:12px;color:#8E8E8E;">By ${safe(r.reporterName || 'someone')} · ${fmtDate(r.createdAt)}</div>
                ${r.description ? `<div style="margin-top:6px;font-size:12px;color:#555;">${safe(r.description)}</div>` : ''}
            </div>`;
        });
        return html;
    }


    // =====================================================
    // REPORT 360°
    // =====================================================
    async function showReportDetail360(reportId, prefetched) {
        document.getElementById('report360-overlay')?.remove();

        let report = prefetched;
        if (!report) {
            try {
                const doc = await db.collection('reports').doc(reportId).get();
                if (!doc.exists) { showToast('Report not found.', 'error'); return; }
                report = doc.data();
            } catch (e) {
                console.error('report fetch error', e);
                showToast('Could not load report.', 'error');
                return;
            }
        }

        const status = report.status || 'pending';
        const statusColor = status === 'pending' ? '#F59E0B' :
            status === 'reviewed' || status === 'resolved' ? '#10B981' : '#ED4956';

        const overlay = document.createElement('div');
        overlay.id = 'report360-overlay';
        overlay.className = 'detail-modal-overlay';
        overlay.innerHTML = `
            <div class="detail-modal user360-modal" style="max-width:880px;width:96%;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;">
                <div class="detail-modal-header" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                    <h3 style="margin:0;">Report Details</h3>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <button id="report360RefreshBtn" title="Reload data" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.45rem 1rem;font-size:0.82rem;font-weight:600;color:#2E86AB;background:transparent;border:1.5px solid #2E86AB;border-radius:8px;cursor:pointer;line-height:1;">Refresh</button>
                        <button class="detail-modal-close">&times;</button>
                    </div>
                </div>
                <div class="detail-modal-body" style="overflow-y:auto;padding:0;">
                    <!-- Header card -->
                    <div style="padding:24px;border-bottom:1px solid #ECECEC;background:linear-gradient(135deg,#FAFAFC 0%, #F5F5F7 100%);">
                        <div style="display:flex;gap:18px;align-items:flex-start;">
                            <div style="width:56px;height:56px;border-radius:50%;background:${statusColor}22;color:${statusColor};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:22px;font-weight:700;">
                                ${safe(((report.reason||'R').trim().charAt(0)||'R').toUpperCase())}
                            </div>
                            <div style="flex:1;min-width:0;">
                                <h4 style="margin:0 0 4px;font-size:18px;font-weight:700;color:#262626;">${safe(report.reason || 'Report')}</h4>
                                <div style="color:#8E8E8E;font-size:13px;margin-bottom:8px;">
                                    Reported on ${fmtDate(report.createdAt)} by
                                    <strong style="color:#262626;cursor:pointer;text-decoration:underline;" onclick="window.showUserDetail && window.showUserDetail('${safe(report.reporterId)}')">${safe(report.reporterName || 'unknown')}</strong>
                                </div>
                                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                    <span class="status-badge" style="background:${statusColor}22;color:${statusColor};text-transform:capitalize;">${safe(status)}</span>
                                    ${report.category ? `<span class="status-badge" style="background:rgba(245,158,11,0.15);color:#F59E0B;">${safe(report.category)}</span>` : ''}
                                </div>
                            </div>
                            <div style="display:flex;flex-direction:column;gap:6px;">
                                ${status === 'pending'
                                    ? '<button class="btn-action btn-activate" id="report360ResolveBtn">Mark resolved</button>'
                                    : ''
                                }
                                <button class="btn-action btn-delete" id="report360RemovePostBtn">Remove post</button>
                            </div>
                        </div>
                        <div id="report360Kpis" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-top:18px;"></div>
                    </div>

                    <!-- Tabs -->
                    <div class="user360-tabs" style="display:flex;gap:2px;background:white;position:sticky;top:0;z-index:5;overflow-x:auto;white-space:nowrap;scrollbar-width:none;-ms-overflow-style:none;padding:0 8px;">
                        ${tabHeader('overview', 'Overview', true)}
                        ${tabHeader('post', 'Reported Post')}
                        ${tabHeader('related', 'Other reports')}
                    </div>
                    <div id="report360TabBody" style="padding:20px;min-height:240px;"></div>
                </div>
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

        overlay.querySelector('#report360RefreshBtn')?.addEventListener('click', async () => {
            const btn = overlay.querySelector('#report360RefreshBtn');
            btn.disabled = true;
            const old = btn.textContent; btn.textContent = '⟳ …';
            try {
                Object.keys(cache).forEach(k => delete cache[k]);
                const fresh = await db.collection('reports').doc(reportId).get();
                if (fresh.exists) report = fresh.data();
                const activeBtn = overlay.querySelector('.user360-tab.active');
                const activeTab = activeBtn ? activeBtn.dataset.tab : 'overview';
                await Promise.all([
                    renderReportKpis(overlay, report),
                    renderReportTab(activeTab, reportId, report, overlay, cache),
                ]);
            } finally {
                btn.disabled = false; btn.textContent = old;
            }
        });

        overlay.querySelector('#report360ResolveBtn')?.addEventListener('click', async () => {
            try {
                await db.collection('reports').doc(reportId).update({
                    status: 'resolved',
                    resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
                if (typeof logAuditAction === 'function') {
                    await logAuditAction('resolve_report', reportId, 'report', {});
                }
                showToast('Report resolved.', 'success');
                close();
                if (typeof loadReports === 'function') loadReports('first');
            } catch (e) {
                console.error('resolve report error', e);
                showToast('Could not resolve.', 'error');
            }
        });

        overlay.querySelector('#report360RemovePostBtn')?.addEventListener('click', () => {
            if (typeof deletePost === 'function' && report.postId) {
                deletePost(report.postId);
                close();
            }
        });

        const cache = {};
        overlay.querySelectorAll('.user360-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                overlay.querySelectorAll('.user360-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderReportTab(btn.dataset.tab, reportId, report, overlay, cache);
            });
        });

        renderReportKpis(overlay, report);
        renderReportTab('overview', reportId, report, overlay, cache);
    }

    async function renderReportKpis(overlay, report) {
        const el = overlay.querySelector('#report360Kpis');
        el.innerHTML = kpi('Loading', '…') + kpi('Loading', '…');
        try {
            const others = report.postId
                ? await db.collection('reports').where('postId', '==', report.postId).get()
                : { docs: [] };
            const byReporter = report.reporterId
                ? await db.collection('reports').where('reporterId', '==', report.reporterId).get()
                : { docs: [] };
            el.innerHTML =
                kpi('Reports on this post', others.docs.length, '#A53A33') +
                kpi('Filed by this user (total)', byReporter.docs.length, '#F59E0B') +
                kpi('Filed on', fmtDate(report.createdAt), '#2E86AB');
        } catch (e) {
            console.error('report kpi error', e);
            el.innerHTML = '<div class="u360-empty">Could not load stats.</div>';
        }
    }

    async function renderReportTab(tab, reportId, report, overlay, cache) {
        const body = overlay.querySelector('#report360TabBody');
        if (cache[tab]) { body.innerHTML = cache[tab]; return; }
        body.innerHTML = '<div class="u360-empty">Loading…</div>';
        try {
            let html = '';
            switch (tab) {
                case 'overview': html = reportOverview(report); break;
                case 'post':     html = await reportPostSection(report); break;
                case 'related':  html = await relatedReports(report, reportId); break;
            }
            cache[tab] = html;
            body.innerHTML = html;
        } catch (e) {
            console.error('report tab error', tab, e);
            body.innerHTML = '<div class="u360-empty">Error loading.</div>';
        }
    }

    function reportOverview(report) {
        const rows = [
            ['Reason', safe(report.reason || '—')],
            ['Description', safe(report.description || '—')],
            ['Status', safe(report.status || 'pending')],
            ['Reporter', safe(report.reporterName || 'unknown')],
            ['Filed', fmtDateTime(report.createdAt)],
        ];
        if (report.resolvedAt) rows.push(['Resolved', fmtDateTime(report.resolvedAt)]);
        if (report.postId) rows.push(['Post ID', safe(report.postId)]);
        let html = '<div class="u360-card"><h5 style="margin:0 0 10px;font-size:14px;color:#262626;">Details</h5>';
        rows.forEach(([l, v]) =>
            html += `<div class="u360-row"><span class="lbl">${l}</span><span class="val">${v}</span></div>`);
        html += '</div>';
        return html;
    }

    async function reportPostSection(report) {
        if (!report.postId) return '<div class="u360-empty">No post attached.</div>';
        try {
            const postDoc = await db.collection('posts').doc(report.postId).get();
            if (!postDoc.exists) return '<div class="u360-empty">Post has been deleted.</div>';
            const p = postDoc.data();
            const isReel = p.mediaType === 'reel';
            const previewSrc = isReel ? (p.thumbnailUrl || p.imageUrl) : p.imageUrl;
            return `<div class="u360-card" style="cursor:pointer;" onclick="window.showPostDetail360 && window.showPostDetail360('${report.postId}')">
                <div style="display:flex;gap:14px;">
                    <div style="position:relative;width:90px;height:90px;border-radius:8px;overflow:hidden;background:#000;flex-shrink:0;">
                        <img src="${safe(previewSrc || 'https://via.placeholder.com/90')}" style="width:100%;height:100%;object-fit:cover;"/>
                        ${isReel ? '<div style="position:absolute;inset:0;background:rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:white;font-size:22px;">▶</div>' : ''}
                    </div>
                    <div style="flex:1;min-width:0;">
                        <h6 style="margin:0 0 4px;font-size:13px;font-weight:700;color:#262626;">${safe(p.description ? (p.description.length > 80 ? p.description.substring(0, 80) + '…' : p.description) : '(no description)')}</h6>
                        <div style="font-size:12px;color:#8E8E8E;margin-bottom:6px;">By ${safe(p.artistName || 'Unknown')} · ${safe(p.category || '—')}</div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            <span class="status-badge status-${(p.status || 'active')}">${safe(p.status || 'active')}</span>
                            <span class="status-badge" style="background:${isReel ? 'rgba(139,92,246,0.15);color:#8B5CF6' : 'rgba(46,134,171,0.15);color:#2E86AB'};">${isReel ? 'Reel' : 'Post'}</span>
                        </div>
                        <div style="font-size:11px;color:#8E8E8E;margin-top:8px;">Click to open Post 360°</div>
                    </div>
                </div>
            </div>`;
        } catch (e) {
            console.error('report post section error', e);
            return '<div class="u360-empty">Error loading post.</div>';
        }
    }

    async function relatedReports(report, thisReportId) {
        if (!report.postId) return '<div class="u360-empty">No related reports (no post attached).</div>';
        const snap = await db.collection('reports').where('postId', '==', report.postId).get();
        const others = snap.docs.filter(d => d.id !== thisReportId);
        if (others.length === 0) return '<div class="u360-empty">No other reports on this post.</div>';
        let html = '';
        others.forEach(doc => {
            const r = doc.data();
            html += `<div class="u360-card" style="cursor:pointer;" onclick="window.showReportDetail360 && window.showReportDetail360('${doc.id}')">
                <div style="display:flex;justify-content:space-between;align-items:start;">
                    <strong style="font-size:13px;color:#262626;">${safe(r.reason || 'Report')}</strong>
                    <span class="status-badge status-${r.status === 'pending' ? 'pending' : 'reviewed'}">${safe(r.status || 'pending')}</span>
                </div>
                <div style="margin-top:6px;font-size:12px;color:#8E8E8E;">By ${safe(r.reporterName || 'someone')} · ${fmtDate(r.createdAt)}</div>
                ${r.description ? `<div style="margin-top:6px;font-size:12px;color:#555;">${safe(r.description)}</div>` : ''}
            </div>`;
        });
        return html;
    }


    // ── Wire overrides ──
    window.showPostDetail360 = showPostDetail360;
    window.showReportDetail360 = showReportDetail360;
    // Hijack the existing entry points so all old click handlers route through
    // the new design. The originals accepted (id, prefetched) — keep that.
    window.showPostDetail = function (postId, prefetched) {
        return showPostDetail360(postId, prefetched);
    };
    window.showReportDetail = function (reportId, reportData /* , postData, reporterData */) {
        return showReportDetail360(reportId, reportData);
    };
})();
