// =============================================
// ANALYTICS 2.0 — date-range filterable + sortable
// Overrides the original loadAnalytics() with a richer dashboard:
//   - Range picker (Today / Yesterday / 7d / 30d / 90d / Month / Custom / All)
//   - 6 KPI cards that respect the range
//   - 4 charts (user growth, revenue, orders by status, categories)
//   - 2 sortable top-N tables (top artists, top categories)
// Load AFTER dashboard.js + admin-extensions.js.
// =============================================

(function () {
    let analyticsChartUsers = null;
    let analyticsChartRevenue = null;
    let analyticsChartStatus = null;
    let analyticsChartCategories = null;

    function safe(v) {
        if (v == null) return '';
        return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function money(v) { return '$' + (Number(v) || 0).toFixed(2); }
    function fmtDay(d) {
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    function rangeFromKey(key) {
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        switch (key) {
            case 'today':
                return { start, end: now };
            case 'yesterday': {
                start.setDate(start.getDate() - 1);
                const end = new Date(start);
                end.setHours(23, 59, 59, 999);
                return { start, end };
            }
            case '7d':
                start.setDate(start.getDate() - 6);
                return { start, end: now };
            case '30d':
                start.setDate(start.getDate() - 29);
                return { start, end: now };
            case '90d':
                start.setDate(start.getDate() - 89);
                return { start, end: now };
            case 'month':
                start.setDate(1);
                return { start, end: now };
            case 'lastMonth': {
                start.setDate(1);
                start.setMonth(start.getMonth() - 1);
                const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
                end.setHours(23, 59, 59, 999);
                return { start, end };
            }
            case 'all':
                return { start: new Date(2020, 0, 1), end: now };
            default:
                return { start, end: now };
        }
    }

    function dayBuckets(start, end) {
        const days = [];
        const cursor = new Date(start);
        cursor.setHours(0, 0, 0, 0);
        const last = new Date(end);
        last.setHours(0, 0, 0, 0);
        while (cursor.getTime() <= last.getTime()) {
            days.push(fmtDay(cursor));
            cursor.setDate(cursor.getDate() + 1);
        }
        return days;
    }

    function injectAnalyticsHtml() {
        const page = document.getElementById('analyticsPage');
        if (!page || page.dataset.v2 === '1') return;
        page.dataset.v2 = '1';
        page.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap" style="gap:10px;">
                <h2 class="page-title mb-0">Analytics</h2>
                <div class="filters" style="margin:0;align-items:center;">
                    <select id="analyticsRange" class="form-select filter-select" style="min-width:180px;">
                        <option value="all" selected>All time</option>
                        <option value="custom">Custom range…</option>
                    </select>
                    <span id="analyticsCustomWrap" style="display:none;align-items:center;gap:6px;">
                        <span style="font-size:0.78rem;color:#8E8E8E;">From</span>
                        <input type="date" id="analyticsCustomFrom" class="form-control filter-select" style="width:155px;"/>
                        <span style="font-size:0.78rem;color:#8E8E8E;">To</span>
                        <input type="date" id="analyticsCustomTo" class="form-control filter-select" style="width:155px;"/>
                    </span>
                    <button id="analyticsRefresh" title="Reload data" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.45rem 1rem;font-size:0.82rem;font-weight:600;color:#2E86AB;background:transparent;border:1.5px solid #2E86AB;border-radius:8px;cursor:pointer;line-height:1;">Refresh</button>
                </div>
            </div>

            <!-- KPI cards -->
            <div class="row g-3 mb-3" id="analyticsKpis"></div>

            <!-- Charts -->
            <div class="row g-3">
                <div class="col-lg-6">
                    <div class="chart-card">
                        <h5>User Growth</h5>
                        <canvas id="analyticsUserChart"></canvas>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="chart-card">
                        <h5>Revenue Trend</h5>
                        <canvas id="analyticsRevenueChart"></canvas>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="chart-card">
                        <h5>Orders by Status</h5>
                        <canvas id="analyticsStatusChart"></canvas>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="chart-card">
                        <h5>Categories Breakdown</h5>
                        <canvas id="analyticsCategoriesChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Top tables -->
            <div class="row g-3 mt-1">
                <div class="col-lg-6">
                    <div class="chart-card">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h5 class="mb-0">Top Artists</h5>
                            <select id="topArtistsSort" class="form-select filter-select" style="width:auto;font-size:0.78rem;padding:4px 8px;">
                                <option value="earnings">By earnings</option>
                                <option value="orders">By orders</option>
                                <option value="rating">By rating</option>
                            </select>
                        </div>
                        <div class="table-responsive">
                            <table class="table custom-table" style="margin:0;">
                                <thead><tr><th>#</th><th>Artist</th><th id="topArtistsMetric">Earnings</th></tr></thead>
                                <tbody id="topArtistsBody"><tr><td colspan="3" class="text-center text-muted py-3">—</td></tr></tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="chart-card">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h5 class="mb-0">Top Categories</h5>
                            <select id="topCategoriesSort" class="form-select filter-select" style="width:auto;font-size:0.78rem;padding:4px 8px;">
                                <option value="posts">By posts</option>
                                <option value="orders">By orders</option>
                            </select>
                        </div>
                        <div class="table-responsive">
                            <table class="table custom-table" style="margin:0;">
                                <thead><tr><th>#</th><th>Category</th><th id="topCategoriesMetric">Posts</th></tr></thead>
                                <tbody id="topCategoriesBody"><tr><td colspan="3" class="text-center text-muted py-3">—</td></tr></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Listeners
        page.querySelector('#analyticsRange').addEventListener('change', (e) => {
            const isCustom = e.target.value === 'custom';
            const wrap = page.querySelector('#analyticsCustomWrap');
            wrap.style.display = isCustom ? 'inline-flex' : 'none';
            if (isCustom) {
                // Default custom inputs to today so the picker has sensible values.
                const fromInput = page.querySelector('#analyticsCustomFrom');
                const toInput = page.querySelector('#analyticsCustomTo');
                if (!fromInput.value || !toInput.value) {
                    const today = new Date();
                    const iso = today.toISOString().slice(0, 10);
                    fromInput.value = iso;
                    toInput.value = iso;
                }
            } else {
                runAnalytics();
            }
        });
        page.querySelector('#analyticsRefresh').addEventListener('click', runAnalytics);
        page.querySelector('#analyticsCustomFrom').addEventListener('change', runAnalytics);
        page.querySelector('#analyticsCustomTo').addEventListener('change', runAnalytics);
        page.querySelector('#topArtistsSort').addEventListener('change', () => renderTopArtists());
        page.querySelector('#topCategoriesSort').addEventListener('change', () => renderTopCategories());
    }

    // Module-level caches so the sort selects can re-render without refetching.
    let _cache = { artists: [], categories: [] };

    async function runAnalytics() {
        const sel = document.getElementById('analyticsRange');
        const rangeKey = sel ? sel.value : '7d';
        let start, end;
        if (rangeKey === 'custom') {
            const from = document.getElementById('analyticsCustomFrom').value;
            const to = document.getElementById('analyticsCustomTo').value;
            if (!from || !to) return;
            start = new Date(from + 'T00:00:00');
            end = new Date(to + 'T23:59:59');
        } else {
            const r = rangeFromKey(rangeKey);
            start = r.start; end = r.end;
        }
        if (start > end) { showToast('Invalid date range.', 'warning'); return; }

        try {
            const ts = (d) => firebase.firestore.Timestamp.fromDate(d);
            const [usersSnap, postsSnap, ordersSnap, reportsSnap, ratingsSnap, allOrdersSnap] = await Promise.all([
                db.collection('users').where('createdAt', '>=', ts(start)).where('createdAt', '<=', ts(end)).get().catch(async () =>
                    await db.collection('users').get()),
                db.collection('posts').where('createdAt', '>=', ts(start)).where('createdAt', '<=', ts(end)).get().catch(async () =>
                    await db.collection('posts').get()),
                db.collection('orders').where('createdAt', '>=', ts(start)).where('createdAt', '<=', ts(end)).get().catch(async () =>
                    await db.collection('orders').get()),
                db.collection('reports').where('createdAt', '>=', ts(start)).where('createdAt', '<=', ts(end)).get().catch(() =>
                    ({ size: 0, docs: [] })),
                db.collection('ratings').get().catch(() => ({ size: 0, docs: [] })),
                db.collection('orders').get().catch(() => ({ docs: [] })),
            ]);

            // Filter in-memory for accuracy (in case the where range fell back to all)
            const inRange = (doc) => {
                const c = doc.data().createdAt;
                if (!c || !c.toDate) return false;
                const t = c.toDate().getTime();
                return t >= start.getTime() && t <= end.getTime();
            };
            const users = usersSnap.docs.filter(inRange);
            const posts = postsSnap.docs.filter(inRange);
            const orders = ordersSnap.docs.filter(inRange);
            const reports = (reportsSnap.docs || []).filter(inRange);

            // KPI cards
            const newUsers = users.length;
            const newArtists = users.filter(d => (d.data().role || '') === 'artist').length;
            const newPosts = posts.length;
            const newReels = posts.filter(d => d.data().mediaType === 'reel').length;
            const orderCount = orders.length;
            let revenue = 0;
            orders.forEach(d => {
                const o = d.data();
                if (['shipping', 'delivered', 'shipped'].includes(o.status)) {
                    revenue += (o.total || o.totalAmount || 0);
                }
            });
            const newReports = reports.length;

            renderKpis([
                { label: 'New users', value: newUsers, accent: '#84CC16' },
                { label: 'New artists', value: newArtists, accent: '#B85C38' },
                { label: 'New posts', value: newPosts, accent: '#1B998B' },
                { label: 'New reels', value: newReels, accent: '#F59E0B' },
                { label: 'Orders', value: orderCount, accent: '#2E86AB' },
                { label: 'Revenue', value: money(revenue), accent: '#10B981' },
                { label: 'Reports', value: newReports, accent: '#A53A33' },
            ]);

            // Charts: daily buckets within the range
            const days = dayBuckets(start, end);
            const usersByDay = Object.fromEntries(days.map(d => [d, 0]));
            const revenueByDay = Object.fromEntries(days.map(d => [d, 0]));
            users.forEach(d => {
                const k = fmtDay(d.data().createdAt.toDate());
                if (usersByDay[k] != null) usersByDay[k]++;
            });
            orders.forEach(d => {
                const o = d.data();
                if (!['shipping', 'delivered', 'shipped'].includes(o.status)) return;
                const k = fmtDay(o.createdAt.toDate());
                if (revenueByDay[k] != null) revenueByDay[k] += (o.total || o.totalAmount || 0);
            });

            const statusCounts = {};
            orders.forEach(d => {
                const s = d.data().status || 'unknown';
                if (s === 'refunded') return; // refunded slices are excluded from the chart
                statusCounts[s] = (statusCounts[s] || 0) + 1;
            });
            const categoryCounts = {};
            posts.forEach(d => {
                const c = d.data().category || 'Uncategorised';
                categoryCounts[c] = (categoryCounts[c] || 0) + 1;
            });

            drawLineChart('analyticsUserChart', days, Object.values(usersByDay), 'New users', '#6F8FA3',
                (c) => analyticsChartUsers = c, () => analyticsChartUsers);
            drawLineChart('analyticsRevenueChart', days, Object.values(revenueByDay), 'Revenue $', '#7A9B5C',
                (c) => analyticsChartRevenue = c, () => analyticsChartRevenue);
            // Colours sampled directly from the Artisans Market logo — the
            // mustard letters, sage olive, rust red, slate-teal blue,
            // terracotta orange and warm brown that appear in the artwork.
            const STATUS_COLORS = {
                pending:     '#E8B547',   // logo mustard yellow
                in_progress: '#5B8FA8',   // logo slate-blue
                paid:        '#5B8FA8',   // legacy → in_progress
                processing:  '#5B8FA8',   // legacy → in_progress
                shipping:    '#D67847',   // logo terracotta orange
                shipped:     '#D67847',   // legacy → shipping
                delivered:   '#7A9B5C',   // logo sage green
                cancelled:   '#B5413B',   // logo brick / rust red
            };
            const statusKeys = Object.keys(statusCounts);
            const statusColors = statusKeys.map(k => STATUS_COLORS[k] || '#B85C38');
            drawDoughnut('analyticsStatusChart',
                statusKeys.map(s => (typeof getOrderStatusLabel === 'function' ? getOrderStatusLabel(s) : s)),
                Object.values(statusCounts),
                (c) => analyticsChartStatus = c, () => analyticsChartStatus,
                statusColors);
            // Same six-color palette used by the Dashboard Overview's
            // "Posts by Category" chart so each category bar matches its
            // colour on the overview page; cycles when categories > 6.
            const CATEGORY_PALETTE = ['#6F8FA3', '#C96A3D', '#E3A93C', '#7A9A7A', '#A44A3F', '#C98A5B'];
            const categoryKeys = Object.keys(categoryCounts);
            const categoryColors = categoryKeys.map((_, i) => CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]);
            drawBarChart('analyticsCategoriesChart', categoryKeys, Object.values(categoryCounts),
                (c) => analyticsChartCategories = c, () => analyticsChartCategories,
                categoryColors);

            // Top Artists table — aggregate over ALL orders (not just range) for
            // the rating column, but use range for earnings/orders count.
            const artistAgg = {};
            orders.forEach(d => {
                const o = d.data();
                if (!o.artistId) return;
                if (!artistAgg[o.artistId]) {
                    artistAgg[o.artistId] = {
                        id: o.artistId, name: o.artistName || 'Unknown',
                        earnings: 0, orders: 0, rating: 0,
                    };
                }
                if (['shipping', 'delivered', 'shipped'].includes(o.status)) {
                    artistAgg[o.artistId].earnings += (o.total || o.totalAmount || 0);
                }
                artistAgg[o.artistId].orders++;
            });
            // ratings are not date-bounded in this view — just look up average
            ratingsSnap.docs && ratingsSnap.docs.forEach(d => {
                const r = d.data();
                if (artistAgg[r.artistId]) {
                    const a = artistAgg[r.artistId];
                    a._ratingSum = (a._ratingSum || 0) + (r.stars || 0);
                    a._ratingCount = (a._ratingCount || 0) + 1;
                }
            });
            Object.values(artistAgg).forEach(a => {
                a.rating = a._ratingCount ? a._ratingSum / a._ratingCount : 0;
            });
            _cache.artists = Object.values(artistAgg);
            renderTopArtists();

            // Top categories — by posts (range) and by orders (range)
            const catAgg = {};
            posts.forEach(d => {
                const c = d.data().category || 'Uncategorised';
                if (!catAgg[c]) catAgg[c] = { name: c, posts: 0, orders: 0 };
                catAgg[c].posts++;
            });
            // Aggregate orders by category by joining via post lookup is expensive;
            // approximate using items[].title categories where present.
            orders.forEach(d => {
                const items = d.data().items || [];
                items.forEach(it => {
                    const c = it.category || 'Uncategorised';
                    if (!catAgg[c]) catAgg[c] = { name: c, posts: 0, orders: 0 };
                    catAgg[c].orders++;
                });
            });
            _cache.categories = Object.values(catAgg);
            renderTopCategories();
        } catch (e) {
            console.error('analytics error', e);
            showToast('Failed to load analytics.', 'error');
        }
    }

    function renderKpis(kpis) {
        const container = document.getElementById('analyticsKpis');
        if (!container) return;
        container.innerHTML = kpis.map(k => `
            <div class="col-lg-3 col-md-4 col-sm-6">
                <div class="kpi-card" style="border-left:3px solid ${k.accent};">
                    <div class="kpi-details">
                        <h4>${safe(k.value)}</h4>
                        <p>${safe(k.label)}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function renderTopArtists() {
        const sort = document.getElementById('topArtistsSort').value;
        const metricLabel = sort === 'earnings' ? 'Earnings' : sort === 'orders' ? 'Orders' : 'Rating';
        document.getElementById('topArtistsMetric').textContent = metricLabel;
        const sorted = [..._cache.artists].sort((a, b) => (b[sort] || 0) - (a[sort] || 0)).slice(0, 10);
        const tbody = document.getElementById('topArtistsBody');
        if (sorted.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3">No data in this range.</td></tr>';
            return;
        }
        tbody.innerHTML = sorted.map((a, i) => {
            const v = sort === 'earnings' ? money(a.earnings)
                : sort === 'orders' ? a.orders
                : a.rating ? a.rating.toFixed(2) + ' ★' : '—';
            return `<tr style="cursor:pointer" onclick="window.showUserDetail && window.showUserDetail('${a.id}')">
                <td>${i + 1}</td>
                <td>${safe(a.name)}</td>
                <td><strong>${v}</strong></td>
            </tr>`;
        }).join('');
    }

    function renderTopCategories() {
        const sort = document.getElementById('topCategoriesSort').value;
        const metricLabel = sort === 'posts' ? 'Posts' : 'Orders';
        document.getElementById('topCategoriesMetric').textContent = metricLabel;
        const sorted = [..._cache.categories].sort((a, b) => (b[sort] || 0) - (a[sort] || 0)).slice(0, 10);
        const tbody = document.getElementById('topCategoriesBody');
        if (sorted.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3">No data in this range.</td></tr>';
            return;
        }
        tbody.innerHTML = sorted.map((c, i) =>
            `<tr><td>${i + 1}</td><td>${safe(c.name)}</td><td><strong>${c[sort] || 0}</strong></td></tr>`
        ).join('');
    }

    function drawLineChart(id, labels, values, label, color, setRef, getRef) {
        const ctx = document.getElementById(id);
        if (!ctx) return;
        if (getRef()) getRef().destroy();
        setRef(new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label, data: values, borderColor: color,
                    backgroundColor: color + '22', fill: true, tension: 0.35,
                    pointRadius: 3, pointHoverRadius: 5,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
            },
        }));
    }
    function drawDoughnut(id, labels, values, setRef, getRef, colors) {
        const ctx = document.getElementById(id);
        if (!ctx) return;
        if (getRef()) getRef().destroy();
        const palette = colors || ['#5B8FA8', '#E8B547', '#7A9B5C', '#B5413B', '#D67847', '#A47A56'];
        setRef(new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: palette,
                    borderColor: '#fff',
                    borderWidth: 2,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: true,
                cutout: '62%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            generateLabels(chart) {
                                const ds = chart.data.datasets[0];
                                const bg = ds.backgroundColor;
                                return chart.data.labels.map((label, i) => {
                                    const c = Array.isArray(bg) ? bg[i] : bg;
                                    return {
                                        text: label,
                                        fillStyle: c,
                                        strokeStyle: c,
                                        lineWidth: 0,
                                        hidden: false,
                                        index: i,
                                    };
                                });
                            },
                        },
                    },
                },
            },
        }));
    }
    function drawBarChart(id, labels, values, setRef, getRef, colors) {
        const ctx = document.getElementById(id);
        if (!ctx) return;
        if (getRef()) getRef().destroy();
        setRef(new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Posts', data: values, backgroundColor: colors || '#C8A870',
                    borderRadius: 6,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
            },
        }));
    }

    // ── Override the original loadAnalytics ──
    window.loadAnalytics = function () {
        injectAnalyticsHtml();
        runAnalytics();
    };
})();
