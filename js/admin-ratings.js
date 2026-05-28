// =============================================
// RATINGS 2.0 — modern, filterable, well-laid-out
// Replaces the two-tables design with:
//   - Header KPI strip
//   - Star-distribution bars
//   - Filter chips (All / 5★ / 4★ / 3★ / 1-2★ low)
//   - Searchable, sortable reviews feed (card layout)
//   - Top Artists sidebar with avatars
// Overrides window.loadRatings(). Load AFTER dashboard.js + admin-user-detail.js.
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
        const s = size || 40;
        if (imgUrl) {
            return `<img src="${safe(imgUrl)}" style="width:${s}px;height:${s}px;border-radius:50%;object-fit:cover;flex-shrink:0;"/>`;
        }
        const initial = (name || '?').trim().substring(0, 1).toUpperCase();
        return `<div style="width:${s}px;height:${s}px;border-radius:50%;background:linear-gradient(135deg,#D4A574,#C8602F);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:${Math.round(s * 0.4)}px;flex-shrink:0;">${safe(initial)}</div>`;
    }
    function starsRow(n, size) {
        const sz = size || 14;
        let h = '';
        for (let i = 1; i <= 5; i++) {
            h += `<span style="color:${i <= n ? '#F59E0B' : '#E0E0E0'};font-size:${sz}px;">★</span>`;
        }
        return `<span style="display:inline-flex;gap:1px;line-height:1;">${h}</span>`;
    }

    let _allRatings = [];   // raw ratings
    let _artistMap = {};    // uid → user data (name, image, avg)

    function injectRatingsHtml() {
        const page = document.getElementById('ratingsPage');
        if (!page || page.dataset.v2 === '1') return;
        page.dataset.v2 = '1';
        page.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap" style="gap:10px;">
                <h2 class="page-title mb-0">Ratings</h2>
                <div class="filters" style="margin:0;">
                    <input type="text" id="ratingsSearch" class="form-control filter-select" placeholder="Search artist or customer..." style="min-width:240px;"/>
                    <select id="ratingsSort" class="form-select filter-select">
                        <option value="recent">Most recent</option>
                        <option value="highest">Highest rated</option>
                        <option value="lowest">Lowest rated</option>
                    </select>
                </div>
            </div>

            <!-- KPI strip -->
            <div class="row g-3 mb-3" id="ratingsKpis"></div>

            <div class="row g-3">
                <!-- LEFT: distribution + filter chips + reviews feed -->
                <div class="col-lg-8">
                    <div class="chart-card mb-3">
                        <div style="display:flex;align-items:flex-start;gap:24px;flex-wrap:wrap;">
                            <div style="flex:0 0 auto;text-align:center;">
                                <div id="ratingsAvgNum" style="font-size:48px;font-weight:800;color:#262626;line-height:1;">—</div>
                                <div id="ratingsAvgStars" style="margin:6px 0;">${starsRow(0, 20)}</div>
                                <div id="ratingsAvgCount" style="color:#8E8E8E;font-size:12px;">0 reviews</div>
                            </div>
                            <div style="flex:1;min-width:240px;" id="ratingsDistribution"></div>
                        </div>
                    </div>

                    <!-- Filter chips -->
                    <div id="ratingsChips" class="mb-3" style="display:flex;gap:8px;flex-wrap:wrap;"></div>

                    <!-- Reviews feed -->
                    <div id="ratingsFeed" style="display:flex;flex-direction:column;gap:10px;"></div>
                </div>

                <!-- RIGHT: top rated artists -->
                <div class="col-lg-4">
                    <div class="chart-card">
                        <h5 style="margin:0 0 10px;font-size:14px;color:#262626;">🏆 Top Rated Artists</h5>
                        <div id="topRatedArtists" style="display:flex;flex-direction:column;gap:8px;"></div>
                    </div>
                </div>
            </div>
        `;

        // Listeners
        page.querySelector('#ratingsSearch').addEventListener('input',
            debounce(() => renderFeed(), 250));
        page.querySelector('#ratingsSort').addEventListener('change', renderFeed);
    }

    let _activeFilter = 'all';
    function renderChips() {
        const chips = [
            { id: 'all', label: 'All' },
            { id: '5', label: '5★', color: '#10B981' },
            { id: '4', label: '4★', color: '#84CC16' },
            { id: '3', label: '3★', color: '#F59E0B' },
            { id: 'low', label: '1-2★ (low)', color: '#ED4956' },
        ];
        const wrap = document.getElementById('ratingsChips');
        wrap.innerHTML = chips.map(c => {
            const sel = c.id === _activeFilter;
            return `<button class="ratings-chip" data-id="${c.id}"
                style="padding:7px 14px;border-radius:18px;border:1.5px solid ${sel ? (c.color || '#262626') : '#E6E6E6'};
                background:${sel ? (c.color || '#262626') + '12' : 'white'};color:${sel ? (c.color || '#262626') : '#555'};
                font-size:12px;font-weight:600;cursor:pointer;">${c.label}</button>`;
        }).join('');
        wrap.querySelectorAll('.ratings-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                _activeFilter = btn.dataset.id;
                renderChips();
                renderFeed();
            });
        });
    }

    function matchFilter(stars) {
        if (_activeFilter === 'all') return true;
        if (_activeFilter === 'low') return stars <= 2;
        return Number(_activeFilter) === stars;
    }

    function renderKpis() {
        const total = _allRatings.length;
        const counts = [0, 0, 0, 0, 0, 0]; // index by stars
        let sum = 0;
        let thisMonth = 0;
        const monthStart = new Date();
        monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        _allRatings.forEach(r => {
            const s = r.stars || 0;
            counts[s] = (counts[s] || 0) + 1;
            sum += s;
            if (r.createdAt && r.createdAt.toDate &&
                r.createdAt.toDate().getTime() >= monthStart.getTime()) {
                thisMonth++;
            }
        });
        const avg = total > 0 ? (sum / total) : 0;
        const fiveStar = counts[5] || 0;
        const lowStar = (counts[1] || 0) + (counts[2] || 0);

        document.getElementById('ratingsKpis').innerHTML = [
            kpi('Total reviews', total, '#2E86AB'),
            kpi('Average', avg.toFixed(2) + ' ★', '#F59E0B'),
            kpi('This month', thisMonth, '#10B981'),
            kpi('5★ reviews', fiveStar, '#84CC16'),
            kpi('Low (1-2★)', lowStar, '#ED4956'),
        ].join('');

        // Header average block
        document.getElementById('ratingsAvgNum').textContent = avg.toFixed(1);
        document.getElementById('ratingsAvgStars').innerHTML = starsRow(Math.round(avg), 20);
        document.getElementById('ratingsAvgCount').textContent =
            total + (total === 1 ? ' review' : ' reviews');

        // Distribution bars
        const distEl = document.getElementById('ratingsDistribution');
        distEl.innerHTML = '';
        for (let s = 5; s >= 1; s--) {
            const c = counts[s] || 0;
            const pct = total > 0 ? Math.round((c / total) * 100) : 0;
            const color = s >= 4 ? '#10B981' : s === 3 ? '#F59E0B' : '#ED4956';
            distEl.innerHTML += `
                <div style="display:flex;align-items:center;gap:10px;margin:5px 0;">
                    <span style="width:30px;font-size:12px;color:#8E8E8E;font-weight:600;">${s}★</span>
                    <div style="flex:1;height:8px;background:#F0F0F0;border-radius:4px;overflow:hidden;">
                        <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;transition:width 0.3s;"></div>
                    </div>
                    <span style="width:60px;text-align:right;font-size:12px;color:#8E8E8E;">${c} (${pct}%)</span>
                </div>
            `;
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
        const feed = document.getElementById('ratingsFeed');
        if (!feed) return;
        const search = (document.getElementById('ratingsSearch').value || '').toLowerCase();
        const sortKey = document.getElementById('ratingsSort').value;

        let list = _allRatings.filter(r => {
            if (!matchFilter(r.stars || 0)) return false;
            if (search) {
                const artist = _artistMap[r.artistId];
                const hay = ((artist?.name || '') + ' ' + (r.customerName || '') + ' ' + (r.feedback || '')).toLowerCase();
                if (!hay.includes(search)) return false;
            }
            return true;
        });

        if (sortKey === 'highest') list.sort((a, b) => (b.stars || 0) - (a.stars || 0));
        else if (sortKey === 'lowest') list.sort((a, b) => (a.stars || 0) - (b.stars || 0));
        else list.sort((a, b) => {
            const ta = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
            const tb = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
            return tb - ta;
        });

        if (list.length === 0) {
            feed.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#8E8E8E;font-size:13px;background:white;border-radius:10px;border:1px solid #ECECEC;">No reviews match these filters.</div>';
            return;
        }

        feed.innerHTML = list.slice(0, 60).map(r => {
            const artist = _artistMap[r.artistId] || {};
            const fb = (r.feedback || '').trim();
            const isLow = (r.stars || 0) <= 2;
            return `
                <div style="background:white;border:1px solid #ECECEC;border-left:4px solid ${
                    isLow ? '#ED4956' : (r.stars >= 4 ? '#10B981' : '#F59E0B')
                };border-radius:10px;padding:14px 16px;">
                    <div style="display:flex;justify-content:space-between;align-items:start;gap:10px;margin-bottom:8px;">
                        <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
                            ${avatarHtml(artist.name, artist.profileImageUrl, 36)}
                            <div style="min-width:0;">
                                <div style="font-weight:700;font-size:13px;color:#262626;cursor:pointer;text-decoration:underline;"
                                    onclick="window.showUserDetail && window.showUserDetail('${safe(r.artistId)}')">${safe(artist.name || 'Unknown artist')}</div>
                                <div style="font-size:11px;color:#8E8E8E;">${
                                    artist.category ? safe(artist.category) + ' · ' : ''
                                }from ${safe(r.customerName || 'a customer')}</div>
                            </div>
                        </div>
                        <div style="text-align:right;flex-shrink:0;">
                            ${starsRow(r.stars || 0, 15)}
                            <div style="font-size:10px;color:#8E8E8E;margin-top:2px;">${fmtAgo(r.createdAt)}</div>
                        </div>
                    </div>
                    ${
                        fb
                            ? `<div style="font-size:13px;color:#444;line-height:1.5;padding-left:46px;">${safe(fb)}</div>`
                            : `<div style="font-size:12px;color:#BDBDBD;font-style:italic;padding-left:46px;">No written feedback</div>`
                    }
                </div>
            `;
        }).join('');
    }

    async function renderTopArtists() {
        const wrap = document.getElementById('topRatedArtists');
        if (!wrap) return;
        try {
            const snap = await db.collection('users')
                .where('role', '==', 'artist')
                .orderBy('averageRating', 'desc')
                .limit(10).get();
            if (snap.empty) {
                wrap.innerHTML = '<div style="text-align:center;color:#8E8E8E;font-size:12px;padding:20px;">No artists yet.</div>';
                return;
            }
            wrap.innerHTML = snap.docs.map((d, i) => {
                const a = d.data();
                const rating = typeof a.averageRating === 'number' ? a.averageRating.toFixed(2) : '—';
                const rankColors = ['#FBBF24', '#9CA3AF', '#C8602F']; // gold, silver, bronze
                const rankBg = i < 3 ? rankColors[i] : '#E6E6E6';
                return `
                    <div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;cursor:pointer;background:${i < 3 ? rankBg + '11' : 'transparent'};"
                        onclick="window.showUserDetail && window.showUserDetail('${safe(d.id)}')">
                        <span style="width:24px;height:24px;border-radius:50%;background:${rankBg};color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;">${i + 1}</span>
                        ${avatarHtml(a.name, a.profileImageUrl, 36)}
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:700;font-size:13px;color:#262626;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safe(a.name || 'Unknown')}</div>
                            <div style="font-size:11px;color:#8E8E8E;">${safe(a.category || '—')}</div>
                        </div>
                        <div style="text-align:right;flex-shrink:0;">
                            <div style="font-size:14px;font-weight:700;color:#F59E0B;">${rating} ★</div>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (e) {
            console.error('top artists error', e);
            wrap.innerHTML = '<div style="text-align:center;color:#ED4956;font-size:12px;padding:20px;">Could not load.</div>';
        }
    }

    async function runRatings() {
        injectRatingsHtml();
        try {
            // Fetch ratings + artists in parallel
            const ratingsSnap = await db.collection('ratings').orderBy('createdAt', 'desc').limit(500).get().catch(async () => {
                return await db.collection('ratings').limit(500).get();
            });
            _allRatings = ratingsSnap.docs.map(d => d.data());

            // Lookup the artists involved (batch)
            const artistIds = [...new Set(_allRatings.map(r => r.artistId).filter(Boolean))];
            const userDocs = await Promise.all(
                artistIds.map(id => db.collection('users').doc(id).get())
            );
            _artistMap = {};
            userDocs.forEach(d => { if (d.exists) _artistMap[d.id] = d.data(); });

            renderKpis();
            renderChips();
            renderFeed();
            renderTopArtists();
        } catch (e) {
            console.error('ratings load error', e);
            showToast('Could not load ratings.', 'error');
        }
    }

    // Override the entry point
    window.loadRatings = runRatings;
})();
