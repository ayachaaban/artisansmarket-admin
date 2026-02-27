// =============================================
// GLOBAL STATE
// =============================================
let currentAdminRole = null;
const PAGE_SIZE = 20;
let reportsUnsubscribe = null;
let postCategoryCache = { data: null, timestamp: 0 };
const CACHE_TTL = 60000; // 1 minute cache

// Dark mode chart helper
function getChartColors() {
    const isDark = document.body.classList.contains('dark-mode');
    return {
        gridColor: isDark ? '#334155' : '#e2e8f0',
        tickColor: isDark ? '#94a3b8' : '#6B8A9E',
        legendColor: isDark ? '#e2e8f0' : '#2C3E50'
    };
}

function getChartScaleOptions() {
    const colors = getChartColors();
    return {
        x: {
            ticks: { color: colors.tickColor },
            grid: { color: colors.gridColor }
        },
        y: {
            ticks: { color: colors.tickColor },
            grid: { color: colors.gridColor }
        }
    };
}

// Plan definitions
const PLANS = {
    free: { name: 'Free', amount: 0, postLimit: 5 },
    basic: { name: 'Basic', amount: 9.99, postLimit: 25 },
    premium: { name: 'Premium', amount: 24.99, postLimit: -1 }
};

// Pagination state for each table
const paginationState = {
    customers: { lastDoc: null, page: 1, hasMore: true, stack: [] },
    allUsers: { lastDoc: null, page: 1, hasMore: true, stack: [] },
    artists: { lastDoc: null, page: 1, hasMore: true, stack: [] },
    posts: { lastDoc: null, page: 1, hasMore: true, stack: [] },
    reports: { lastDoc: null, page: 1, hasMore: true, stack: [] },
    subscriptions: { lastDoc: null, page: 1, hasMore: true, stack: [] },
    orders: { lastDoc: null, page: 1, hasMore: true, stack: [] },
    payments: { lastDoc: null, page: 1, hasMore: true, stack: [] },
    payouts: { lastDoc: null, page: 1, hasMore: true, stack: [] },
};

// Platform fee percentage (10%)
const PLATFORM_FEE_PERCENT = 0.10;

// Payment policies
const PAYMENT_POLICIES = {
    commissionPercent: 10,    // 10% platform commission
    refundDays: 7,            // 7-day refund window
    minWithdrawal: 20,        // $20 minimum withdrawal
    currency: 'USD'
};

// =============================================
// UTILITY FUNCTIONS
// =============================================
function createEl(tag, attrs = {}, textContent = '') {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'className') {
            el.className = value;
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(el.style, value);
        } else {
            el.setAttribute(key, value);
        }
    }
    if (textContent) {
        el.textContent = textContent;
    }
    return el;
}

function createLoadingRow(colspan) {
    const tr = document.createElement('tr');
    const td = createEl('td', { colspan: String(colspan), className: 'text-center' }, 'Loading...');
    tr.appendChild(td);
    return tr;
}

function createEmptyRow(colspan, message) {
    const tr = document.createElement('tr');
    const td = createEl('td', { colspan: String(colspan), className: 'text-center' }, message);
    tr.appendChild(td);
    return tr;
}

function createErrorRow(colspan, message) {
    const tr = document.createElement('tr');
    const td = createEl('td', { colspan: String(colspan), className: 'text-center text-danger' }, message);
    tr.appendChild(td);
    return tr;
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function resetPagination(key) {
    paginationState[key] = { lastDoc: null, page: 1, hasMore: true, stack: [] };
}

function updatePaginationUI(tableKey, page, hasMore) {
    const pageInfo = document.getElementById(tableKey + 'PageInfo');
    const prevBtn = document.getElementById(tableKey + 'PrevBtn');
    const nextBtn = document.getElementById(tableKey + 'NextBtn');

    if (pageInfo) pageInfo.textContent = 'Page ' + page;
    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = !hasMore;
}

// =============================================
// UTILITY: Get Active Page
// =============================================
function getActivePage() {
    const activePageEl = document.querySelector('.page-content.active');
    if (!activePageEl) return null;
    return activePageEl.id.replace('Page', '');
}

// =============================================
// UTILITY: Reload visible user tables after user action
// =============================================
function reloadVisibleUserTables() {
    const activePage = getActivePage();
    if (activePage === 'users') {
        resetPagination('customers');
        resetPagination('allUsers');
        loadCustomers('first');
        loadAllUsers('first');
    } else if (activePage === 'artists') {
        resetPagination('artists');
        loadArtists('first');
    }
}

// =============================================
// UTILITY: Shared post category data (avoids duplicate fetches)
// =============================================
async function getPostCategoryData() {
    const now = Date.now();
    if (postCategoryCache.data && (now - postCategoryCache.timestamp) < CACHE_TTL) {
        return postCategoryCache.data;
    }
    const postsSnap = await db.collection('posts').get();
    const categoryData = {};
    postsSnap.forEach(doc => {
        const category = doc.data().category || 'Unknown';
        categoryData[category] = (categoryData[category] || 0) + 1;
    });
    postCategoryCache = { data: categoryData, timestamp: now };
    return categoryData;
}

// =============================================
// AUDIT LOG
// =============================================
async function logAuditAction(action, targetId, targetType, details = {}) {
    try {
        const user = auth.currentUser;
        await db.collection('auditLogs').add({
            adminId: user.uid,
            adminEmail: user.email,
            action: action,
            targetId: targetId,
            targetType: targetType,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            details: details
        });
    } catch (error) {
        console.error('Error writing audit log:', error);
    }
}

// =============================================
// CHECK AUTHENTICATION
// =============================================
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'admin-login.html';
        return;
    }

    try {
        const adminDoc = await db.collection('admins').doc(user.uid).get();
        if (!adminDoc.exists) {
            await auth.signOut();
            alert('Access denied. You are not authorized.');
            window.location.href = 'admin-login.html';
            return;
        }

        currentAdminRole = adminDoc.data().role;
        document.getElementById('adminEmail').textContent = user.email;

        // Show/hide admin management menu based on role
        const adminMenuItem = document.getElementById('adminManagementMenuItem');
        if (adminMenuItem) {
            adminMenuItem.style.display = currentAdminRole === 'super-admin' ? 'flex' : 'none';
        }

        initializeDashboard();
    } catch (error) {
        console.error('Admin verification error:', error);
        await auth.signOut();
        window.location.href = 'admin-login.html';
    }
});

// =============================================
// DOM ELEMENTS
// =============================================
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const themeToggleDash = document.getElementById('themeToggleDash');
const logoutBtn = document.getElementById('logoutBtn');
const sidebarMenuItems = document.querySelectorAll('.sidebar-menu li[data-page]');

// =============================================
// INITIALIZE DASHBOARD
// =============================================
function initializeDashboard() {
    updateCurrentDate();
    setInterval(updateCurrentDate, 60000);
    loadDashboard();
    setupRealtimeListeners();
}

// =============================================
// UPDATE CURRENT DATE
// =============================================
function updateCurrentDate() {
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        const now = new Date();
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        dateElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

// =============================================
// SIDEBAR NAVIGATION
// =============================================
sidebarMenuItems.forEach(item => {
    item.addEventListener('click', function () {
        const page = this.getAttribute('data-page');
        if (!page) return;

        sidebarMenuItems.forEach(i => i.classList.remove('active'));
        this.classList.add('active');

        document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
        const pageEl = document.getElementById(page + 'Page');
        if (pageEl) pageEl.classList.add('active');

        switch (page) {
            case 'overview':
                loadOverview();
                break;
            case 'users':
                resetPagination('customers');
                resetPagination('allUsers');
                loadCustomers('first');
                loadAllUsers('first');
                break;
            case 'artists':
                resetPagination('artists');
                loadArtists('first');
                break;
            case 'posts':
                resetPagination('posts');
                loadPosts('first');
                break;
            case 'reports':
                resetPagination('reports');
                loadReports('first');
                break;
            case 'ratings':
                loadRatings();
                break;
            case 'subscriptions':
                resetPagination('subscriptions');
                loadSubscriptionStats();
                populateArtistDropdown();
                loadSubscriptions('first');
                break;
            case 'orders':
                resetPagination('orders');
                loadOrderStats();
                loadOrders('first');
                break;
            case 'paymentsPayouts':
                resetPagination('payments');
                resetPagination('payouts');
                loadPaymentStats();
                loadPayments('first');
                loadArtistWallets();
                loadPayouts('first');
                populatePayoutArtistDropdown();
                loadRevenueTrendChart();
                loadPaymentMethodsChart();
                break;
            case 'analytics':
                loadAnalytics();
                break;
            case 'adminManagement':
                if (currentAdminRole === 'super-admin') {
                    loadAdmins();
                }
                break;
        }

        if (window.innerWidth <= 992) {
            sidebar.classList.remove('active');
        }
    });
});

// =============================================
// MENU TOGGLE (MOBILE)
// =============================================
if (menuToggle) {
    menuToggle.addEventListener('click', function () {
        sidebar.classList.toggle('active');
    });
}

// =============================================
// THEME TOGGLE
// =============================================
themeToggleDash.addEventListener('click', function () {
    document.body.classList.toggle('dark-mode');

    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
        this.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/></svg>';
    } else {
        localStorage.setItem('theme', 'light');
        this.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/></svg>';
    }

    // Re-render charts with updated dark/light colors
    try {
        loadUserGrowthChart();
        loadPostsCategoryChart();
        loadCategoryPieChart();
        loadReportsTrendChart();
        loadRevenueTrendChart();
        loadPaymentMethodsChart();
    } catch (e) { /* charts may not be loaded yet */ }
});

// Load saved theme
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggleDash.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/></svg>';
    }
});

// =============================================
// LOGOUT
// =============================================
logoutBtn.addEventListener('click', async function () {
    if (confirm('Are you sure you want to logout?')) {
        try {
            if (reportsUnsubscribe) {
                reportsUnsubscribe();
                reportsUnsubscribe = null;
            }
            await auth.signOut();
            localStorage.removeItem('adminEmail');
            localStorage.removeItem('adminRole');
            window.location.href = 'admin-login.html';
        } catch (error) {
            console.error('Logout error:', error);
            alert('Error logging out.');
        }
    }
});

// =============================================
// LOAD DASHBOARD
// =============================================
function loadDashboard() {
    loadOverview();
}

// =============================================
// REALTIME LISTENERS
// =============================================
function setupRealtimeListeners() {
    // Clean up previous listener if exists
    if (reportsUnsubscribe) {
        reportsUnsubscribe();
    }
    reportsUnsubscribe = db.collection('reports').where('status', '==', 'pending')
        .onSnapshot((snapshot) => {
            updateReportsBadge(snapshot.size);
        }, (error) => {
            console.warn('Reports listener error (will retry automatically):', error.code);
        });
}

function updateReportsBadge(count) {
    const reportsBadge = document.getElementById('reportsBadge');
    const notificationBadge = document.getElementById('notificationBadge');
    const notifCount = document.getElementById('notifCount');

    if (count > 0) {
        if (reportsBadge) {
            reportsBadge.textContent = count;
            reportsBadge.style.display = 'flex';
        }
        if (notificationBadge) {
            notificationBadge.textContent = count;
            notificationBadge.style.display = 'flex';
        }
        if (notifCount) notifCount.textContent = count;
    } else {
        if (reportsBadge) reportsBadge.style.display = 'none';
        if (notificationBadge) notificationBadge.style.display = 'none';
        if (notifCount) notifCount.textContent = '0';
    }
}

// =============================================
// NOTIFICATION POPUP
// =============================================
(function () {
    const notificationIcon = document.getElementById('notificationIcon');
    const notificationPopup = document.getElementById('notificationPopup');
    const notificationList = document.getElementById('notificationList');
    const viewAllReports = document.getElementById('viewAllReports');

    if (!notificationIcon || !notificationPopup) return;

    // Toggle popup on bell click
    notificationIcon.addEventListener('click', function (e) {
        e.stopPropagation();
        const isOpen = notificationPopup.classList.contains('show');
        notificationPopup.classList.toggle('show');
        if (!isOpen) loadNotifications();
    });

    // Close popup when clicking outside
    document.addEventListener('click', function (e) {
        if (!notificationIcon.contains(e.target)) {
            notificationPopup.classList.remove('show');
        }
    });

    // "View All Reports" navigates to reports page
    if (viewAllReports) {
        viewAllReports.addEventListener('click', function (e) {
            e.preventDefault();
            notificationPopup.classList.remove('show');
            const reportsMenuItem = document.querySelector('[data-page="reports"]');
            if (reportsMenuItem) reportsMenuItem.click();
        });
    }

    function loadNotifications() {
        notificationList.innerHTML = '<div class="notification-empty">Loading...</div>';

        db.collection('reports')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get()
            .then(function (snapshot) {
                if (snapshot.empty) {
                    notificationList.innerHTML = '<div class="notification-empty">No new notifications</div>';
                    return;
                }

                notificationList.innerHTML = '';
                snapshot.forEach(function (doc) {
                    const report = doc.data();
                    const reason = report.reason || 'No reason provided';
                    const time = report.createdAt ? timeAgo(report.createdAt.toDate()) : 'Unknown';

                    const item = document.createElement('div');
                    item.className = 'notification-item';
                    item.innerHTML =
                        '<div class="notification-item-icon">' +
                            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">' +
                                '<path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.146.146 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.163.163 0 0 1-.054.06.116.116 0 0 1-.066.017H1.146a.115.115 0 0 1-.066-.017.163.163 0 0 1-.054-.06.176.176 0 0 1 .002-.183L7.884 2.073a.147.147 0 0 1 .054-.057z"/>' +
                            '</svg>' +
                        '</div>' +
                        '<div class="notification-item-content">' +
                            '<div class="notification-item-text">New report: ' + escapeHtml(reason) + '</div>' +
                            '<div class="notification-item-time">' + time + '</div>' +
                        '</div>';

                    item.addEventListener('click', function () {
                        notificationPopup.classList.remove('show');
                        const reportsMenuItem = document.querySelector('[data-page="reports"]');
                        if (reportsMenuItem) reportsMenuItem.click();
                    });

                    notificationList.appendChild(item);
                });
            })
            .catch(function (error) {
                console.error('Error loading notifications:', error);
                notificationList.innerHTML = '<div class="notification-empty">Error loading notifications</div>';
            });
    }

    function timeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return minutes + 'm ago';
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + 'h ago';
        const days = Math.floor(hours / 24);
        if (days < 7) return days + 'd ago';
        return date.toLocaleDateString();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
})();

// =============================================
// OVERVIEW PAGE
// =============================================
async function loadOverview() {
    try {
        const [usersSnap, artistsSnap, postsSnap, activePostsSnap, pendingReportsSnap, ratingsSnap] = await Promise.all([
            db.collection('users').get(),
            db.collection('users').where('role', '==', 'artist').get(),
            db.collection('posts').get(),
            db.collection('posts').where('status', '==', 'active').get(),
            db.collection('reports').where('status', '==', 'pending').get(),
            db.collection('ratings').get()
        ]);

        let totalRating = 0;
        ratingsSnap.forEach(doc => {
            totalRating += doc.data().stars || 0;
        });
        const avgRating = ratingsSnap.size > 0 ? (totalRating / ratingsSnap.size).toFixed(1) : '0.0';

        document.getElementById('totalUsers').textContent = usersSnap.size;
        document.getElementById('totalArtists').textContent = artistsSnap.size;
        document.getElementById('totalPosts').textContent = postsSnap.size;
        document.getElementById('activePosts').textContent = activePostsSnap.size;
        document.getElementById('pendingReports').textContent = pendingReportsSnap.size;
        document.getElementById('avgRating').textContent = avgRating;

        loadUserGrowthChart();
        loadPostsCategoryChart();
    } catch (error) {
        console.error('Error loading overview:', error);
    }
}

// =============================================
// USER GROWTH CHART
// =============================================
let userGrowthChart = null;

async function loadUserGrowthChart() {
    try {
        const usersSnap = await db.collection('users').orderBy('createdAt', 'asc').get();

        const monthlyData = {};
        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.createdAt) {
                const date = data.createdAt.toDate();
                const monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
                monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
            }
        });

        const labels = [];
        const data = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
            labels.push(d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
            data.push(monthlyData[key] || 0);
        }

        const ctx = document.getElementById('userGrowthChart');
        if (ctx) {
            if (userGrowthChart) userGrowthChart.destroy();
            userGrowthChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'New Users',
                        data: data,
                        borderColor: '#2E86AB',
                        backgroundColor: 'rgba(46, 134, 171, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                    scales: getChartScaleOptions()
                }
            });
        }
    } catch (error) {
        console.error('Error loading user growth chart:', error);
    }
}

// =============================================
// POSTS CATEGORY CHART
// =============================================
let postsCategoryChart = null;

async function loadPostsCategoryChart() {
    try {
        const categoryData = await getPostCategoryData();

        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);

        const ctx = document.getElementById('postsCategoryChart');
        if (ctx) {
            if (postsCategoryChart) postsCategoryChart.destroy();
            postsCategoryChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Posts',
                        data: data,
                        backgroundColor: ['#2E86AB', '#B07D4B', '#6BC5D2', '#7CB342', '#C4A265', '#E8837C']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                    scales: getChartScaleOptions()
                }
            });
        }
    } catch (error) {
        console.error('Error loading posts category chart:', error);
    }
}

// =============================================
// CUSTOMERS TABLE (with pagination)
// =============================================
async function loadCustomers(direction) {
    if (!direction) direction = 'first';
    const state = paginationState.customers;
    const tbody = document.getElementById('customersTableBody');
    tbody.innerHTML = '';
    tbody.appendChild(createLoadingRow(6));

    try {
        const sortValue = document.getElementById('userSortSelect') ? document.getElementById('userSortSelect').value : 'createdAt-desc';
        const parts = sortValue.split('-');
        const sortField = parts[0];
        const sortDir = parts[1];

        const searchQuery = document.getElementById('userSearchInput') ? document.getElementById('userSearchInput').value.toLowerCase() : '';
        const fetchLimit = searchQuery ? PAGE_SIZE * 5 : PAGE_SIZE + 1;

        function buildCustomerQuery() {
            return db.collection('users')
                .where('role', '==', 'customer')
                .orderBy(sortField, sortDir);
        }

        let query = buildCustomerQuery().limit(fetchLimit);

        if (direction === 'next' && state.lastDoc) {
            query = buildCustomerQuery().startAfter(state.lastDoc).limit(fetchLimit);
        } else if (direction === 'prev' && state.stack.length > 1) {
            state.stack.pop();
            const prevCursor = state.stack[state.stack.length - 1];
            query = buildCustomerQuery().limit(fetchLimit);
            if (prevCursor) {
                query = buildCustomerQuery().startAt(prevCursor).limit(fetchLimit);
            }
            state.page--;
        } else {
            state.page = 1;
            state.stack = [null];
        }

        const snapshot = await query.get();
        tbody.innerHTML = '';

        let docs = snapshot.docs;

        // Client-side search filter
        if (searchQuery) {
            docs = docs.filter(doc => {
                const data = doc.data();
                return (data.name || '').toLowerCase().includes(searchQuery) ||
                    (data.email || '').toLowerCase().includes(searchQuery);
            });
        }

        const hasMore = docs.length > PAGE_SIZE;
        const displayDocs = hasMore ? docs.slice(0, PAGE_SIZE) : docs;

        if (displayDocs.length === 0) {
            tbody.appendChild(createEmptyRow(6, 'No customers found'));
            updatePaginationUI('customers', state.page, false);
            return;
        }

        if (direction === 'first' || direction === 'next') {
            if (direction === 'next') state.page++;
            if (displayDocs.length > 0) {
                state.stack.push(displayDocs[0]);
            }
        }
        state.lastDoc = displayDocs[displayDocs.length - 1];
        state.hasMore = hasMore;

        displayDocs.forEach(doc => {
            const user = doc.data();
            const tr = document.createElement('tr');

            const tdAvatar = document.createElement('td');
            const avatar = createEl('img', { className: 'user-avatar', alt: user.name || '' });
            avatar.src = user.profileImageUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || '?') + '&background=D4A574&color=fff&size=40';
            tdAvatar.appendChild(avatar);
            tr.appendChild(tdAvatar);

            tr.appendChild(createEl('td', {}, user.name || 'N/A'));
            tr.appendChild(createEl('td', {}, user.email || 'N/A'));

            const tdRole = document.createElement('td');
            tdRole.appendChild(createEl('span', { className: 'role-badge role-customer' }, 'Customer'));
            tr.appendChild(tdRole);

            const userStatus = user.status || 'active';
            const tdStatus = document.createElement('td');
            tdStatus.appendChild(createEl('span', {
                className: 'status-badge status-' + (userStatus === 'active' ? 'active-user' : 'suspended')
            }, userStatus));
            tr.appendChild(tdStatus);

            tr.appendChild(createEl('td', {}, user.createdAt ? user.createdAt.toDate().toLocaleDateString() : 'N/A'));

            const tdActions = document.createElement('td');
            if (userStatus === 'active') {
                const suspendBtn = createEl('button', { className: 'btn-action btn-suspend' }, 'Suspend');
                suspendBtn.addEventListener('click', () => suspendUser(doc.id, user.name || 'Unknown'));
                tdActions.appendChild(suspendBtn);
            } else {
                const activateBtn = createEl('button', { className: 'btn-action btn-activate' }, 'Activate');
                activateBtn.addEventListener('click', () => activateUser(doc.id, user.name || 'Unknown'));
                tdActions.appendChild(activateBtn);
            }
            const deleteBtn = createEl('button', { className: 'btn-action btn-delete' }, 'Delete');
            deleteBtn.addEventListener('click', () => deleteUser(doc.id, user.name || 'Unknown'));
            tdActions.appendChild(deleteBtn);
            tr.appendChild(tdActions);

            tbody.appendChild(tr);
        });

        updatePaginationUI('customers', state.page, hasMore);
    } catch (error) {
        console.error('Error loading customers:', error);
        tbody.innerHTML = '';
        tbody.appendChild(createErrorRow(7, 'Error loading customers'));
    }
}

// =============================================
// ALL USERS TABLE (with pagination)
// =============================================
async function loadAllUsers(direction) {
    if (!direction) direction = 'first';
    const state = paginationState.allUsers;
    const tbody = document.getElementById('allUsersTableBody');
    tbody.innerHTML = '';
    tbody.appendChild(createLoadingRow(6));

    try {
        const sortValue = document.getElementById('userSortSelect') ? document.getElementById('userSortSelect').value : 'createdAt-desc';
        const parts = sortValue.split('-');
        const sortField = parts[0];
        const sortDir = parts[1];

        const searchQuery = document.getElementById('userSearchInput') ? document.getElementById('userSearchInput').value.toLowerCase() : '';
        const fetchLimit = searchQuery ? PAGE_SIZE * 5 : PAGE_SIZE + 1;

        function buildAllUsersQuery() {
            return db.collection('users')
                .orderBy(sortField, sortDir);
        }

        let query = buildAllUsersQuery().limit(fetchLimit);

        if (direction === 'next' && state.lastDoc) {
            query = buildAllUsersQuery().startAfter(state.lastDoc).limit(fetchLimit);
        } else if (direction === 'prev' && state.stack.length > 1) {
            state.stack.pop();
            const prevCursor = state.stack[state.stack.length - 1];
            query = buildAllUsersQuery().limit(fetchLimit);
            if (prevCursor) {
                query = buildAllUsersQuery().startAt(prevCursor).limit(fetchLimit);
            }
            state.page--;
        } else {
            state.page = 1;
            state.stack = [null];
        }

        const snapshot = await query.get();
        tbody.innerHTML = '';

        let docs = snapshot.docs;

        // Client-side search filter
        if (searchQuery) {
            docs = docs.filter(doc => {
                const data = doc.data();
                return (data.name || '').toLowerCase().includes(searchQuery) ||
                    (data.email || '').toLowerCase().includes(searchQuery);
            });
        }

        const hasMore = docs.length > PAGE_SIZE;
        const displayDocs = hasMore ? docs.slice(0, PAGE_SIZE) : docs;

        if (displayDocs.length === 0) {
            tbody.appendChild(createEmptyRow(6, 'No users found'));
            updatePaginationUI('allUsers', state.page, false);
            return;
        }

        if (direction === 'first' || direction === 'next') {
            if (direction === 'next') state.page++;
            if (displayDocs.length > 0) state.stack.push(displayDocs[0]);
        }
        state.lastDoc = displayDocs[displayDocs.length - 1];
        state.hasMore = hasMore;

        displayDocs.forEach(doc => {
            const user = doc.data();
            const tr = document.createElement('tr');

            const tdAvatar = document.createElement('td');
            const avatar = createEl('img', { className: 'user-avatar', alt: user.name || '' });
            avatar.src = user.profileImageUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || '?') + '&background=D4A574&color=fff&size=40';
            tdAvatar.appendChild(avatar);
            tr.appendChild(tdAvatar);

            tr.appendChild(createEl('td', {}, user.name || 'N/A'));
            tr.appendChild(createEl('td', {}, user.email || 'N/A'));

            const tdRole = document.createElement('td');
            tdRole.appendChild(createEl('span', { className: 'role-badge role-' + (user.role || 'customer') }, user.role || 'customer'));
            tr.appendChild(tdRole);

            const userStatus = user.status || 'active';
            const tdStatus = document.createElement('td');
            tdStatus.appendChild(createEl('span', {
                className: 'status-badge status-' + (userStatus === 'active' ? 'active-user' : 'suspended')
            }, userStatus));
            tr.appendChild(tdStatus);

            tr.appendChild(createEl('td', {}, user.createdAt ? user.createdAt.toDate().toLocaleDateString() : 'N/A'));

            const tdActions = document.createElement('td');
            if (userStatus === 'active') {
                const suspendBtn = createEl('button', { className: 'btn-action btn-suspend' }, 'Suspend');
                suspendBtn.addEventListener('click', () => suspendUser(doc.id, user.name || 'Unknown'));
                tdActions.appendChild(suspendBtn);
            } else {
                const activateBtn = createEl('button', { className: 'btn-action btn-activate' }, 'Activate');
                activateBtn.addEventListener('click', () => activateUser(doc.id, user.name || 'Unknown'));
                tdActions.appendChild(activateBtn);
            }
            const deleteBtn = createEl('button', { className: 'btn-action btn-delete' }, 'Delete');
            deleteBtn.addEventListener('click', () => deleteUser(doc.id, user.name || 'Unknown'));
            tdActions.appendChild(deleteBtn);
            tr.appendChild(tdActions);

            tbody.appendChild(tr);
        });

        updatePaginationUI('allUsers', state.page, hasMore);
    } catch (error) {
        console.error('Error loading all users:', error);
        tbody.innerHTML = '';
        tbody.appendChild(createErrorRow(7, 'Error loading users'));
    }
}

// =============================================
// ARTISTS TABLE (with pagination + filters)
// =============================================
async function loadArtists(direction) {
    if (!direction) direction = 'first';
    const state = paginationState.artists;
    const tbody = document.getElementById('artistsTableBody');
    tbody.innerHTML = '';
    tbody.appendChild(createLoadingRow(7));

    try {
        const sortValue = document.getElementById('artistSortSelect') ? document.getElementById('artistSortSelect').value : 'createdAt-desc';
        const parts = sortValue.split('-');
        const sortField = parts[0];
        const sortDir = parts[1];

        const categoryFilter = document.getElementById('artistCategoryFilter') ? document.getElementById('artistCategoryFilter').value : '';
        const searchQuery = document.getElementById('artistSearchInput') ? document.getElementById('artistSearchInput').value.toLowerCase() : '';
        const hasFilters = categoryFilter || searchQuery;
        const fetchLimit = hasFilters ? PAGE_SIZE * 5 : PAGE_SIZE + 1;

        // Build base query (category filter is client-side to avoid extra composite indexes)
        function buildBaseQuery() {
            return db.collection('users')
                .where('role', '==', 'artist')
                .orderBy(sortField, sortDir);
        }

        let query = buildBaseQuery().limit(fetchLimit);

        if (direction === 'next' && state.lastDoc) {
            query = buildBaseQuery().startAfter(state.lastDoc).limit(fetchLimit);
        } else if (direction === 'prev' && state.stack.length > 1) {
            state.stack.pop();
            const prevCursor = state.stack[state.stack.length - 1];
            query = buildBaseQuery().limit(fetchLimit);
            if (prevCursor) {
                query = buildBaseQuery().startAt(prevCursor).limit(fetchLimit);
            }
            state.page--;
        } else {
            state.page = 1;
            state.stack = [null];
        }

        const snapshot = await query.get();
        tbody.innerHTML = '';

        let docs = snapshot.docs;

        // Client-side category filter
        if (categoryFilter) {
            docs = docs.filter(doc => doc.data().category === categoryFilter);
        }

        // Client-side search filter
        if (searchQuery) {
            docs = docs.filter(doc => {
                const data = doc.data();
                return (data.name || '').toLowerCase().includes(searchQuery) ||
                    (data.email || '').toLowerCase().includes(searchQuery);
            });
        }

        const hasMore = docs.length > PAGE_SIZE;
        const displayDocs = hasMore ? docs.slice(0, PAGE_SIZE) : docs;

        if (displayDocs.length === 0) {
            tbody.appendChild(createEmptyRow(7, 'No artists found'));
            updatePaginationUI('artists', state.page, false);
            return;
        }

        if (direction === 'first' || direction === 'next') {
            if (direction === 'next') state.page++;
            if (displayDocs.length > 0) state.stack.push(displayDocs[0]);
        }
        state.lastDoc = displayDocs[displayDocs.length - 1];
        state.hasMore = hasMore;

        displayDocs.forEach(doc => {
            const artist = doc.data();
            const tr = document.createElement('tr');

            const tdAvatar = document.createElement('td');
            const avatar = createEl('img', { className: 'user-avatar', alt: artist.name || '' });
            avatar.src = artist.profileImageUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(artist.name || '?') + '&background=D4A574&color=fff&size=40';
            tdAvatar.appendChild(avatar);
            tr.appendChild(tdAvatar);

            tr.appendChild(createEl('td', {}, artist.name || 'N/A'));
            tr.appendChild(createEl('td', {}, artist.email || 'N/A'));
            tr.appendChild(createEl('td', {}, artist.category || 'N/A'));
            tr.appendChild(createEl('td', {}, artist.averageRating ? artist.averageRating.toFixed(1) : 'N/A'));

            const artistStatus = artist.status || 'active';
            const tdStatus = document.createElement('td');
            tdStatus.appendChild(createEl('span', {
                className: 'status-badge status-' + (artistStatus === 'active' ? 'active-user' : 'suspended')
            }, artistStatus));
            tr.appendChild(tdStatus);

            tr.appendChild(createEl('td', {}, artist.createdAt ? artist.createdAt.toDate().toLocaleDateString() : 'N/A'));

            const tdActions = document.createElement('td');
            if (artistStatus === 'active') {
                const suspendBtn = createEl('button', { className: 'btn-action btn-suspend' }, 'Suspend');
                suspendBtn.addEventListener('click', () => suspendUser(doc.id, artist.name || 'Unknown'));
                tdActions.appendChild(suspendBtn);
            } else {
                const activateBtn = createEl('button', { className: 'btn-action btn-activate' }, 'Activate');
                activateBtn.addEventListener('click', () => activateUser(doc.id, artist.name || 'Unknown'));
                tdActions.appendChild(activateBtn);
            }
            const deleteBtn = createEl('button', { className: 'btn-action btn-delete' }, 'Delete');
            deleteBtn.addEventListener('click', () => deleteUser(doc.id, artist.name || 'Unknown'));
            tdActions.appendChild(deleteBtn);
            tr.appendChild(tdActions);

            tbody.appendChild(tr);
        });

        updatePaginationUI('artists', state.page, hasMore);
    } catch (error) {
        console.error('Error loading artists:', error);
        tbody.innerHTML = '';
        tbody.appendChild(createErrorRow(8, 'Error loading artists'));
    }
}

// =============================================
// SUSPEND / ACTIVATE USER
// =============================================
async function suspendUser(userId, userName) {
    if (!confirm('Suspend user "' + userName + '"?')) return;

    try {
        await db.collection('users').doc(userId).update({ status: 'suspended' });
        await logAuditAction('suspend_user', userId, 'user', { name: userName });
        alert('User suspended.');
        reloadVisibleUserTables();
    } catch (error) {
        console.error('Error suspending user:', error);
        alert('Error suspending user.');
    }
}

async function activateUser(userId, userName) {
    if (!confirm('Activate user "' + userName + '"?')) return;

    try {
        await db.collection('users').doc(userId).update({ status: 'active' });
        await logAuditAction('activate_user', userId, 'user', { name: userName });
        alert('User activated.');
        reloadVisibleUserTables();
    } catch (error) {
        console.error('Error activating user:', error);
        alert('Error activating user.');
    }
}

// =============================================
// DELETE USER
// =============================================
async function deleteUser(userId, userName) {
    if (!confirm('Delete user "' + userName + '"? This cannot be undone.')) return;

    try {
        await db.collection('users').doc(userId).delete();
        await logAuditAction('delete_user', userId, 'user', { name: userName });
        alert('User deleted successfully!');
        reloadVisibleUserTables();
        loadOverview();
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user.');
    }
}

// =============================================
// POSTS TABLE (with pagination + filters)
// =============================================
async function loadPosts(direction) {
    if (!direction) direction = 'first';
    const state = paginationState.posts;
    const tbody = document.getElementById('postsTableBody');
    tbody.innerHTML = '';
    tbody.appendChild(createLoadingRow(7));

    try {
        const categoryFilter = document.getElementById('categoryFilter') ? document.getElementById('categoryFilter').value : '';
        const statusFilter = document.getElementById('statusFilter') ? document.getElementById('statusFilter').value : '';
        const searchQuery = document.getElementById('searchArtist') ? document.getElementById('searchArtist').value.toLowerCase() : '';
        const fetchLimit = searchQuery ? PAGE_SIZE * 5 : PAGE_SIZE + 1;

        function buildPostQuery() {
            let q = db.collection('posts');
            if (categoryFilter) q = q.where('category', '==', categoryFilter);
            if (statusFilter) q = q.where('status', '==', statusFilter);
            q = q.orderBy('createdAt', 'desc');
            return q;
        }

        let query = buildPostQuery().limit(fetchLimit);

        if (direction === 'next' && state.lastDoc) {
            query = buildPostQuery().startAfter(state.lastDoc).limit(fetchLimit);
        } else if (direction === 'prev' && state.stack.length > 1) {
            state.stack.pop();
            const prevCursor = state.stack[state.stack.length - 1];
            query = buildPostQuery().limit(fetchLimit);
            if (prevCursor) {
                query = buildPostQuery().startAt(prevCursor).limit(fetchLimit);
            }
            state.page--;
        } else {
            state.page = 1;
            state.stack = [null];
        }

        const snapshot = await query.get();
        tbody.innerHTML = '';

        let docs = snapshot.docs;

        // Client-side artist name search
        if (searchQuery) {
            docs = docs.filter(doc => {
                const data = doc.data();
                return (data.artistName || '').toLowerCase().includes(searchQuery);
            });
        }

        const hasMore = docs.length > PAGE_SIZE;
        const displayDocs = hasMore ? docs.slice(0, PAGE_SIZE) : docs;

        if (displayDocs.length === 0) {
            tbody.appendChild(createEmptyRow(7, 'No posts found'));
            updatePaginationUI('posts', state.page, false);
            return;
        }

        if (direction === 'first' || direction === 'next') {
            if (direction === 'next') state.page++;
            if (displayDocs.length > 0) state.stack.push(displayDocs[0]);
        }
        state.lastDoc = displayDocs[displayDocs.length - 1];
        state.hasMore = hasMore;

        displayDocs.forEach(doc => {
            const post = doc.data();
            const tr = document.createElement('tr');

            const tdImg = document.createElement('td');
            const img = createEl('img', { className: 'post-thumbnail', alt: 'Post' });
            img.src = post.imageUrl || 'https://via.placeholder.com/60';
            tdImg.appendChild(img);
            tr.appendChild(tdImg);

            tr.appendChild(createEl('td', {}, post.artistName || 'Unknown'));
            tr.appendChild(createEl('td', {}, post.category || 'N/A'));

            const desc = post.description && post.description.length > 40
                ? post.description.substring(0, 40) + '...'
                : post.description || 'N/A';
            tr.appendChild(createEl('td', {}, desc));

            const tdStatus = document.createElement('td');
            tdStatus.appendChild(createEl('span', { className: 'status-badge status-' + (post.status || 'active') }, post.status || 'active'));
            tr.appendChild(tdStatus);

            tr.appendChild(createEl('td', {}, post.createdAt ? post.createdAt.toDate().toLocaleDateString() : 'N/A'));

            const tdActions = document.createElement('td');
            const deleteBtn = createEl('button', { className: 'btn-action btn-delete' }, 'Delete');
            deleteBtn.addEventListener('click', () => deletePost(doc.id));
            tdActions.appendChild(deleteBtn);
            tr.appendChild(tdActions);

            tbody.appendChild(tr);
        });

        updatePaginationUI('posts', state.page, hasMore);
    } catch (error) {
        console.error('Error loading posts:', error);
        tbody.innerHTML = '';
        tbody.appendChild(createErrorRow(7, 'Error loading posts'));
    }
}

// Post filters
document.getElementById('categoryFilter')?.addEventListener('change', function () {
    resetPagination('posts');
    loadPosts('first');
});

document.getElementById('statusFilter')?.addEventListener('change', function () {
    resetPagination('posts');
    loadPosts('first');
});

document.getElementById('searchArtist')?.addEventListener('input', debounce(function () {
    resetPagination('posts');
    loadPosts('first');
}, 300));

// Artist page filters
document.getElementById('artistSearchInput')?.addEventListener('input', debounce(function () {
    resetPagination('artists');
    loadArtists('first');
}, 300));

document.getElementById('artistCategoryFilter')?.addEventListener('change', function () {
    resetPagination('artists');
    loadArtists('first');
});

document.getElementById('artistSortSelect')?.addEventListener('change', function () {
    resetPagination('artists');
    loadArtists('first');
});

// Report status filter
document.getElementById('reportStatusFilter')?.addEventListener('change', function () {
    resetPagination('reports');
    loadReports('first');
});

// =============================================
// DELETE POST
// =============================================
async function deletePost(postId) {
    if (!confirm('Delete this post? This cannot be undone.')) return;

    try {
        await db.collection('posts').doc(postId).delete();
        await logAuditAction('delete_post', postId, 'post', {});
        alert('Post deleted successfully!');
        resetPagination('posts');
        loadPosts('first');
        loadOverview();
    } catch (error) {
        console.error('Error deleting post:', error);
        alert('Error deleting post.');
    }
}

// =============================================
// REPORTS TABLE (with pagination + enhanced info + status filter)
// =============================================
async function loadReports(direction) {
    if (!direction) direction = 'first';
    const state = paginationState.reports;
    const tbody = document.getElementById('reportsTableBody');
    tbody.innerHTML = '';
    tbody.appendChild(createLoadingRow(6));

    try {
        const statusFilter = document.getElementById('reportStatusFilter') ? document.getElementById('reportStatusFilter').value : '';

        function buildBaseQuery() {
            let q = db.collection('reports');
            if (statusFilter) {
                q = q.where('status', '==', statusFilter);
            }
            q = q.orderBy('createdAt', 'desc');
            return q;
        }

        let query = buildBaseQuery().limit(PAGE_SIZE + 1);

        if (direction === 'next' && state.lastDoc) {
            query = buildBaseQuery().startAfter(state.lastDoc).limit(PAGE_SIZE + 1);
        } else if (direction === 'prev' && state.stack.length > 1) {
            state.stack.pop();
            const prevCursor = state.stack[state.stack.length - 1];
            query = buildBaseQuery().limit(PAGE_SIZE + 1);
            if (prevCursor) {
                query = buildBaseQuery().startAt(prevCursor).limit(PAGE_SIZE + 1);
            }
            state.page--;
        } else {
            state.page = 1;
            state.stack = [null];
        }

        const snapshot = await query.get();
        tbody.innerHTML = '';

        const docs = snapshot.docs;
        const hasMore = docs.length > PAGE_SIZE;
        const displayDocs = hasMore ? docs.slice(0, PAGE_SIZE) : docs;

        if (displayDocs.length === 0) {
            tbody.appendChild(createEmptyRow(6, 'No reports found'));
            updatePaginationUI('reports', state.page, false);
            return;
        }

        if (direction === 'first' || direction === 'next') {
            if (direction === 'next') state.page++;
            if (displayDocs.length > 0) state.stack.push(displayDocs[0]);
        }
        state.lastDoc = displayDocs[displayDocs.length - 1];
        state.hasMore = hasMore;

        // Batch fetch related posts and reporters
        const postIds = [...new Set(displayDocs.map(d => d.data().postId).filter(Boolean))];
        const reporterIds = [...new Set(displayDocs.map(d => d.data().reporterId).filter(Boolean))];

        const postPromises = postIds.map(id => db.collection('posts').doc(id).get());
        const reporterPromises = reporterIds.map(id => db.collection('users').doc(id).get());

        const [postDocs, reporterDocs] = await Promise.all([
            Promise.all(postPromises),
            Promise.all(reporterPromises)
        ]);

        const postMap = {};
        postDocs.forEach(d => { if (d.exists) postMap[d.id] = d.data(); });
        const reporterMap = {};
        reporterDocs.forEach(d => { if (d.exists) reporterMap[d.id] = d.data(); });

        displayDocs.forEach(doc => {
            const report = doc.data();
            const tr = document.createElement('tr');

            // Post thumbnail + info
            const tdPost = document.createElement('td');
            const postData = postMap[report.postId];
            if (postData) {
                const img = createEl('img', { className: 'post-thumbnail', alt: 'Post' });
                img.src = postData.imageUrl || 'https://via.placeholder.com/60';
                tdPost.appendChild(img);
            } else {
                tdPost.textContent = 'N/A';
            }
            tr.appendChild(tdPost);

            // Reporter name
            const reporterData = reporterMap[report.reporterId];
            tr.appendChild(createEl('td', {}, reporterData ? reporterData.name || 'Unknown' : 'Unknown'));

            tr.appendChild(createEl('td', {}, report.reason || 'No reason'));

            const tdStatus = document.createElement('td');
            tdStatus.appendChild(createEl('span', { className: 'status-badge status-' + (report.status || 'pending') }, report.status || 'pending'));
            tr.appendChild(tdStatus);

            tr.appendChild(createEl('td', {}, report.createdAt ? report.createdAt.toDate().toLocaleDateString() : 'N/A'));

            const tdActions = document.createElement('td');
            if (report.status === 'pending') {
                const approveBtn = createEl('button', { className: 'btn-action btn-approve' }, 'Approve');
                approveBtn.addEventListener('click', () => approveReport(doc.id, report.postId));
                const rejectBtn = createEl('button', { className: 'btn-action btn-reject' }, 'Reject');
                rejectBtn.addEventListener('click', () => rejectReport(doc.id));
                tdActions.append(approveBtn, rejectBtn);
            } else {
                tdActions.appendChild(createEl('span', { className: 'text-muted' }, 'Reviewed'));
            }
            tr.appendChild(tdActions);

            tbody.appendChild(tr);
        });

        updatePaginationUI('reports', state.page, hasMore);
    } catch (error) {
        console.error('Error loading reports:', error);
        tbody.innerHTML = '';
        tbody.appendChild(createErrorRow(6, 'Error loading reports'));
    }
}

// =============================================
// APPROVE / REJECT REPORT
// =============================================
async function approveReport(reportId, postId) {
    if (!postId) {
        alert('Cannot approve: this report has no associated post.');
        return;
    }
    if (!confirm('This will remove the reported post. Continue?')) return;

    try {
        await db.collection('posts').doc(postId).update({ status: 'removed' });
        await db.collection('reports').doc(reportId).update({ status: 'reviewed' });
        await logAuditAction('approve_report', reportId, 'report', { postId: postId });
        alert('Report approved. Post removed.');
        resetPagination('reports');
        loadReports('first');
        loadOverview();
    } catch (error) {
        console.error('Error approving report:', error);
        alert('Error approving report.');
    }
}

async function rejectReport(reportId) {
    if (!confirm('Mark report as reviewed without action?')) return;

    try {
        await db.collection('reports').doc(reportId).update({ status: 'reviewed' });
        await logAuditAction('reject_report', reportId, 'report', {});
        alert('Report rejected.');
        resetPagination('reports');
        loadReports('first');
        loadOverview();
    } catch (error) {
        console.error('Error rejecting report:', error);
        alert('Error rejecting report.');
    }
}

// =============================================
// RATINGS PAGE
// =============================================
async function loadRatings() {
    try {
        // Top Rated Artists
        const artistsSnap = await db.collection('users').where('role', '==', 'artist').orderBy('averageRating', 'desc').limit(10).get();

        const topRatedTbody = document.getElementById('topRatedArtists');
        topRatedTbody.innerHTML = '';

        if (artistsSnap.empty) {
            topRatedTbody.appendChild(createEmptyRow(3, 'No artists found'));
        } else {
            artistsSnap.forEach(doc => {
                const artist = doc.data();
                const tr = document.createElement('tr');
                tr.appendChild(createEl('td', {}, artist.name || 'N/A'));
                tr.appendChild(createEl('td', {}, artist.category || 'N/A'));
                tr.appendChild(createEl('td', {}, artist.averageRating ? artist.averageRating.toFixed(1) : 'N/A'));
                topRatedTbody.appendChild(tr);
            });
        }

        // Recent Feedback - batch fetch artist names
        const ratingsSnap = await db.collection('ratings').orderBy('createdAt', 'desc').limit(10).get();

        const recentFeedbackTbody = document.getElementById('recentFeedback');
        recentFeedbackTbody.innerHTML = '';

        if (ratingsSnap.empty) {
            recentFeedbackTbody.appendChild(createEmptyRow(4, 'No feedback found'));
        } else {
            const artistIds = [...new Set(ratingsSnap.docs.map(d => d.data().artistId).filter(Boolean))];
            const artistPromises = artistIds.map(id => db.collection('users').doc(id).get());
            const artistDocs = await Promise.all(artistPromises);
            const artistMap = {};
            artistDocs.forEach(d => { if (d.exists) artistMap[d.id] = d.data(); });

            ratingsSnap.forEach(doc => {
                const rating = doc.data();
                const tr = document.createElement('tr');

                const artistData = artistMap[rating.artistId];
                tr.appendChild(createEl('td', {}, artistData ? artistData.name || 'Unknown' : 'Unknown'));
                tr.appendChild(createEl('td', {}, (rating.stars || 0) + ' \u2B50'));

                const feedback = rating.feedback && rating.feedback.length > 30
                    ? rating.feedback.substring(0, 30) + '...'
                    : rating.feedback || 'No feedback';
                tr.appendChild(createEl('td', {}, feedback));

                tr.appendChild(createEl('td', {}, rating.createdAt ? rating.createdAt.toDate().toLocaleDateString() : 'N/A'));

                recentFeedbackTbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error loading ratings:', error);
    }
}

// =============================================
// ANALYTICS PAGE
// =============================================
async function loadAnalytics() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const postsSnap = await db.collection('posts').where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(today)).get();
        document.getElementById('postsToday').textContent = postsSnap.size;

        const usersSnap = await db.collection('users').where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(today)).get();
        document.getElementById('usersToday').textContent = usersSnap.size;

        const reportsSnap = await db.collection('reports').where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(today)).get();
        document.getElementById('reportsToday').textContent = reportsSnap.size;

        loadCategoryPieChart();
        loadReportsTrendChart();
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// =============================================
// CATEGORY PIE CHART
// =============================================
let categoryPieChart = null;

async function loadCategoryPieChart() {
    try {
        const categoryData = await getPostCategoryData();

        const ctx = document.getElementById('categoryPieChart');
        if (ctx) {
            if (categoryPieChart) categoryPieChart.destroy();
            const colors = getChartColors();
            categoryPieChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: Object.keys(categoryData),
                    datasets: [{
                        data: Object.values(categoryData),
                        backgroundColor: ['#2E86AB', '#B07D4B', '#6BC5D2', '#7CB342', '#C4A265', '#E8837C']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            labels: { color: colors.legendColor }
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading category pie chart:', error);
    }
}

// =============================================
// REPORTS TREND CHART
// =============================================
let reportsTrendChart = null;

async function loadReportsTrendChart() {
    try {
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);

        const snapshot = await db.collection('reports')
            .where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(startDate))
            .get();

        // Bucket reports by day
        const dayCounts = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.createdAt) {
                const date = data.createdAt.toDate();
                const dayKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
                dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1;
            }
        });

        const last7Days = [];
        const reportCounts = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const dayKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
            last7Days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            reportCounts.push(dayCounts[dayKey] || 0);
        }

        const ctx = document.getElementById('reportsTrendChart');
        if (ctx) {
            if (reportsTrendChart) reportsTrendChart.destroy();
            reportsTrendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: last7Days,
                    datasets: [{
                        label: 'Reports',
                        data: reportCounts,
                        borderColor: '#C4A265',
                        backgroundColor: 'rgba(196, 162, 101, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                    scales: getChartScaleOptions()
                }
            });
        }
    } catch (error) {
        console.error('Error loading reports trend chart:', error);
    }
}

// =============================================
// ADMIN MANAGEMENT (RBAC)
// =============================================
async function loadAdmins() {
    const tbody = document.getElementById('adminsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    tbody.appendChild(createLoadingRow(4));

    try {
        const snapshot = await db.collection('admins').orderBy('createdAt', 'desc').get();
        tbody.innerHTML = '';

        if (snapshot.empty) {
            tbody.appendChild(createEmptyRow(4, 'No admins found'));
            return;
        }

        const currentUid = auth.currentUser.uid;

        snapshot.forEach(doc => {
            const admin = doc.data();
            const tr = document.createElement('tr');

            tr.appendChild(createEl('td', {}, admin.email || 'N/A'));

            const tdRole = document.createElement('td');
            tdRole.appendChild(createEl('span', {
                className: admin.role === 'super-admin' ? 'role-badge role-artist' : 'role-badge role-customer'
            }, admin.role));
            tr.appendChild(tdRole);

            tr.appendChild(createEl('td', {}, admin.createdAt ? admin.createdAt.toDate().toLocaleDateString() : 'N/A'));

            const tdActions = document.createElement('td');
            if (doc.id !== currentUid) {
                const resetPwdBtn = createEl('button', { className: 'btn-action btn-suspend' }, 'Reset Password');
                resetPwdBtn.addEventListener('click', () => sendAdminPasswordReset(doc.id, admin.email));

                const deleteBtn = createEl('button', { className: 'btn-action btn-delete' }, 'Remove');
                deleteBtn.addEventListener('click', () => deleteAdmin(doc.id, admin.email));

                tdActions.append(resetPwdBtn, deleteBtn);
            } else {
                tdActions.appendChild(createEl('span', { className: 'text-muted' }, 'Current User'));
            }
            tr.appendChild(tdActions);

            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error loading admins:', error);
        tbody.innerHTML = '';
        tbody.appendChild(createErrorRow(4, 'Error loading admins'));
    }
}

// Add Admin form handler
document.getElementById('addAdminForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (currentAdminRole !== 'super-admin') {
        alert('Only super-admins can add new admins.');
        return;
    }

    const email = document.getElementById('newAdminEmail').value.trim();
    const password = document.getElementById('newAdminPassword').value;
    const role = 'admin';

    if (!email || !password || password.length < 6) {
        alert('Please provide a valid email and password (min 6 characters).');
        return;
    }

    if (!confirm('Add "' + email + '" as admin?')) return;

    try {
        // Create user via secondary app so current session is preserved
        const userCredential = await secondaryAuth.createUserWithEmailAndPassword(email, password);
        const newUid = userCredential.user.uid;

        // Sign out secondary auth immediately
        await secondaryAuth.signOut();

        // Create admin document in Firestore
        await db.collection('admins').doc(newUid).set({
            uid: newUid,
            email: email,
            role: role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await logAuditAction('add_admin', newUid, 'admin', { email: email, role: role });

        alert('Admin added successfully!');
        this.reset();
        loadAdmins();
    } catch (error) {
        console.error('Error adding admin:', error);
        if (error.code === 'auth/email-already-in-use') {
            alert('This email is already in use.');
        } else {
            alert('Error adding admin: ' + error.message);
        }
    }
});

// NOTE: This only removes the Firestore admin document. The Firebase Auth account
// remains (deleting auth users requires the Firebase Admin SDK / Cloud Functions).
// Access is still blocked since the login flow checks for the admin doc.
async function deleteAdmin(adminId, adminEmail) {
    if (!confirm('Remove admin "' + adminEmail + '"? They will lose admin access.')) return;

    try {
        await db.collection('admins').doc(adminId).delete();
        await logAuditAction('remove_admin', adminId, 'admin', { email: adminEmail });
        alert('Admin removed successfully.');
        loadAdmins();
    } catch (error) {
        console.error('Error removing admin:', error);
        alert('Error removing admin.');
    }
}

// =============================================
// SEND ADMIN PASSWORD RESET EMAIL
// =============================================
async function sendAdminPasswordReset(adminId, adminEmail) {
    if (!confirm('Send a password reset email to "' + adminEmail + '"?')) return;

    try {
        await auth.sendPasswordResetEmail(adminEmail);
        await logAuditAction('send_password_reset', adminId, 'admin', { email: adminEmail });
        alert('Password reset email sent to ' + adminEmail + '.');
    } catch (error) {
        console.error('Error sending password reset:', error);
        if (error.code === 'auth/user-not-found') {
            alert('No Firebase Auth account found for this email. The admin document may be orphaned.');
        } else {
            alert('Error sending reset email: ' + error.message);
        }
    }
}

// =============================================
// USER SEARCH & SORT HANDLERS
// =============================================
document.getElementById('userSearchInput')?.addEventListener('input', debounce(function () {
    resetPagination('customers');
    resetPagination('allUsers');
    loadCustomers('first');
    loadAllUsers('first');
}, 300));

document.getElementById('userSortSelect')?.addEventListener('change', function () {
    resetPagination('customers');
    resetPagination('allUsers');
    loadCustomers('first');
    loadAllUsers('first');
});

// =============================================
// PAGINATION BUTTON HANDLERS
// =============================================
document.getElementById('customersPrevBtn')?.addEventListener('click', () => loadCustomers('prev'));
document.getElementById('customersNextBtn')?.addEventListener('click', () => loadCustomers('next'));
document.getElementById('allUsersPrevBtn')?.addEventListener('click', () => loadAllUsers('prev'));
document.getElementById('allUsersNextBtn')?.addEventListener('click', () => loadAllUsers('next'));
document.getElementById('artistsPrevBtn')?.addEventListener('click', () => loadArtists('prev'));
document.getElementById('artistsNextBtn')?.addEventListener('click', () => loadArtists('next'));
document.getElementById('postsPrevBtn')?.addEventListener('click', () => loadPosts('prev'));
document.getElementById('postsNextBtn')?.addEventListener('click', () => loadPosts('next'));
document.getElementById('reportsPrevBtn')?.addEventListener('click', () => loadReports('prev'));
document.getElementById('reportsNextBtn')?.addEventListener('click', () => loadReports('next'));
document.getElementById('subscriptionsPrevBtn')?.addEventListener('click', () => loadSubscriptions('prev'));
document.getElementById('subscriptionsNextBtn')?.addEventListener('click', () => loadSubscriptions('next'));

// =============================================
// SUBSCRIPTIONS - Stats
// =============================================
async function loadSubscriptionStats() {
    try {
        const snapshot = await db.collection('subscriptions').get();
        let total = 0, active = 0, expired = 0, revenue = 0;

        snapshot.forEach(doc => {
            const sub = doc.data();
            total++;
            if (sub.status === 'active') {
                active++;
                revenue += sub.amount || 0;
            } else if (sub.status === 'expired') {
                expired++;
            }
        });

        document.getElementById('totalSubscriptions').textContent = total;
        document.getElementById('activeSubscriptions').textContent = active;
        document.getElementById('expiredSubscriptions').textContent = expired;
        document.getElementById('monthlyRevenue').textContent = '$' + revenue.toFixed(2);
    } catch (error) {
        console.error('Error loading subscription stats:', error);
    }
}

// =============================================
// SUBSCRIPTIONS - Populate Artist Dropdown
// =============================================
async function populateArtistDropdown() {
    const select = document.getElementById('artistSelect');
    if (!select) return;

    try {
        const snapshot = await db.collection('users')
            .where('role', '==', 'artist')
            .where('status', '==', 'active')
            .orderBy('name', 'asc')
            .get();

        // Keep the default option
        select.innerHTML = '<option value="">-- Choose Artist --</option>';

        snapshot.forEach(doc => {
            const artist = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = artist.name + ' (' + artist.email + ')';
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error populating artist dropdown:', error);
    }
}

// =============================================
// SUBSCRIPTIONS - Load Table (paginated + filtered)
// =============================================
async function loadSubscriptions(direction) {
    if (!direction) direction = 'first';
    const state = paginationState.subscriptions;
    const tbody = document.getElementById('subscriptionsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    tbody.appendChild(createLoadingRow(7));

    try {
        const planFilter = document.getElementById('subscriptionPlanFilter') ? document.getElementById('subscriptionPlanFilter').value : '';
        const statusFilter = document.getElementById('subscriptionStatusFilter') ? document.getElementById('subscriptionStatusFilter').value : '';
        const searchQuery = document.getElementById('subscriptionSearchInput') ? document.getElementById('subscriptionSearchInput').value.toLowerCase() : '';
        const fetchLimit = searchQuery ? PAGE_SIZE * 5 : PAGE_SIZE + 1;

        function buildSubQuery() {
            let q = db.collection('subscriptions');
            if (planFilter) q = q.where('plan', '==', planFilter);
            if (statusFilter) q = q.where('status', '==', statusFilter);
            q = q.orderBy('createdAt', 'desc');
            return q;
        }

        let query = buildSubQuery().limit(fetchLimit);

        if (direction === 'next' && state.lastDoc) {
            query = buildSubQuery().startAfter(state.lastDoc).limit(fetchLimit);
        } else if (direction === 'prev' && state.stack.length > 1) {
            state.stack.pop();
            const prevCursor = state.stack[state.stack.length - 1];
            query = buildSubQuery().limit(fetchLimit);
            if (prevCursor) {
                query = buildSubQuery().startAt(prevCursor).limit(fetchLimit);
            }
            state.page--;
        } else {
            state.page = 1;
            state.stack = [null];
        }

        const snapshot = await query.get();
        tbody.innerHTML = '';

        let docs = snapshot.docs;

        // Client-side search filter
        if (searchQuery) {
            docs = docs.filter(doc => {
                const data = doc.data();
                return (data.artistName || '').toLowerCase().includes(searchQuery) ||
                    (data.artistEmail || '').toLowerCase().includes(searchQuery);
            });
        }

        const hasMore = docs.length > PAGE_SIZE;
        const displayDocs = hasMore ? docs.slice(0, PAGE_SIZE) : docs;

        if (displayDocs.length === 0) {
            tbody.appendChild(createEmptyRow(7, 'No subscriptions found'));
            updatePaginationUI('subscriptions', state.page, false);
            return;
        }

        if (direction === 'first' || direction === 'next') {
            if (direction === 'next') state.page++;
            if (displayDocs.length > 0) state.stack.push(displayDocs[0]);
        }
        state.lastDoc = displayDocs[displayDocs.length - 1];
        state.hasMore = hasMore;

        displayDocs.forEach(doc => {
            const sub = doc.data();
            const tr = document.createElement('tr');

            tr.appendChild(createEl('td', {}, sub.artistName || 'N/A'));
            tr.appendChild(createEl('td', {}, sub.artistEmail || 'N/A'));

            const tdPlan = document.createElement('td');
            tdPlan.appendChild(createEl('span', { className: 'plan-badge plan-' + (sub.plan || 'free') }, PLANS[sub.plan] ? PLANS[sub.plan].name : sub.plan));
            tr.appendChild(tdPlan);

            tr.appendChild(createEl('td', {}, '$' + (sub.amount || 0).toFixed(2)));

            const tdStatus = document.createElement('td');
            tdStatus.appendChild(createEl('span', { className: 'status-badge status-' + (sub.status || 'active') }, sub.status || 'active'));
            tr.appendChild(tdStatus);

            const expiryText = sub.expiryDate ? sub.expiryDate.toDate().toLocaleDateString() : 'N/A';
            tr.appendChild(createEl('td', {}, expiryText));

            const tdActions = document.createElement('td');
            if (sub.status === 'active') {
                const changeWrapper = document.createElement('div');
                changeWrapper.className = 'plan-change-wrapper';

                const changeBtn = createEl('button', { className: 'btn-action btn-view' }, 'Change');
                changeWrapper.appendChild(changeBtn);

                const planSelect = document.createElement('select');
                planSelect.className = 'form-select form-select-sm plan-change-select';
                planSelect.style.display = 'none';
                Object.keys(PLANS).forEach(key => {
                    const opt = document.createElement('option');
                    opt.value = key;
                    opt.textContent = PLANS[key].name + ' ($' + PLANS[key].amount + '/mo)';
                    if (key === sub.plan) opt.selected = true;
                    planSelect.appendChild(opt);
                });

                changeBtn.addEventListener('click', function () {
                    changeBtn.style.display = 'none';
                    planSelect.style.display = 'inline-block';
                    planSelect.focus();
                });

                planSelect.addEventListener('change', function () {
                    const newPlan = this.value;
                    planSelect.style.display = 'none';
                    changeBtn.style.display = 'inline-block';
                    if (newPlan === sub.plan) return;
                    changePlan(doc.id, newPlan, sub);
                });

                planSelect.addEventListener('blur', function () {
                    planSelect.style.display = 'none';
                    changeBtn.style.display = 'inline-block';
                });

                changeWrapper.appendChild(planSelect);
                tdActions.appendChild(changeWrapper);

                const cancelBtn = createEl('button', { className: 'btn-action btn-delete' }, 'Cancel');
                cancelBtn.addEventListener('click', () => cancelSubscription(doc.id, sub.artistName));
                tdActions.appendChild(cancelBtn);
            } else {
                const renewBtn = createEl('button', { className: 'btn-action btn-approve' }, 'Renew');
                renewBtn.addEventListener('click', () => renewSubscription(doc.id, sub));
                tdActions.appendChild(renewBtn);
            }
            tr.appendChild(tdActions);

            tbody.appendChild(tr);
        });

        updatePaginationUI('subscriptions', state.page, hasMore);
    } catch (error) {
        console.error('Error loading subscriptions:', error);
        tbody.innerHTML = '';
        tbody.appendChild(createErrorRow(7, 'Error loading subscriptions'));
    }
}

// =============================================
// SUBSCRIPTIONS - Assign Plan
// =============================================
async function assignPlan(artistId, planKey) {
    const plan = PLANS[planKey];
    if (!plan) {
        alert('Invalid plan selected.');
        return;
    }

    try {
        // Fetch artist info
        const artistDoc = await db.collection('users').doc(artistId).get();
        if (!artistDoc.exists) {
            alert('Artist not found.');
            return;
        }
        const artist = artistDoc.data();

        const now = new Date();
        const expiryDate = planKey === 'free' ? null : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        await db.collection('subscriptions').doc(artistId).set({
            artistId: artistId,
            artistName: artist.name || 'Unknown',
            artistEmail: artist.email || '',
            plan: planKey,
            amount: plan.amount,
            status: 'active',
            postLimit: plan.postLimit,
            startDate: firebase.firestore.Timestamp.fromDate(now),
            expiryDate: expiryDate ? firebase.firestore.Timestamp.fromDate(expiryDate) : null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            assignedBy: auth.currentUser.email
        });

        await logAuditAction('assign_plan', artistId, 'subscription', {
            artistName: artist.name, plan: planKey, amount: plan.amount
        });

        alert('Plan "' + plan.name + '" assigned to ' + artist.name + '!');
        resetPagination('subscriptions');
        loadSubscriptions('first');
        loadSubscriptionStats();
    } catch (error) {
        console.error('Error assigning plan:', error);
        alert('Error assigning plan: ' + error.message);
    }
}

// =============================================
// SUBSCRIPTIONS - Change Plan
// =============================================
async function changePlan(subId, newPlanKey, currentSub) {
    const plan = PLANS[newPlanKey];
    if (!confirm('Change ' + (currentSub.artistName || 'this artist') + ' from ' +
        (PLANS[currentSub.plan] ? PLANS[currentSub.plan].name : currentSub.plan) + ' to ' + plan.name + '?')) return;

    try {
        const now = new Date();
        const expiryDate = newPlanKey === 'free' ? null : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        await db.collection('subscriptions').doc(subId).update({
            plan: newPlanKey,
            amount: plan.amount,
            postLimit: plan.postLimit,
            startDate: firebase.firestore.Timestamp.fromDate(now),
            expiryDate: expiryDate ? firebase.firestore.Timestamp.fromDate(expiryDate) : null,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            assignedBy: auth.currentUser.email
        });

        await logAuditAction('change_plan', subId, 'subscription', {
            artistName: currentSub.artistName, oldPlan: currentSub.plan, newPlan: newPlanKey
        });

        alert('Plan changed to ' + plan.name + '!');
        resetPagination('subscriptions');
        loadSubscriptions('first');
        loadSubscriptionStats();
    } catch (error) {
        console.error('Error changing plan:', error);
        alert('Error changing plan.');
    }
}

// =============================================
// SUBSCRIPTIONS - Cancel
// =============================================
async function cancelSubscription(subId, artistName) {
    if (!confirm('Cancel subscription for "' + (artistName || 'this artist') + '"?')) return;

    try {
        await db.collection('subscriptions').doc(subId).update({
            status: 'cancelled',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await logAuditAction('cancel_subscription', subId, 'subscription', { artistName: artistName });

        alert('Subscription cancelled.');
        resetPagination('subscriptions');
        loadSubscriptions('first');
        loadSubscriptionStats();
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        alert('Error cancelling subscription.');
    }
}

// =============================================
// SUBSCRIPTIONS - Renew
// =============================================
async function renewSubscription(subId, currentSub) {
    if (!confirm('Renew subscription for "' + (currentSub.artistName || 'this artist') + '" for 30 days?')) return;

    try {
        const now = new Date();
        const planKey = currentSub.plan || 'free';
        const expiryDate = planKey === 'free' ? null : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        await db.collection('subscriptions').doc(subId).update({
            status: 'active',
            startDate: firebase.firestore.Timestamp.fromDate(now),
            expiryDate: expiryDate ? firebase.firestore.Timestamp.fromDate(expiryDate) : null,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            assignedBy: auth.currentUser.email
        });

        await logAuditAction('renew_subscription', subId, 'subscription', {
            artistName: currentSub.artistName, plan: planKey
        });

        alert('Subscription renewed!');
        resetPagination('subscriptions');
        loadSubscriptions('first');
        loadSubscriptionStats();
    } catch (error) {
        console.error('Error renewing subscription:', error);
        alert('Error renewing subscription.');
    }
}

// =============================================
// SUBSCRIPTIONS - Form & Filter Event Listeners
// =============================================
document.getElementById('assignPlanForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const artistId = document.getElementById('artistSelect').value;
    const planKey = document.getElementById('planSelect').value;

    if (!artistId) {
        alert('Please select an artist.');
        return;
    }

    await assignPlan(artistId, planKey);
    this.reset();
});

document.getElementById('subscriptionSearchInput')?.addEventListener('input', debounce(function () {
    resetPagination('subscriptions');
    loadSubscriptions('first');
}, 300));

document.getElementById('subscriptionPlanFilter')?.addEventListener('change', function () {
    resetPagination('subscriptions');
    loadSubscriptions('first');
});

document.getElementById('subscriptionStatusFilter')?.addEventListener('change', function () {
    resetPagination('subscriptions');
    loadSubscriptions('first');
});

// =============================================
// ORDERS - Stats
// =============================================
async function loadOrderStats() {
    try {
        const snapshot = await db.collection('orders').get();
        let total = 0, pending = 0, delivered = 0, revenue = 0;

        snapshot.forEach(doc => {
            const order = doc.data();
            total++;
            if (order.status === 'pending' || order.status === 'paid') pending++;
            if (order.status === 'delivered') delivered++;
            if (order.status !== 'cancelled' && order.status !== 'refunded') {
                revenue += order.total || 0;
            }
        });

        document.getElementById('totalOrders').textContent = total;
        document.getElementById('pendingOrders').textContent = pending;
        document.getElementById('deliveredOrders').textContent = delivered;
        document.getElementById('orderRevenue').textContent = '$' + revenue.toFixed(2);
    } catch (error) {
        console.error('Error loading order stats:', error);
    }
}

// =============================================
// ORDERS - Load Table (paginated + filtered)
// =============================================
function getOrderStatusClass(status) {
    const map = {
        'pending': 'pending',
        'paid': 'active',
        'processing': 'reported',
        'shipped': 'expired',
        'delivered': 'reviewed',
        'cancelled': 'cancelled',
        'refunded': 'removed'
    };
    return map[status] || 'pending';
}

async function loadOrders(direction) {
    if (!direction) direction = 'first';
    const state = paginationState.orders;
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    tbody.appendChild(createLoadingRow(9));

    try {
        const statusFilter = document.getElementById('orderStatusFilter')?.value || '';
        const methodFilter = document.getElementById('orderPaymentMethodFilter')?.value || '';
        const searchQuery = (document.getElementById('orderSearchInput')?.value || '').toLowerCase();
        const fetchLimit = searchQuery ? PAGE_SIZE * 5 : PAGE_SIZE + 1;

        function buildOrderQuery() {
            let q = db.collection('orders');
            if (statusFilter) q = q.where('status', '==', statusFilter);
            q = q.orderBy('createdAt', 'desc');
            return q;
        }

        let query = buildOrderQuery().limit(fetchLimit);

        if (direction === 'next' && state.lastDoc) {
            query = buildOrderQuery().startAfter(state.lastDoc).limit(fetchLimit);
        } else if (direction === 'prev' && state.stack.length > 1) {
            state.stack.pop();
            const prevCursor = state.stack[state.stack.length - 1];
            query = buildOrderQuery().limit(fetchLimit);
            if (prevCursor) {
                query = buildOrderQuery().startAt(prevCursor).limit(fetchLimit);
            }
            state.page--;
        } else {
            state.page = 1;
            state.stack = [null];
        }

        const snapshot = await query.get();
        tbody.innerHTML = '';

        let docs = snapshot.docs;

        // Client-side filters
        if (methodFilter) {
            docs = docs.filter(doc => doc.data().paymentMethod === methodFilter);
        }
        if (searchQuery) {
            docs = docs.filter(doc => {
                const data = doc.data();
                return (data.customerName || '').toLowerCase().includes(searchQuery) ||
                    (data.artistName || '').toLowerCase().includes(searchQuery) ||
                    (data.customerEmail || '').toLowerCase().includes(searchQuery);
            });
        }

        const hasMore = docs.length > PAGE_SIZE;
        const displayDocs = hasMore ? docs.slice(0, PAGE_SIZE) : docs;

        if (displayDocs.length === 0) {
            tbody.appendChild(createEmptyRow(9, 'No orders found'));
            updatePaginationUI('orders', state.page, false);
            return;
        }

        if (direction === 'first' || direction === 'next') {
            if (direction === 'next') state.page++;
            if (displayDocs.length > 0) state.stack.push(displayDocs[0]);
        }
        state.lastDoc = displayDocs[displayDocs.length - 1];
        state.hasMore = hasMore;

        displayDocs.forEach(doc => {
            const order = doc.data();
            const tr = document.createElement('tr');

            tr.appendChild(createEl('td', {}, doc.id.substring(0, 8) + '...'));
            tr.appendChild(createEl('td', {}, order.customerName || 'N/A'));
            tr.appendChild(createEl('td', {}, order.artistName || 'N/A'));
            tr.appendChild(createEl('td', {}, (order.items || []).length + ' item(s)'));
            tr.appendChild(createEl('td', {}, '$' + (order.total || 0).toFixed(2)));

            const tdStatus = document.createElement('td');
            tdStatus.appendChild(createEl('span', {
                className: 'status-badge status-' + getOrderStatusClass(order.status)
            }, order.status || 'pending'));
            tr.appendChild(tdStatus);

            const tdPayment = document.createElement('td');
            tdPayment.appendChild(createEl('span', {
                className: 'payment-method-badge payment-' + (order.paymentMethod || 'stripe')
            }, order.paymentMethod || 'N/A'));
            tr.appendChild(tdPayment);

            tr.appendChild(createEl('td', {},
                order.createdAt ? order.createdAt.toDate().toLocaleDateString() : 'N/A'));

            // Actions
            const tdActions = document.createElement('td');

            const viewBtn = createEl('button', { className: 'btn-action btn-view' }, 'View');
            viewBtn.addEventListener('click', () => viewOrderDetails(doc.id));
            tdActions.appendChild(viewBtn);

            if (order.status === 'paid' || order.status === 'processing' || order.status === 'shipped') {
                const updateBtn = createEl('button', { className: 'btn-action btn-approve' }, 'Update');
                updateBtn.addEventListener('click', () => updateOrderStatus(doc.id, order));
                tdActions.appendChild(updateBtn);
            }

            if (order.status !== 'refunded' && order.status !== 'cancelled') {
                // Check refund window before showing button
                let withinRefundWindow = true;
                if (order.createdAt) {
                    const daysSince = Math.floor((new Date() - order.createdAt.toDate()) / (1000 * 60 * 60 * 24));
                    withinRefundWindow = daysSince <= PAYMENT_POLICIES.refundDays;
                }
                if (withinRefundWindow) {
                    const refundBtn = createEl('button', { className: 'btn-action btn-delete' }, 'Refund');
                    refundBtn.addEventListener('click', () => refundOrder(doc.id, order));
                    tdActions.appendChild(refundBtn);
                }
            }

            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        });

        updatePaginationUI('orders', state.page, hasMore);
    } catch (error) {
        console.error('Error loading orders:', error);
        tbody.innerHTML = '';
        tbody.appendChild(createErrorRow(9, 'Error loading orders'));
    }
}

// =============================================
// ORDERS - Actions
// =============================================
async function viewOrderDetails(orderId) {
    try {
        const doc = await db.collection('orders').doc(orderId).get();
        if (!doc.exists) { alert('Order not found.'); return; }
        const order = doc.data();

        let itemsList = (order.items || []).map(i =>
            '  - ' + i.title + ' x' + i.quantity + ' @ $' + i.price.toFixed(2)
        ).join('\n');

        alert(
            'Order: ' + orderId + '\n' +
            'Customer: ' + (order.customerName || 'N/A') + ' (' + (order.customerEmail || '') + ')\n' +
            'Artist: ' + (order.artistName || 'N/A') + '\n' +
            'Items:\n' + (itemsList || '  (none)') + '\n' +
            'Subtotal: $' + (order.subtotal || 0).toFixed(2) + '\n' +
            'Platform Fee: $' + (order.platformFee || 0).toFixed(2) + '\n' +
            'Total: $' + (order.total || 0).toFixed(2) + '\n' +
            'Status: ' + (order.status || 'N/A') + '\n' +
            'Payment: ' + (order.paymentMethod || 'N/A') + '\n' +
            'Payout Status: ' + (order.payoutStatus || 'N/A') + '\n' +
            'Date: ' + (order.createdAt ? order.createdAt.toDate().toLocaleString() : 'N/A')
        );
    } catch (error) {
        console.error('Error viewing order:', error);
        alert('Error loading order details.');
    }
}

async function updateOrderStatus(orderId, order) {
    const nextStatus = {
        'paid': 'processing',
        'processing': 'shipped',
        'shipped': 'delivered'
    };
    const newStatus = nextStatus[order.status];
    if (!newStatus) { alert('Cannot update this order status.'); return; }

    let trackingNumber = '';
    if (newStatus === 'shipped') {
        trackingNumber = prompt('Enter tracking number (optional):') || '';
    }

    if (!confirm('Update order to "' + newStatus + '"?')) return;

    try {
        const updateData = {
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (trackingNumber) updateData.trackingNumber = trackingNumber;

        await db.collection('orders').doc(orderId).update(updateData);
        await logAuditAction('update_order_status', orderId, 'order', {
            oldStatus: order.status, newStatus: newStatus, trackingNumber: trackingNumber
        });
        alert('Order updated to ' + newStatus + '.');
        resetPagination('orders');
        loadOrders('first');
        loadOrderStats();
    } catch (error) {
        console.error('Error updating order:', error);
        alert('Error updating order.');
    }
}

async function refundOrder(orderId, order) {
    // Check refund time limit policy
    if (order.createdAt) {
        const orderDate = order.createdAt.toDate();
        const now = new Date();
        const daysSinceOrder = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));
        if (daysSinceOrder > PAYMENT_POLICIES.refundDays) {
            alert('Refund denied: This order is ' + daysSinceOrder + ' days old. Refund window is ' + PAYMENT_POLICIES.refundDays + ' days.');
            return;
        }
    }

    if (!confirm('Refund $' + (order.total || 0).toFixed(2) + ' for this order? This will deduct from the artist\'s wallet.')) return;

    try {
        await db.collection('orders').doc(orderId).update({
            status: 'refunded',
            payoutStatus: 'unpaid',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (order.paymentId) {
            await db.collection('payments').doc(order.paymentId).update({
                status: 'refunded',
                refundedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        // Reverse artist wallet earnings
        if (order.artistId && order.artistEarnings) {
            const walletRef = db.collection('wallets').doc(order.artistId);
            const walletDoc = await walletRef.get();
            if (walletDoc.exists) {
                const wallet = walletDoc.data();
                const newBalance = Math.max(0, (wallet.balance || 0) - (order.artistEarnings || 0));
                await walletRef.update({
                    balance: newBalance,
                    totalEarnings: Math.max(0, (wallet.totalEarnings || 0) - (order.artistEarnings || 0)),
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }

        await logAuditAction('refund_order', orderId, 'order', {
            amount: order.total, customerName: order.customerName, artistId: order.artistId
        });

        alert('Order refunded. Artist wallet updated.');
        resetPagination('orders');
        loadOrders('first');
        loadOrderStats();
    } catch (error) {
        console.error('Error refunding order:', error);
        alert('Error refunding order.');
    }
}

// Order event listeners
document.getElementById('ordersPrevBtn')?.addEventListener('click', () => loadOrders('prev'));
document.getElementById('ordersNextBtn')?.addEventListener('click', () => loadOrders('next'));

document.getElementById('orderSearchInput')?.addEventListener('input', debounce(function () {
    resetPagination('orders');
    loadOrders('first');
}, 300));

document.getElementById('orderStatusFilter')?.addEventListener('change', function () {
    resetPagination('orders');
    loadOrders('first');
});

document.getElementById('orderPaymentMethodFilter')?.addEventListener('change', function () {
    resetPagination('orders');
    loadOrders('first');
});

// =============================================
// PAYMENTS - Stats
// =============================================
async function loadPaymentStats() {
    try {
        const [paymentsSnap, payoutsSnap, unpaidOrdersSnap] = await Promise.all([
            db.collection('payments').get(),
            db.collection('payouts').get(),
            db.collection('orders').where('payoutStatus', '==', 'unpaid').where('status', '==', 'delivered').get()
        ]);

        let totalPayments = 0, completedAmount = 0, platformRevenue = 0, refundedAmount = 0;
        paymentsSnap.forEach(doc => {
            const p = doc.data();
            totalPayments++;
            if (p.status === 'completed') completedAmount += p.amount || 0;
            if (p.status === 'completed') platformRevenue += p.platformFee || 0;
            if (p.status === 'refunded') refundedAmount += p.amount || 0;
        });

        let totalPayoutsAmount = 0;
        payoutsSnap.forEach(doc => {
            const p = doc.data();
            if (p.status === 'completed') totalPayoutsAmount += p.amount || 0;
        });

        let pendingPayoutsAmount = 0;
        unpaidOrdersSnap.forEach(doc => {
            pendingPayoutsAmount += doc.data().artistEarnings || 0;
        });

        document.getElementById('totalPayments').textContent = totalPayments;
        document.getElementById('completedPayments').textContent = '$' + completedAmount.toFixed(2);
        document.getElementById('platformRevenue').textContent = '$' + platformRevenue.toFixed(2);
        document.getElementById('totalPayoutsAmount').textContent = '$' + totalPayoutsAmount.toFixed(2);
        document.getElementById('pendingPayouts').textContent = '$' + pendingPayoutsAmount.toFixed(2);
        document.getElementById('refundedAmount').textContent = '$' + refundedAmount.toFixed(2);
    } catch (error) {
        console.error('Error loading payment stats:', error);
    }
}

// =============================================
// PAYMENTS - Load Table
// =============================================
async function loadPayments(direction) {
    if (!direction) direction = 'first';
    const state = paginationState.payments;
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    tbody.appendChild(createLoadingRow(10));

    try {
        const typeFilter = document.getElementById('paymentTypeFilter')?.value || '';
        const statusFilter = document.getElementById('paymentStatusFilter')?.value || '';
        const methodFilter = document.getElementById('paymentMethodFilter')?.value || '';
        const searchQuery = (document.getElementById('paymentSearchInput')?.value || '').toLowerCase();
        const fetchLimit = searchQuery ? PAGE_SIZE * 5 : PAGE_SIZE + 1;

        function buildPaymentQuery() {
            let q = db.collection('payments');
            if (typeFilter) q = q.where('type', '==', typeFilter);
            if (statusFilter) q = q.where('status', '==', statusFilter);
            q = q.orderBy('createdAt', 'desc');
            return q;
        }

        let query = buildPaymentQuery().limit(fetchLimit);

        if (direction === 'next' && state.lastDoc) {
            query = buildPaymentQuery().startAfter(state.lastDoc).limit(fetchLimit);
        } else if (direction === 'prev' && state.stack.length > 1) {
            state.stack.pop();
            const prevCursor = state.stack[state.stack.length - 1];
            query = buildPaymentQuery().limit(fetchLimit);
            if (prevCursor) {
                query = buildPaymentQuery().startAt(prevCursor).limit(fetchLimit);
            }
            state.page--;
        } else {
            state.page = 1;
            state.stack = [null];
        }

        const snapshot = await query.get();
        tbody.innerHTML = '';

        let docs = snapshot.docs;

        if (methodFilter) {
            docs = docs.filter(doc => doc.data().paymentMethod === methodFilter);
        }
        if (searchQuery) {
            docs = docs.filter(doc => {
                const data = doc.data();
                return (data.userName || '').toLowerCase().includes(searchQuery) ||
                    (data.userEmail || '').toLowerCase().includes(searchQuery);
            });
        }

        const hasMore = docs.length > PAGE_SIZE;
        const displayDocs = hasMore ? docs.slice(0, PAGE_SIZE) : docs;

        if (displayDocs.length === 0) {
            tbody.appendChild(createEmptyRow(10, 'No payments found'));
            updatePaginationUI('payments', state.page, false);
            return;
        }

        if (direction === 'first' || direction === 'next') {
            if (direction === 'next') state.page++;
            if (displayDocs.length > 0) state.stack.push(displayDocs[0]);
        }
        state.lastDoc = displayDocs[displayDocs.length - 1];
        state.hasMore = hasMore;

        displayDocs.forEach(doc => {
            const payment = doc.data();
            const tr = document.createElement('tr');

            tr.appendChild(createEl('td', {}, doc.id.substring(0, 8) + '...'));

            const tdType = document.createElement('td');
            tdType.appendChild(createEl('span', {
                className: 'type-badge type-' + (payment.type || 'order')
            }, payment.type || 'order'));
            tr.appendChild(tdType);

            tr.appendChild(createEl('td', {}, (payment.userName || 'N/A') + '\n' + (payment.userEmail || '')));
            tr.appendChild(createEl('td', {}, '$' + (payment.amount || 0).toFixed(2)));
            tr.appendChild(createEl('td', {}, '$' + (payment.platformFee || 0).toFixed(2)));
            tr.appendChild(createEl('td', {}, '$' + (payment.netAmount || 0).toFixed(2)));

            const tdMethod = document.createElement('td');
            tdMethod.appendChild(createEl('span', {
                className: 'payment-method-badge payment-' + (payment.paymentMethod || 'stripe')
            }, payment.paymentMethod || 'N/A'));
            tr.appendChild(tdMethod);

            const tdStatus = document.createElement('td');
            tdStatus.appendChild(createEl('span', {
                className: 'status-badge status-' + getPaymentStatusClass(payment.status)
            }, payment.status || 'pending'));
            tr.appendChild(tdStatus);

            tr.appendChild(createEl('td', {},
                payment.createdAt ? payment.createdAt.toDate().toLocaleDateString() : 'N/A'));

            const tdActions = document.createElement('td');
            const viewBtn = createEl('button', { className: 'btn-action btn-view' }, 'View');
            viewBtn.addEventListener('click', () => {
                alert(
                    'Payment: ' + doc.id + '\n' +
                    'Type: ' + (payment.type || 'N/A') + '\n' +
                    'User: ' + (payment.userName || 'N/A') + '\n' +
                    'Amount: $' + (payment.amount || 0).toFixed(2) + '\n' +
                    'Platform Fee: $' + (payment.platformFee || 0).toFixed(2) + '\n' +
                    'Net: $' + (payment.netAmount || 0).toFixed(2) + '\n' +
                    'Method: ' + (payment.paymentMethod || 'N/A') + '\n' +
                    'Status: ' + (payment.status || 'N/A') + '\n' +
                    'Gateway ID: ' + (payment.gatewayTransactionId || 'N/A') + '\n' +
                    'Reference: ' + (payment.referenceId || 'N/A')
                );
            });
            tdActions.appendChild(viewBtn);
            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        });

        updatePaginationUI('payments', state.page, hasMore);
    } catch (error) {
        console.error('Error loading payments:', error);
        tbody.innerHTML = '';
        tbody.appendChild(createErrorRow(10, 'Error loading payments'));
    }
}

function getPaymentStatusClass(status) {
    const map = {
        'completed': 'reviewed',
        'pending': 'pending',
        'failed': 'removed',
        'refunded': 'removed'
    };
    return map[status] || 'pending';
}

// Payment event listeners
document.getElementById('paymentsPrevBtn')?.addEventListener('click', () => loadPayments('prev'));
document.getElementById('paymentsNextBtn')?.addEventListener('click', () => loadPayments('next'));

document.getElementById('paymentSearchInput')?.addEventListener('input', debounce(function () {
    resetPagination('payments');
    loadPayments('first');
}, 300));

document.getElementById('paymentTypeFilter')?.addEventListener('change', function () {
    resetPagination('payments');
    loadPayments('first');
});

document.getElementById('paymentStatusFilter')?.addEventListener('change', function () {
    resetPagination('payments');
    loadPayments('first');
});

document.getElementById('paymentMethodFilter')?.addEventListener('change', function () {
    resetPagination('payments');
    loadPayments('first');
});

// =============================================
// PAYOUTS - Load Table
// =============================================
async function loadPayouts(direction) {
    if (!direction) direction = 'first';
    const state = paginationState.payouts;
    const tbody = document.getElementById('payoutsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    tbody.appendChild(createLoadingRow(8));

    try {
        const statusFilter = document.getElementById('payoutStatusFilter')?.value || '';
        const searchQuery = (document.getElementById('payoutSearchInput')?.value || '').toLowerCase();
        const fetchLimit = searchQuery ? PAGE_SIZE * 5 : PAGE_SIZE + 1;

        function buildPayoutQuery() {
            let q = db.collection('payouts');
            if (statusFilter) q = q.where('status', '==', statusFilter);
            q = q.orderBy('createdAt', 'desc');
            return q;
        }

        let query = buildPayoutQuery().limit(fetchLimit);

        if (direction === 'next' && state.lastDoc) {
            query = buildPayoutQuery().startAfter(state.lastDoc).limit(fetchLimit);
        } else if (direction === 'prev' && state.stack.length > 1) {
            state.stack.pop();
            const prevCursor = state.stack[state.stack.length - 1];
            query = buildPayoutQuery().limit(fetchLimit);
            if (prevCursor) {
                query = buildPayoutQuery().startAt(prevCursor).limit(fetchLimit);
            }
            state.page--;
        } else {
            state.page = 1;
            state.stack = [null];
        }

        const snapshot = await query.get();
        tbody.innerHTML = '';

        let docs = snapshot.docs;

        if (searchQuery) {
            docs = docs.filter(doc => {
                const data = doc.data();
                return (data.artistName || '').toLowerCase().includes(searchQuery) ||
                    (data.artistEmail || '').toLowerCase().includes(searchQuery);
            });
        }

        const hasMore = docs.length > PAGE_SIZE;
        const displayDocs = hasMore ? docs.slice(0, PAGE_SIZE) : docs;

        if (displayDocs.length === 0) {
            tbody.appendChild(createEmptyRow(8, 'No payouts found'));
            updatePaginationUI('payouts', state.page, false);
            return;
        }

        if (direction === 'first' || direction === 'next') {
            if (direction === 'next') state.page++;
            if (displayDocs.length > 0) state.stack.push(displayDocs[0]);
        }
        state.lastDoc = displayDocs[displayDocs.length - 1];
        state.hasMore = hasMore;

        displayDocs.forEach(doc => {
            const payout = doc.data();
            const tr = document.createElement('tr');

            tr.appendChild(createEl('td', {}, doc.id.substring(0, 8) + '...'));
            tr.appendChild(createEl('td', {}, payout.artistName || 'N/A'));
            tr.appendChild(createEl('td', {}, '$' + (payout.amount || 0).toFixed(2)));
            tr.appendChild(createEl('td', {}, (payout.orderIds || []).length + ' order(s)'));

            const tdMethod = document.createElement('td');
            tdMethod.appendChild(createEl('span', {
                className: 'payment-method-badge payment-' + (payout.paymentMethod || 'stripe')
            }, payout.paymentMethod || 'N/A'));
            tr.appendChild(tdMethod);

            const tdStatus = document.createElement('td');
            const statusClass = payout.status === 'completed' ? 'reviewed' :
                payout.status === 'failed' ? 'removed' :
                payout.status === 'processing' ? 'reported' : 'pending';
            tdStatus.appendChild(createEl('span', {
                className: 'status-badge status-' + statusClass
            }, payout.status || 'pending'));
            tr.appendChild(tdStatus);

            tr.appendChild(createEl('td', {},
                payout.createdAt ? payout.createdAt.toDate().toLocaleDateString() : 'N/A'));
            tr.appendChild(createEl('td', {}, payout.processedBy || 'N/A'));

            tbody.appendChild(tr);
        });

        updatePaginationUI('payouts', state.page, hasMore);
    } catch (error) {
        console.error('Error loading payouts:', error);
        tbody.innerHTML = '';
        tbody.appendChild(createErrorRow(8, 'Error loading payouts'));
    }
}

// Payout event listeners
document.getElementById('payoutsPrevBtn')?.addEventListener('click', () => loadPayouts('prev'));
document.getElementById('payoutsNextBtn')?.addEventListener('click', () => loadPayouts('next'));

document.getElementById('payoutSearchInput')?.addEventListener('input', debounce(function () {
    resetPagination('payouts');
    loadPayouts('first');
}, 300));

document.getElementById('payoutStatusFilter')?.addEventListener('change', function () {
    resetPagination('payouts');
    loadPayouts('first');
});

// =============================================
// PAYOUTS - Populate Artist Dropdown
// =============================================
async function populatePayoutArtistDropdown() {
    const select = document.getElementById('payoutArtistSelect');
    if (!select) return;

    try {
        const snapshot = await db.collection('orders')
            .where('payoutStatus', '==', 'unpaid')
            .where('status', '==', 'delivered')
            .get();

        const artistAmounts = {};
        snapshot.forEach(doc => {
            const order = doc.data();
            if (!artistAmounts[order.artistId]) {
                artistAmounts[order.artistId] = {
                    name: order.artistName || 'Unknown',
                    amount: 0
                };
            }
            artistAmounts[order.artistId].amount += order.artistEarnings || 0;
        });

        select.innerHTML = '<option value="">-- Choose Artist --</option>';
        for (const [artistId, info] of Object.entries(artistAmounts)) {
            const option = document.createElement('option');
            option.value = artistId;
            option.textContent = info.name + ' - $' + info.amount.toFixed(2) + ' pending';
            option.dataset.amount = info.amount.toFixed(2);
            select.appendChild(option);
        }
    } catch (error) {
        console.error('Error populating payout artist dropdown:', error);
    }
}

// Update preview when artist selected
document.getElementById('payoutArtistSelect')?.addEventListener('change', function () {
    const selected = this.options[this.selectedIndex];
    const preview = document.getElementById('payoutAmountPreview');
    if (preview) {
        preview.value = selected.dataset.amount ? '$' + selected.dataset.amount : '$0.00';
    }
});

// Process Payout form
document.getElementById('processPayoutForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const artistId = document.getElementById('payoutArtistSelect').value;
    const method = document.getElementById('payoutMethodSelect').value;

    if (!artistId) { alert('Please select an artist.'); return; }

    try {
        // Check artist wallet balance
        const walletDoc = await db.collection('wallets').doc(artistId).get();
        const walletBalance = walletDoc.exists ? (walletDoc.data().balance || 0) : 0;

        if (walletBalance < PAYMENT_POLICIES.minWithdrawal) {
            alert('Payout denied: Artist wallet balance ($' + walletBalance.toFixed(2) + ') is below the minimum withdrawal of $' + PAYMENT_POLICIES.minWithdrawal.toFixed(2) + '.');
            return;
        }

        const ordersSnap = await db.collection('orders')
            .where('artistId', '==', artistId)
            .where('payoutStatus', '==', 'unpaid')
            .where('status', '==', 'delivered')
            .get();

        if (ordersSnap.empty) { alert('No unpaid delivered orders for this artist.'); return; }

        const totalAmount = ordersSnap.docs.reduce((sum, d) => sum + (d.data().artistEarnings || 0), 0);

        if (!confirm('Process payout of $' + totalAmount.toFixed(2) + ' for this artist? This will deduct from their wallet.')) return;

        const orderIds = ordersSnap.docs.map(d => d.id);
        const firstOrder = ordersSnap.docs[0].data();

        const payoutRef = db.collection('payouts').doc();
        const batch = db.batch();

        batch.set(payoutRef, {
            payoutId: payoutRef.id,
            artistId: artistId,
            artistName: firstOrder.artistName || 'Unknown',
            artistEmail: firstOrder.artistEmail || '',
            amount: totalAmount,
            currency: 'USD',
            orderIds: orderIds,
            paymentMethod: method,
            gatewayPayoutId: '',
            status: 'completed',
            processedBy: auth.currentUser.email,
            notes: '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            processedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        ordersSnap.forEach(doc => {
            batch.update(doc.ref, {
                payoutId: payoutRef.id,
                payoutStatus: 'paid_out',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        // Deduct from artist wallet
        if (walletDoc.exists) {
            batch.update(db.collection('wallets').doc(artistId), {
                balance: Math.max(0, walletBalance - totalAmount),
                totalWithdrawn: (walletDoc.data().totalWithdrawn || 0) + totalAmount,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        await batch.commit();
        await logAuditAction('process_payout', payoutRef.id, 'payout', {
            artistId: artistId, artistName: firstOrder.artistName, amount: totalAmount, method: method
        });

        alert('Payout completed! $' + totalAmount.toFixed(2) + ' withdrawn from artist wallet.');
        this.reset();
        document.getElementById('payoutAmountPreview').value = '$0.00';
        resetPagination('payouts');
        loadPayouts('first');
        loadArtistWallets();
        loadPaymentStats();
        populatePayoutArtistDropdown();
    } catch (error) {
        console.error('Error processing payout:', error);
        alert('Error processing payout: ' + error.message);
    }
});

// =============================================
// REVENUE CHARTS
// =============================================
let revenueTrendChart = null;
let paymentMethodsPieChart = null;

async function loadRevenueTrendChart() {
    try {
        const now = new Date();
        const monthlyData = {};

        const paymentsSnap = await db.collection('payments')
            .where('status', '==', 'completed')
            .get();

        paymentsSnap.forEach(doc => {
            const p = doc.data();
            if (p.createdAt) {
                const date = p.createdAt.toDate();
                const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
                if (!monthlyData[key]) monthlyData[key] = { revenue: 0, fees: 0 };
                monthlyData[key].revenue += p.amount || 0;
                monthlyData[key].fees += p.platformFee || 0;
            }
        });

        const labels = [], revenueData = [], feeData = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
            labels.push(d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
            revenueData.push((monthlyData[key] || {}).revenue || 0);
            feeData.push((monthlyData[key] || {}).fees || 0);
        }

        const ctx = document.getElementById('revenueTrendChart');
        if (!ctx) return;
        if (revenueTrendChart) revenueTrendChart.destroy();

        const colors = getChartColors();
        revenueTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total Revenue',
                        data: revenueData,
                        borderColor: '#2E86AB',
                        backgroundColor: 'rgba(46, 134, 171, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Platform Fees',
                        data: feeData,
                        borderColor: '#C4A265',
                        backgroundColor: 'rgba(196, 162, 101, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { labels: { color: colors.legendColor } } },
                scales: getChartScaleOptions()
            }
        });
    } catch (error) {
        console.error('Error loading revenue trend chart:', error);
    }
}

async function loadPaymentMethodsChart() {
    try {
        const paymentsSnap = await db.collection('payments')
            .where('status', '==', 'completed')
            .get();

        let virtualCardTotal = 0, virtualVisaTotal = 0;
        paymentsSnap.forEach(doc => {
            const p = doc.data();
            if (p.paymentMethod === 'virtual_card') virtualCardTotal += p.amount || 0;
            else if (p.paymentMethod === 'virtual_visa') virtualVisaTotal += p.amount || 0;
        });

        const ctx = document.getElementById('paymentMethodsChart');
        if (!ctx) return;
        if (paymentMethodsPieChart) paymentMethodsPieChart.destroy();

        const colors = getChartColors();
        paymentMethodsPieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Virtual Card', 'Virtual Visa'],
                datasets: [{
                    data: [virtualCardTotal, virtualVisaTotal],
                    backgroundColor: ['#2E86AB', '#C4A265'],
                    borderWidth: 2,
                    borderColor: document.body.classList.contains('dark-mode') ? '#1e293b' : '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        labels: { color: colors.legendColor }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading payment methods chart:', error);
    }
}

// =============================================
// ARTIST WALLETS
// =============================================
async function loadArtistWallets() {
    const tbody = document.getElementById('walletsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    tbody.appendChild(createLoadingRow(7));

    try {
        const searchQuery = (document.getElementById('walletSearchInput')?.value || '').toLowerCase();

        // Get all artists
        const usersSnap = await db.collection('users').where('role', '==', 'artist').get();
        const artistIds = usersSnap.docs.map(d => d.id);
        const artistMap = {};
        usersSnap.forEach(doc => {
            const data = doc.data();
            artistMap[doc.id] = { name: data.name || 'Unknown', email: data.email || '' };
        });

        // Get all wallets
        const walletsSnap = await db.collection('wallets').get();
        const walletMap = {};
        walletsSnap.forEach(doc => {
            walletMap[doc.id] = doc.data();
        });

        tbody.innerHTML = '';

        // Build rows for each artist
        let artists = artistIds.map(id => ({
            id: id,
            name: artistMap[id].name,
            email: artistMap[id].email,
            wallet: walletMap[id] || { balance: 0, totalEarnings: 0, totalWithdrawn: 0 }
        }));

        // Client-side search
        if (searchQuery) {
            artists = artists.filter(a =>
                a.name.toLowerCase().includes(searchQuery) ||
                a.email.toLowerCase().includes(searchQuery)
            );
        }

        if (artists.length === 0) {
            tbody.appendChild(createEmptyRow(6, 'No artist wallets found'));
            return;
        }

        artists.forEach(artist => {
            const tr = document.createElement('tr');
            const w = artist.wallet;

            tr.appendChild(createEl('td', {}, artist.name));
            tr.appendChild(createEl('td', {}, artist.email));
            tr.appendChild(createEl('td', {}, '$' + (w.balance || 0).toFixed(2)));
            tr.appendChild(createEl('td', {}, '$' + (w.totalEarnings || 0).toFixed(2)));
            tr.appendChild(createEl('td', {}, '$' + (w.totalWithdrawn || 0).toFixed(2)));

            const tdActions = document.createElement('td');
            const addCreditBtn = createEl('button', { className: 'btn-action btn-approve' }, 'Add Credit');
            addCreditBtn.addEventListener('click', () => addWalletCredit(artist.id, artist.name));
            tdActions.appendChild(addCreditBtn);
            tr.appendChild(tdActions);

            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error loading artist wallets:', error);
        tbody.innerHTML = '';
        tbody.appendChild(createErrorRow(6, 'Error loading wallets'));
    }
}

async function addWalletCredit(artistId, artistName) {
    const amountStr = prompt('Enter credit amount to add to ' + artistName + '\'s wallet:');
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid positive amount.');
        return;
    }

    if (!confirm('Add $' + amount.toFixed(2) + ' to ' + artistName + '\'s wallet?')) return;

    try {
        const walletRef = db.collection('wallets').doc(artistId);
        const walletDoc = await walletRef.get();

        if (walletDoc.exists) {
            const wallet = walletDoc.data();
            await walletRef.update({
                balance: (wallet.balance || 0) + amount,
                totalEarnings: (wallet.totalEarnings || 0) + amount,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            await walletRef.set({
                balance: amount,
                totalEarnings: amount,
                totalWithdrawn: 0,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        await logAuditAction('add_wallet_credit', artistId, 'wallet', {
            artistName: artistName, amount: amount
        });

        alert('$' + amount.toFixed(2) + ' added to ' + artistName + '\'s wallet.');
        loadArtistWallets();
        loadPaymentStats();
    } catch (error) {
        console.error('Error adding wallet credit:', error);
        alert('Error adding credit: ' + error.message);
    }
}

// Wallet search listener
document.getElementById('walletSearchInput')?.addEventListener('input', debounce(function () {
    loadArtistWallets();
}, 300));
