// =============================================
// USER AVATAR — matches the mobile UserAvatar widget and the dashboard
// overview avatars. With a profile picture → cached image cropped to a
// circle. Without → first initial of the name in primary slate-blue on a
// 12%-alpha slate-blue tinted circle.
// =============================================
function buildUserAvatar(user, size) {
    const s = size || 40;
    const url = user && user.profileImageUrl ? String(user.profileImageUrl) : '';
    if (url) {
        const img = document.createElement('img');
        img.className = 'user-avatar';
        img.alt = (user && user.name) || '';
        img.src = url;
        img.style.width = s + 'px';
        img.style.height = s + 'px';
        return img;
    }
    const div = document.createElement('div');
    div.className = 'user-avatar user-avatar-initial';
    div.style.width = s + 'px';
    div.style.height = s + 'px';
    div.style.fontSize = Math.round(s * 0.42) + 'px';
    const name = (user && user.name) ? String(user.name).trim() : '';
    div.textContent = name ? name.charAt(0).toUpperCase() : '?';
    return div;
}

// =============================================
// TOAST NOTIFICATION SYSTEM
// =============================================
function showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast-notification toast-' + type;

    const icons = {
        success: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></svg>',
        error: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/></svg>',
        warning: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>',
        info: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.399l-.334-.027.09-.418H8.93zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>'
    };

    toast.innerHTML =
        '<div class="toast-icon">' + (icons[type] || icons.info) + '</div>' +
        '<div class="toast-message">' + message + '</div>' +
        '<button class="toast-close" onclick="this.parentElement.classList.add(\'toast-exit\')">&times;</button>' +
        '<div class="toast-progress"><div class="toast-progress-bar" style="animation-duration:' + duration + 'ms"></div></div>';

    container.appendChild(toast);

    // Auto-remove after duration
    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

// =============================================
// CUSTOM CONFIRMATION MODAL
// =============================================
function showConfirm(title, message, onConfirm, options = {}) {
    const { confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning', modalClass = '' } = options;

    // Remove existing modal
    document.querySelector('.confirm-modal-overlay')?.remove();

    const icons = {
        warning: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="#C4A265" viewBox="0 0 16 16"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>',
        danger: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="#dc3545" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/></svg>',
        info: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="#2E86AB" viewBox="0 0 16 16"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.399l-.334-.027.09-.418H8.93zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>'
    };

    const overlay = document.createElement('div');
    overlay.className = 'confirm-modal-overlay';
    overlay.innerHTML =
        '<div class="confirm-modal' + (modalClass ? ' ' + modalClass : '') + '">' +
            '<div class="confirm-modal-icon">' + (icons[type] || icons.warning) + '</div>' +
            '<h3 class="confirm-modal-title">' + title + '</h3>' +
            '<p class="confirm-modal-message">' + message + '</p>' +
            '<div class="confirm-modal-actions">' +
                '<button class="confirm-modal-btn confirm-modal-cancel">' + cancelText + '</button>' +
                '<button class="confirm-modal-btn confirm-modal-confirm">' + confirmText + '</button>' +
            '</div>' +
        '</div>';

    document.body.appendChild(overlay);

    // Trigger animation on next frame
    requestAnimationFrame(() => overlay.classList.add('active'));

    // Focus trap
    const confirmBtn = overlay.querySelector('.confirm-modal-confirm');
    const cancelBtn = overlay.querySelector('.confirm-modal-cancel');
    confirmBtn.focus();

    cancelBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    confirmBtn.addEventListener('click', () => {
        overlay.remove();
        onConfirm();
    });
}

// =============================================
// DETAIL MODAL (for orders, payments, etc.)
// =============================================
function showDetailModal(title, items, listItems) {
    // Only remove sibling detail modals — leave the User Profile (User 360°)
    // alone so that opening + closing an inner Order/Post modal returns to
    // the user profile instead of dumping the admin back on the users page.
    document.querySelector('.detail-modal-overlay:not(#user360-overlay)')?.remove();

    let bodyHtml = '';
    items.forEach(item => {
        bodyHtml += '<div class="detail-item"><span class="detail-label">' + item.label + '</span><span class="detail-value">' + item.value + '</span></div>';
    });

    if (listItems && listItems.length > 0) {
        bodyHtml += '<div class="detail-items-list"><div class="detail-label" style="margin-bottom:8px">Items</div>';
        listItems.forEach(li => {
            bodyHtml += '<div class="detail-list-item">' + li + '</div>';
        });
        bodyHtml += '</div>';
    }

    const overlay = document.createElement('div');
    overlay.className = 'detail-modal-overlay';
    overlay.innerHTML =
        '<div class="detail-modal">' +
            '<div class="detail-modal-header">' +
                '<h3>' + title + '</h3>' +
                '<button class="detail-modal-close">&times;</button>' +
            '</div>' +
            '<div class="detail-modal-body">' + bodyHtml + '</div>' +
        '</div>';

    document.body.appendChild(overlay);

    // Trigger animation on next frame
    requestAnimationFrame(() => overlay.classList.add('active'));

    const onEsc = (e) => { if (e.key === 'Escape') close(); };
    const close = () => {
        document.removeEventListener('keydown', onEsc);
        overlay.remove();
    };
    document.addEventListener('keydown', onEsc);
    overlay.querySelector('.detail-modal-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

// =============================================
// POST DETAIL POPUP
// =============================================
function showPostDetail(postId, postData) {
    // If we already have the data, show it; otherwise fetch it
    if (postData) {
        renderPostPopup(postId, postData);
    } else {
        db.collection('posts').doc(postId).get().then(doc => {
            if (!doc.exists) { showToast('Post not found.', 'error'); return; }
            renderPostPopup(doc.id, doc.data());
        }).catch(err => {
            console.error('Error fetching post:', err);
            showToast('Error loading post details.', 'error');
        });
    }
}

function renderPostPopup(postId, post) {
    // Only remove sibling detail modals — leave the User Profile (User 360°)
    // alone so that opening + closing an inner Order/Post modal returns to
    // the user profile instead of dumping the admin back on the users page.
    document.querySelector('.detail-modal-overlay:not(#user360-overlay)')?.remove();

    const statusClass = 'status-' + (post.status || 'active');
    const date = post.createdAt ? post.createdAt.toDate().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    }) : 'N/A';
    const time = post.createdAt ? post.createdAt.toDate().toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit'
    }) : '';

    const isReel = post.mediaType === 'reel';
    const previewMedia = isReel
        ? (
            // Inline HTML5 video for reels — admin gets a real playable preview.
            '<video src="' + (post.videoUrl || post.imageUrl || '') + '" ' +
            'poster="' + (post.thumbnailUrl || '') + '" ' +
            'controls preload="metadata" ' +
            'style="width:100%;max-height:420px;background:#000;border-radius:8px;object-fit:contain;"></video>'
        )
        : (
            '<img src="' + (post.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image') + '" alt="Post Image" class="post-detail-image"/>'
        );

    const overlay = document.createElement('div');
    overlay.className = 'detail-modal-overlay';
    overlay.innerHTML =
        '<div class="detail-modal post-detail-modal">' +
            '<div class="detail-modal-header">' +
                '<h3>' + (isReel ? 'Reel Details' : 'Post Details') + '</h3>' +
                '<button class="detail-modal-close">&times;</button>' +
            '</div>' +
            '<div class="detail-modal-body">' +
                '<div class="post-detail-image-wrap">' +
                    previewMedia +
                '</div>' +
                '<div class="post-detail-info">' +
                    '<div class="post-detail-row">' +
                        '<span class="post-detail-label">Artist</span>' +
                        '<span class="post-detail-value">' + (post.artistName || 'Unknown') + '</span>' +
                    '</div>' +
                    '<div class="post-detail-row">' +
                        '<span class="post-detail-label">Category</span>' +
                        '<span class="post-detail-value">' + (post.category || 'N/A') + '</span>' +
                    '</div>' +
                    '<div class="post-detail-row">' +
                        '<span class="post-detail-label">Price</span>' +
                        '<span class="post-detail-value post-detail-price">$' + (post.price || 0).toFixed(2) + '</span>' +
                    '</div>' +
                    '<div class="post-detail-row">' +
                        '<span class="post-detail-label">Status</span>' +
                        '<span class="status-badge ' + statusClass + '">' + (post.status || 'active') + '</span>' +
                    '</div>' +
                    '<div class="post-detail-row">' +
                        '<span class="post-detail-label">Posted</span>' +
                        '<span class="post-detail-value">' + date + (time ? ' at ' + time : '') + '</span>' +
                    '</div>' +
                    '<div class="post-detail-row">' +
                        '<span class="post-detail-label">Post ID</span>' +
                        '<span class="post-detail-value" style="font-size:0.8rem;color:var(--text-light)">' + postId + '</span>' +
                    '</div>' +
                '</div>' +
                '<div class="post-detail-desc">' +
                    '<span class="post-detail-label">Description</span>' +
                    '<p class="post-detail-desc-text">' + (post.description || 'No description provided.') + '</p>' +
                '</div>' +
            '</div>' +
        '</div>';

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
}

// =============================================
// REPORT DETAIL POPUP
// =============================================
function showReportDetail(reportId, report, postData, reporterData) {
    // Only remove sibling detail modals — leave the User Profile (User 360°)
    // alone so that opening + closing an inner Order/Post modal returns to
    // the user profile instead of dumping the admin back on the users page.
    document.querySelector('.detail-modal-overlay:not(#user360-overlay)')?.remove();

    const statusClass = 'status-' + (report.status || 'pending');
    const date = report.createdAt ? report.createdAt.toDate().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    }) : 'N/A';
    const time = report.createdAt ? report.createdAt.toDate().toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit'
    }) : '';

    const reporterName = reporterData ? (reporterData.name || 'Unknown') : 'Unknown';
    const reporterEmail = reporterData ? (reporterData.email || '') : '';

    // Build post preview section
    let postPreviewHtml = '';
    if (postData) {
        postPreviewHtml =
            '<div class="report-post-preview">' +
                '<div class="report-post-preview-header">Reported Post</div>' +
                '<div class="report-post-preview-content">' +
                    '<img src="' + (postData.imageUrl || 'https://via.placeholder.com/80') + '" alt="Post" class="report-post-preview-img" onclick="showPostDetail(\'' + report.postId + '\', null)"/>' +
                    '<div class="report-post-preview-info">' +
                        '<div class="report-post-preview-artist">' + (postData.artistName || 'Unknown') + '</div>' +
                        '<div class="report-post-preview-cat">' + (postData.category || 'N/A') + ' &middot; $' + (postData.price || 0).toFixed(2) + '</div>' +
                        '<div class="report-post-preview-desc">' + (postData.description ? (postData.description.length > 80 ? postData.description.substring(0, 80) + '...' : postData.description) : 'No description') + '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
    } else {
        postPreviewHtml = '<div class="report-post-preview"><div class="report-post-preview-header">Reported Post</div><p style="color:var(--text-light);font-size:0.85rem;margin:0.5rem 0 0">Post not found or deleted.</p></div>';
    }

    const overlay = document.createElement('div');
    overlay.className = 'detail-modal-overlay';
    overlay.innerHTML =
        '<div class="detail-modal report-detail-modal">' +
            '<div class="detail-modal-header">' +
                '<h3>Report Details</h3>' +
                '<button class="detail-modal-close">&times;</button>' +
            '</div>' +
            '<div class="detail-modal-body">' +
                '<div class="post-detail-info">' +
                    '<div class="post-detail-row">' +
                        '<span class="post-detail-label">Report ID</span>' +
                        '<span class="post-detail-value" style="font-size:0.8rem;color:var(--text-light)">' + reportId + '</span>' +
                    '</div>' +
                    '<div class="post-detail-row">' +
                        '<span class="post-detail-label">Reporter</span>' +
                        '<span class="post-detail-value">' + reporterName + (reporterEmail ? ' <span style="color:var(--text-light);font-weight:400">(' + reporterEmail + ')</span>' : '') + '</span>' +
                    '</div>' +
                    '<div class="post-detail-row">' +
                        '<span class="post-detail-label">Status</span>' +
                        '<span class="status-badge ' + statusClass + '">' + (report.status || 'pending') + '</span>' +
                    '</div>' +
                    '<div class="post-detail-row">' +
                        '<span class="post-detail-label">Reported On</span>' +
                        '<span class="post-detail-value">' + date + (time ? ' at ' + time : '') + '</span>' +
                    '</div>' +
                '</div>' +
                '<div class="post-detail-desc" style="margin-bottom:1.25rem">' +
                    '<span class="post-detail-label">Reason</span>' +
                    '<p class="post-detail-desc-text">' + (report.reason || 'No reason provided.') + '</p>' +
                '</div>' +
                postPreviewHtml +
            '</div>' +
        '</div>';

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
}

// =============================================
// ANIMATED KPI COUNTER
// =============================================
function animateCounter(elementId, targetValue, prefix = '', suffix = '', duration = 800) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const isFloat = prefix === '$' || String(targetValue).includes('.');
    const decimals = prefix === '$' ? 2 : (String(targetValue).includes('.') ? 1 : 0);
    const start = 0;
    const startTime = performance.now();

    el.classList.add('counter-updating');

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = start + (targetValue - start) * eased;

        el.textContent = prefix + (isFloat ? current.toFixed(decimals) : Math.round(current)) + suffix;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            el.textContent = prefix + (isFloat ? targetValue.toFixed(decimals) : targetValue) + suffix;
            el.classList.remove('counter-updating');
        }
    }

    requestAnimationFrame(update);
}

// =============================================
// SKELETON LOADING ROWS
// =============================================
function createSkeletonRows(count, cols) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
        const tr = document.createElement('tr');
        tr.className = 'skeleton-row';
        for (let j = 0; j < cols; j++) {
            const td = document.createElement('td');
            const div = document.createElement('div');
            div.className = 'skeleton skeleton-cell';
            td.appendChild(div);
            tr.appendChild(td);
        }
        fragment.appendChild(tr);
    }
    return fragment;
}

// =============================================
// EXCEL EXPORT
// =============================================
// Exports whichever tab is currently active on the Users page so the
// button works for both Customers and All Users without the reviewer
// having to switch tabs and click a different button.
function exportActiveUsersTab() {
    const allUsersPane = document.getElementById('allUsersTab');
    const onAllUsers = allUsersPane && allUsersPane.classList.contains('active');
    if (onAllUsers) {
        exportTableToCSV('allUsersTab', 'all-users');
    } else {
        exportTableToCSV('customersTab', 'customers');
    }
}

// Same idea on the Payments & Payouts page — pick the visible tab's
// table so the button is a one-click action no matter which list the
// admin is currently browsing.
function exportActivePaymentsTab() {
    const wallets = document.getElementById('artistWalletsTab');
    const revenue = document.getElementById('revenueChartTab');
    if (wallets && wallets.classList.contains('active')) {
        exportTableToCSV('artistWalletsTab', 'artist-wallets');
    } else if (revenue && revenue.classList.contains('active')) {
        exportTableToCSV('revenueChartTab', 'revenue');
    } else {
        exportTableToCSV('paymentsTab', 'payments');
    }
}

function exportTableToCSV(tableId, filename) {
    const container = document.getElementById(tableId);
    if (!container) { showToast('Table not found.', 'error'); return; }

    // Find the table inside the container (or use it directly if it's a table)
    const table = container.tagName === 'TABLE' ? container : container.querySelector('table');
    if (!table) { showToast('No table found to export.', 'error'); return; }

    // Build data array from table rows
    const data = [];
    const rows = table.querySelectorAll('tr');

    rows.forEach(row => {
        // Skip skeleton loading rows
        if (row.classList.contains('skeleton-row')) return;

        const cols = row.querySelectorAll('th, td');
        const rowData = [];
        cols.forEach(col => {
            // Skip action columns
            if (col.querySelector('.btn-action') || col.querySelector('.btn-export')) return;
            // Skip image-only columns (avatar/thumbnail with no text)
            const text = col.textContent.trim();
            if (!text && col.querySelector('img')) { rowData.push(''); return; }
            rowData.push(text);
        });
        if (rowData.length > 0) data.push(rowData);
    });

    if (data.length <= 1) { showToast('No data to export.', 'warning'); return; }

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Auto-size columns
    const colWidths = data[0].map((_, colIdx) => {
        let maxLen = 10;
        data.forEach(row => {
            if (row[colIdx] && row[colIdx].length > maxLen) maxLen = row[colIdx].length;
        });
        return { wch: Math.min(maxLen + 2, 40) };
    });
    ws['!cols'] = colWidths;

    // Style header row bold
    const headerRange = XLSX.utils.decode_range(ws['!ref']);
    for (let c = headerRange.s.c; c <= headerRange.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c: c });
        if (ws[addr]) {
            ws[addr].s = { font: { bold: true } };
        }
    }

    const sheetName = filename.charAt(0).toUpperCase() + filename.slice(1);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Download
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, filename + '_' + dateStr + '.xlsx');
    showToast('Exported ' + filename + '.xlsx successfully!', 'success');
}

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
    basic: { name: 'Basic', amount: 3.99, postLimit: 25 },
    premium: { name: 'Premium', amount: 9.99, postLimit: -1 }
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
    minWithdrawal: 5,         // $5 minimum withdrawal
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
            showToast('Access denied. You are not authorized.', 'error');
            setTimeout(() => { window.location.href = 'admin-login.html'; }, 1500);
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
            case 'deadlines':
                loadDeadlines();
                break;
            case 'broadcast':
                // No data fetch — just renders the form. Listeners wired below.
                break;
            case 'paymentsPayouts':
                resetPagination('payments');
                loadPaymentStats();
                loadPayments('first');
                loadArtistWallets();
                // Payouts tab + dropdown removed: artists no longer request
                // withdrawals — earnings auto-route to their linked payout card.
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
        showToast('Error logging out.', 'error');
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
// Time the admin panel was opened — used to distinguish "new" reports
// that arrived during this session from reports already in the queue.
const _panelOpenedAt = Date.now();
// Base browser tab title — preserved so we can restore it when the
// pending-reports count drops back to 0.
const _baseTitle = document.title || 'Artisans Market · Admin';
let _firstSnapshot = true;

function setupRealtimeListeners() {
    // Clean up previous listener if exists
    if (reportsUnsubscribe) {
        reportsUnsubscribe();
    }
    reportsUnsubscribe = db.collection('reports').where('status', '==', 'pending')
        .onSnapshot((snapshot) => {
            updateReportsBadge(snapshot.size);

            // Fire a live toast for any report that ARRIVED while the admin
            // is on the panel (skipping the initial snapshot, which is the
            // backlog the admin already knew about).
            if (!_firstSnapshot) {
                snapshot.docChanges().forEach((change) => {
                    if (change.type !== 'added') return;
                    const data = change.doc.data() || {};
                    const ts = data.createdAt;
                    const createdMs = ts && typeof ts.toMillis === 'function'
                        ? ts.toMillis()
                        : 0;
                    // Only toast for reports created after the panel opened.
                    if (createdMs < _panelOpenedAt) return;
                    const reason = (data.reason || 'No reason given').toString();
                    const preview = reason.length > 80
                        ? reason.substring(0, 80) + '...'
                        : reason;
                    showToast('New report: ' + preview, 'info');
                });
            }
            _firstSnapshot = false;
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

    // Mirror the count in the browser tab title so the admin notices
    // activity even when this tab isn't focused. Restores the original
    // title when there are no pending reports.
    document.title = count > 0
        ? '(' + count + ') ' + _baseTitle
        : _baseTitle;
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

        animateCounter('totalUsers', usersSnap.size);
        animateCounter('totalArtists', artistsSnap.size);
        animateCounter('totalPosts', postsSnap.size);
        animateCounter('activePosts', activePostsSnap.size);
        animateCounter('pendingReports', pendingReportsSnap.size);
        animateCounter('avgRating', parseFloat(avgRating));

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
                        borderColor: '#6F8FA3',
                        backgroundColor: 'rgba(111, 143, 163, 0.12)',
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
                        backgroundColor: ['#6F8FA3', '#C96A3D', '#E3A93C', '#7A9A7A', '#A44A3F', '#C98A5B']
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
    tbody.appendChild(createSkeletonRows(5, 7));

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
            tdAvatar.appendChild(buildUserAvatar(user, 40));
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
            const pushBtn = createEl('button', { className: 'btn-action btn-view' }, 'Push');
            pushBtn.addEventListener('click', () =>
                window.sendPushPrompt(doc.id, user.name || 'Unknown'));
            tdActions.appendChild(pushBtn);
            const deleteBtn = createEl('button', { className: 'btn-action btn-delete' }, 'Delete');
            deleteBtn.addEventListener('click', () => deleteUser(doc.id, user.name || 'Unknown'));
            tdActions.appendChild(deleteBtn);
            tr.appendChild(tdActions);
            // Click anywhere on the row (except buttons) to open the 360° detail.
            tr.style.cursor = 'pointer';
            tr.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                if (typeof window.showUserDetail === 'function') {
                    window.showUserDetail(doc.id);
                }
            });

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
    tbody.appendChild(createSkeletonRows(5, 7));

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
            tdAvatar.appendChild(buildUserAvatar(user, 40));
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
            const pushBtn = createEl('button', { className: 'btn-action btn-view' }, 'Push');
            pushBtn.addEventListener('click', () =>
                window.sendPushPrompt(doc.id, user.name || 'Unknown'));
            tdActions.appendChild(pushBtn);
            const deleteBtn = createEl('button', { className: 'btn-action btn-delete' }, 'Delete');
            deleteBtn.addEventListener('click', () => deleteUser(doc.id, user.name || 'Unknown'));
            tdActions.appendChild(deleteBtn);
            tr.appendChild(tdActions);
            tr.style.cursor = 'pointer';
            tr.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                if (typeof window.showUserDetail === 'function') {
                    window.showUserDetail(doc.id);
                }
            });

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
    tbody.appendChild(createSkeletonRows(5, 7));

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
            tdAvatar.appendChild(buildUserAvatar(artist, 40));
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
            const pushBtn = createEl('button', { className: 'btn-action btn-view' }, 'Push');
            pushBtn.addEventListener('click', () =>
                window.sendPushPrompt(doc.id, artist.name || 'Unknown'));
            tdActions.appendChild(pushBtn);
            const deleteBtn = createEl('button', { className: 'btn-action btn-delete' }, 'Delete');
            deleteBtn.addEventListener('click', () => deleteUser(doc.id, artist.name || 'Unknown'));
            tdActions.appendChild(deleteBtn);
            tr.appendChild(tdActions);
            tr.style.cursor = 'pointer';
            tr.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                if (typeof window.showUserDetail === 'function') {
                    window.showUserDetail(doc.id);
                }
            });

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
function suspendUser(userId, userName) {
    showConfirm('Suspend User', 'Suspend user "' + userName + '"?', async () => {
        try {
            await db.collection('users').doc(userId).update({ status: 'suspended' });
            await logAuditAction('suspend_user', userId, 'user', { name: userName });
            showToast('User "' + userName + '" suspended.', 'warning');
            reloadVisibleUserTables();
        } catch (error) {
            console.error('Error suspending user:', error);
            showToast('Error suspending user.', 'error');
        }
    }, { confirmText: 'Suspend', type: 'warning', modalClass: 'confirm-modal-suspend' });
}

function activateUser(userId, userName) {
    showConfirm('Activate User', 'Activate user "' + userName + '"?', async () => {
        try {
            await db.collection('users').doc(userId).update({ status: 'active' });
            await logAuditAction('activate_user', userId, 'user', { name: userName });
            showToast('User "' + userName + '" activated.', 'success');
            reloadVisibleUserTables();
        } catch (error) {
            console.error('Error activating user:', error);
            showToast('Error activating user.', 'error');
        }
    }, { confirmText: 'Activate', type: 'info' });
}

// =============================================
// DELETE USER
// =============================================
function deleteUser(userId, userName) {
    showConfirm('Delete User', 'Delete user "' + userName + '"? This cannot be undone.', async () => {
        try {
            await db.collection('users').doc(userId).delete();
            await logAuditAction('delete_user', userId, 'user', { name: userName });
            showToast('User "' + userName + '" deleted.', 'success');
            reloadVisibleUserTables();
            loadOverview();
        } catch (error) {
            console.error('Error deleting user:', error);
            showToast('Error deleting user.', 'error');
        }
    }, { confirmText: 'Delete', type: 'danger', modalClass: 'confirm-modal-delete' });
}

// =============================================
// POSTS TABLE (with pagination + filters)
// =============================================
async function loadPosts(direction) {
    if (!direction) direction = 'first';
    const state = paginationState.posts;
    const tbody = document.getElementById('postsTableBody');
    tbody.innerHTML = '';
    tbody.appendChild(createSkeletonRows(5, 8));

    try {
        const categoryFilter = document.getElementById('categoryFilter') ? document.getElementById('categoryFilter').value : '';
        const statusFilter = document.getElementById('statusFilter') ? document.getElementById('statusFilter').value : '';
        const mediaTypeFilter = document.getElementById('mediaTypeFilter') ? document.getElementById('mediaTypeFilter').value : '';
        const searchQuery = document.getElementById('searchArtist') ? document.getElementById('searchArtist').value.toLowerCase() : '';
        const fetchLimit = searchQuery ? PAGE_SIZE * 5 : PAGE_SIZE + 1;

        function buildPostQuery() {
            let q = db.collection('posts');
            if (categoryFilter) q = q.where('category', '==', categoryFilter);
            if (statusFilter) q = q.where('status', '==', statusFilter);
            if (mediaTypeFilter) q = q.where('mediaType', '==', mediaTypeFilter);
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
        if (typeof window.filterByDate === 'function') docs = window.filterByDate(docs, 'posts');

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
            tbody.appendChild(createEmptyRow(8, 'No posts found'));
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
            tr.style.cursor = 'pointer';

            // ── Media cell — for reels use the thumbnail + play overlay,
            //    for posts use the image. Both fall back gracefully.
            const isReel = post.mediaType === 'reel';
            const tdImg = document.createElement('td');
            const wrap = createEl('div', {
                style:
                    'position:relative;width:60px;height:60px;border-radius:6px;overflow:hidden;background:#f0f0f0;',
            });
            const previewSrc = isReel
                ? (post.thumbnailUrl || post.imageUrl || 'https://via.placeholder.com/60')
                : (post.imageUrl || 'https://via.placeholder.com/60');
            const img = createEl('img', {
                alt: isReel ? 'Reel' : 'Post',
                style: 'width:100%;height:100%;object-fit:cover;display:block;',
            });
            img.src = previewSrc;
            wrap.appendChild(img);
            if (isReel) {
                const playOverlay = createEl('div', {
                    style:
                        'position:absolute;inset:0;background:rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:white;font-size:22px;',
                }, '▶');
                wrap.appendChild(playOverlay);
                if (typeof post.videoDurationSec === 'number' && post.videoDurationSec > 0) {
                    const dur = createEl('span', {
                        style:
                            'position:absolute;right:4px;bottom:4px;background:rgba(0,0,0,0.7);color:white;font-size:9px;padding:1px 5px;border-radius:6px;',
                    }, post.videoDurationSec + 's');
                    wrap.appendChild(dur);
                }
            }
            tdImg.appendChild(wrap);
            tr.appendChild(tdImg);

            // ── Type pill (Post / Reel)
            const tdType = document.createElement('td');
            tdType.appendChild(createEl('span', {
                className: 'status-badge',
                style: isReel
                    ? 'background:rgba(139,92,246,0.15);color:#8B5CF6;'
                    : 'background:rgba(46,134,171,0.15);color:#2E86AB;',
            }, isReel ? 'Reel' : 'Post'));
            tr.appendChild(tdType);

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
            deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deletePost(doc.id); });
            tdActions.appendChild(deleteBtn);
            tr.appendChild(tdActions);

            // Click row to view post
            tr.addEventListener('click', () => showPostDetail(doc.id, post));

            tbody.appendChild(tr);
        });

        updatePaginationUI('posts', state.page, hasMore);
    } catch (error) {
        console.error('Error loading posts:', error);
        tbody.innerHTML = '';
        tbody.appendChild(createErrorRow(8, 'Error loading posts'));
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

document.getElementById('mediaTypeFilter')?.addEventListener('change', function () {
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
function deletePost(postId) {
    showConfirm('Delete Post', 'Delete this post? This cannot be undone.', async () => {
        try {
            await db.collection('posts').doc(postId).delete();
            await logAuditAction('delete_post', postId, 'post', {});
            showToast('Post deleted successfully!', 'success');
            resetPagination('posts');
            loadPosts('first');
            loadOverview();
        } catch (error) {
            console.error('Error deleting post:', error);
            showToast('Error deleting post.', 'error');
        }
    }, { confirmText: 'Delete', type: 'danger', modalClass: 'confirm-modal-delete' });
}

// =============================================
// REPORTS TABLE (with pagination + enhanced info + status filter)
// =============================================
async function loadReports(direction) {
    if (!direction) direction = 'first';
    const state = paginationState.reports;
    const tbody = document.getElementById('reportsTableBody');
    tbody.innerHTML = '';
    tbody.appendChild(createSkeletonRows(5, 6));

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

        let docs = snapshot.docs;
        if (typeof window.filterByDate === 'function') docs = window.filterByDate(docs, 'reports');
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
            tr.style.cursor = 'pointer';

            const postData = postMap[report.postId];
            const reporterData = reporterMap[report.reporterId];

            // Click row to view report detail
            tr.addEventListener('click', () => showReportDetail(doc.id, report, postData, reporterData));

            // Post thumbnail + info (clickable)
            const tdPost = document.createElement('td');
            if (postData) {
                const img = createEl('img', { className: 'post-thumbnail post-thumbnail-clickable', alt: 'Post' });
                img.src = postData.imageUrl || 'https://via.placeholder.com/60';
                img.style.cursor = 'pointer';
                img.addEventListener('click', (e) => { e.stopPropagation(); showPostDetail(report.postId, postData); });
                tdPost.appendChild(img);
            } else {
                tdPost.textContent = 'N/A';
            }
            tr.appendChild(tdPost);

            // Reporter name
            tr.appendChild(createEl('td', {}, reporterData ? reporterData.name || 'Unknown' : 'Unknown'));

            tr.appendChild(createEl('td', {}, report.reason || 'No reason'));

            const tdStatus = document.createElement('td');
            tdStatus.appendChild(createEl('span', { className: 'status-badge status-' + (report.status || 'pending') }, report.status || 'pending'));
            tr.appendChild(tdStatus);

            tr.appendChild(createEl('td', {}, report.createdAt ? report.createdAt.toDate().toLocaleDateString() : 'N/A'));

            const tdActions = document.createElement('td');
            if (report.status === 'pending') {
                const approveBtn = createEl('button', { className: 'btn-action btn-approve' }, 'Approve');
                approveBtn.addEventListener('click', (e) => { e.stopPropagation(); approveReport(doc.id, report.postId); });
                const rejectBtn = createEl('button', { className: 'btn-action btn-reject' }, 'Reject');
                rejectBtn.addEventListener('click', (e) => { e.stopPropagation(); rejectReport(doc.id); });
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
function approveReport(reportId, postId) {
    if (!postId) {
        showToast('Cannot approve: this report has no associated post.', 'error');
        return;
    }
    showConfirm('Approve Report', 'This will remove the reported post. Continue?', async () => {
        try {
            // Fetch the post to get artist info before updating
            const postDoc = await db.collection('posts').doc(postId).get();
            const postData = postDoc.exists ? postDoc.data() : null;

            await db.collection('posts').doc(postId).update({ status: 'removed' });
            await db.collection('reports').doc(reportId).update({ status: 'reviewed' });

            // Send notification to the artist
            if (postData && postData.artistId) {
                const postDesc = postData.description
                    ? (postData.description.length > 50 ? postData.description.substring(0, 50) + '...' : postData.description)
                    : 'your post';
                await db.collection('notifications').add({
                    userId: postData.artistId,
                    title: 'Post Removed',
                    message: 'Your post "' + postDesc + '" has been removed due to a report violation. If you believe this was a mistake, please contact support.',
                    type: 'post_removed',
                    referenceId: postId,
                    isRead: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            await logAuditAction('approve_report', reportId, 'report', { postId: postId });
            showToast('Report approved. Post removed. Artist notified.', 'success');
            resetPagination('reports');
            loadReports('first');
            loadOverview();
        } catch (error) {
            console.error('Error approving report:', error);
            showToast('Error approving report.', 'error');
        }
    }, { confirmText: 'Approve', type: 'danger', modalClass: 'confirm-modal-approve' });
}

function rejectReport(reportId) {
    showConfirm('Reject Report', 'Mark report as reviewed without action?', async () => {
        try {
            await db.collection('reports').doc(reportId).update({ status: 'reviewed' });
            await logAuditAction('reject_report', reportId, 'report', {});
            showToast('Report rejected.', 'info');
            resetPagination('reports');
            loadReports('first');
            loadOverview();
        } catch (error) {
            console.error('Error rejecting report:', error);
            showToast('Error rejecting report.', 'error');
        }
    }, { confirmText: 'Reject', type: 'warning', modalClass: 'confirm-modal-reject' });
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
                        backgroundColor: ['#6F8FA3', '#C96A3D', '#E3A93C', '#7A9A7A', '#A44A3F', '#C98A5B']
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
                        borderColor: '#F59E0B',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
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
    tbody.appendChild(createSkeletonRows(3, 4));

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
        showToast('Only super-admins can add new admins.', 'error');
        return;
    }

    const email = document.getElementById('newAdminEmail').value.trim();
    const password = document.getElementById('newAdminPassword').value;
    const role = 'admin';

    if (!email || !password || password.length < 6) {
        showToast('Please provide a valid email and password (min 6 characters).', 'warning');
        return;
    }

    const form = this;
    showConfirm('Add Admin', 'Add "' + email + '" as admin?', async () => {
        try {
            const userCredential = await secondaryAuth.createUserWithEmailAndPassword(email, password);
            const newUid = userCredential.user.uid;
            await secondaryAuth.signOut();

            await db.collection('admins').doc(newUid).set({
                uid: newUid,
                email: email,
                role: role,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            await logAuditAction('add_admin', newUid, 'admin', { email: email, role: role });

            showToast('Admin added successfully!', 'success');
            form.reset();
            loadAdmins();
        } catch (error) {
            console.error('Error adding admin:', error);
            if (error.code === 'auth/email-already-in-use') {
                showToast('This email is already in use.', 'error');
            } else {
                showToast('Error adding admin: ' + error.message, 'error');
            }
        }
    }, { confirmText: 'Add Admin', type: 'info', modalClass: 'confirm-modal-approve' });
});

// NOTE: This only removes the Firestore admin document. The Firebase Auth account
// remains (deleting auth users requires the Firebase Admin SDK / Cloud Functions).
// Access is still blocked since the login flow checks for the admin doc.
function deleteAdmin(adminId, adminEmail) {
    showConfirm('Remove Admin', 'Remove admin "' + adminEmail + '"? They will lose admin access.', async () => {
        try {
            await db.collection('admins').doc(adminId).delete();
            await logAuditAction('remove_admin', adminId, 'admin', { email: adminEmail });
            showToast('Admin removed successfully.', 'success');
            loadAdmins();
        } catch (error) {
            console.error('Error removing admin:', error);
            showToast('Error removing admin.', 'error');
        }
    }, { confirmText: 'Remove', type: 'danger', modalClass: 'confirm-modal-delete' });
}

// =============================================
// SEND ADMIN PASSWORD RESET EMAIL
// =============================================
function sendAdminPasswordReset(adminId, adminEmail) {
    showConfirm('Reset Password', 'Send a password reset email to "' + adminEmail + '"?', async () => {
        try {
            await auth.sendPasswordResetEmail(adminEmail);
            await logAuditAction('send_password_reset', adminId, 'admin', { email: adminEmail });
            showToast('Password reset email sent to ' + adminEmail + '.', 'success');
        } catch (error) {
            console.error('Error sending password reset:', error);
            if (error.code === 'auth/user-not-found') {
                showToast('No Firebase Auth account found for this email.', 'error');
            } else {
                showToast('Error sending reset email: ' + error.message, 'error');
            }
        }
    }, { confirmText: 'Send Reset', type: 'warning', modalClass: 'confirm-modal-reset' });
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

        animateCounter('totalSubscriptions', total);
        animateCounter('activeSubscriptions', active);
        animateCounter('expiredSubscriptions', expired);
        animateCounter('monthlyRevenue', revenue, '$');
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
    tbody.appendChild(createSkeletonRows(5, 7));

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
        if (typeof window.filterByDate === 'function') docs = window.filterByDate(docs, 'subscriptions');

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

                const changeBtn = createEl('button', { className: 'btn-action btn-suspend' }, 'Change');
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
        showToast('Invalid plan selected.', 'error');
        return;
    }

    try {
        // Fetch artist info
        const artistDoc = await db.collection('users').doc(artistId).get();
        if (!artistDoc.exists) {
            showToast('Artist not found.', 'error');
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

        showToast('Plan "' + plan.name + '" assigned to ' + artist.name + '!', 'success');
        resetPagination('subscriptions');
        loadSubscriptions('first');
        loadSubscriptionStats();
    } catch (error) {
        console.error('Error assigning plan:', error);
        showToast('Error assigning plan: ' + error.message, 'error');
    }
}

// =============================================
// SUBSCRIPTIONS - Change Plan
// =============================================
function changePlan(subId, newPlanKey, currentSub) {
    const plan = PLANS[newPlanKey];
    showConfirm('Change Plan', 'Change ' + (currentSub.artistName || 'this artist') + ' from ' +
        (PLANS[currentSub.plan] ? PLANS[currentSub.plan].name : currentSub.plan) + ' to ' + plan.name + '?', async () => {
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

            showToast('Plan changed to ' + plan.name + '!', 'success');
            resetPagination('subscriptions');
            loadSubscriptions('first');
            loadSubscriptionStats();
        } catch (error) {
            console.error('Error changing plan:', error);
            showToast('Error changing plan.', 'error');
        }
    }, { confirmText: 'Change Plan', type: 'warning', modalClass: 'confirm-modal-suspend' });
}

// =============================================
// SUBSCRIPTIONS - Cancel
// =============================================
function cancelSubscription(subId, artistName) {
    showConfirm('Cancel Subscription', 'Cancel subscription for "' + (artistName || 'this artist') + '"?', async () => {
        try {
            await db.collection('subscriptions').doc(subId).update({
                status: 'cancelled',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            await logAuditAction('cancel_subscription', subId, 'subscription', { artistName: artistName });

            showToast('Subscription cancelled.', 'warning');
            resetPagination('subscriptions');
            loadSubscriptions('first');
            loadSubscriptionStats();
        } catch (error) {
            console.error('Error cancelling subscription:', error);
            showToast('Error cancelling subscription.', 'error');
        }
    }, { confirmText: 'Cancel Subscription', type: 'danger', modalClass: 'confirm-modal-delete' });
}

// =============================================
// SUBSCRIPTIONS - Renew
// =============================================
function renewSubscription(subId, currentSub) {
    showConfirm('Renew Subscription', 'Renew subscription for "' + (currentSub.artistName || 'this artist') + '" for 30 days?', async () => {
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

            showToast('Subscription renewed!', 'success');
            resetPagination('subscriptions');
            loadSubscriptions('first');
            loadSubscriptionStats();
        } catch (error) {
            console.error('Error renewing subscription:', error);
            showToast('Error renewing subscription.', 'error');
        }
    }, { confirmText: 'Renew', type: 'info' });
}

// =============================================
// SUBSCRIPTIONS - Form & Filter Event Listeners
// =============================================
document.getElementById('assignPlanForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const artistId = document.getElementById('artistSelect').value;
    const planKey = document.getElementById('planSelect').value;

    if (!artistId) {
        showToast('Please select an artist.', 'warning');
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

        animateCounter('totalOrders', total);
        animateCounter('pendingOrders', pending);
        animateCounter('deliveredOrders', delivered);
        animateCounter('orderRevenue', revenue, '$');
    } catch (error) {
        console.error('Error loading order stats:', error);
    }
}

// =============================================
// ORDERS - Load Table (paginated + filtered)
// =============================================
function getOrderStatusClass(status) {
    const map = {
        // New lifecycle (mobile uses these by default)
        'pending':      'pending',   // amber — awaiting artist acceptance
        'in_progress':  'reported',  // orange — artist working on it
        'shipping':     'expired',   // blue — money released
        'delivered':    'reviewed',  // green — terminal
        // Legacy aliases — kept so historical orders still color correctly
        'paid':         'active',
        'processing':   'reported',
        'shipped':      'expired',
        // Cancellation paths
        'cancelled':    'cancelled',
        'refunded':     'removed',
    };
    return map[status] || 'pending';
}

/// Returns a user-facing label for an order status (handles legacy aliases).
function getOrderStatusLabel(status) {
    const map = {
        'pending':     'Pending',
        'in_progress': 'In Progress',
        'shipping':    'Shipping',
        'delivered':   'Delivered',
        'paid':        'Paid',
        'processing':  'Processing',
        'shipped':     'Shipped',
        'cancelled':   'Cancelled',
        'refunded':    'Refunded',
    };
    return map[status] || status || 'Unknown';
}

async function loadOrders(direction) {
    if (!direction) direction = 'first';
    const state = paginationState.orders;
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    tbody.appendChild(createSkeletonRows(5, 9));

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
        if (typeof window.filterByDate === 'function') docs = window.filterByDate(docs, 'orders');

        // Client-side filters
        if (methodFilter) {
            // Tolerate both keys — older payment docs only have `method`,
            // newer ones mirror under `paymentMethod`. Either match counts
            // so the filter works against old + new data uniformly.
            docs = docs.filter(doc => {
                const d = doc.data();
                return d.paymentMethod === methodFilter || d.method === methodFilter;
            });
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
            }, getOrderStatusLabel(order.status)));
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

            const viewBtn = createEl('button', { className: 'btn-action btn-view-paid' }, 'View');
            viewBtn.addEventListener('click', () => viewOrderDetails(doc.id));
            tdActions.appendChild(viewBtn);

            // Admin can override status while order is in flight.
            const inFlight = ['pending', 'in_progress', 'shipping',
                              'paid', 'processing', 'shipped'];
            if (inFlight.includes(order.status)) {
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
                    const cancelBtn = createEl('button', { className: 'btn-action btn-delete' }, 'Cancel order');
                    cancelBtn.addEventListener('click', () => refundOrder(doc.id, order));
                    tdActions.appendChild(cancelBtn);
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
        if (!doc.exists) { showToast('Order not found.', 'error'); return; }
        const order = doc.data();

        const fmt = ts => ts ? ts.toDate().toLocaleDateString() : '—';

        // Human-readable labels for the cancellation policy tiers — keeps
        // the modal honest with examiners ("free_window" alone reads like
        // unexplained jargon; the second line explains why the split
        // landed the way it did).
        const TIER_LABEL = {
            pre_accept:    'Pre-acceptance (full refund)',
            free_window:   'Free-cancel window (full refund)',
            over_extended: 'Artist over-extended (full refund)',
            post_ship:     'Already shipped (no refund)',
            early:         'Early in build (10% artist share)',
            mid_early:     'Mid-early build (25% artist share)',
            mid_late:      'Mid-late build (50% artist share)',
            late:          'Late in build (75% artist share)',
            unknown:       'Unknown state (50/50 fallback)',
        };

        const items = [
            { label: 'Order ID', value: orderId },
            { label: 'Customer', value: (order.customerName || 'N/A') + ' (' + (order.customerEmail || '') + ')' },
            { label: 'Artist', value: order.artistName || 'N/A' },
            { label: 'Subtotal', value: '$' + (order.subtotal || 0).toFixed(2) },
            { label: 'Total', value: '$' + (order.total || 0).toFixed(2) },
            { label: 'Status', value: getOrderStatusLabel(order.status) },
            { label: 'Payment Method', value: formatPaymentMethod(order.paymentMethod) },
            { label: 'Payout Status', value: order.payoutStatus || 'N/A' },
            { label: 'Date', value: order.createdAt ? order.createdAt.toDate().toLocaleString() : 'N/A' },
        ];

        // ── Deadline + acceptance (only if the artist has accepted)
        if (order.acceptedAt || order.estimatedCompletionDate) {
            items.push({ label: '— Deadline —', value: '' });
            if (order.acceptedAt) {
                items.push({ label: 'Accepted At', value: fmt(order.acceptedAt) });
            }
            if (order.estimatedCompletionDate) {
                items.push({ label: 'Estimated Completion', value: fmt(order.estimatedCompletionDate) });
            }
            if (order.originalCompletionDate &&
                order.originalCompletionDate.toMillis &&
                order.estimatedCompletionDate &&
                order.originalCompletionDate.toMillis() !== order.estimatedCompletionDate.toMillis()) {
                items.push({ label: 'Original Promise', value: fmt(order.originalCompletionDate) });
            }
            if (Array.isArray(order.extensions) && order.extensions.length > 0) {
                items.push({
                    label: 'Extensions Used',
                    value: order.extensions.length + ' (max 3 before customer cancels free)',
                });
            }
        }

        // ── Cancellation breakdown (only if cancelled)
        if (order.status === 'cancelled' || order.refundAmount || order.cancellationArtistShare) {
            items.push({ label: '— Cancellation —', value: '' });
            if (order.cancelledAt) {
                items.push({ label: 'Cancelled At', value: fmt(order.cancelledAt) });
            }
            items.push({ label: 'Refund to Customer', value: '$' + (order.refundAmount || 0).toFixed(2) });
            items.push({ label: 'Artist Compensation', value: '$' + (order.cancellationArtistShare || 0).toFixed(2) });
            if (order.cancellationTier) {
                items.push({
                    label: 'Penalty Tier',
                    value: TIER_LABEL[order.cancellationTier] || order.cancellationTier,
                });
            }
        }

        // ── Delivery address (snapshot taken at checkout)
        if (order.deliveryAddress && typeof order.deliveryAddress === 'object') {
            const da = order.deliveryAddress;
            items.push({ label: '— Delivery —', value: '' });
            const parts = [];
            if (da.street) parts.push(da.street);
            if (da.building) parts.push('Bldg ' + da.building);
            if (da.apartment) parts.push('Apt ' + da.apartment);
            const summary = parts.length > 0
                ? parts.join(', ')
                : (da.resolvedAddress || '—');
            items.push({ label: 'Address', value: summary });
            if (da.nickname) items.push({ label: 'Label', value: da.nickname });
            if (da.phone) items.push({ label: 'Phone', value: da.phone });
            if (da.instructions) items.push({ label: 'Instructions', value: da.instructions });
            if (typeof da.lat === 'number' && typeof da.lng === 'number') {
                const url = 'https://maps.google.com/?q=' + da.lat + ',' + da.lng;
                items.push({
                    label: 'Map',
                    value: '<a href="' + url + '" target="_blank" rel="noopener" style="color:#2E86AB;text-decoration:underline;">Open in Google Maps (' +
                        da.lat.toFixed(4) + ', ' + da.lng.toFixed(4) + ')</a>',
                    html: true,
                });
            }
        }

        // ── Per-side seen state — useful for support to know if user opened
        if (order.lastViewedByCustomer || order.lastViewedByArtist) {
            items.push({ label: '— Activity —', value: '' });
            items.push({
                label: 'Last Viewed by Customer',
                value: order.lastViewedByCustomer
                    ? order.lastViewedByCustomer.toDate().toLocaleString()
                    : 'Never',
            });
            items.push({
                label: 'Last Viewed by Artist',
                value: order.lastViewedByArtist
                    ? order.lastViewedByArtist.toDate().toLocaleString()
                    : 'Never',
            });
        }

        // ── Items list + extension reasons appended
        const listItems = (order.items || []).map(i =>
            i.title + ' x' + i.quantity + ' @ $' + i.price.toFixed(2)
        );
        if (Array.isArray(order.extensions) && order.extensions.length > 0) {
            listItems.push('— Extension reasons —');
            order.extensions.forEach((ext, idx) => {
                const prev = ext.previousDeadline ? ext.previousDeadline.toDate().toLocaleDateString() : '?';
                const next = ext.newDeadline ? ext.newDeadline.toDate().toLocaleDateString() : '?';
                const reason = (ext.reason || '').trim() || '(no reason given)';
                listItems.push(`#${idx + 1}: ${prev} → ${next} — ${reason}`);
            });
        }

        showDetailModal('Order Details', items, listItems);
    } catch (error) {
        console.error('Error viewing order:', error);
        showToast('Error loading order details.', 'error');
    }
}

// ─────────────────────────────────────────────────────────────────────
// God-mode order modal — lets admin override any status, set/extend the
// deadline on the artist's behalf, and ping both parties with a push.
// ─────────────────────────────────────────────────────────────────────
function updateOrderStatus(orderId, order) {
    // Only remove sibling detail modals — leave the User Profile (User 360°)
    // alone so that opening + closing an inner Order/Post modal returns to
    // the user profile instead of dumping the admin back on the users page.
    document.querySelector('.detail-modal-overlay:not(#user360-overlay)')?.remove();

    const allStatuses = [
        'pending', 'in_progress', 'shipping', 'delivered',
        'cancelled',
    ];
    const statusOptions = allStatuses.map(s => {
        const sel = s === order.status ? ' selected' : '';
        return '<option value="' + s + '"' + sel + '>' + getOrderStatusLabel(s) + '</option>';
    }).join('');

    const currentDeadline = order.estimatedCompletionDate &&
        order.estimatedCompletionDate.toDate
        ? order.estimatedCompletionDate.toDate().toISOString().split('T')[0]
        : '';

    const overlay = document.createElement('div');
    overlay.className = 'detail-modal-overlay';
    overlay.innerHTML =
        '<div class="detail-modal" style="max-width:520px;">' +
            '<div class="detail-modal-header">' +
                '<h3>Admin Actions — Order ' + orderId.substring(0, 8) + '</h3>' +
                '<button class="detail-modal-close">&times;</button>' +
            '</div>' +
            '<div class="detail-modal-body">' +
                '<div class="mb-3">' +
                    '<label class="form-label">Override Status</label>' +
                    '<select class="form-select" id="adminStatusPicker">' + statusOptions + '</select>' +
                    '<small class="text-muted">Current: ' + getOrderStatusLabel(order.status) + '</small>' +
                '</div>' +
                '<div class="mb-3">' +
                    '<label class="form-label">Set / Override Deadline (optional)</label>' +
                    '<input type="date" class="form-control" id="adminDeadlinePicker" value="' + currentDeadline + '"/>' +
                    '<small class="text-muted">Leave blank to keep current.</small>' +
                '</div>' +
                '<div class="mb-3">' +
                    '<label class="form-label">Reason (audit log)</label>' +
                    '<input type="text" class="form-control" id="adminActionReason" placeholder="e.g. customer disputed shipment"/>' +
                '</div>' +
                '<div class="form-check mb-2">' +
                    '<input class="form-check-input" type="checkbox" id="adminNotifyCustomer" checked/>' +
                    '<label class="form-check-label" for="adminNotifyCustomer">Notify customer (in-app + push)</label>' +
                '</div>' +
                '<div class="form-check mb-3">' +
                    '<input class="form-check-input" type="checkbox" id="adminNotifyArtist" checked/>' +
                    '<label class="form-check-label" for="adminNotifyArtist">Notify artist (in-app + push)</label>' +
                '</div>' +
                '<div class="d-flex gap-2 justify-content-end">' +
                    '<button id="adminActionsCancel" style="padding:8px 18px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;background:transparent;color:#1B998B;border:1.5px solid rgba(27,153,139,0.45);transition:background 0.2s,border-color 0.2s;" onmouseover="this.style.background=\'rgba(27,153,139,0.10)\';this.style.borderColor=\'rgba(27,153,139,0.65)\';" onmouseout="this.style.background=\'transparent\';this.style.borderColor=\'rgba(27,153,139,0.45)\';">Cancel</button>' +
                    '<button id="adminActionsSave" style="padding:8px 18px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;background:transparent;color:#1B998B;border:1.5px solid rgba(27,153,139,0.45);transition:background 0.2s,border-color 0.2s;" onmouseover="this.style.background=\'rgba(27,153,139,0.10)\';this.style.borderColor=\'rgba(27,153,139,0.65)\';" onmouseout="this.style.background=\'transparent\';this.style.borderColor=\'rgba(27,153,139,0.45)\';">Apply</button>' +
                '</div>' +
            '</div>' +
        '</div>';

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    overlay.querySelector('.detail-modal-close')
        .addEventListener('click', () => overlay.remove());
    overlay.querySelector('#adminActionsCancel')
        .addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#adminActionsSave').addEventListener('click', async () => {
        const btn = overlay.querySelector('#adminActionsSave');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        const newStatus = overlay.querySelector('#adminStatusPicker').value;
        const newDeadlineStr = overlay.querySelector('#adminDeadlinePicker').value;
        const reason = overlay.querySelector('#adminActionReason').value.trim();
        const notifyCustomer = overlay.querySelector('#adminNotifyCustomer').checked;
        const notifyArtist = overlay.querySelector('#adminNotifyArtist').checked;

        try {
            const updates = {
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            };
            if (newDeadlineStr) {
                const newDeadline = new Date(newDeadlineStr + 'T12:00:00');
                updates.estimatedCompletionDate =
                    firebase.firestore.Timestamp.fromDate(newDeadline);
                // If we're setting a deadline and the order had never been
                // accepted, also stamp the acceptance.
                if (!order.acceptedAt) {
                    updates.acceptedAt = firebase.firestore.FieldValue.serverTimestamp();
                    if (!order.originalCompletionDate) {
                        updates.originalCompletionDate = updates.estimatedCompletionDate;
                    }
                }
            }
            await db.collection('orders').doc(orderId).update(updates);
            await logAuditAction('admin_order_override', orderId, 'order', {
                oldStatus: order.status,
                newStatus: newStatus,
                newDeadline: newDeadlineStr || null,
                reason: reason || null,
            });

            // Send notifications + push to each party as configured.
            const statusLabel = getOrderStatusLabel(newStatus);
            const shortId = orderId.substring(0, 8).toUpperCase();
            const sendNotif = async (uid, title, body) => {
                if (!uid) return;
                await db.collection('notifications').add({
                    userId: uid,
                    title: title,
                    message: body,
                    type: 'order_status',
                    referenceId: orderId,
                    isRead: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
                if (typeof sendPushToUser === 'function') {
                    try { await sendPushToUser(uid, title, body, orderId); } catch (_) {}
                }
            };
            if (notifyCustomer) {
                await sendNotif(
                    order.customerId,
                    'Order update',
                    'Your order #' + shortId + ' is now: ' + statusLabel +
                    (reason ? ' (' + reason + ')' : '')
                );
            }
            if (notifyArtist) {
                await sendNotif(
                    order.artistId,
                    'Admin updated order',
                    'Order #' + shortId + ' status was set to ' + statusLabel +
                    (reason ? ' (' + reason + ')' : '')
                );
            }

            showToast('Order updated.', 'success');
            overlay.remove();
            resetPagination('orders');
            loadOrders('first');
            loadOrderStats();
            if (typeof loadDeadlines === 'function') loadDeadlines();
        } catch (e) {
            console.error('Admin override error', e);
            showToast('Failed to update order.', 'error');
            btn.disabled = false;
            btn.textContent = 'Apply';
        }
    });
}

// Mirrors lib/services/order_policy.dart in the mobile app so admin and
// mobile cancellations produce the same refund / artist-share split. Keep
// the two implementations in sync — if you change one, change the other.
const ORDER_POLICY = {
    maxExtensions: 3,
    maxExtensionDaysTotal: 14,
    freeCancelWindowHours: 24,
};
function computeAdminCancellation(order) {
    const total = order.total || order.totalAmount || 0;
    const tsToDate = (ts) => (ts && typeof ts.toDate === 'function' ? ts.toDate() : null);
    const now = new Date();

    // 1. Pre-accept → full refund.
    if (order.status === 'pending') {
        return { refund: total, artistShare: 0, tier: 'pre_accept' };
    }
    // 2. Free-cancel window after creation → full refund.
    const created = tsToDate(order.createdAt);
    if (created) {
        const hours = (now - created) / 3600000;
        if (hours <= ORDER_POLICY.freeCancelWindowHours) {
            return { refund: total, artistShare: 0, tier: 'free_window' };
        }
    }
    // 3. Artist over-extended → no-penalty cancel right.
    const extCount = Array.isArray(order.extensions) ? order.extensions.length : 0;
    const extDays = (order.extensions || []).reduce((acc, e) => {
        const prev = tsToDate(e.previousDeadline);
        const next = tsToDate(e.newDeadline);
        if (!prev || !next) return acc;
        return acc + Math.max(0, Math.round((next - prev) / 86400000));
    }, 0);
    if (extCount >= ORDER_POLICY.maxExtensions || extDays > ORDER_POLICY.maxExtensionDaysTotal) {
        return { refund: total, artistShare: 0, tier: 'over_extended' };
    }
    // 4. Post-ship → artist keeps everything, no refund.
    if (order.status === 'shipping' || order.status === 'delivered') {
        return { refund: 0, artistShare: total, tier: 'post_ship' };
    }
    // 5. In-progress curve: scales with elapsed time vs deadline.
    const accepted = tsToDate(order.acceptedAt);
    const deadline = tsToDate(order.estimatedCompletionDate);
    if (!accepted || !deadline) {
        return { refund: total / 2, artistShare: total / 2, tier: 'unknown' };
    }
    const totalWindow = (deadline - accepted) / 1000;
    const elapsed = (now - accepted) / 1000;
    const timeRemainingPct = totalWindow <= 0
        ? 0
        : Math.max(0, Math.min(1, (totalWindow - elapsed) / totalWindow));
    let penaltyPct, tier;
    if (timeRemainingPct > 0.75)      { penaltyPct = 0.10; tier = 'early'; }
    else if (timeRemainingPct > 0.50) { penaltyPct = 0.25; tier = 'mid_early'; }
    else if (timeRemainingPct > 0.25) { penaltyPct = 0.50; tier = 'mid_late'; }
    else                              { penaltyPct = 0.75; tier = 'late'; }
    const artistShare = total * penaltyPct;
    return { refund: total - artistShare, artistShare, tier };
}

function refundOrder(orderId, order) {
    const outcome = computeAdminCancellation(order);
    const refund = +outcome.refund.toFixed(2);
    const artistShare = +outcome.artistShare.toFixed(2);

    const msg =
        'Tier: ' + outcome.tier + '\n' +
        'Refund to customer: $' + refund.toFixed(2) + '\n' +
        'Artist keeps: $' + artistShare.toFixed(2) + '\n\n' +
        'Continue?';

    showConfirm('Cancel order', msg, async () => {
        try {
            // Wrap order + customer credit + artist reconcile in one
            // Firestore transaction. Either every wallet move and the
            // order flip succeed, or none of them do — so the visible
            // state ("refunded") can never disappear without the actual
            // money having moved.
            const orderRef = db.collection('orders').doc(orderId);
            const custWalletRef = order.customerId
                ? db.collection('wallets').doc(order.customerId)
                : null;
            const artistWalletRef = order.artistId
                ? db.collection('wallets').doc(order.artistId)
                : null;
            const paymentRef = order.paymentId
                ? db.collection('payments').doc(order.paymentId)
                : null;

            await db.runTransaction(async (tx) => {
                // Reads first — transactions disallow reads after writes.
                const custDoc = custWalletRef ? await tx.get(custWalletRef) : null;
                const artistDoc = artistWalletRef ? await tx.get(artistWalletRef) : null;

                tx.update(orderRef, {
                    status: 'cancelled',
                    payoutStatus: 'unpaid',
                    cancelledAt: firebase.firestore.FieldValue.serverTimestamp(),
                    refundAmount: refund,
                    cancellationArtistShare: artistShare,
                    cancellationTier: outcome.tier,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                });

                if (paymentRef) {
                    tx.update(paymentRef, {
                        status: 'refunded',
                        refundedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    });
                }

                // Credit the customer's wallet with the computed refund.
                if (refund > 0 && custWalletRef && custDoc) {
                    if (custDoc.exists) {
                        tx.update(custWalletRef, {
                            balance: firebase.firestore.FieldValue.increment(refund),
                            totalEarnings: firebase.firestore.FieldValue.increment(refund),
                            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                        });
                    } else {
                        tx.set(custWalletRef, {
                            balance: refund,
                            totalEarnings: refund,
                            totalWithdrawn: 0,
                            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                        });
                    }
                }

                // Reconcile artist wallet so it ends up holding `artistShare`
                // (not the full original earnings). Adjust by the delta so we
                // don't double-credit if the artist was already paid at
                // shipping, and we don't strand them with zero if they weren't.
                if (artistWalletRef && artistDoc) {
                    const earned = order.artistEarnings || 0;
                    const delta = artistShare - earned;
                    if (artistDoc.exists) {
                        if (delta !== 0) {
                            tx.update(artistWalletRef, {
                                balance: firebase.firestore.FieldValue.increment(delta),
                                totalEarnings: firebase.firestore.FieldValue.increment(delta),
                                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                            });
                        }
                    } else if (artistShare > 0) {
                        tx.set(artistWalletRef, {
                            balance: artistShare,
                            totalEarnings: artistShare,
                            totalWithdrawn: 0,
                            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                        });
                    }
                }
            });

            await logAuditAction('cancel_order', orderId, 'order', {
                amount: order.total,
                customerName: order.customerName,
                artistId: order.artistId,
                tier: outcome.tier,
                refund: refund,
                artistShare: artistShare,
            });

            showToast(
                'Order cancelled (' + outcome.tier + '). ' +
                'Refund $' + refund.toFixed(2) + ' / artist keeps $' + artistShare.toFixed(2) + '.',
                'success'
            );
            resetPagination('orders');
            loadOrders('first');
            loadOrderStats();
        } catch (error) {
            console.error('Error cancelling order:', error);
            showToast('Error cancelling order.', 'error');
        }
    }, { confirmText: 'Cancel order', type: 'danger', modalClass: 'confirm-modal-cancel-order' });
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
        const [paymentsSnap, payoutsSnap, unpaidOrdersSnap, subscriptionsSnap] = await Promise.all([
            db.collection('payments').get(),
            db.collection('payouts').get(),
            db.collection('orders').where('payoutStatus', '==', 'unpaid').where('status', '==', 'delivered').get(),
            db.collection('subscriptions').get(),
        ]);

        let totalPayments = 0, completedAmount = 0;
        paymentsSnap.forEach(doc => {
            const p = doc.data();
            totalPayments++;
            if (p.status === 'completed') completedAmount += p.amount || 0;
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

        // Subscription revenue — the *real* platform income source now
        // that sales commission is 0%. Sums every active or completed
        // subscription's monthly amount, which mirrors the mobile concept
        // ("revenue comes from the Free / Basic / Premium tiers").
        let subscriptionRevenue = 0;
        subscriptionsSnap.forEach(doc => {
            const s = doc.data();
            const status = (s.status || '').toLowerCase();
            if (status === 'active' || status === 'completed' || status === 'paid') {
                subscriptionRevenue += s.amount || 0;
            }
        });

        animateCounter('totalPayments', totalPayments);
        animateCounter('completedPayments', completedAmount, '$');
        animateCounter('platformRevenue', subscriptionRevenue, '$');
        animateCounter('totalPayoutsAmount', totalPayoutsAmount, '$');
        animateCounter('pendingPayouts', pendingPayoutsAmount, '$');
    } catch (error) {
        console.error('Error loading payment stats:', error);
    }
}

// =============================================
// PAYMENTS - Display formatters
// =============================================
// Mirror the labels the mobile app shows so admin reviewers see the same
// wording: payment types are humanised ("order_payment" → "Order payment")
// and methods map to the two virtual-card variants ("Virtual Visa" /
// "Virtual Card") with Virtual Visa as the default since that's what
// customers and artists both use now.
function formatPaymentType(raw) {
    if (!raw) return 'Order payment';
    const map = {
        order_payment: 'Order payment',
        payout: 'Payout',
        refund: 'Refund',
        platform_fee: 'Platform fee',
    };
    if (map[raw]) return map[raw];
    return raw
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}
function formatPaymentMethod(raw) {
    if (!raw) return 'N/A';
    // Matches what the mobile app actually writes to Firestore — the
    // auto-detected card brand from the customer's checkout form. Older
    // payout / wallet flows still use the virtual_* and wallet_* aliases.
    const map = {
        visa: 'Visa',
        mastercard: 'Mastercard',
        amex: 'Amex',
        card: 'Card',
        credit_card: 'Credit card',
        virtual_visa: 'Virtual Visa',
        virtual_card: 'Virtual Card',
        wallet_withdrawal: 'Auto payout',
    };
    return map[raw] || raw
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
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
    tbody.appendChild(createSkeletonRows(5, 10));

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
        if (typeof window.filterByDate === 'function') docs = window.filterByDate(docs, 'payments');

        if (methodFilter) {
            // Tolerate both keys — older payment docs only have `method`,
            // newer ones mirror under `paymentMethod`. Either match counts
            // so the filter works against old + new data uniformly.
            docs = docs.filter(doc => {
                const d = doc.data();
                return d.paymentMethod === methodFilter || d.method === methodFilter;
            });
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
            }, formatPaymentType(payment.type)));
            tr.appendChild(tdType);

            // User column — prefer denormalised fields on the payment
            // doc, then fall back to a known buyer/customer key for older
            // records, then to a truncated userId so the cell is never
            // an opaque "N/A".
            const userLabel = payment.userName
                || payment.customerName
                || (payment.userId ? payment.userId.substring(0, 8) + '…' : 'N/A');
            const userSub = payment.userEmail || payment.customerEmail || '';
            tr.appendChild(createEl('td', {}, userLabel + (userSub ? '\n' + userSub : '')));
            tr.appendChild(createEl('td', {}, '$' + (payment.amount || 0).toFixed(2)));

            // Method column — mobile payment docs use `method`, older /
            // mirrored records use `paymentMethod`. Read both so the cell
            // doesn't depend on which key happens to exist.
            const methodRaw = payment.paymentMethod || payment.method;
            const tdMethod = document.createElement('td');
            tdMethod.appendChild(createEl('span', {
                className: 'payment-method-badge payment-' + (methodRaw || 'unknown')
            }, formatPaymentMethod(methodRaw)));
            tr.appendChild(tdMethod);

            const tdStatus = document.createElement('td');
            tdStatus.appendChild(createEl('span', {
                className: 'status-badge status-' + getPaymentStatusClass(payment.status)
            }, payment.status || 'pending'));
            tr.appendChild(tdStatus);

            tr.appendChild(createEl('td', {},
                payment.createdAt ? payment.createdAt.toDate().toLocaleDateString() : 'N/A'));

            const tdActions = document.createElement('td');
            const viewBtn = createEl('button', { className: 'btn-action btn-view-paid' }, 'View');
            viewBtn.addEventListener('click', () => {
                const detailUser = payment.userName
                    || payment.customerName
                    || (payment.userId ? payment.userId.substring(0, 8) + '…' : 'N/A');
                const detailMethod = payment.paymentMethod || payment.method;
                showDetailModal('Payment Details', [
                    { label: 'Payment ID', value: doc.id },
                    { label: 'Type', value: formatPaymentType(payment.type) },
                    { label: 'User', value: detailUser },
                    { label: 'Amount', value: '$' + (payment.amount || 0).toFixed(2) },
                    { label: 'Method', value: formatPaymentMethod(detailMethod) },
                    { label: 'Status', value: payment.status || 'N/A' },
                    { label: 'Gateway ID', value: payment.gatewayTransactionId || 'N/A' },
                    { label: 'Reference', value: payment.referenceId || 'N/A' }
                ]);
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
    tbody.appendChild(createSkeletonRows(5, 9));

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
            tbody.appendChild(createEmptyRow(9, 'No payouts found'));
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

            const tdActions = document.createElement('td');
            const viewBtn = createEl('button', { className: 'btn-action btn-view-paid' }, 'View');
            viewBtn.addEventListener('click', () => {
                showDetailModal('Payout Details', [
                    { label: 'Payout ID', value: doc.id },
                    { label: 'Artist', value: payout.artistName || 'N/A' },
                    { label: 'Artist Email', value: payout.artistEmail || 'N/A' },
                    { label: 'Amount', value: '$' + (payout.amount || 0).toFixed(2) },
                    { label: 'Orders', value: (payout.orderIds || []).length + ' order(s)' },
                    { label: 'Method', value: payout.paymentMethod || 'N/A' },
                    { label: 'Status', value: payout.status || 'pending' },
                    { label: 'Date', value: payout.createdAt ? payout.createdAt.toDate().toLocaleString() : 'N/A' },
                    { label: 'Processed By', value: payout.processedBy || 'N/A' },
                    { label: 'Reference', value: payout.referenceId || 'N/A' }
                ]);
            });
            tdActions.appendChild(viewBtn);
            tr.appendChild(tdActions);

            tbody.appendChild(tr);
        });

        updatePaginationUI('payouts', state.page, hasMore);
    } catch (error) {
        console.error('Error loading payouts:', error);
        tbody.innerHTML = '';
        tbody.appendChild(createErrorRow(9, 'Error loading payouts'));
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

    if (!artistId) { showToast('Please select an artist.', 'warning'); return; }

    try {
        const walletDoc = await db.collection('wallets').doc(artistId).get();
        const walletBalance = walletDoc.exists ? (walletDoc.data().balance || 0) : 0;

        if (walletBalance < PAYMENT_POLICIES.minWithdrawal) {
            showToast('Payout denied: Wallet balance ($' + walletBalance.toFixed(2) + ') below minimum $' + PAYMENT_POLICIES.minWithdrawal.toFixed(2) + '.', 'error');
            return;
        }

        const ordersSnap = await db.collection('orders')
            .where('artistId', '==', artistId)
            .where('payoutStatus', '==', 'unpaid')
            .where('status', '==', 'delivered')
            .get();

        if (ordersSnap.empty) { showToast('No unpaid delivered orders for this artist.', 'warning'); return; }

        const totalAmount = ordersSnap.docs.reduce((sum, d) => sum + (d.data().artistEarnings || 0), 0);
        const form = this;

        showConfirm('Process Payout', 'Process payout of $' + totalAmount.toFixed(2) + '? This will deduct from the artist\'s wallet.', async () => {
            try {
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

                showToast('Payout completed! $' + totalAmount.toFixed(2) + ' withdrawn.', 'success');
                form.reset();
                document.getElementById('payoutAmountPreview').value = '$0.00';
                resetPagination('payouts');
                loadPayouts('first');
                loadArtistWallets();
                loadPaymentStats();
                populatePayoutArtistDropdown();
            } catch (error) {
                console.error('Error processing payout:', error);
                showToast('Error processing payout: ' + error.message, 'error');
            }
        }, { confirmText: 'Process Payout', type: 'warning' });
    } catch (error) {
        console.error('Error processing payout:', error);
        showToast('Error processing payout: ' + error.message, 'error');
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

        // Two parallel reads — completed order payments give the
        // marketplace-volume curve, subscriptions give the real platform
        // revenue curve. Previously the second line tracked `platformFee`
        // which is permanently $0 under the no-commission model.
        const [paymentsSnap, subscriptionsSnap] = await Promise.all([
            db.collection('payments').where('status', '==', 'completed').get(),
            db.collection('subscriptions').get(),
        ]);

        paymentsSnap.forEach(doc => {
            const p = doc.data();
            if (p.createdAt) {
                const date = p.createdAt.toDate();
                const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
                if (!monthlyData[key]) monthlyData[key] = { volume: 0, subs: 0 };
                monthlyData[key].volume += p.amount || 0;
            }
        });

        subscriptionsSnap.forEach(doc => {
            const s = doc.data();
            const status = (s.status || '').toLowerCase();
            if (!['active', 'completed', 'paid'].includes(status)) return;
            const ts = s.createdAt || s.startDate;
            if (!ts || !ts.toDate) return;
            const date = ts.toDate();
            const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
            if (!monthlyData[key]) monthlyData[key] = { volume: 0, subs: 0 };
            monthlyData[key].subs += s.amount || 0;
        });

        const labels = [], volumeData = [], subsData = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
            labels.push(d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
            volumeData.push((monthlyData[key] || {}).volume || 0);
            subsData.push((monthlyData[key] || {}).subs || 0);
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
                        label: 'Marketplace Volume',
                        data: volumeData,
                        borderColor: '#6F8FA3',
                        backgroundColor: 'rgba(111, 143, 163, 0.12)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Subscription Revenue',
                        data: subsData,
                        borderColor: '#F59E0B',
                        backgroundColor: 'rgba(245, 158, 11, 0.10)',
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
        // Pull both collections so the chart reflects the full money
        // flow: payments are money IN (customers paying with cards) and
        // payouts are money OUT (auto-payouts landing on artists' Visas).
        const [paymentsSnap, payoutsSnap] = await Promise.all([
            db.collection('payments').where('status', '==', 'completed').get(),
            db.collection('payouts').where('status', '==', 'completed').get(),
        ]);

        // Customer payments in the mobile app are stored under the auto-
        // detected card brand (visa / mastercard / amex / card /
        // credit_card). Payouts always use virtual_visa post-fix. Each
        // slice maps to a distinct, observable money flow.
        const totals = {
            visa:        0,
            mastercard:  0,
            amex:        0,
            credit_card: 0,
            other_card:  0,
            auto_payout: 0,
        };
        paymentsSnap.forEach(doc => {
            const p = doc.data();
            // Read both keys — older docs only set `method`, newer ones
            // mirror under `paymentMethod`. Without this fallback the
            // chart silently drops every legacy payment into the
            // "Other card" catch-all bucket.
            const m = (p.paymentMethod || p.method || '').toLowerCase();
            const amt = p.amount || 0;
            if (m === 'visa') totals.visa += amt;
            else if (m === 'mastercard') totals.mastercard += amt;
            else if (m === 'amex') totals.amex += amt;
            else if (m === 'virtual_visa' || m === 'virtual_card' || m === 'wallet_withdrawal') {
                totals.auto_payout += amt;
            } else if (m === 'credit_card') {
                totals.credit_card += amt;
            } else {
                // 'card' or anything unrecognised
                totals.other_card += amt;
            }
        });

        // Fold every completed payout into the auto_payout slice so the
        // chart honestly shows how much money has reached artists' Visas.
        payoutsSnap.forEach(doc => {
            const p = doc.data();
            totals.auto_payout += p.amount || 0;
        });

        // Same logo-derived palette used by the Orders by Status doughnut
        // and the Categories Breakdown bars, so all three charts on the
        // page share one visual vocabulary instead of competing palettes.
        const palette = {
            visa:        { label: 'Visa',        color: '#5B8FA8' }, // slate-blue (logo letters)
            mastercard:  { label: 'Mastercard',  color: '#E8B547' }, // mustard yellow (logo letters)
            amex:        { label: 'Amex',        color: '#7A9B5C' }, // sage green (logo letters)
            credit_card: { label: 'Credit card', color: '#C96A3D' }, // terracotta (logo triangle)
            other_card:  { label: 'Other card',  color: '#4A8B8B' }, // deep teal (logo pottery spirals)
            auto_payout: { label: 'Auto payout', color: '#B5413B' }, // brick red (logo letters)
        };
        const labels = [];
        const data = [];
        const backgroundColor = [];
        Object.keys(palette).forEach(k => {
            if (totals[k] > 0) {
                labels.push(palette[k].label);
                data.push(totals[k]);
                backgroundColor.push(palette[k].color);
            }
        });

        const ctx = document.getElementById('paymentMethodsChart');
        if (!ctx) return;
        if (paymentMethodsPieChart) paymentMethodsPieChart.destroy();

        const colors = getChartColors();
        paymentMethodsPieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor,
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
    tbody.appendChild(createSkeletonRows(5, 7));

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

// Admin credit → wallet → auto-payout to the artist's Visa.
//
// Mirrors the mobile app's `markShipping → creditWallet →
// _autoPayoutIfCardLinked` flow so any money that enters the system
// behaves the same way regardless of where it came from: it touches the
// wallet briefly, then drains to the artist's linked Virtual Visa via a
// real payout record. If no card is linked the money stays in the
// wallet until the artist links one.
//
// Wrapped in a Firestore transaction so the wallet credit + debit and
// the payout record either all succeed or none do — balances can never
// drift if a step fails.
async function addWalletCredit(artistId, artistName) {
    const amountStr = prompt(
        'Enter credit amount to add to ' + artistName + '\'s wallet.\n\n' +
        'If a Virtual Visa is linked, it will be paid out immediately. ' +
        'Otherwise the amount waits in the wallet until a card is linked.'
    );
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
        showToast('Please enter a valid positive amount.', 'warning');
        return;
    }

    try {
        // Pre-fetch the artist's payout card (outside the transaction —
        // user docs aren't part of the financial atomic set, just used
        // to decide whether to pay out).
        const userDoc = await db.collection('users').doc(artistId).get();
        const card = userDoc.exists ? userDoc.data().payoutCard : null;

        const walletRef = db.collection('wallets').doc(artistId);
        const payoutRef = db.collection('payouts').doc();

        await db.runTransaction(async (tx) => {
            const walletSnap = await tx.get(walletRef);

            if (walletSnap.exists) {
                tx.update(walletRef, {
                    balance: firebase.firestore.FieldValue.increment(amount),
                    totalEarnings: firebase.firestore.FieldValue.increment(amount),
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                });
            } else {
                tx.set(walletRef, {
                    balance: amount,
                    totalEarnings: amount,
                    totalWithdrawn: 0,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                });
            }

            // If the artist has a card, drain the credit straight back
            // out into a payout record so the money reaches their Visa.
            if (card) {
                tx.update(walletRef, {
                    balance: firebase.firestore.FieldValue.increment(-amount),
                    totalWithdrawn: firebase.firestore.FieldValue.increment(amount),
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                });
                tx.set(payoutRef, {
                    artistId: artistId,
                    artistName: artistName,
                    amount: amount,
                    currency: 'USD',
                    orderIds: [],
                    paymentMethod: card.brand || 'virtual_visa',
                    cardLast4: card.last4 || '',
                    status: 'completed',
                    source: 'admin_credit',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    processedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
            }
        });

        // Notification + audit log — outside the transaction because
        // they don't need atomic consistency with the money moves.
        const brandLabel = card && card.brand === 'virtual_visa' ? 'Virtual Visa' : 'Virtual Card';
        await db.collection('notifications').add({
            userId: artistId,
            title: card ? 'Admin credit sent to your Visa' : 'Admin credit added to wallet',
            message: card
                ? '$' + amount.toFixed(2) + ' was sent to your ' + brandLabel +
                  ' •••• ' + (card.last4 || '').toString() + '.'
                : '$' + amount.toFixed(2) + ' was added to your wallet. ' +
                  'Link a payout card from Earnings to receive it on your Visa.',
            type: card ? 'payout' : 'wallet_credit',
            referenceId: '',
            isRead: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        await logAuditAction('add_wallet_credit', artistId, 'wallet', {
            artistName: artistName,
            amount: amount,
            paidOutImmediately: !!card,
            card: card ? (card.brand + ' ' + card.last4) : null,
        });

        showToast(
            card
                ? '$' + amount.toFixed(2) + ' sent to ' + artistName + '\'s ' + brandLabel + '.'
                : '$' + amount.toFixed(2) + ' added to ' + artistName + '\'s wallet (no card linked).',
            'success'
        );
        loadArtistWallets();
        loadPaymentStats();
    } catch (error) {
        console.error('Error adding wallet credit:', error);
        showToast('Error adding credit: ' + error.message, 'error');
    }
}

// Wallet search listener
document.getElementById('walletSearchInput')?.addEventListener('input', debounce(function () {
    loadArtistWallets();
}, 300));
