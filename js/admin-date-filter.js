// =============================================
// ADMIN DATE-RANGE FILTER
// =============================================
// Injects From / To date inputs into each filterable page (Orders, Payments,
// Reports, Posts, Subscriptions, Notifications) and applies the range to the
// docs returned from Firestore.
//
// Each loader in dashboard.js / admin-notifications.js calls
// `window.filterByDate(docs, pageKey)` after fetching, which keeps only docs
// whose `createdAt` (or fallback field) falls inside the user-selected range.
//
// Stored selections are kept in-memory only — they don't persist across
// reloads so a stale filter never silently hides data.

(function () {
    const ranges = {}; // { orders: { from, to }, ... }
    window._adminDateRanges = ranges;

    // Where to inject the From/To inputs on each page, and the reload fn.
    // `key` is the pageKey that filterByDate uses to find the range.
    // `dateField` is which doc field to compare. Almost everywhere it's
    // 'createdAt'; subscriptions use 'startDate' if present, else createdAt.
    const PAGES = [
        { pageId: 'ordersPage',         key: 'orders',         reload: 'loadOrders',        dateField: 'createdAt' },
        { pageId: 'paymentsPage',       key: 'payments',       reload: 'loadPayments',      dateField: 'createdAt' },
        { pageId: 'reportsPage',        key: 'reports',        reload: 'loadReports',       dateField: 'createdAt' },
        { pageId: 'postsPage',          key: 'posts',          reload: 'loadPosts',         dateField: 'createdAt' },
        { pageId: 'subscriptionsPage',  key: 'subscriptions',  reload: 'loadSubscriptions', dateField: 'createdAt' },
        { pageId: 'notificationsPage',  key: 'notifications',  reload: '_notifReload',      dateField: 'createdAt' },
    ];

    function injectInto(page) {
        const root = document.getElementById(page.pageId);
        if (!root) return;
        // Most pages have a single .filters row. Notifications page is laid
        // out differently — for it we fall back to inserting at the top of
        // the page body.
        let host = root.querySelector('.filters');
        if (!host) {
            // For Notifications: insert above the first content block.
            const placeholder = document.createElement('div');
            placeholder.className = 'date-range-filter-host';
            placeholder.style.cssText = 'margin: 0 0 14px;';
            root.insertBefore(placeholder, root.firstChild);
            host = placeholder;
        }
        if (host.querySelector('.date-range-filter')) return; // already injected

        const wrap = document.createElement('div');
        wrap.className = 'date-range-filter';
        wrap.style.cssText = 'display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap;';
        wrap.innerHTML = `
            <label style="font-size:12px;color:#666;font-weight:500;display:inline-flex;align-items:center;gap:4px;">
                <span>📅 From</span>
                <input type="date" data-page="${page.key}" data-role="from" class="form-control filter-select date-range-input" style="width:auto;">
            </label>
            <label style="font-size:12px;color:#666;font-weight:500;display:inline-flex;align-items:center;gap:4px;">
                <span>To</span>
                <input type="date" data-page="${page.key}" data-role="to" class="form-control filter-select date-range-input" style="width:auto;">
            </label>
            <button type="button" data-page="${page.key}" class="date-range-clear" style="background:none;border:1px solid #E5E5E5;border-radius:6px;padding:6px 10px;font-size:12px;color:#666;cursor:pointer;">Clear</button>
        `;
        host.appendChild(wrap);

        wrap.querySelectorAll('.date-range-input').forEach((el) => {
            el.addEventListener('change', () => onRangeChange(page));
        });
        wrap.querySelector('.date-range-clear').addEventListener('click', () => {
            wrap.querySelectorAll('.date-range-input').forEach((el) => { el.value = ''; });
            onRangeChange(page);
        });
    }

    function onRangeChange(page) {
        const root = document.getElementById(page.pageId);
        const fromEl = root.querySelector(`[data-page="${page.key}"][data-role="from"]`);
        const toEl   = root.querySelector(`[data-page="${page.key}"][data-role="to"]`);
        const from = fromEl?.value ? new Date(fromEl.value + 'T00:00:00') : null;
        const to   = toEl?.value   ? new Date(toEl.value   + 'T23:59:59') : null;
        ranges[page.key] = { from, to, field: page.dateField };

        if (typeof window[page.reload] === 'function') {
            window[page.reload]('first');
        } else if (page.key === 'notifications' && typeof window._notifReload === 'function') {
            window._notifReload();
        }
    }

    // Public helper — every loader calls this after building its `docs` array.
    // Returns docs whose chosen date field falls inside the active range.
    // If no range is set for that page, returns docs untouched.
    window.filterByDate = function (docs, pageKey) {
        const r = ranges[pageKey];
        if (!r || (!r.from && !r.to)) return docs;
        const field = r.field || 'createdAt';
        return docs.filter((doc) => {
            const data = typeof doc.data === 'function' ? doc.data() : doc;
            const ts = data?.[field];
            if (!ts) return false;
            let dt;
            try { dt = ts.toDate ? ts.toDate() : new Date(ts); } catch (_) { return false; }
            if (!(dt instanceof Date) || isNaN(dt)) return false;
            if (r.from && dt < r.from) return false;
            if (r.to   && dt > r.to)   return false;
            return true;
        });
    };

    // Inject after DOM is ready. We do it once now and once more in 800ms in
    // case some pages haven't been hydrated yet (dashboard renders pages
    // lazily on first sidebar click — but the HTML containers exist
    // up-front, so a single pass is normally enough).
    function injectAll() { PAGES.forEach(injectInto); }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectAll);
    } else {
        injectAll();
    }
    setTimeout(injectAll, 800);
})();
