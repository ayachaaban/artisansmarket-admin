// =============================================
// FIREBASE CONFIGURATION
// =============================================
const firebaseConfig = {
    apiKey: "AIzaSyDG1fBMvyAmmk7qNBH-mRKAX1OCd3ouKUk",
    authDomain: "artisansmarket-5f2b6.firebaseapp.com",
    projectId: "artisansmarket-5f2b6",
    storageBucket: "artisansmarket-5f2b6.firebasestorage.app",
    messagingSenderId: "89551898663",
    appId: "1:89551898663:web:1891c4639d293c861e2602"
};

// Initialize Firebase
let auth, db;
try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// Admin email
const ADMIN_EMAIL = "artisansmarkett@gmail.com";

// =============================================
// CHECK AUTHENTICATION
// =============================================
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'admin-login.html';
    } else if (user.email !== ADMIN_EMAIL) {
        auth.signOut();
        alert('Access denied. You are not authorized.');
        window.location.href = 'admin-login.html';
    } else {
        document.getElementById('adminEmail').textContent = user.email;
        initializeDashboard();
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
    setInterval(updateCurrentDate, 60000); // Update every minute
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
    item.addEventListener('click', function() {
        const page = this.getAttribute('data-page');
        if (!page) return;

        sidebarMenuItems.forEach(i => i.classList.remove('active'));
        this.classList.add('active');

        document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
        document.getElementById(`${page}Page`).classList.add('active');

        switch(page) {
            case 'overview':
                loadOverview();
                break;
            case 'users':
                loadCustomers();
                loadAllUsers();
                break;
            case 'artists':
                loadArtists();
                break;
            case 'posts':
                loadPosts();
                break;
            case 'reports':
                loadReports();
                break;
            case 'ratings':
                loadRatings();
                break;
            case 'analytics':
                loadAnalytics();
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
    menuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
    });
}

// =============================================
// THEME TOGGLE
// =============================================
themeToggleDash.addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');

    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
        this.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/></svg>`;
    } else {
        localStorage.setItem('theme', 'light');
        this.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/></svg>`;
    }
});

// Load saved theme
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggleDash.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/></svg>`;
    }
});

// =============================================
// LOGOUT
// =============================================
logoutBtn.addEventListener('click', async function() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await auth.signOut();
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
    // Listen for pending reports in real-time
    db.collection('reports').where('status', '==', 'pending')
        .onSnapshot((snapshot) => {
            const count = snapshot.size;
            updateReportsBadge(count);
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
        // Load KPI stats
        const usersSnap = await db.collection('users').get();
        const artistsSnap = await db.collection('users').where('role', '==', 'artist').get();
        const postsSnap = await db.collection('posts').get();
        const activePostsSnap = await db.collection('posts').where('status', '==', 'active').get();
        const pendingReportsSnap = await db.collection('reports').where('status', '==', 'pending').get();
        const ratingsSnap = await db.collection('ratings').get();

        // Calculate average rating
        let totalRating = 0;
        ratingsSnap.forEach(doc => {
            totalRating += doc.data().stars || 0;
        });
        const avgRating = ratingsSnap.size > 0 ? (totalRating / ratingsSnap.size).toFixed(1) : '0.0';

        // Update KPI cards
        document.getElementById('totalUsers').textContent = usersSnap.size;
        document.getElementById('totalArtists').textContent = artistsSnap.size;
        document.getElementById('totalPosts').textContent = postsSnap.size;
        document.getElementById('activePosts').textContent = activePostsSnap.size;
        document.getElementById('pendingReports').textContent = pendingReportsSnap.size;
        document.getElementById('avgRating').textContent = avgRating;

        // Load charts
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

        // Group by month
        const monthlyData = {};
        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.createdAt) {
                const date = data.createdAt.toDate();
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
            }
        });

        // Get last 6 months
        const labels = [];
        const data = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const monthName = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            labels.push(monthName);
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
        const postsSnap = await db.collection('posts').get();

        const categoryData = {};
        postsSnap.forEach(doc => {
            const category = doc.data().category || 'Unknown';
            categoryData[category] = (categoryData[category] || 0) + 1;
        });

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
// USERS PAGE
// =============================================
async function loadCustomers() {
    const tbody = document.getElementById('customersTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';

    try {
        const snapshot = await db.collection('users').where('role', '==', 'customer').orderBy('createdAt', 'desc').get();

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No customers found</td></tr>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            const date = user.createdAt ? user.createdAt.toDate().toLocaleDateString() : 'N/A';
            html += `
                <tr>
                    <td>${user.name || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td><span class="role-badge role-customer">Customer</span></td>
                    <td>${date}</td>
                    <td>
                        <button class="btn-action btn-delete" onclick="deleteUser('${doc.id}', '${user.name}')">Delete</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    } catch (error) {
        console.error('Error loading customers:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading customers</td></tr>';
    }
}

async function loadAllUsers() {
    const tbody = document.getElementById('allUsersTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';

    try {
        const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No users found</td></tr>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            const date = user.createdAt ? user.createdAt.toDate().toLocaleDateString() : 'N/A';
            html += `
                <tr>
                    <td>${user.name || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td><span class="role-badge role-${user.role}">${user.role}</span></td>
                    <td>${date}</td>
                    <td>
                        <button class="btn-action btn-delete" onclick="deleteUser('${doc.id}', '${user.name}')">Delete</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    } catch (error) {
        console.error('Error loading all users:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading users</td></tr>';
    }
}

// =============================================
// ARTISTS PAGE
// =============================================
async function loadArtists() {
    const tbody = document.getElementById('artistsTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

    try {
        const snapshot = await db.collection('users').where('role', '==', 'artist').orderBy('createdAt', 'desc').get();

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No artists found</td></tr>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const artist = doc.data();
            const date = artist.createdAt ? artist.createdAt.toDate().toLocaleDateString() : 'N/A';
            const rating = artist.averageRating ? artist.averageRating.toFixed(1) : 'N/A';
            html += `
                <tr>
                    <td>${artist.name || 'N/A'}</td>
                    <td>${artist.email || 'N/A'}</td>
                    <td>${artist.category || 'N/A'}</td>
                    <td>${rating}</td>
                    <td>${date}</td>
                    <td>
                        <button class="btn-action btn-delete" onclick="deleteUser('${doc.id}', '${artist.name}')">Delete</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    } catch (error) {
        console.error('Error loading artists:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading artists</td></tr>';
    }
}

// =============================================
// DELETE USER
// =============================================
async function deleteUser(userId, userName) {
    if (!confirm(`Delete user "${userName}"? This cannot be undone.`)) return;

    try {
        await db.collection('users').doc(userId).delete();
        alert('User deleted successfully!');
        loadCustomers();
        loadAllUsers();
        loadArtists();
        loadOverview();
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user.');
    }
}

// =============================================
// POSTS PAGE
// =============================================
let allPosts = [];

async function loadPosts(categoryFilter = '', statusFilter = '', searchQuery = '') {
    const tbody = document.getElementById('postsTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';

    try {
        if (allPosts.length === 0) {
            const snapshot = await db.collection('posts').orderBy('createdAt', 'desc').get();
            allPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        let filteredPosts = allPosts;

        if (categoryFilter) {
            filteredPosts = filteredPosts.filter(post => post.category === categoryFilter);
        }
        if (statusFilter) {
            filteredPosts = filteredPosts.filter(post => post.status === statusFilter);
        }
        if (searchQuery) {
            filteredPosts = filteredPosts.filter(post =>
                post.artistName && post.artistName.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (filteredPosts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No posts found</td></tr>';
            return;
        }

        let html = '';
        filteredPosts.forEach(post => {
            const date = post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString() : 'N/A';
            const desc = post.description && post.description.length > 40 ? post.description.substring(0, 40) + '...' : post.description || 'N/A';
            const imgSrc = post.imageUrl || 'https://via.placeholder.com/60';

            html += `
                <tr>
                    <td><img src="${imgSrc}" class="post-thumbnail" alt="Post"></td>
                    <td>${post.artistName || 'Unknown'}</td>
                    <td>${post.category || 'N/A'}</td>
                    <td>${desc}</td>
                    <td><span class="status-badge status-${post.status}">${post.status}</span></td>
                    <td>${date}</td>
                    <td>
                        <button class="btn-action btn-delete" onclick="deletePost('${post.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    } catch (error) {
        console.error('Error loading posts:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading posts</td></tr>';
    }
}

// Setup filters
document.getElementById('categoryFilter')?.addEventListener('change', function() {
    const category = this.value;
    const status = document.getElementById('statusFilter').value;
    const search = document.getElementById('searchArtist').value;
    loadPosts(category, status, search);
});

document.getElementById('statusFilter')?.addEventListener('change', function() {
    const status = this.value;
    const category = document.getElementById('categoryFilter').value;
    const search = document.getElementById('searchArtist').value;
    loadPosts(category, status, search);
});

document.getElementById('searchArtist')?.addEventListener('input', function() {
    const search = this.value;
    const category = document.getElementById('categoryFilter').value;
    const status = document.getElementById('statusFilter').value;
    loadPosts(category, status, search);
});

// =============================================
// DELETE POST
// =============================================
async function deletePost(postId) {
    if (!confirm('Delete this post? This cannot be undone.')) return;

    try {
        await db.collection('posts').doc(postId).delete();
        alert('Post deleted successfully!');
        allPosts = [];
        loadPosts();
        loadOverview();
    } catch (error) {
        console.error('Error deleting post:', error);
        alert('Error deleting post.');
    }
}

// =============================================
// REPORTS PAGE
// =============================================
async function loadReports() {
    const tbody = document.getElementById('reportsTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';

    try {
        const snapshot = await db.collection('reports').orderBy('createdAt', 'desc').get();

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No reports found</td></tr>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const report = doc.data();
            const date = report.createdAt ? report.createdAt.toDate().toLocaleDateString() : 'N/A';

            html += `
                <tr>
                    <td>${doc.id.substring(0, 8)}...</td>
                    <td>${report.postId ? report.postId.substring(0, 8) + '...' : 'N/A'}</td>
                    <td>${report.reporterId ? report.reporterId.substring(0, 8) + '...' : 'N/A'}</td>
                    <td>${report.reason || 'No reason'}</td>
                    <td><span class="status-badge status-${report.status}">${report.status}</span></td>
                    <td>${date}</td>
                    <td>
                        ${report.status === 'pending' ? `
                            <button class="btn-action btn-approve" onclick="approveReport('${doc.id}', '${report.postId}')">Approve</button>
                            <button class="btn-action btn-reject" onclick="rejectReport('${doc.id}')">Reject</button>
                        ` : '<span class="text-muted">Reviewed</span>'}
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    } catch (error) {
        console.error('Error loading reports:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading reports</td></tr>';
    }
}

// =============================================
// APPROVE REPORT
// =============================================
async function approveReport(reportId, postId) {
    if (!confirm('This will remove the reported post. Continue?')) return;

    try {
        await db.collection('posts').doc(postId).update({ status: 'removed' });
        await db.collection('reports').doc(reportId).update({ status: 'reviewed' });
        alert('Report approved. Post removed.');
        loadReports();
        loadOverview();
        allPosts = [];
    } catch (error) {
        console.error('Error approving report:', error);
        alert('Error approving report.');
    }
}

// =============================================
// REJECT REPORT
// =============================================
async function rejectReport(reportId) {
    if (!confirm('Mark report as reviewed without action?')) return;

    try {
        await db.collection('reports').doc(reportId).update({ status: 'reviewed' });
        alert('Report rejected.');
        loadReports();
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
        if (artistsSnap.empty) {
            topRatedTbody.innerHTML = '<tr><td colspan="3" class="text-center">No artists found</td></tr>';
        } else {
            let html = '';
            artistsSnap.forEach(doc => {
                const artist = doc.data();
                html += `
                    <tr>
                        <td>${artist.name || 'N/A'}</td>
                        <td>${artist.category || 'N/A'}</td>
                        <td>${artist.averageRating ? artist.averageRating.toFixed(1) : 'N/A'}</td>
                    </tr>
                `;
            });
            topRatedTbody.innerHTML = html;
        }

        // Recent Feedback
        const ratingsSnap = await db.collection('ratings').orderBy('createdAt', 'desc').limit(10).get();

        const recentFeedbackTbody = document.getElementById('recentFeedback');
        if (ratingsSnap.empty) {
            recentFeedbackTbody.innerHTML = '<tr><td colspan="4" class="text-center">No feedback found</td></tr>';
        } else {
            let html = '';
            for (const doc of ratingsSnap.docs) {
                const rating = doc.data();
                let artistName = 'Unknown';

                try {
                    const artistDoc = await db.collection('users').doc(rating.artistId).get();
                    if (artistDoc.exists) {
                        artistName = artistDoc.data().name || 'Unknown';
                    }
                } catch (e) {
                    console.error('Error fetching artist name:', e);
                }

                const date = rating.createdAt ? rating.createdAt.toDate().toLocaleDateString() : 'N/A';
                const feedback = rating.feedback && rating.feedback.length > 30 ? rating.feedback.substring(0, 30) + '...' : rating.feedback || 'No feedback';

                html += `
                    <tr>
                        <td>${artistName}</td>
                        <td>${rating.stars || 0} ⭐</td>
                        <td>${feedback}</td>
                        <td>${date}</td>
                    </tr>
                `;
            }
            recentFeedbackTbody.innerHTML = html;
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

        // Posts Today
        const postsSnap = await db.collection('posts').where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(today)).get();
        document.getElementById('postsToday').textContent = postsSnap.size;

        // Users Today
        const usersSnap = await db.collection('users').where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(today)).get();
        document.getElementById('usersToday').textContent = usersSnap.size;

        // Reports Today
        const reportsSnap = await db.collection('reports').where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(today)).get();
        document.getElementById('reportsToday').textContent = reportsSnap.size;

        // Load charts
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
        const postsSnap = await db.collection('posts').get();

        const categoryData = {};
        postsSnap.forEach(doc => {
            const category = doc.data().category || 'Unknown';
            categoryData[category] = (categoryData[category] || 0) + 1;
        });

        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);

        const ctx = document.getElementById('categoryPieChart');
        if (ctx) {
            if (categoryPieChart) categoryPieChart.destroy();
            categoryPieChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
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
        const last7Days = [];
        const reportCounts = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const snapshot = await db.collection('reports')
                .where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(date))
                .where('createdAt', '<', firebase.firestore.Timestamp.fromDate(nextDate))
                .get();

            last7Days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            reportCounts.push(snapshot.size);
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

// Make functions global for onclick
window.deleteUser = deleteUser;
window.deletePost = deletePost;
window.approveReport = approveReport;
window.rejectReport = rejectReport;
