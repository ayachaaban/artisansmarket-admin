// =============================================
// GLOBAL STATE
// =============================================
let currentAdminRole = null;
const PAGE_SIZE = 20;
let reportsUnsubscribe = null;
let postCategoryCache = { data: null, timestamp: 0 };
const CACHE_TTL = 60000; // 1 minute cache

// Pagination state for each table
const paginationState = {
    customers: { lastDoc: null, page: 1, hasMore: true, stack: [] },
    allUsers: { lastDoc: null, page: 1, hasMore: true, stack: [] },
    artists: { lastDoc: null, page: 1, hasMore: true, stack: [] },
    posts: { lastDoc: null, page: 1, hasMore: true, stack: [] },
    reports: { lastDoc: null, page: 1, hasMore: true, stack: [] },
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

    if (count > 0) {
        if (reportsBadge) {
            reportsBadge.textContent = count;
            reportsBadge.style.display = 'flex';
        }
        if (notificationBadge) {
            notificationBadge.textContent = count;
            notificationBadge.style.display = 'flex';
        }
    } else {
        if (reportsBadge) reportsBadge.style.display = 'none';
        if (notificationBadge) notificationBadge.style.display = 'none';
    }
}

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
                        borderColor: '#0066cc',
                        backgroundColor: 'rgba(0, 102, 204, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } }
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
                        backgroundColor: ['#0066cc', '#7c3aed', '#0891b2', '#10b981', '#f59e0b', '#ec4899']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } }
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
        tbody.appendChild(createErrorRow(6, 'Error loading customers'));
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
        tbody.appendChild(createErrorRow(6, 'Error loading users'));
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
        tbody.appendChild(createErrorRow(7, 'Error loading artists'));
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
            categoryPieChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: Object.keys(categoryData),
                    datasets: [{
                        data: Object.values(categoryData),
                        backgroundColor: ['#0066cc', '#7c3aed', '#0891b2', '#10b981', '#f59e0b', '#ec4899']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true
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
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } }
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
                const toggleRoleBtn = createEl('button', { className: 'btn-action btn-view' },
                    admin.role === 'super-admin' ? 'Demote' : 'Promote');
                toggleRoleBtn.addEventListener('click', () => toggleAdminRole(doc.id, admin.role, admin.email));

                const deleteBtn = createEl('button', { className: 'btn-action btn-delete' }, 'Remove');
                deleteBtn.addEventListener('click', () => deleteAdmin(doc.id, admin.email));

                tdActions.append(toggleRoleBtn, deleteBtn);
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
    const role = document.getElementById('newAdminRole').value;

    if (!email || !password || password.length < 6) {
        alert('Please provide a valid email and password (min 6 characters).');
        return;
    }

    if (!confirm('Add "' + email + '" as ' + role + '?')) return;

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

async function toggleAdminRole(adminId, currentRole, adminEmail) {
    const newRole = currentRole === 'super-admin' ? 'admin' : 'super-admin';
    if (!confirm('Change "' + adminEmail + '" from ' + currentRole + ' to ' + newRole + '?')) return;

    try {
        await db.collection('admins').doc(adminId).update({ role: newRole });
        await logAuditAction('change_admin_role', adminId, 'admin', {
            email: adminEmail, oldRole: currentRole, newRole: newRole
        });
        alert('Admin role updated.');
        loadAdmins();
    } catch (error) {
        console.error('Error updating admin role:', error);
        alert('Error updating admin role.');
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
