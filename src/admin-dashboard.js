// Admin Dashboard JavaScript
let currentAdmin = null;
let dashboardData = null;

// Billing System Variables
let billItems = [];
let selectedCustomer = null;
let availableBooks = [
    { id: '1', title: 'The Great Gatsby', price: 1500 },
    { id: '2', title: 'To Kill a Mockingbird', price: 1200 },
    { id: '3', title: '1984', price: 1800 },
    { id: '4', title: 'Pride and Prejudice', price: 900 },
    { id: '5', title: 'Mistborn: The Final Empire', price: 1350 },
    { id: '6', title: 'Lord of the Rings', price: 1500 },
    { id: '7', title: 'Harry Potter and the Sorcerer\'s Stone', price: 1100 },
    { id: '8', title: 'The Hobbit', price: 950 }
];

// Book management variables (consolidated - only declare once)
let currentBooks = [];
let currentPage = 0;
let totalPages = 0;
let currentFilters = {
    search: '',
    status: '',
    minPrice: null,
    maxPrice: null,
    sortBy: 'title',
    sortOrder: 'asc'
};

// Global variable to store current customers
let currentCustomers = [];

// Global variable to store current orders
let currentOrders = [];

// Global variable to store current bills
let currentBills = [];

// Stores the most recently generated bill for preview/print/download actions
let lastGeneratedBill = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    (window.requestIdleCallback ? requestIdleCallback(() => {
        loadDashboardData();
        updateBookStats();
    }) : setTimeout(() => { loadDashboardData(); updateBookStats(); }, 0));
    setupEventListeners();
    initializeBillingWithBackendCheck();
   
    setTimeout(startAutoRefresh, 1500);

    
 
    const editBookForm = document.getElementById('edit-book-form');
    if (editBookForm) {
        editBookForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const bookId = this.getAttribute('data-book-id');
            if (bookId) {
                saveBookChanges(bookId);
            }
        });
    }
    
    // Update stock form event listener
    const updateStockForm = document.getElementById('update-stock-form');
    if (updateStockForm) {
        updateStockForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const bookId = this.getAttribute('data-book-id');
            if (bookId) {
                saveStockChanges(bookId);
            }
        });
    }
});

// ========================
// Reports & Analytics
// ========================

let categoryChartRef = null;
let revenueChartRef = null;
let salesTrendChartRef = null; // left defined; card removed
let stockStatusChartRef = null;

// Wait until Chart.js global is ready (prevents blank charts on slow networks)
async function ensureChartReady(timeoutMs = 5000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const check = () => {
            if (typeof window.Chart !== 'undefined') return resolve(window.Chart);
            if (Date.now() - start > timeoutMs) return reject(new Error('Chart.js not available'));
            setTimeout(check, 50);
        };
        check();
    });
}

async function safeFetchJSON(url, options = {}) {
    try {
        const res = await fetch(url, options);
        const isJSON = (res.headers.get('content-type') || '').includes('application/json');
        if (!isJSON) return { ok: res.ok, data: null };
        const data = await res.json();
        return { ok: res.ok, data };
    } catch (e) {
        console.warn('safeFetchJSON error for', url, e);
        return { ok: false, data: null };
    }
}

async function loadReports() {
    try {
        const token = localStorage.getItem('adminToken');

        // Parallel fetch of data needed for analytics
        const [billsRes, ordersRes, booksRes, customersRes] = await Promise.all([
            safeFetchJSON('http://localhost:8080/api/billing/all'),
            safeFetchJSON('http://localhost:8080/api/admin/orders', { headers: { 'Authorization': `Bearer ${token}` } }),
            safeFetchJSON('http://localhost:8080/api/books/all'),
            safeFetchJSON('http://localhost:8080/api/admin/customers', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const bills = billsRes.data ? (billsRes.data.bills || billsRes.data || []) : [];
        const orders = ordersRes.data ? (Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data.orders || [])) : [];
        const books = booksRes.data ? (booksRes.data.books || booksRes.data || []) : [];
        const customers = customersRes.data ? (Array.isArray(customersRes.data) ? customersRes.data : (customersRes.data.customers || [])) : [];

        // Aggregate metrics
        const totalRevenue = bills.reduce((sum, b) => sum + (Number(b.total) || Number(b.totalAmount) || 0), 0);
        const totalOrders = orders.length;
        const totalCustomers = customers.length;
        const totalBooks = books.length;

        // Basic period comparison (last 7 days vs previous 7 days)
        const now = new Date();
        const start7 = new Date(now); start7.setDate(now.getDate() - 7);
        const start14 = new Date(now); start14.setDate(now.getDate() - 14);

        const inRange = (dt, s, e) => { const d = new Date(dt); return d >= s && d <= e; };

        const revLast7 = bills.filter(b => inRange(b.billDate || b.date || b.createdAt, start7, now))
                               .reduce((s, b) => s + (Number(b.total) || Number(b.totalAmount) || 0), 0);
        const revPrev7 = bills.filter(b => inRange(b.billDate || b.date || b.createdAt, start14, start7))
                               .reduce((s, b) => s + (Number(b.total) || Number(b.totalAmount) || 0), 0);

        const pct = (a, b) => {
            if (!b) return a ? 100 : 0;
            return Math.round(((a - b) / b) * 100);
        };

        // Update quick stats
        setText('total-revenue-stat', `Rs. ${formatCurrency(totalRevenue)}`);
        setText('revenue-change', `${pct(revLast7, revPrev7)}% last 7d`);
        setText('total-orders-stat', `${totalOrders}`);
        setText('orders-change', 'Updated');
        setText('total-customers-stat', `${totalCustomers}`);
        setText('customers-change', 'Updated');
        setText('total-books-stat', `${totalBooks}`);
        setText('books-change', 'Updated');

        // Top selling books from orders
        const titleToQty = new Map();
        orders.forEach(o => {
            const key = o.bookTitle || 'Unknown';
            titleToQty.set(key, (titleToQty.get(key) || 0) + (Number(o.quantity) || 0));
        });
        const top = [...titleToQty.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
        try { renderTopBooks(top); } catch(e) { console.warn('renderTopBooks failed', e); }

        // Stock status overview from books
        const stockStatus = {
            inStock: books.filter(b => Number(b.stockQuantity ?? 0) > 10).length,
            lowStock: books.filter(b => Number(b.stockQuantity ?? 0) > 0 && Number(b.stockQuantity ?? 0) <= 10).length,
            outOfStock: books.filter(b => Number(b.stockQuantity ?? 0) <= 0).length
        };
        try { await ensureChartReady(); renderStockStatusChart(stockStatus); } catch(e) { console.warn('renderStockStatusChart failed', e); }

        // Recent bills
        try { renderRecentBills(bills); } catch(e) { console.warn('renderRecentBills failed', e); }

        // Sales trend: sum totals by day for last 30 days
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 29);
        const dayKey = (d)=> d.toISOString().slice(0,10);
        const trendMap = new Map();
        for (let d=new Date(start); d<=end; d.setDate(d.getDate()+1)) {
            trendMap.set(dayKey(d), 0);
        }
        bills.forEach(b => {
            const date = new Date(b.billDate || b.date || Date.now());
            const key = dayKey(date);
            if (trendMap.has(key)) {
                trendMap.set(key, trendMap.get(key) + (Number(b.total) || Number(b.totalAmount) || 0));
            }
        });
        try { await ensureChartReady(); renderSalesTrendChart(trendMap); } catch(e) { console.warn('renderSalesTrendChart failed', e); }

        // Cache for exports
        window.__reports_cache = { bills, orders, books, customers, totals: { totalRevenue, totalOrders, totalCustomers, totalBooks } };

    } catch (err) {
        console.error('Error loading reports:', err);
        showToast('Failed to load reports. Check backend and try again.', 'error');
    }
}

function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
function formatCurrency(n) { return Number(n || 0).toLocaleString('en-LK', { maximumFractionDigits: 2 }); }

function renderTopBooks(entries) {
    const holder = document.getElementById('top-books-list');
    if (!holder) return;
    holder.innerHTML = '';
    const max = Math.max(1, ...entries.map(e => e[1]));
    entries.forEach(([title, qty], i) => {
        const pct = Math.round((qty / max) * 100);
        const item = document.createElement('div');
        item.className = 'top-book-item';
        item.innerHTML = `
            <div class="rank ${i===0?'gold':(i===1?'silver':(i===2?'bronze':''))}">${i+1}</div>
            <div class="book-info">
                <div class="book-title">${title}</div>
                <div class="sales-count">${qty} sold</div>
                <div style="background:#e5e7eb;height:8px;border-radius:6px;margin-top:6px;overflow:hidden">
                    <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#60a5fa,#2563eb)"></div>
                </div>
            </div>`;
        holder.appendChild(item);
    });
}

function renderStockStatusChart(stockStatus) {
    const canvas = document.getElementById('stock-status-chart');
    if (!canvas) return;
    const labels = ['In Stock', 'Low Stock', 'Out of Stock'];
    const data = [
        Number(stockStatus.inStock || 0),
        Number(stockStatus.lowStock || 0),
        Number(stockStatus.outOfStock || 0)
    ];
    // If everything zero, still render a very light placeholder bar set so card isn't empty
    if (data.every(v => v === 0)) {
        data[0] = 0.0001; // renders a hairline bar
    }
    if (stockStatusChartRef) stockStatusChartRef.destroy();
    const ctx = canvas.getContext('2d');
    stockStatusChartRef = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Books',
                data,
                backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });
}

function renderRevenueChart(pmRevenue) {
    const canvas = document.getElementById('revenue-chart');
    if (!canvas) return;
    let labels = Object.keys(pmRevenue || {});
    let data = Object.values(pmRevenue || {}).map(v => Math.round(v));
    if (!labels.length || !data.length) {
        // Keep canvas for later rendering by other modules; just clear it
        const w = canvas.width; const h = canvas.height; canvas.width = w; canvas.height = h;
        return;
    }
    if (revenueChartRef) revenueChartRef.destroy();
    const ctx = canvas.getContext('2d');
    revenueChartRef = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Revenue (Rs.)', data, backgroundColor: '#60a5fa' }] },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}

// New: Sales Trend (Last 30 Days)
function renderSalesTrendChart(trendMap) {
    const canvas = document.getElementById('sales-trend-chart');
    if (!canvas) return;
    const labels = Array.from(trendMap.keys());
    const data = Array.from(trendMap.values()).map(v => Math.round(v));
    if (!labels.length) {
        const holder = canvas.parentElement;
        if (holder) {
            holder.innerHTML = '<div class="no-data-content"><i class="fas fa-inbox"></i><p>No sales in the last 30 days.</p></div>';
        }
        return;
    }
    if (salesTrendChartRef) salesTrendChartRef.destroy();
    const ctx = canvas.getContext('2d');
    salesTrendChartRef = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Daily Revenue (Rs.)',
                data,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16,185,129,0.15)',
                fill: true,
                tension: 0.3,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderRecentBills(bills) {
    const list = document.getElementById('recent-bills-list');
    if (!list) return;
    list.innerHTML = '';
    const sorted = [...bills].sort((a,b)=> new Date(b.billDate||b.date||0) - new Date(a.billDate||a.date||0)).slice(0,6);
    sorted.forEach(b => {
        const item = document.createElement('div');
        item.className = 'activity-item bill-item';
        item.innerHTML = `
            <div class="activity-icon"><i class="fas fa-file-invoice"></i></div>
            <div class="activity-content">
                <strong>${b.billNumber || 'BILL'}</strong>
                <div style="font-size:12px;color:#6b7280">${new Date(b.billDate || b.date || Date.now()).toLocaleString()} • ${b.customerName || ''}</div>
            </div>
            <div class="amount-value">Rs. ${formatCurrency(b.total || b.totalAmount || 0)}</div>`;
        list.appendChild(item);
    });
}

// -------- Reports Export/Print wrappers (delegate to enhanced script when available) --------
function exportDetailedReport() {
    if (window.exportReport) return window.exportReport('pdf');
}

function printReport() {
    if (window.printReport) return window.printReport();
    window.print();
}

// Populate the detailed table with bills (default view)
function loadDetailedReportLegacy() {
    // Delegate to enhanced reports module if present; else fallback to cache
    if (typeof window.loadDetailedReport === 'function' && window.loadDetailedReport !== loadDetailedReport) {
        return window.loadDetailedReport();
    }
    const cache = window.__reports_cache || {};
    const bills = cache.bills || [];
    const tbody = document.getElementById('detailed-reports-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const rows = bills
        .sort((a,b)=> new Date(b.billDate||b.date||0) - new Date(a.billDate||a.date||0))
        .slice(0,200)
        .map(b => `
            <tr>
              <td>${new Date(b.billDate || b.date || Date.now()).toLocaleDateString()}</td>
              <td>${b.billNumber || ''}</td>
              <td>${b.customerName || ''}</td>
              <td>${(b.items||[]).length}</td>
              <td>Rs. ${formatCurrency(b.total || b.totalAmount || 0)}</td>
              <td>${(b.paymentMethod || '').toUpperCase()}</td>
              <td><span class="bill-status ${String(b.status||'').toLowerCase()}">${b.status || ''}</span></td>
            </tr>`)
        .join('');
    tbody.insertAdjacentHTML('beforeend', rows || `<tr><td colspan="7" style="text-align:center;color:#64748b;padding:1.5rem">No data</td></tr>`);
}

// Authentication check
function checkAuth() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = 'admin-login.html';
        return;
    }
    loadAdminInfo();
}

// Load admin information
async function loadAdminInfo() {
    const token = localStorage.getItem('adminToken');
    try {
        const response = await fetch('http://localhost:8080/api/admin/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.ok) {
            const admin = await response.json();
            currentAdmin = admin;
            document.getElementById('admin-name').textContent = admin.name || admin.username;
            document.getElementById('admin-role').textContent = admin.role || 'Administrator';
        }
    } catch (error) {
        console.error('Error loading admin info:', error);
    }
}

// Load dashboard data
async function loadDashboardData() {
    const token = localStorage.getItem('adminToken');
    try {
        const response = await fetch('http://localhost:8080/api/admin/dashboard', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.ok) {
            dashboardData = await response.json();
            updateDashboardStats();
            loadRecentOrders();
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Update dashboard statistics
function updateDashboardStats() {
    if (!dashboardData) return;
    document.getElementById('total-customers').textContent = dashboardData.totalCustomers || 0;
    document.getElementById('total-orders').textContent = dashboardData.totalOrders || 0;
    document.getElementById('total-books').textContent = dashboardData.totalBooks || 0;
    document.getElementById('total-revenue').textContent = `Rs. ${(dashboardData.totalRevenue || 0).toLocaleString()}`;
}

// Load recent orders
function loadRecentOrders() {
    if (!dashboardData || !dashboardData.recentOrders) return;
    const ordersList = document.getElementById('recent-orders-list');
    ordersList.innerHTML = '';
    dashboardData.recentOrders.forEach(order => {
        const orderItem = document.createElement('div');
        orderItem.className = 'order-item';
        orderItem.innerHTML = `
            <div class="order-info">
                <h4>${order.customerName || 'Guest'}</h4>
                <p>${order.bookTitle} - Qty: ${order.quantity}</p>
            </div>
            <div class="order-status ${order.status.toLowerCase()}">
                ${order.status}
            </div>
        `;
        ordersList.appendChild(orderItem);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Navigation event listeners
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Search functionality
    const searchInput = document.getElementById('customer-search');
    if (searchInput) {
        searchInput.addEventListener('input', searchCustomers);
    }

    // Book filters
    const bookSearchInput = document.getElementById('book-search');
    if (bookSearchInput) {
        bookSearchInput.addEventListener('input', applyBookFilters);
    }

    // Order filters
    const orderSearchInput = document.getElementById('order-search');
    if (orderSearchInput) {
        orderSearchInput.addEventListener('input', filterOrders);
    }

    // Form event listeners
    const addCustomerForm = document.getElementById('add-customer-form');
    if (addCustomerForm) {
        addCustomerForm.addEventListener('submit', handleAddCustomer);
    }

    const addBookForm = document.getElementById('add-book-form');
    if (addBookForm) {
        addBookForm.addEventListener('submit', handleAddBook);
    }

    // Billing form event listener
    const billingForm = document.getElementById('billing-form');
    if (billingForm) {
        billingForm.addEventListener('submit', handleBillingSubmit);
    }

    // Edit book form event listener
    const editBookForm = document.getElementById('edit-book-form');
    if (editBookForm) {
        editBookForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const bookId = this.getAttribute('data-book-id');
            if (bookId) {
                saveBookChanges(bookId);
            }
        });
    }

    // Update stock form event listener
    const updateStockForm = document.getElementById('update-stock-form');
    if (updateStockForm) {
        updateStockForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const bookId = this.getAttribute('data-book-id');
            if (bookId) {
                saveStockChanges(bookId);
            }
        });
    }
}

// Show different sections
function showSection(sectionName) {
    // Update side nav active state
    document.querySelectorAll('.nav-item').forEach(btn => {
        const isTarget = btn.getAttribute('data-section') === sectionName;
        if (isTarget) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Minimize UI jank: avoid replacing button HTML; just set aria-busy when relevant
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(btn => {
        if (btn.onclick && btn.onclick.toString().includes(sectionName)) {
            btn.style.pointerEvents = 'none';
            btn.setAttribute('aria-busy', 'true');
        }
    });

    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const selectedSection = document.getElementById(`${sectionName}-section`);
    if (selectedSection) {
        selectedSection.classList.add('active');
        
        // Add smooth scroll to section
        selectedSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Load section data with enhanced feedback
    switch(sectionName) {
        case 'customers':
            showToast('Loading customers...', 'info');
            loadCustomers();
            break;
        case 'orders':
            showToast('Loading orders...', 'info');
            loadOrders();
            break;
        case 'books':
            showToast('Loading books...', 'info');
            loadBooks();
            updateBookStats(); // Update book stats when books section is activated
            break;
        case 'billing':
            showToast('Initializing billing system...', 'info');
            // Avoid re-initializing if already initialized recently
            if (!window.__billing_initialized_at || (Date.now() - window.__billing_initialized_at) > 10000) {
                initializeBilling();
                window.__billing_initialized_at = Date.now();
            }
            // Defer history load to next tick to keep UI responsive
            setTimeout(() => loadBillHistory(), 0);
            break;
        case 'reports':
            showToast('Loading reports...', 'info');
            // Load analytics first; then detailed table
            setTimeout(() => {
                Promise.resolve(loadReports()).then(() => loadDetailedReport());
            }, 100);
            // Defer history load as low priority
            setTimeout(() => loadBillHistory(), 300);
            break;
    }
    
    // Reset action buttons after a short delay
    setTimeout(() => {
        actionButtons.forEach(btn => {
            btn.style.pointerEvents = 'auto';
            btn.removeAttribute('aria-busy');
        });
    }, 400);
}

// Load customers
async function loadCustomers() {
    const token = localStorage.getItem('adminToken');
    try {
        const response = await fetch('http://localhost:8080/api/admin/customers', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.ok) {
            const data = await response.json();
            // Handle both array format and object with customers property
            const customers = Array.isArray(data) ? data : (data.customers || data.data || []);
            currentCustomers = customers; // Store current customers
            displayCustomers(customers);
        } else {
            console.error('Failed to load customers from backend, using demo data:', response.status);
            loadDemoCustomers(); // Fallback to demo data
        }
    } catch (error) {
        console.error('Error loading customers from backend, using demo data:', error);
        loadDemoCustomers(); // Fallback to demo data
    }
}

// Display customers with enhanced action buttons
function displayCustomers(customers) {
    const customersTableBody = document.getElementById('customers-table-body');
    if (!customersTableBody) {
        console.error('customers-table-body element not found');
        return;
    }
    
    customersTableBody.innerHTML = '';
    
    if (!customers || customers.length === 0) {
        customersTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="no-data">
                    <div style="text-align: center; padding: 2rem;">
                        <i class="fas fa-users" style="font-size: 3rem; color: #9ca3af; margin-bottom: 1rem;"></i>
                        <h3 style="color: #6b7280; margin-bottom: 0.5rem;">No customers found</h3>
                        <p style="color: #9ca3af;">Add some customers to get started.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    customers.forEach(customer => {
        const row = document.createElement('tr');
        row.className = 'customer-row';
        row.innerHTML = `
            <td>
                <div class="customer-account">
                    <strong>${customer.accountNumber || 'N/A'}</strong>
                </div>
            </td>
            <td>
                <div class="customer-name">
                    <div class="customer-avatar-small">
                        <i class="fas fa-user"></i>
                    </div>
                    <div>
                        <strong>${customer.name || 'N/A'}</strong>
                        <small>${customer.email || ''}</small>
                    </div>
                </div>
            </td>
            <td>${customer.email || 'N/A'}</td>
            <td>${customer.phone || 'N/A'}</td>
            <td>${customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A'}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view-btn" onclick="viewCustomer('${customer.id}')" title="View Customer">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit-btn" onclick="editCustomer('${customer.id}')" title="Edit Customer">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteCustomer('${customer.id}')" title="Delete Customer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        customersTableBody.appendChild(row);
    });
}

// View customer details
function viewCustomer(customerId) {
    console.log('Viewing customer:', customerId);
    
    // Find the customer in current customers
    const customer = currentCustomers ? currentCustomers.find(c => c.id === customerId) : null;
    if (!customer) {
        showToast('Customer not found', 'error');
        return;
    }
    
    // Create and show customer detail modal with enhanced styling
    const modal = document.createElement('div');
    modal.className = 'modal customer-detail-modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content modern-modal">
            <div class="modal-header modern-header">
                <div class="header-content">
                    <div class="header-icon">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="header-text">
                        <h3>Customer Details</h3>
                        <p>View and manage customer information</p>
                    </div>
                </div>
                <button class="close-btn modern-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="modal-body modern-body">
                <div class="customer-profile-section">
                    <div class="customer-avatar-large">
                        <div class="avatar-circle">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="customer-name-display">
                            <h2>${customer.name || 'N/A'}</h2>
                            <span class="account-badge">${customer.accountNumber || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="customer-info-grid">
                    <div class="info-card">
                        <div class="info-icon">
                            <i class="fas fa-envelope"></i>
                        </div>
                        <div class="info-content">
                            <label>Email Address</label>
                            <span class="info-value">${customer.email || 'Not provided'}</span>
                        </div>
                    </div>
                    
                    <div class="info-card">
                        <div class="info-icon">
                            <i class="fas fa-phone"></i>
                        </div>
                        <div class="info-content">
                            <label>Phone Number</label>
                            <span class="info-value">${customer.phone || 'Not provided'}</span>
                        </div>
                    </div>
                    
                    <div class="info-card">
                        <div class="info-icon">
                            <i class="fas fa-calendar-alt"></i>
                        </div>
                        <div class="info-content">
                            <label>Registration Date</label>
                            <span class="info-value">${customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            }) : 'Not available'}</span>
                        </div>
                    </div>
                    
                    <div class="info-card">
                        <div class="info-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="info-content">
                            <label>Status</label>
                            <span class="status-badge-modern active">Active</span>
                        </div>
                    </div>
                </div>
                
                ${customer.address ? `
                <div class="customer-address-section">
                    <div class="section-header">
                        <i class="fas fa-map-marker-alt"></i>
                        <h4>Address Information</h4>
                    </div>
                    <div class="address-content">
                        <p>${customer.address}</p>
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div class="modal-footer modern-footer">
                <div class="action-buttons">
                    <button class="action-btn primary-btn" onclick="editCustomer('${customer.id}')">
                        <i class="fas fa-edit"></i>
                        <span>Edit Customer</span>
                    </button>
                    <button class="action-btn secondary-btn" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                        <span>Close</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Add animation
    setTimeout(() => {
        modal.classList.add('modal-active');
    }, 10);
}

// Delete customer
function deleteCustomer(customerId) {
    if (confirm('Are you sure you want to delete this customer?')) {
        console.log('Deleting customer:', customerId);
        // TODO: Implement customer deletion
        alert('Customer deleted successfully');
        loadCustomers(); // Reload the list
    }
}

// Load demo customers (fallback when backend is not available)
function loadDemoCustomers() {
    console.log('Loading demo customers...');
    
    const demoCustomers = [
        {
            id: '1',
            accountNumber: 'ACC74773',
            name: 'Pasindi Silva',
            email: 'pasindi.silva@email.com',
            phone: '+94 71 234 5678',
            createdAt: '2024-01-15T10:30:00Z'
        },
        {
            id: '2',
            accountNumber: 'ACC74824',
            name: 'Neethumi Perera',
            email: 'neethumi.perera@email.com',
            phone: '+94 77 345 6789',
            createdAt: '2024-01-20T14:15:00Z'
        },
        {
            id: '3',
            accountNumber: 'ACC74702',
            name: 'Pamuditha Fernando',
            email: 'pamuditha.fernando@email.com',
            phone: '+94 76 456 7890',
            createdAt: '2024-02-05T09:45:00Z'
        },
        {
            id: '4',
            accountNumber: 'ACC74767',
            name: 'Sithara Roshana',
            email: 'sithara.roshana@email.com',
            phone: '+94 75 567 8901',
            createdAt: '2024-02-10T16:20:00Z'
        },
        {
            id: '5',
            accountNumber: 'ACC74895',
            name: 'Dilshan Kumar',
            email: 'dilshan.kumar@email.com',
            phone: '+94 78 678 9012',
            createdAt: '2024-02-15T11:30:00Z'
        },
        {
            id: '6',
            accountNumber: 'ACC74912',
            name: 'Anjali Patel',
            email: 'anjali.patel@email.com',
            phone: '+94 79 789 0123',
            createdAt: '2024-02-20T13:45:00Z'
        }
    ];
    
    displayCustomers(demoCustomers);
}

// Load orders with enhanced functionality
async function loadOrders() {
    const token = localStorage.getItem('adminToken');
    try {
        const response = await fetch('http://localhost:8080/api/admin/orders', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.ok) {
            const data = await response.json();
            // Handle both array format and object with orders property
            const orders = Array.isArray(data) ? data : (data.orders || data.data || []);
            currentOrders = orders; // Store current orders
            displayOrders(orders);
        } else {
            console.error('Failed to load orders:', response.status);
            displayOrders([]);
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        displayOrders([]);
    }
}

// Display orders with enhanced action buttons
function displayOrders(orders) {
    const ordersTableBody = document.getElementById('orders-table-body');
    if (!ordersTableBody) {
        console.error('orders-table-body element not found');
        return;
    }
    
    ordersTableBody.innerHTML = '';
    
    if (!orders || orders.length === 0) {
        ordersTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="no-data">
                    <div style="text-align: center; padding: 2rem;">
                        <i class="fas fa-shopping-cart" style="font-size: 3rem; color: #9ca3af; margin-bottom: 1rem;"></i>
                        <h3 style="color: #6b7280; margin-bottom: 0.5rem;">No orders found</h3>
                        <p style="color: #9ca3af;">Orders will appear here when customers make purchases.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    orders.forEach(order => {
        const row = document.createElement('tr');
        row.className = 'order-row';
        row.innerHTML = `
            <td>
                <div class="order-id">
                    <strong>${order.id || 'N/A'}</strong>
                </div>
            </td>
            <td>
                <div class="customer-info">
                    <div class="customer-avatar-small">
                        <i class="fas fa-user"></i>
                    </div>
                    <div>
                        <strong>${order.customerName || 'Guest'}</strong>
                    </div>
                </div>
            </td>
            <td>${order.bookTitle || 'N/A'}</td>
            <td>
                <span class="quantity-badge">${order.quantity || 0}</span>
            </td>
            <td>
                <div class="price-info">
                    <strong>Rs. ${order.totalPrice || 0}</strong>
                </div>
            </td>
            <td>
                <span class="status-badge ${order.status?.toLowerCase()}">${order.status || 'PENDING'}</span>
            </td>
            <td>${order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view-btn" onclick="viewOrder('${order.id}')" title="View Order">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit-btn" onclick="editOrder('${order.id}')" title="Edit Order">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteOrder('${order.id}')" title="Delete Order">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        ordersTableBody.appendChild(row);
    });
}

// Order action functions
async function viewOrder(orderId) {
    console.log('Viewing order:', orderId);
    
    // Find the order in current orders
    const order = currentOrders ? currentOrders.find(o => o.id === orderId) : null;
    if (!order) {
        alert('Order not found');
        return;
    }
    
    console.log('=== ORDER DETAILS FOR IMAGE SEARCH ===');
    console.log('Order ID:', order.id);
    console.log('Book ID:', order.bookId);
    console.log('Book Title:', order.bookTitle);
    console.log('Customer:', order.customerName);
    console.log('========================================');
    
    // Fetch book details including image from backend
    let bookImage = null;
    let bookDetails = null;
    
    try {
        // First try to get book by exact ID if available
        if (order.bookId) {
            console.log('Trying to fetch book by ID:', order.bookId);
            const bookResponse = await fetch(`http://localhost:8080/api/books/${order.bookId}`);
            console.log('Book API response status:', bookResponse.status);
            if (bookResponse.ok) {
                const bookResponseData = await bookResponse.json();
                console.log('Book API response data:', bookResponseData);
                
                // The API returns {success: true, book: {...}}
                if (bookResponseData.success && bookResponseData.book) {
                    bookDetails = bookResponseData.book;
                    console.log('Found book by ID:', bookDetails);
                    if (bookDetails && bookDetails.imageUrl) {
                        bookImage = bookDetails.imageUrl;
                        console.log('Using real book image from database (by ID):', bookImage);
                    } else {
                        console.log('Book found but no imageUrl:', bookDetails);
                    }
                } else {
                    console.log('Book API response format unexpected:', bookResponseData);
                }
            } else {
                console.log('Book not found by ID, response status:', bookResponse.status);
                const errorText = await bookResponse.text();
                console.log('Error response:', errorText);
            }
        } else {
            console.log('No bookId found in order, will try title matching');
        }
        
        // If no bookId or book not found by ID, try to find by title
        if (!bookDetails) {
            console.log('Fetching all books to find by title:', order.bookTitle);
            const response = await fetch(`http://localhost:8080/api/books`);
            if (response.ok) {
                const booksResponseData = await response.json();
                console.log('Books API response data:', booksResponseData);
                
                // The API returns {success: true, books: [...], ...}
                let books = [];
                if (booksResponseData.success && booksResponseData.books) {
                    books = booksResponseData.books;
                } else if (Array.isArray(booksResponseData)) {
                    // Fallback if it returns array directly
                    books = booksResponseData;
                } else {
                    console.log('Unexpected books API response format:', booksResponseData);
                    books = [];
                }
                console.log('Fetched books from database:', books.length, 'books');
                
                // Try multiple matching strategies to find the book
                bookDetails = books.find(book => {
                    console.log('Comparing:', book.title, 'with', order.bookTitle);
                    
                    // Exact match first
                    if (book.title === order.bookTitle) {
                        console.log('Found exact title match');
                        return true;
                    }
                    
                    // Case insensitive match
                    if (book.title && book.title.toLowerCase() === order.bookTitle?.toLowerCase()) {
                        console.log('Found case-insensitive match');
                        return true;
                    }
                    
                    // Partial match (in case of slight differences)
                    if (book.title && order.bookTitle && 
                        book.title.toLowerCase().includes(order.bookTitle.toLowerCase().substring(0, 10))) {
                        console.log('Found partial match');
                        return true;
                    }
                    
                    return false;
                });
                
                console.log('Found matching book by title:', bookDetails);
                
                if (bookDetails && bookDetails.imageUrl) {
                    bookImage = bookDetails.imageUrl;
                    console.log('Using real book image from database (by title):', bookImage);
                } else if (bookDetails) {
                    console.log('Book found but no imageUrl available');
                } else {
                    console.log('No matching book found in database');
                }
            } else {
                console.log('Failed to fetch books, response status:', response.status);
            }
        }
    } catch (error) {
        console.log('Error fetching book image from backend:', error);
    }
    
    // Set a good default book image
    if (!bookImage) {
        // Use a nice book cover placeholder with proper styling
        bookImage = `https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300&h=400&fit=crop&auto=format`;
        console.log('Using fallback image:', bookImage); // Debug log
    }
    
    // Create and show modern order detail modal
    const modal = document.createElement('div');
    modal.className = 'modal modern-order-modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modern-modal-content">
            <div class="modern-modal-header">
                <div class="modal-header-content">
                    <div class="modal-icon">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <h2>Order Details</h2>
                </div>
                <button class="modern-close-btn" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="modern-modal-body">
                <div class="order-header-section">
                    <div class="order-id-badge">
                        Order #${order.id}
                    </div>
                    <div class="order-date">
                        <i class="fas fa-calendar"></i>
                        ${order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        }) : 'Date not available'}
                    </div>
                </div>
                
                <div class="order-main-content">
                    <div class="book-preview-section">
                        <div class="book-image-container">
                            <img src="${bookImage}" alt="${order.bookTitle || 'Book'}" class="book-cover-image" 
                                 onerror="this.src='https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=400&fit=crop&auto=format'; console.log('Image failed to load, using fallback');"
                                 onload="console.log('Image loaded successfully:', this.src);">
                            <div class="book-overlay">
                                <div class="book-status">
                                    <span class="modern-status-badge ${order.status?.toLowerCase()}">${order.status || 'PENDING'}</span>
                                </div>
                            </div>
                        </div>
                        <div class="book-info">
                            <h3 class="book-title">${order.bookTitle || 'Unknown Book'}</h3>
                            ${bookDetails ? `
                                <p class="book-author"><i class="fas fa-user"></i> ${bookDetails.author || 'Unknown Author'}</p>
                                <p class="book-category"><i class="fas fa-tag"></i> ${bookDetails.category || 'Uncategorized'}</p>
                                <p class="book-format"><i class="fas fa-book-open"></i> ${bookDetails.format || 'Physical'}</p>
                            ` : `<p class="book-author"><i class="fas fa-user"></i> Author not available</p>`}
                        </div>
                    </div>
                    
                    <div class="order-details-section">
                        <div class="details-grid">
                            <div class="detail-card customer-card">
                                <div class="detail-icon">
                                    <i class="fas fa-user-circle"></i>
                                </div>
                                <div class="detail-content">
                                    <div class="detail-label">Customer</div>
                                    <div class="detail-value">${order.customerName || 'Guest Customer'}</div>
                                </div>
                            </div>
                            
                            <div class="detail-card quantity-card">
                                <div class="detail-icon">
                                    <i class="fas fa-cubes"></i>
                                </div>
                                <div class="detail-content">
                                    <div class="detail-label">Quantity</div>
                                    <div class="detail-value">${order.quantity || 0} ${(order.quantity || 0) === 1 ? 'item' : 'items'}</div>
                                </div>
                            </div>
                            
                            <div class="detail-card price-card">
                                <div class="detail-icon">
                                    <i class="fas fa-rupee-sign"></i>
                                </div>
                                <div class="detail-content">
                                    <div class="detail-label">Total Price</div>
                                    <div class="detail-value">Rs. ${(order.totalPrice || 0).toLocaleString()}</div>
                                </div>
                            </div>
                            
                            <div class="detail-card status-card">
                                <div class="detail-icon">
                                    <i class="fas fa-info-circle"></i>
                                </div>
                                <div class="detail-content">
                                    <div class="detail-label">Order Status</div>
                                    <div class="detail-value">
                                        <span class="modern-status-badge ${order.status?.toLowerCase()}">${order.status || 'PENDING'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        ${bookDetails && bookDetails.description ? `
                            <div class="book-description-section">
                                <h4><i class="fas fa-align-left"></i> Book Description</h4>
                                <p class="book-description">${bookDetails.description}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="modern-modal-footer">
                    <button class="modern-action-btn edit-btn" onclick="editOrder('${order.id}')">
                        <i class="fas fa-edit"></i>
                        <span>Edit Order</span>
                    </button>
                    <button class="modern-action-btn close-btn" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                        <span>Close</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add animation
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function editOrder(orderId) {
    console.log('Editing order:', orderId);
    
    // Find the order in current orders
    const order = currentOrders ? currentOrders.find(o => o.id === orderId) : null;
    if (!order) {
        alert('Order not found');
        return;
    }
    
    // Create and show modern edit order modal
    const modal = document.createElement('div');
    modal.className = 'modal modern-order-modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modern-modal-content">
            <div class="modern-modal-header">
                <div class="modal-header-content">
                    <div class="modal-icon">
                        <i class="fas fa-edit"></i>
                    </div>
                    <h2>Edit Order</h2>
                </div>
                <button class="modern-close-btn" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="modern-modal-body">
                <div class="order-header-section">
                    <div class="order-id-badge">
                        Order #${order.id}
                    </div>
                    <div class="order-date">
                        <i class="fas fa-calendar"></i>
                        ${order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        }) : 'Date not available'}
                    </div>
                </div>
                
                <div class="order-details-section">
                    <h4><i class="fas fa-edit"></i> Edit Order Details</h4>
                    <form id="edit-order-form">
                        <div class="details-grid">
                            <div class="detail-card customer-card">
                                <div class="detail-icon">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div class="detail-content">
                                    <div class="detail-label">CUSTOMER</div>
                                    <div class="detail-value">
                                        <input type="text" id="edit-order-customer" value="${order.customerName || 'Guest'}" required>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="detail-card quantity-card">
                                <div class="detail-icon">
                                    <i class="fas fa-hashtag"></i>
                                </div>
                                <div class="detail-content">
                                    <div class="detail-label">QUANTITY</div>
                                    <div class="detail-value">
                                        <input type="number" id="edit-order-quantity" value="${order.quantity || 1}" min="1" required>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="detail-card price-card">
                                <div class="detail-icon">
                                    <i class="fas fa-rupee-sign"></i>
                                </div>
                                <div class="detail-content">
                                    <div class="detail-label">TOTAL PRICE (RS.)</div>
                                    <div class="detail-value">
                                        <input type="number" id="edit-order-price" value="${order.totalPrice || 0}" step="0.01" required>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="detail-card status-card">
                                <div class="detail-icon">
                                    <i class="fas fa-info-circle"></i>
                                </div>
                                <div class="detail-content">
                                    <div class="detail-label">STATUS</div>
                                    <div class="detail-value">
                                        <select id="edit-order-status" required>
                                            <option value="PENDING" ${order.status === 'PENDING' ? 'selected' : ''}>Pending</option>
                                            <option value="COMPLETED" ${order.status === 'COMPLETED' ? 'selected' : ''}>Completed</option>
                                            <option value="CANCELLED" ${order.status === 'CANCELLED' ? 'selected' : ''}>Cancelled</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                
                <div class="modern-modal-footer">
                    <button class="modern-action-btn close-btn" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                        <span>Cancel</span>
                    </button>
                    <button class="modern-action-btn edit-btn" onclick="saveOrderChanges('${order.id}')">
                        <i class="fas fa-save"></i>
                        <span>Save Changes</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add animation
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function saveOrderChanges(orderId) {
    // Get form values
    const formData = {
        customerName: document.getElementById('edit-order-customer').value,
        quantity: parseInt(document.getElementById('edit-order-quantity').value),
        totalPrice: parseFloat(document.getElementById('edit-order-price').value),
        status: document.getElementById('edit-order-status').value
    };
    
    // Debug: Log the form data being sent
    console.log('=== SAVE ORDER CHANGES ===');
    console.log('Order ID:', orderId);
    console.log('Form Data:', formData);
    console.log('Form Data JSON:', JSON.stringify(formData));
    
    // Validate required fields
    if (!formData.customerName || formData.quantity <= 0 || formData.totalPrice <= 0) {
        showToast('Please fill in all required fields correctly.', 'error');
        return;
    }
    
    // Show loading state
    const saveButton = document.querySelector('.modern-action-btn.edit-btn');
    const originalText = saveButton.innerHTML;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Saving...</span>';
    saveButton.disabled = true;
    
    // Send update to backend - using the comprehensive order update endpoint
    const token = localStorage.getItem('adminToken');
    console.log('Admin Token:', token ? 'Present' : 'Missing');
    
    if (!token) {
        showToast('Authentication required. Please log in again.', 'error');
        saveButton.innerHTML = originalText;
        saveButton.disabled = false;
        return;
    }
    
    fetch(`http://localhost:8080/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
    })
    .then(response => {
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Response data:', data);
        if (data.success) {
            showToast('Order updated successfully!', 'success');
            document.querySelector('.modal').remove();
            
            // Update all relevant data
            loadOrders(); // Reload order list
            loadRecentOrders(); // Update recent orders in dashboard
            loadDashboardData(); // Refresh dashboard stats
            
            // Trigger customer dashboard update
            updateCustomerDashboard();
            
        } else {
            showToast('Error updating order: ' + (data.message || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        console.error('Error updating order:', error);
        showToast('Error updating order: ' + error.message, 'error');
    })
    .finally(() => {
        // Restore button state
        saveButton.innerHTML = originalText;
        saveButton.disabled = false;
    });
}

// Function to update customer dashboard
function updateCustomerDashboard() {
    console.log('Updating customer dashboard...');
    
    // If customer dashboard is open in another tab/window, send a message
    if (window.opener && !window.opener.closed) {
        try {
            window.opener.postMessage({ type: 'ORDER_UPDATED' }, '*');
        } catch (e) {
            console.log('Could not notify parent window');
        }
    }
    
    // Broadcast to other tabs
    if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('order_updates');
        channel.postMessage({ type: 'ORDER_UPDATED', timestamp: Date.now() });
    }
    
    // Also try localStorage for cross-tab communication
    localStorage.setItem('orderUpdateTrigger', Date.now().toString());
}

// Load demo orders (fallback when backend is not available)
function loadDemoOrders() {
    console.log('Loading demo orders...');
    
    const demoOrders = [
        {
            id: 'ORD001',
            customerName: 'Pasindi Silva',
            bookTitle: 'The Great Gatsby',
            quantity: 2,
            totalPrice: 3000,
            status: 'COMPLETED',
            orderDate: '2024-01-15T10:30:00Z'
        },
        {
            id: 'ORD002',
            customerName: 'Neethumi Perera',
            bookTitle: 'To Kill a Mockingbird',
            quantity: 1,
            totalPrice: 1200,
            status: 'PENDING',
            orderDate: '2024-01-20T14:15:00Z'
        },
        {
            id: 'ORD003',
            customerName: 'Pamuditha Fernando',
            bookTitle: '1984',
            quantity: 1,
            totalPrice: 1800,
            status: 'COMPLETED',
            orderDate: '2024-02-05T09:45:00Z'
        },
        {
            id: 'ORD004',
            customerName: 'Sithara Roshana',
            bookTitle: 'Pride and Prejudice',
            quantity: 3,
            totalPrice: 2700,
            status: 'PENDING',
            orderDate: '2024-02-10T16:20:00Z'
        }
    ];
    
    displayOrders(demoOrders);
}

// Load books with advanced filtering
async function loadBooks(page = 0) {
    try {
        const params = new URLSearchParams();
        
        if (currentFilters.search) params.append('search', currentFilters.search);
        if (currentFilters.status) params.append('status', currentFilters.status);
        if (currentFilters.minPrice) params.append('minPrice', currentFilters.minPrice);
        if (currentFilters.maxPrice) params.append('maxPrice', currentFilters.maxPrice);
        if (currentFilters.sortBy) params.append('sortBy', currentFilters.sortBy);
        if (currentFilters.sortOrder) params.append('sortOrder', currentFilters.sortOrder);
        
        params.append('page', page);
        params.append('size', 12);

        const response = await fetch(`http://localhost:8080/api/books?${params}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Backend response:', data);
            
            // Handle both array format and object with books property
            const books = Array.isArray(data) ? data : (data.books || data.data || []);
            currentBooks = books;
            currentPage = data.currentPage || 0;
            totalPages = data.totalPages || 1;
            displayBooks(books);
            updateBookStats(); // Update stats after loading books
            generatePagination();
        } else {
            console.error('Failed to load books:', response.status);
            displayBooks([]);
            updateBookStats(); // Update stats even if no books
        }
    } catch (error) {
        console.error('Error loading books:', error);
        displayBooks([]);
        updateBookStats(); // Update stats on error
    }
}

// Load book statistics
async function updateBookStats() {
    try {
        const response = await fetch('http://localhost:8080/api/books/stats');
        if (response.ok) {
            const data = await response.json();
            console.log('Book stats response:', data);
            
            // Handle both array format and object with stats property
            const stats = Array.isArray(data) ? data : (data.stats || data.data || {});
            
            // Update book statistics in the Books section
            const totalBooksElement = document.getElementById('total-books-count');
            const inStockElement = document.getElementById('in-stock-count');
            const lowStockElement = document.getElementById('low-stock-count');
            const outOfStockElement = document.getElementById('out-of-stock-count');
            
            if (totalBooksElement) {
                totalBooksElement.textContent = stats.totalBooks || stats.total || 0;
            }
            if (inStockElement) {
                inStockElement.textContent = stats.inStockQuantity || stats.inStockBooks || stats.inStock || 0;
            }
            if (lowStockElement) {
                lowStockElement.textContent = stats.lowStockQuantity || stats.lowStockBooks || stats.lowStock || 0;
            }
            if (outOfStockElement) {
                outOfStockElement.textContent = stats.outOfStockQuantity || stats.outOfStockBooks || stats.outOfStock || 0;
            }
            
            // Also update dashboard stats if available
            if (stats.totalBooks) {
                const dashboardBooksElement = document.getElementById('total-books');
                if (dashboardBooksElement) {
                    dashboardBooksElement.textContent = stats.totalBooks;
                }
            }
            
            console.log('Book stats updated successfully');
        } else {
            console.error('Failed to load book stats:', response.status);
            // Set default values
            setDefaultBookStats();
        }
    } catch (error) {
        console.error('Error loading book stats:', error);
        // Set default values on error
        setDefaultBookStats();
    }
}

// Set default book statistics
function setDefaultBookStats() {
    const elements = ['total-books-count', 'in-stock-count', 'low-stock-count', 'out-of-stock-count'];
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = '0';
        }
    });
}

// Display books in grid with enhanced features
function displayBooks(books) {
    console.log('Displaying books:', books);
    const grid = document.getElementById('books-grid');
    if (!grid) {
        console.error('books-grid element not found');
        return;
    }
    
    grid.innerHTML = '';
    
    if (!books || books.length === 0) {
        grid.innerHTML = `
            <div class="no-books" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <i class="fas fa-book-open" style="font-size: 3rem; color: #9ca3af; margin-bottom: 1rem;"></i>
                <h3 style="color: #6b7280; margin-bottom: 0.5rem;">No books found</h3>
                <p style="color: #9ca3af;">Try adjusting your filters or add some books.</p>
            </div>
        `;
        return;
    }
    
    books.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        
        const statusClass = getStatusClass(book.status);
        const statusText = getStatusText(book.status);
        
        bookCard.innerHTML = `
            <div class="book-image">
                <img src="${book.imageUrl || 'https://via.placeholder.com/200x300?text=Book'}" alt="${book.title}" onerror="this.src='https://via.placeholder.com/200x300?text=Book'">
                <div class="book-status ${statusClass}">${statusText}</div>
            </div>
            <div class="book-content">
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">by ${book.author}</p>
                <div class="book-details">
                    <div class="book-detail-item">
                        <span class="book-detail-label">Price:</span>
                        <span class="book-detail-value">Rs. ${book.price}</span>
                    </div>
                    <div class="book-detail-item">
                        <span class="book-detail-label">Stock:</span>
                        <span class="book-detail-value">${book.stockQuantity || 0}</span>
                    </div>
                    <div class="book-detail-item">
                        <span class="book-detail-label">Rating:</span>
                        <span class="book-detail-value">${generateStarRating(book.rating || 0)}</span>
                    </div>
                </div>
                <div class="book-actions">
                    <div class="action-buttons">
                        <button class="view-btn" onclick="viewBook('${book.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="edit-btn" onclick="editBook('${book.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="stock-btn" onclick="updateStock('${book.id}')">
                            <i class="fas fa-box"></i> Stock
                        </button>
                        <button class="archive-btn danger" onclick="deleteBook('${book.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        grid.appendChild(bookCard);
    });
}

// Generate star rating HTML
function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return `<div class="stars">${stars}</div>`;
}

// Get status class for styling
function getStatusClass(status) {
    switch(status) {
        case 'IN_STOCK': return 'in-stock';
        case 'LOW_STOCK': return 'low-stock';
        case 'OUT_OF_STOCK': return 'out-of-stock';
        default: return 'unknown';
    }
}

// Get status text for display
function getStatusText(status) {
    switch(status) {
        case 'IN_STOCK': return 'In Stock';
        case 'LOW_STOCK': return 'Low Stock';
        case 'OUT_OF_STOCK': return 'Out of Stock';
        default: return 'Unknown';
    }
}

// NOTE: The advanced loadReports implementation is defined earlier in this file (around line ~100).
// We intentionally remove the duplicate lightweight version here to avoid overriding the full
// analytics loader which renders charts, top books, recent bills, and payment method revenue.

// Delete book
async function deleteBook(bookId) {
    if (!confirm('Are you sure you want to delete this book?')) return;
    
    const token = localStorage.getItem('adminToken');
    try {
        const response = await fetch(`http://localhost:8080/api/books/${bookId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            alert('Book deleted successfully');
            loadBooks(currentPage);
        } else {
            alert('Error deleting book');
        }
    } catch (error) {
        console.error('Error deleting book:', error);
        alert('Error deleting book');
    }
}

// Delete order
async function deleteOrder(orderId) {
    console.log('=== DELETE ORDER REQUEST ===');
    console.log('Order ID:', orderId);
    
    if (!confirm('Are you sure you want to delete this order?')) {
        console.log('User cancelled deletion');
        return;
    }
    
    const token = localStorage.getItem('adminToken');
    console.log('Admin Token:', token ? 'Present' : 'Missing');
    
    if (!token) {
        showToast('Authentication required. Please log in again.', 'error');
        return;
    }
    
    try {
        const url = `http://localhost:8080/api/admin/orders/${orderId}`;
        console.log('Making DELETE request to:', url);
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success) {
            showToast('Order deleted successfully!', 'success');
            loadOrders(); // Reload order list
            loadRecentOrders(); // Update recent orders in dashboard
            loadDashboardData(); // Refresh dashboard stats
        } else {
            showToast('Error deleting order: ' + (data.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error deleting order:', error);
        showToast('Error deleting order: ' + error.message, 'error');
    }
}

// Search customers (filters the table rows using cached customer list)
function searchCustomers() {
    const term = (document.getElementById('customer-search')?.value || '').trim().toLowerCase();
    if (!currentCustomers || !Array.isArray(currentCustomers)) return;
    if (!term) {
        // Show full list when query is empty
        return displayCustomers(currentCustomers);
    }
    const filtered = currentCustomers.filter(c => {
        const fields = [c.accountNumber, c.name, c.email, c.phone];
        return fields.some(v => String(v || '').toLowerCase().includes(term));
    });
    displayCustomers(filtered);
}

// Apply book filters
function applyBookFilters() {
    const searchTerm = document.getElementById('book-search').value.toLowerCase();
    const statusFilter = document.getElementById('books-status-filter').value;
    const minPrice = parseFloat(document.getElementById('min-price').value) || 0;
    const maxPrice = parseFloat(document.getElementById('max-price').value) || Infinity;
    const sortBy = document.getElementById('sort-filter').value;
    
    // Update current filters
    currentFilters = {
        search: searchTerm,
        status: statusFilter,
        minPrice: minPrice,
        maxPrice: maxPrice,
        sortBy: sortBy,
        sortOrder: 'asc'
    };
    
    // Reload books with filters
    loadBooks(0);
}

// Clear book filters
function clearBookFilters() {
    // Clear filter inputs
    document.getElementById('book-search').value = '';
    document.getElementById('books-status-filter').value = '';
    document.getElementById('min-price').value = '';
    document.getElementById('max-price').value = '';
    document.getElementById('sort-filter').value = 'title';
    
    // Reset current filters
    currentFilters = {
        search: '',
        status: '',
        minPrice: null,
        maxPrice: null,
        sortBy: 'title',
        sortOrder: 'asc'
    };
    
    // Reload books without filters
    loadBooks(0);
}

// Generate pagination
function generatePagination() {
    const paginationContainer = document.getElementById('book-pagination');
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    if (currentPage > 0) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = 'Previous';
        prevBtn.className = 'pagination-btn';
        prevBtn.onclick = () => loadBooks(currentPage - 1);
        paginationContainer.appendChild(prevBtn);
    }
    
    // Page numbers
    const startPage = Math.max(0, currentPage - 2);
    const endPage = Math.min(totalPages - 1, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i + 1;
        pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.onclick = () => loadBooks(i);
        paginationContainer.appendChild(pageBtn);
    }
    
    // Next button
    if (currentPage < totalPages - 1) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next';
        nextBtn.className = 'pagination-btn';
        nextBtn.onclick = () => loadBooks(currentPage + 1);
        paginationContainer.appendChild(nextBtn);
    }
}

// Load demo books (fallback when backend is not available)
function loadDemoBooks() {
    console.log('Loading demo books...');
    
    // Enhanced demo books with more realistic data
    const demoBooks = [
        {
            id: '1',
            title: 'The Great Gatsby',
            author: 'F. Scott Fitzgerald',
            description: 'A story of the fabulously wealthy Jay Gatsby and his love for the beautiful Daisy Buchanan.',
            price: 1500,
            stockQuantity: 25,
            status: 'IN_STOCK',
            rating: 4.5,
            ratingCount: 120,
            imageUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300'
        },
        {
            id: '2',
            title: 'To Kill a Mockingbird',
            author: 'Harper Lee',
            description: 'The story of young Scout Finch and her father Atticus in a racially divided Alabama town.',
            price: 1200,
            stockQuantity: 18,
            status: 'IN_STOCK',
            rating: 4.8,
            ratingCount: 95,
            imageUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300'
        },
        {
            id: '3',
            title: '1984',
            author: 'George Orwell',
            description: 'A dystopian novel about totalitarianism and surveillance society.',
            price: 1800,
            stockQuantity: 0,
            status: 'OUT_OF_STOCK',
            rating: 4.3,
            ratingCount: 87,
            imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300'
        },
        {
            id: '4',
            title: 'Pride and Prejudice',
            author: 'Jane Austen',
            description: 'A classic romance novel about the relationship between Elizabeth Bennet and Mr. Darcy.',
            price: 900,
            stockQuantity: 3,
            status: 'LOW_STOCK',
            rating: 4.6,
            ratingCount: 156,
            imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300'
        },
        {
            id: '5',
            title: 'Mistborn: The Final Empire',
            author: 'Brandon Sanderson',
            description: 'A fantasy novel about a young woman who joins a group of thieves to overthrow a tyrant.',
            price: 1350,
            stockQuantity: 12,
            status: 'IN_STOCK',
            rating: 4.7,
            ratingCount: 203,
            imageUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300'
        },
        {
            id: '6',
            title: 'Lord of the Rings',
            author: 'J.R.R. Tolkien',
            description: 'An epic fantasy novel about a quest to destroy a powerful ring.',
            price: 1500,
            stockQuantity: 8,
            status: 'IN_STOCK',
            rating: 4.9,
            ratingCount: 342,
            imageUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300'
        },
        {
            id: '7',
            title: 'Harry Potter and the Sorcerer\'s Stone',
            author: 'J.K. Rowling',
            description: 'The first book in the Harry Potter series about a young wizard.',
            price: 1100,
            stockQuantity: 2,
            status: 'LOW_STOCK',
            rating: 4.8,
            ratingCount: 567,
            imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300'
        },
        {
            id: '8',
            title: 'The Hobbit',
            author: 'J.R.R. Tolkien',
            description: 'A fantasy novel about Bilbo Baggins\' journey with thirteen dwarves.',
            price: 950,
            stockQuantity: 15,
            status: 'IN_STOCK',
            rating: 4.6,
            ratingCount: 234,
            imageUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300'
        }
    ];
    
    currentBooks = demoBooks;
    displayBooks(demoBooks);
    updateDemoBookStats(demoBooks);
}

// Filter orders
function filterOrders() {
    const status = document.getElementById('orders-status-filter')?.value || '';
    const date = document.getElementById('date-filter')?.value || '';
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
        const statusCell = row.querySelector('td:nth-child(6)');
        const dateCell = row.querySelector('td:nth-child(7)');
        const matchesStatus = !status || (statusCell && statusCell.textContent.trim().toUpperCase() === status);
        const matchesDate = !date || (dateCell && new Date(dateCell.textContent).toDateString() === new Date(date).toDateString());
        row.style.display = matchesStatus && matchesDate ? '' : 'none';
    });
}

// Logout function
function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = 'admin-login.html';
}

// Billing system functions
function clearDemoBills() {
    localStorage.removeItem('demoBills');
    console.log('Demo bills cleared');
}

// Test billing system
async function testBillingSystem() {
    console.log('Testing billing system...');
    
    // Test backend availability
    const isBackendAvailable = await checkBackendStatus();
    console.log('Backend available:', isBackendAvailable);
    
    // Test customer fetch
    try {
        const response = await fetch('http://localhost:8080/api/billing/customer/ACC74773');
        if (response.ok) {
            const data = await response.json();
            console.log('Customer fetch test:', data.success);
        }
    } catch (error) {
        console.error('Customer fetch test failed:', error);
    }
}

// Check if backend is available
async function isBackendAvailable() {
    try {
        const response = await fetch('http://localhost:8080/api/books');
        return response.ok;
    } catch (error) {
        return false;
    }
}

// Initialize billing with backend check
async function initializeBillingWithBackendCheck() {
    const isBackendAvailable = await checkBackendStatus();
    if (isBackendAvailable) {
        console.log('Backend available, initializing with real data');
        await populateBookSelect();
    } else {
        console.log('Backend not available, using demo data');
        populateBookSelectWithDemo();
    }
}

// Initialize billing system
async function initializeBilling() {
    console.log('Initializing billing system...');
    
    // Check backend status
    const isBackendAvailable = await checkBackendStatus();
    updateBackendStatus(isBackendAvailable);
    
    // Setup event listeners
    setupBillingEventListeners();
    
    // Populate book select
    if (isBackendAvailable) {
        await populateBookSelect();
    } else {
        populateBookSelectWithDemo();
    }
    
    // Load bill history from real database
    setTimeout(() => {
        loadBillHistory();
    }, 500);
}

// Update backend status display
function updateBackendStatus(isAvailable) {
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    
    if (statusIndicator && statusText) {
        if (isAvailable) {
            statusIndicator.className = 'status-indicator online';
            statusText.textContent = 'Backend Online';
        } else {
            statusIndicator.className = 'status-indicator offline';
            statusText.textContent = 'Backend Offline (Using Demo Data)';
        }
    }
}

// Check backend status
async function checkBackendStatus() {
    try {
        const response = await fetch('http://localhost:8080/api/books');
        return response.ok;
    } catch (error) {
        console.error('Backend status check failed:', error);
        return false;
    }
}

// Populate book select from backend
async function populateBookSelect() {
    try {
        const response = await fetch('http://localhost:8080/api/books/all');
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.books) {
                availableBooks = data.books.map(book => ({
                    id: book.id,
                    title: book.title,
                    price: book.price
                }));
                populateBookSelectWithDemo();
            }
        }
    } catch (error) {
        console.error('Error populating book select:', error);
        populateBookSelectWithDemo();
    }
}

// Populate book select with demo data
function populateBookSelectWithDemo() {
    const bookSelect = document.getElementById('book-select');
    if (!bookSelect) return;
    
    bookSelect.innerHTML = '<option value="">Select a book</option>';
    availableBooks.forEach(book => {
        const option = document.createElement('option');
        option.value = book.id;
        option.textContent = `${book.title} - Rs. ${book.price}`;
        bookSelect.appendChild(option);
    });
}

// Setup billing event listeners
function setupBillingEventListeners() {
    // Add form submission handler
    const billingForm = document.getElementById('billing-form');
    if (billingForm) {
        billingForm.addEventListener('submit', handleBillingSubmit);
    }
    
    // Add event listeners for discount and tax changes
    const discountType = document.getElementById('discount-type');
    const discountValue = document.getElementById('discount-value');
    const taxType = document.getElementById('tax-type');
    
    if (discountType) {
        discountType.addEventListener('change', updateDiscount);
    }
    
    if (discountValue) {
        discountValue.addEventListener('input', updateDiscount);
    }
    
    if (taxType) {
        taxType.addEventListener('change', updateTax);
    }
    
    // Add event listener for quantity changes
    const quantityInput = document.getElementById('book-quantity');
    if (quantityInput) {
        quantityInput.addEventListener('input', updateBookSubtotal);
    }
}

// Fetch customer by account number
async function fetchCustomer() {
    const accountNumber = document.getElementById('customer-account').value;
    const customerNameInput = document.getElementById('customer-name');
    
    if (!accountNumber) {
        showToast('Please enter an account number', 'error');
        return;
    }
    
    try {
        // Fetch from billing API
        const response = await fetch(`http://localhost:8080/api/billing/customer/${accountNumber}`);
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.customer) {
                selectedCustomer = data.customer;
                customerNameInput.value = data.customer.name;
                showImportantToast('Customer found successfully', 'success');
                return;
            }
        }
        
        // If billing API fails, try admin customers API
        const adminResponse = await fetch(`http://localhost:8080/api/admin/customers`);
        if (adminResponse.ok) {
            const customers = await adminResponse.json();
            const customer = customers.find(c => c.accountNumber === accountNumber);
            if (customer) {
                selectedCustomer = customer;
                customerNameInput.value = customer.name;
                showImportantToast('Customer found successfully', 'success');
                return;
            }
        }
        
        showToast('Customer not found. Please check the account number.', 'error');
        customerNameInput.value = '';
        selectedCustomer = null;
    } catch (error) {
        console.error('Error fetching customer:', error);
        showToast('Error fetching customer. Please try again.', 'error');
        customerNameInput.value = '';
        selectedCustomer = null;
    }
}

// Update book price when book is selected
function updateBookPrice() {
    const bookSelect = document.getElementById('book-select');
    const priceInput = document.getElementById('book-price');
    
    if (bookSelect && priceInput) {
        const selectedBook = availableBooks.find(book => book.id === bookSelect.value);
        if (selectedBook) {
            priceInput.value = selectedBook.price;
            updateBookSubtotal();
        }
    }
}

// Update book subtotal when quantity changes
function updateBookSubtotal() {
    const quantity = document.getElementById('book-quantity').value;
    const price = document.getElementById('book-price').value;
    
    if (quantity && price) {
        const subtotal = quantity * price;
        // Update subtotal display if there's a subtotal field
        const subtotalDisplay = document.getElementById('book-subtotal');
        if (subtotalDisplay) {
            subtotalDisplay.value = subtotal.toFixed(2);
        }
        console.log('Subtotal:', subtotal);
    }
}

// Add book to bill
function addBookToBill() {
    const bookSelect = document.getElementById('book-select');
    const quantityInput = document.getElementById('book-quantity');
    const priceInput = document.getElementById('book-price');
    
    if (!bookSelect.value) {
        showToast('Please select a book', 'error');
        return;
    }
    
    if (!quantityInput.value || quantityInput.value <= 0) {
        showToast('Please enter a valid quantity', 'error');
        return;
    }
    
    const selectedBook = availableBooks.find(book => book.id === bookSelect.value);
    if (!selectedBook) {
        showToast('Selected book not found', 'error');
        return;
    }
    
    const quantity = parseInt(quantityInput.value);
    const price = parseFloat(priceInput.value);
    const subtotal = quantity * price;
    
    // Check if book is already in the bill
    const existingItem = billItems.find(item => item.bookId === bookSelect.value);
    if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.subtotal = existingItem.quantity * existingItem.price;
        showToast('Quantity updated for existing book', 'info');
    } else {
        // Add new item to bill
        const newItem = {
            id: Date.now(), // Unique ID for the item
            bookId: bookSelect.value,
            title: selectedBook.title,
            price: price,
            quantity: quantity,
            subtotal: subtotal
        };
        billItems.push(newItem);
        showToast('Book added to bill', 'success');
    }
    
    // Update the bill items table
    updateBillItemsTable();
    
    // Clear the form
    bookSelect.value = '';
    quantityInput.value = '1';
    priceInput.value = '';
    
    // Update total
    calculateBillTotal();
}

// Update bill items table
function updateBillItemsTable() {
    const tableBody = document.getElementById('bill-items-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (billItems.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5" style="text-align: center; color: #64748b; padding: 1rem;">No items added to bill</td>';
        tableBody.appendChild(row);
        return;
    }
    
    billItems.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.title}</td>
            <td>${item.quantity}</td>
            <td>Rs. ${item.price.toFixed(2)}</td>
            <td>Rs. ${item.subtotal.toFixed(2)}</td>
            <td>
                <button class="btn-small danger" onclick="removeBillItem(${item.id})">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Remove bill item
function removeBillItem(itemId) {
    billItems = billItems.filter(item => item.id !== itemId);
    updateBillItemsTable();
    calculateBillTotal();
    showToast('Item removed from bill', 'info');
}

// Clear book selection
function clearBookSelection() {
    const bookSelect = document.getElementById('book-select');
    const quantityInput = document.getElementById('book-quantity');
    const priceInput = document.getElementById('book-price');
    
    if (bookSelect) bookSelect.value = '';
    if (quantityInput) quantityInput.value = '1';
    if (priceInput) priceInput.value = '';
}

// Clear billing form fields only (without clearing bill preview)
function clearBillingFormFields() {
    // Clear customer information
    document.getElementById('customer-account').value = '';
    document.getElementById('customer-name').value = '';
    selectedCustomer = null;
    
    // Clear book selection
    clearBookSelection();
    
    // Clear bill items
    billItems = [];
    updateBillItemsTable();
    
    // Clear discount and tax
    const discountType = document.getElementById('discount-type');
    const discountValue = document.getElementById('discount-value');
    const taxType = document.getElementById('tax-type');
    
    if (discountType) discountType.value = 'none';
    if (discountValue) discountValue.value = '';
    if (taxType) taxType.value = 'none';
    
    // Clear payment information
    const paymentMethod = document.getElementById('payment-method');
    const transactionId = document.getElementById('transaction-id');
    const adminNotes = document.getElementById('admin-notes');
    
    if (paymentMethod) paymentMethod.value = '';
    if (transactionId) transactionId.value = '';
    if (adminNotes) adminNotes.value = '';
    
    // Reset totals
    calculateBillTotal();
    
    showToast('Billing form cleared', 'success');
}

// Clear billing form completely (including bill preview)
function clearBillingForm() {
    clearBillingFormFields();
    // Clear bill preview
    clearBillPreview();
}

// Calculate bill total
function calculateBillTotal() {
    const subtotal = billItems.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Get discount
    const discountType = document.getElementById('discount-type');
    const discountValue = document.getElementById('discount-value');
    let discount = 0;
    
    if (discountType && discountValue && discountValue.value) {
        if (discountType.value === 'percentage') {
            discount = (subtotal * parseFloat(discountValue.value)) / 100;
        } else if (discountType.value === 'amount') {
            discount = parseFloat(discountValue.value);
        }
    }
    
    // Get tax
    const taxType = document.getElementById('tax-type');
    let tax = 0;
    
    if (taxType) {
        if (taxType.value === 'vat') {
            tax = (subtotal - discount) * 0.15; // 15% VAT
        } else if (taxType.value === 'nbt') {
            tax = (subtotal - discount) * 0.02; // 2% NBT
        } else if (taxType.value === 'both') {
            tax = (subtotal - discount) * 0.17; // 15% VAT + 2% NBT
        }
    }
    
    const total = subtotal - discount + tax;
    
    // Update display elements if they exist
    const subtotalDisplay = document.getElementById('subtotal-display');
    const discountDisplay = document.getElementById('discount-display');
    const taxDisplay = document.getElementById('tax-display');
    const totalDisplay = document.getElementById('total-display');
    
    if (subtotalDisplay) subtotalDisplay.textContent = `Rs. ${subtotal.toFixed(2)}`;
    if (discountDisplay) discountDisplay.textContent = `Rs. ${discount.toFixed(2)}`;
    if (taxDisplay) taxDisplay.textContent = `Rs. ${tax.toFixed(2)}`;
    if (totalDisplay) totalDisplay.textContent = `Rs. ${total.toFixed(2)}`;
    
    return { subtotal, discount, tax, total };
}

// Update discount
function updateDiscount() {
    calculateBillTotal();
}

// Update tax
function updateTax() {
    calculateBillTotal();
}

// Removed saveBillToLocalStorage - now using real database

// Create demo bills
// Removed demo bills creation - now using real data from MongoDB

// Display no bills message
function displayNoBillsMessage() {
    const billsContainer = document.getElementById('bills-container');
    if (billsContainer) {
        billsContainer.innerHTML = `
            <div class="no-bills">
                <i class="fas fa-file-invoice"></i>
                <h3>No bills found</h3>
                <p>Generate some bills to see them here</p>
            </div>
        `;
    }
}

// Start auto refresh
function startAutoRefresh() {
    console.log('Starting auto-refresh...');
    
    // Refresh dashboard data every 60 seconds (reduced to improve performance)
    setInterval(async () => {
        try {
            await loadDashboardData();
            await updateBookStats();
            console.log('Auto-refresh completed');
        } catch (error) {
            console.error('Auto-refresh error:', error);
        }
    }, 60000);
    
    // Refresh book stats every 90 seconds (staggered)
    setInterval(async () => {
        try {
            await updateBookStats();
            console.log('Book stats auto-refresh completed');
        } catch (error) {
            console.error('Book stats auto-refresh error:', error);
        }
    }, 90000);
    
    // Refresh customer data every 45 seconds
    setInterval(async () => {
        try {
            await refreshCustomerData();
            console.log('Customer data auto-refresh completed');
        } catch (error) {
            console.error('Customer data auto-refresh error:', error);
        }
    }, 45000);
}

// Initialize reports auto refresh
function initializeReportsAutoRefresh() {
    setInterval(() => {
        loadReports();
    }, 60000); // Refresh every minute
} 

// Load bill history from backend
async function loadBillHistory() {
    try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            console.error('No admin token found');
            showToast('Authentication required. Please login again.', 'error');
            return;
        }

        const response = await fetch('http://localhost:8080/api/admin/bills', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.bills) {
                currentBills = data.bills; // Store bills globally
                console.log('Loaded real bills from MongoDB:', data.bills);
                displayBillHistory(data.bills);
                displayRecentBills(data.bills);
            } else {
                console.error('Failed to load bill history:', data.message);
                showToast(`Failed to load bills: ${data.message}`, 'error');
                // Fallback to demo bills if backend fails
                loadDemoBills();
            }
        } else if (response.status === 401) {
            console.error('Unauthorized access to bills');
            showToast('Authentication failed. Please login again.', 'error');
            // Redirect to login
            window.location.href = 'admin-login.html';
        } else {
            console.error('Failed to load bill history:', response.status);
            showToast(`Failed to load bills: HTTP ${response.status}`, 'error');
            // Fallback to demo bills if backend fails
            loadDemoBills();
        }
    } catch (error) {
        console.error('Error loading bill history:', error);
        showToast('Network error. Please check your connection.', 'error');
        // Fallback to demo bills if backend fails
        loadDemoBills();
    }
}

// Load demo bills as fallback
function loadDemoBills() {
    console.log('Loading demo bills as fallback...');
    
    const demoBills = [
        {
            id: 'demo-1',
            billNumber: 'BILL-001',
            customerName: 'John Doe',
            customerAccount: 'ACC-001',
            billDate: new Date().toISOString(),
            total: 1250.00,
            totalAmount: 1250.00,
            subtotal: 1200.00,
            discount: 50.00,
            tax: 100.00,
            status: 'SAVED',
            paymentMethod: 'Cash',
            items: [
                {
                    bookTitle: 'The Great Gatsby',
                    quantity: 2,
                    price: 600.00,
                    subtotal: 1200.00
                }
            ]
        },
        {
            id: 'demo-2',
            billNumber: 'BILL-002',
            customerName: 'Jane Smith',
            customerAccount: 'ACC-002',
            billDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
            total: 850.00,
            totalAmount: 850.00,
            subtotal: 800.00,
            discount: 0.00,
            tax: 50.00,
            status: 'PENDING',
            paymentMethod: 'Credit Card',
            items: [
                {
                    bookTitle: 'To Kill a Mockingbird',
                    quantity: 1,
                    price: 800.00,
                    subtotal: 800.00
                }
            ]
        }
    ];
    
    currentBills = demoBills;
    displayBillHistory(demoBills);
    displayRecentBills(demoBills);
    console.log('Demo bills loaded:', demoBills);
}

// Force refresh billing data
function refreshBillingData() {
    console.log('Refreshing billing data...');
    loadBillHistory(); // Reload bill history from real database
    showToast('Billing data refreshed', 'success');
}

// Manual refresh with better error handling
async function manualRefreshBills() {
    console.log('Manual refresh of bills...');
    try {
        await loadBillHistory();
        showToast(`Refreshed ${currentBills.length} bills from MongoDB`, 'success');
    } catch (error) {
        console.error('Error refreshing bills:', error);
        showToast('Error refreshing bills. Check console for details.', 'error');
    }
}







// Manually trigger VIEW button for a specific bill
function triggerViewButton(billIndex = 0) {
    if (currentBills.length === 0) {
        showToast('No bills available', 'error');
        return;
    }
    
    if (billIndex >= currentBills.length) {
        showToast(`Bill index ${billIndex} not available. Total bills: ${currentBills.length}`, 'error');
        return;
    }
    
    const bill = currentBills[billIndex];
    console.log(`Triggering VIEW button for bill at index ${billIndex}:`, bill);
    
    // Try different ID formats
    const billId = bill.id || bill._id || bill.billNumber;
    console.log('Using bill ID:', billId);
    
    // Manually call viewBill
    viewBill(billId);
}

// Display bill history in the billing section
function displayBillHistory(bills) {
    const billHistoryBody = document.getElementById('bill-history-body');
    const noBillsMessage = document.getElementById('no-bills-message');
    const billHistoryTable = document.querySelector('.bill-history-table');
    
    if (!billHistoryBody) return;
    
    billHistoryBody.innerHTML = '';
    
    if (!bills || bills.length === 0) {
        // Hide table and show no bills message
        if (billHistoryTable) billHistoryTable.style.display = 'none';
        if (noBillsMessage) noBillsMessage.style.display = 'flex';
        return;
    }
    
    // Show table and hide no bills message
    if (billHistoryTable) billHistoryTable.style.display = 'block';
    if (noBillsMessage) noBillsMessage.style.display = 'none';
    
    console.log(`Displaying ${bills.length} bills in the table`);
    showToast(`Loaded ${bills.length} bills from database`, 'success');
    
    bills.forEach(bill => {
        const row = document.createElement('tr');
        const billDate = bill.billDate ? new Date(bill.billDate).toLocaleDateString() : 'N/A';
        const totalAmount = bill.total || bill.totalAmount || 0;
        const statusClass = bill.status?.toLowerCase() === 'saved' ? 'saved' : bill.status?.toLowerCase() || 'pending';
        
        row.innerHTML = `
            <td class="bill-number">
                <div class="bill-number-content">
                    <i class="fas fa-hashtag"></i>
                    <span>${bill.billNumber || 'N/A'}</span>
                </div>
            </td>
            <td class="customer-name">
                <div class="customer-info">
                    <div class="customer-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="customer-details">
                        <strong>${bill.customerName || 'N/A'}</strong>
                        <small>${bill.customerAccount || 'N/A'}</small>
                    </div>
                </div>
            </td>
            <td class="bill-date">
                <div class="date-content">
                    <i class="fas fa-calendar"></i>
                    <span>${billDate}</span>
                </div>
            </td>
            <td class="bill-amount">
                <div class="amount-content">
                    <i class="fas fa-rupee-sign"></i>
                    <span class="amount-value">Rs. ${totalAmount.toFixed(2)}</span>
                </div>
            </td>
            <td class="bill-status">
                <span class="status-badge ${statusClass}">
                    <i class="fas fa-circle"></i>
                    ${bill.status || 'PENDING'}
                </span>
            </td>
            <td class="payment-method">
                <div class="payment-content">
                    <i class="fas fa-credit-card"></i>
                    <span>${bill.paymentMethod || 'N/A'}</span>
                </div>
            </td>
            <td class="bill-actions">
                <div class="action-buttons">
                    <button class="action-btn view-btn" onclick="viewBill('${bill.id}')" title="View Bill Details">
                        <i class="fas fa-eye"></i>
                        <span>View</span>
                    </button>
                    <button class="action-btn download-btn" onclick="downloadBillPDF('${bill.id}')" title="Download PDF">
                        <i class="fas fa-download"></i>
                        <span>Download</span>
                    </button>
                    <button class="action-btn print-btn" onclick="printBill('${bill.id}')" title="Print Bill">
                        <i class="fas fa-print"></i>
                        <span>Print</span>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteBill('${bill.id}')" title="Delete Bill">
                        <i class="fas fa-trash"></i>
                        <span>Delete</span>
                    </button>
                </div>
            </td>
        `;
        billHistoryBody.appendChild(row);
    });
}

// Display recent bills in the reports section
function displayRecentBills(bills) {
    const recentBillsList = document.getElementById('recent-bills-list');
    if (!recentBillsList) return;
    
    recentBillsList.innerHTML = '';
    
    if (!bills || bills.length === 0) {
        recentBillsList.innerHTML = `
            <div class="no-data">
                <i class="fas fa-file-invoice"></i>
                <p>No recent bills</p>
            </div>
        `;
        return;
    }
    
    // Show only the 5 most recent bills
    const recentBills = bills.slice(0, 5);
    
    recentBills.forEach(bill => {
        const billItem = document.createElement('div');
        billItem.className = 'activity-item bill-item';
        const billDate = bill.billDate ? new Date(bill.billDate).toLocaleDateString() : 'N/A';
        const totalAmount = bill.total || bill.totalAmount || 0;
        const statusClass = bill.status?.toLowerCase() === 'saved' ? 'saved' : bill.status?.toLowerCase() || 'pending';
        
        billItem.innerHTML = `
            <div class="activity-icon">
                <i class="fas fa-file-invoice-dollar"></i>
            </div>
            <div class="activity-content">
                <h4>${bill.billNumber || 'N/A'}</h4>
                <p>${bill.customerName || 'N/A'} - Rs. ${totalAmount.toFixed(2)}</p>
                <small>${billDate}</small>
            </div>
            <div class="status-badge ${statusClass}">
                ${bill.status || 'PENDING'}
            </div>
            <div class="bill-actions">
                <button class="action-btn view-btn" onclick="viewBill('${bill.id}')" title="View Bill">
                    VIEW
                </button>
                <button class="action-btn delete-btn" onclick="deleteBill('${bill.id}')" title="Delete Bill">
                    DELETE
                </button>
                <div class="action-links">
                    <a href="#" onclick="downloadBillPDF('${bill.id}')" class="action-link">DOWNLOAD</a>
                    <a href="#" onclick="printBill('${bill.id}')" class="action-link">PRINT</a>
                </div>
            </div>
        `;
        recentBillsList.appendChild(billItem);
    });
}



// View bill details
function viewBill(billId) {
    console.log('=== VIEW BILL FUNCTION CALLED ===');
    console.log('Bill ID parameter:', billId);
    console.log('Bill ID type:', typeof billId);
    console.log('Current bills array length:', currentBills.length);
    console.log('Current bills data:', currentBills);
    
    if (!billId) {
        console.error('No bill ID provided');
        showToast('No bill ID provided', 'error');
        return;
    }
    
    try {
        // Try to find bill by id first (MongoDB ObjectId)
        let bill = currentBills.find(b => b.id === billId);
        console.log('Search by id result:', bill);
        
        // If not found by id, try to find by billNumber
        if (!bill) {
            bill = currentBills.find(b => b.billNumber === billId);
            console.log('Search by billNumber result:', bill);
        }
        
        // If still not found, try to find by string comparison for MongoDB ObjectIds
        if (!bill) {
            bill = currentBills.find(b => String(b.id) === String(billId));
            console.log('Search by string comparison result:', bill);
        }
        
        // If still not found, try to find by _id (MongoDB format)
        if (!bill) {
            bill = currentBills.find(b => b._id === billId);
            console.log('Search by _id result:', bill);
        }
        
        if (bill) {
            console.log('✅ Bill found successfully:', bill);
            // Display bill in the right panel instead of modal
            renderBillPreview(bill);
            showToast(`Viewing bill: ${bill.billNumber}`, 'success');
        } else {
            console.error('❌ Bill not found. Available bills:', currentBills.map(b => ({ 
                id: b.id, 
                _id: b._id,
                billNumber: b.billNumber,
                customerName: b.customerName 
            })));
            showToast(`Bill not found. Please check the bill ID: ${billId}`, 'error');
        }
    } catch (error) {
        console.error('❌ Error viewing bill:', error);
        showToast('Error viewing bill. Please try again.', 'error');
    }
}

// Show bill details modal
function showBillDetailsModal(bill) {
    // Create modal HTML
    const modalHTML = `
        <div id="bill-details-modal" class="modal modal-active">
            <div class="modal-content bill-details-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-file-invoice-dollar"></i> Bill Details - ${bill.billNumber}</h3>
                    <button class="close-btn" onclick="closeModal('bill-details-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="bill-details-grid">
                        <div class="bill-header-info">
                            <div class="bill-number-display">
                                <h2>${bill.billNumber}</h2>
                                <span class="bill-date">${bill.billDate ? new Date(bill.billDate).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <div class="bill-status-display">
                                <span class="status-badge ${bill.status?.toLowerCase() || 'pending'}">
                                    <i class="fas fa-circle"></i>
                                    ${bill.status || 'PENDING'}
                                </span>
                            </div>
                        </div>
                        
                        <div class="customer-details-section">
                            <h4><i class="fas fa-user"></i> Customer Information</h4>
                            <div class="customer-details-grid">
                                <div class="detail-item">
                                    <label>Name:</label>
                                    <span>${bill.customerName || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Account:</label>
                                    <span>${bill.customerAccount || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Payment Method:</label>
                                    <span>${bill.paymentMethod || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bill-items-section">
                            <h4><i class="fas fa-list"></i> Bill Items</h4>
                            <div class="bill-items-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Quantity</th>
                                            <th>Price</th>
                                            <th>Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${bill.items && bill.items.length > 0 ? 
                                            bill.items.map(item => `
                                                <tr>
                                                    <td>${item.bookTitle || item.title || 'N/A'}</td>
                                                    <td>${item.quantity || 1}</td>
                                                    <td>Rs. ${(item.price || 0).toFixed(2)}</td>
                                                    <td>Rs. ${(item.subtotal || 0).toFixed(2)}</td>
                                                </tr>
                                            `).join('') : 
                                            '<tr><td colspan="4" class="no-items">No items found</td></tr>'
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <div class="bill-totals-section">
                            <h4><i class="fas fa-calculator"></i> Bill Summary</h4>
                            <div class="totals-grid">
                                <div class="total-item">
                                    <label>Subtotal:</label>
                                    <span>Rs. ${(bill.subtotal || bill.total || 0).toFixed(2)}</span>
                                </div>
                                <div class="total-item">
                                    <label>Discount:</label>
                                    <span>Rs. ${(bill.discount || 0).toFixed(2)}</span>
                                </div>
                                <div class="total-item">
                                    <label>Tax:</label>
                                    <span>Rs. ${(bill.tax || 0).toFixed(2)}</span>
                                </div>
                                <div class="total-item total-amount">
                                    <label>Total Amount:</label>
                                    <span>Rs. ${(bill.total || bill.totalAmount || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <div class="bill-actions">
                        <button class="action-btn download-btn" onclick="downloadBillPDF('${bill.id}')">
                            <i class="fas fa-download"></i> Download PDF
                        </button>
                        <button class="action-btn print-btn" onclick="printBill('${bill.id}')">
                            <i class="fas fa-print"></i> Print
                        </button>
                        <button class="action-btn delete-btn" onclick="deleteBill('${bill.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    setTimeout(() => {
        const modal = document.getElementById('bill-details-modal');
        if (modal) {
            modal.classList.add('modal-active');
        }
    }, 10);
}

// Delete bill
async function deleteBill(billId) {
    console.log('Deleting bill:', billId);
    
    if (!confirm('Are you sure you want to delete this bill? This action cannot be undone.')) {
        return;
    }
    
    try {
        // First, find the bill to get the billNumber
        const bill = currentBills.find(b => b.id === billId);
        if (!bill) {
            showToast('Bill not found', 'error');
            return;
        }
        
        const token = localStorage.getItem('adminToken');
        if (!token) {
            showToast('Authentication required. Please login again.', 'error');
            return;
        }
        
        // Use the correct endpoint with billNumber
        const response = await fetch(`http://localhost:8080/api/billing/bill/${bill.billNumber}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            console.log('Bill deleted successfully, showing notification...');
            
            // Try multiple notification methods to ensure user sees the message
            try {
                showImportantToast('Bill deleted successfully!', 'success');
            } catch (toastError) {
                console.error('Error showing important toast:', toastError);
            }
            
            try {
                showSimpleNotification('Bill deleted successfully!', 'success');
            } catch (simpleError) {
                console.error('Error showing simple notification:', simpleError);
            }
            
            // Also show a simple alert as backup to ensure user sees the message
            alert('✅ Bill deleted successfully!');
            
            console.log('All notification methods attempted');
            
            // Refresh the bill history (but don't let errors hide the success message)
            try {
                await loadBillHistory();
            } catch (refreshError) {
                console.error('Error refreshing bill history:', refreshError);
                // Still show success message even if refresh fails
            }
        } else {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            showToast(`Failed to delete bill: ${errorData.message}`, 'error');
        }
    } catch (error) {
        console.error('Error deleting bill:', error);
        showToast('Error deleting bill. Please try again.', 'error');
    }
}

// Print bill
function printBill(billId) {
    console.log('Printing bill:', billId);
    try {
        const bill = currentBills.find(b => b.id === billId);
        if (bill) {
            showToast(`Preparing bill ${bill.billNumber} for printing...`, 'info');
            
            // Create a new window for printing
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>Bill ${bill.billNumber} - Pahana Book Shop</title>
                            <style>
                                @media print {
                                    body { margin: 0; padding: 20px; }
                                    .no-print { display: none !important; }
                                }
                                
                                body { 
                                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                                    margin: 20px; 
                                    line-height: 1.6;
                                    color: #333;
                                }
                                
                                .bill-header { 
                                    text-align: center; 
                                    margin-bottom: 30px; 
                                    border-bottom: 3px solid #2563eb;
                                    padding-bottom: 20px;
                                }
                                
                                .bill-header h1 { 
                                    color: #2563eb; 
                                    margin: 0 0 10px 0;
                                    font-size: 28px;
                                    font-weight: bold;
                                }
                                
                                .bill-header h2 { 
                                    color: #1e293b; 
                                    margin: 0;
                                    font-size: 20px;
                                    font-weight: 600;
                                }
                                
                                .bill-info { 
                                    display: grid; 
                                    grid-template-columns: 1fr 1fr; 
                                    gap: 20px; 
                                    margin-bottom: 30px;
                                    background: #f8fafc;
                                    padding: 20px;
                                    border-radius: 8px;
                                }
                                
                                .bill-details h3 { 
                                    color: #1e293b; 
                                    margin: 0 0 15px 0;
                                    font-size: 16px;
                                    border-bottom: 2px solid #e2e8f0;
                                    padding-bottom: 8px;
                                }
                                
                                .bill-details p { 
                                    margin: 8px 0; 
                                    font-size: 14px;
                                }
                                
                                .bill-details strong { 
                                    color: #374151; 
                                    min-width: 120px;
                                    display: inline-block;
                                }
                                
                                .bill-items { 
                                    width: 100%; 
                                    border-collapse: collapse; 
                                    margin-bottom: 30px;
                                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                                }
                                
                                .bill-items th { 
                                    background: #1e293b; 
                                    color: white; 
                                    padding: 15px 12px; 
                                    text-align: left; 
                                    font-weight: 600;
                                    font-size: 14px;
                                }
                                
                                .bill-items td { 
                                    border-bottom: 1px solid #e5e7eb; 
                                    padding: 12px; 
                                    text-align: left;
                                    font-size: 14px;
                                }
                                
                                .bill-items tr:nth-child(even) { 
                                    background: #f9fafb; 
                                }
                                
                                .bill-items tr:hover { 
                                    background: #f3f4f6; 
                                }
                                
                                .bill-totals { 
                                    background: #f8fafc; 
                                    padding: 20px; 
                                    border-radius: 8px;
                                    border-left: 4px solid #2563eb;
                                }
                                
                                .total-item { 
                                    display: flex; 
                                    justify-content: space-between; 
                                    margin: 10px 0;
                                    font-size: 14px;
                                }
                                
                                .total-amount { 
                                    font-size: 18px; 
                                    font-weight: bold; 
                                    color: #1e293b;
                                    border-top: 2px solid #e2e8f0;
                                    padding-top: 15px;
                                    margin-top: 15px;
                                }
                                
                                .footer { 
                                    text-align: center; 
                                    margin-top: 40px; 
                                    padding-top: 20px;
                                    border-top: 1px solid #e5e7eb;
                                    color: #6b7280;
                                    font-size: 12px;
                                }
                                
                                .print-btn { 
                                    background: #2563eb; 
                                    color: white; 
                                    border: none; 
                                    padding: 12px 24px; 
                                    border-radius: 6px; 
                                    cursor: pointer;
                                    font-size: 14px;
                                    margin: 20px 0;
                                }
                                
                                .print-btn:hover { 
                                    background: #1d4ed8; 
                                }
                            </style>
                        </head>
                        <body>
                            <div class="bill-header">
                                <h1>📚 Pahana Book Shop</h1>
                                <h2>Invoice #${bill.billNumber}</h2>
                            </div>
                            
                            <div class="bill-info">
                                <div class="bill-details">
                                    <h3>📋 Bill Information</h3>
                                    <p><strong>Bill Number:</strong> ${bill.billNumber}</p>
                                    <p><strong>Date:</strong> ${bill.billDate ? new Date(bill.billDate).toLocaleDateString() : 'N/A'}</p>
                                    <p><strong>Status:</strong> <span class="status-badge ${(bill.status || 'PENDING').toLowerCase()}">${bill.status || 'PENDING'}</span></p>
                                </div>
                                
                                <div class="bill-details">
                                    <h3>👤 Customer Information</h3>
                                    <p><strong>Name:</strong> ${bill.customerName || 'N/A'}</p>
                                    <p><strong>Account:</strong> ${bill.customerAccount || 'N/A'}</p>
                                    <p><strong>Payment:</strong> ${bill.paymentMethod || 'N/A'}</p>
                                </div>
                            </div>
                            
                            <div class="bill-items-section">
                                <h3>📚 Bill Items</h3>
                                <table class="bill-items">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Quantity</th>
                                            <th>Price/Unit</th>
                                            <th>Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${bill.items && bill.items.length > 0 ? 
                                            bill.items.map(item => `
                                                <tr>
                                                    <td>${item.bookTitle || 'N/A'}</td>
                                                    <td>${item.quantity || 1}</td>
                                                    <td>Rs. ${(item.price || 0).toFixed(2)}</td>
                                                    <td>Rs. ${(item.subtotal || 0).toFixed(2)}</td>
                                                </tr>
                                            `).join('') : 
                                            '<tr><td colspan="4" style="text-align: center; color: #6b7280;">No items found</td></tr>'
                                        }
                                    </tbody>
                                </table>
                            </div>
                            
                            <div class="bill-totals">
                                <div class="total-item">
                                    <span>Subtotal:</span>
                                    <span>Rs. ${(bill.subtotal || bill.total || 0).toFixed(2)}</span>
                                </div>
                                <div class="total-item">
                                    <span>Discount:</span>
                                    <span>Rs. ${(bill.discount || 0).toFixed(2)}</span>
                                </div>
                                <div class="total-item">
                                    <span>Tax:</span>
                                    <span>Rs. ${(bill.tax || 0).toFixed(2)}</span>
                                </div>
                                <div class="total-item total-amount">
                                    <span>Total Amount:</span>
                                    <span>Rs. ${(bill.total || bill.totalAmount || 0).toFixed(2)}</span>
                                </div>
                            </div>
                            
                            <div class="footer">
                                <p>Thank you for choosing Pahana Book Shop!</p>
                                <p>Generated on: ${new Date().toLocaleString()}</p>
                            </div>
                            
                            <div class="no-print">
                                <button class="print-btn" onclick="window.print()">
                                    🖨️ Print Bill
                                </button>
                                <button class="print-btn" onclick="window.close()" style="background: #6b7280; margin-left: 10px;">
                                    ❌ Close
                                </button>
                            </div>
                        </body>
                    </html>
                `);
                printWindow.document.close();
                
                // Auto-print after a short delay
                setTimeout(() => {
                    printWindow.print();
                }, 500);
                
                showToast('Bill prepared for printing', 'success');
            } else {
                showToast('Popup blocked. Please allow popups and try again.', 'error');
            }
        } else {
            showToast('Bill not found', 'error');
        }
    } catch (error) {
        console.error('Error printing bill:', error);
        showToast('Error printing bill. Please try again.', 'error');
    }
}

// Test PDF generation
function testPDFGeneration() {
    console.log('Testing PDF generation...');
    console.log('window.jspdf:', window.jspdf);
    console.log('typeof window.jspdf:', typeof window.jspdf);
    
    if (window.jspdf && window.jspdf.jsPDF) {
        console.log('jsPDF found via window.jspdf.jsPDF');
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.text('Test PDF', 20, 20);
            doc.save('test.pdf');
            showToast('PDF generation test successful!', 'success');
        } catch (error) {
            console.error('Error in PDF test:', error);
            showToast('PDF generation test failed: ' + error.message, 'error');
        }
    } else if (window.jspdf && window.jspdf.default) {
        console.log('jsPDF found via window.jspdf.default');
        try {
            const jsPDF = window.jspdf.default;
            const doc = new jsPDF();
            doc.text('Test PDF', 20, 20);
            doc.save('test.pdf');
            showToast('PDF generation test successful!', 'success');
        } catch (error) {
            console.error('Error in PDF test:', error);
            showToast('PDF generation test failed: ' + error.message, 'error');
        }
    } else if (window.jsPDF) {
        console.log('jsPDF found via window.jsPDF');
        try {
            const doc = new window.jsPDF();
            doc.text('Test PDF', 20, 20);
            doc.save('test.pdf');
            showToast('PDF generation test successful!', 'success');
        } catch (error) {
            console.error('Error in PDF test:', error);
            showToast('PDF generation test failed: ' + error.message, 'error');
        }
    } else {
        console.error('jsPDF not found in any expected location');
        showToast('PDF generation library not found. Please refresh the page.', 'error');
    }
}

// Test notification system
function testNotification() {
    console.log('Testing notification system...');
    
    // Test basic toast
    showToast('This is a test notification!', 'info');
    
    // Test important toast
    setTimeout(() => {
        showImportantToast('This is an important test notification!', 'success');
    }, 1000);
    
    // Test error toast
    setTimeout(() => {
        showToast('This is an error test notification!', 'error');
    }, 2000);
    
    // Also test with simple alert to verify JavaScript is working
    setTimeout(() => {
        alert('🔔 Test notification system is working!');
    }, 3000);
}

// Simple fallback notification method
function showSimpleNotification(message, type = 'info') {
    // Create a simple div notification that doesn't rely on complex CSS
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 999999;
        font-family: Arial, sans-serif;
        font-size: 14px;
        font-weight: bold;
        max-width: 300px;
        word-wrap: break-word;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
    
    // Click to dismiss
    notification.addEventListener('click', () => {
        notification.remove();
    });
    
    console.log('Simple notification shown:', message);
}

// Download bill PDF
async function downloadBillPDF(billId) {
    console.log('Downloading bill PDF:', billId);
    try {
        const bill = currentBills.find(b => b.id === billId);
        if (bill) {
            showToast(`Generating PDF for bill ${bill.billNumber}...`, 'info');
            
            // Debug: Check what's available
            console.log('window.jspdf:', window.jspdf);
            console.log('typeof window.jspdf:', typeof window.jspdf);
            console.log('window.jspdf?.jsPDF:', window.jspdf?.jsPDF);
            
            // Wait for jsPDF to be available
            let attempts = 0;
            while (typeof window.jspdf === 'undefined' && attempts < 10) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            // Check if jsPDF is available
            if (typeof window.jspdf === 'undefined') {
                console.error('jsPDF library not found in window.jspdf after waiting');
                showToast('PDF generation library not loaded. Downloading as text file instead.', 'warning');
                downloadBillAsText(bill);
                return;
            }
            
            // Create PDF using jsPDF
            let doc;
            try {
                // Try different ways to access jsPDF
                let jsPDF;
                if (window.jspdf && window.jspdf.jsPDF) {
                    jsPDF = window.jspdf.jsPDF;
                } else if (window.jspdf && window.jspdf.default) {
                    jsPDF = window.jspdf.default;
                } else if (window.jsPDF) {
                    jsPDF = window.jsPDF;
                } else {
                    throw new Error('jsPDF not found in any expected location');
                }
                
                doc = new jsPDF();
                console.log('jsPDF instance created successfully using:', jsPDF);
            } catch (error) {
                console.error('Error creating jsPDF instance:', error);
                showToast('Error creating PDF. Downloading as text file instead.', 'warning');
                downloadBillAsText(bill);
                return;
            }
            
            // Set up fonts and colors
            doc.setFont('helvetica');
            doc.setFontSize(12);
            
            // Header with blue background
            doc.setFillColor(37, 99, 235); // Blue header
            doc.rect(0, 0, 210, 30, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text('PAHANA BOOK SHOP', 105, 15, { align: 'center' });
            
            doc.setFontSize(12);
            doc.text('Professional Book Retailer', 105, 25, { align: 'center' });
            
            // Reset text color
            doc.setTextColor(0, 0, 0);
            
            // Invoice details section
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('INVOICE', 20, 50);
            
            // Invoice number and date
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Invoice Number: ${bill.billNumber}`, 20, 65);
            doc.text(`Date: ${bill.billDate ? new Date(bill.billDate).toLocaleDateString() : 'N/A'}`, 20, 72);
            doc.text(`Status: ${bill.status || 'SAVED'}`, 20, 79);
            
            // Customer information
            doc.setFont('helvetica', 'bold');
            doc.text('CUSTOMER INFORMATION', 20, 95);
            doc.setFont('helvetica', 'normal');
            doc.text(`Name: ${bill.customerName || 'N/A'}`, 20, 105);
            doc.text(`Account: ${bill.customerAccount || bill.accountNumber || 'N/A'}`, 20, 112);
            doc.text(`Payment Method: ${(bill.paymentMethod || 'N/A').toUpperCase()}`, 20, 119);
            doc.text(`Transaction ID: ${bill.transactionId || bill.paymentMethod || 'CASH'}`, 20, 126);
            
            // Items section
            doc.setFont('helvetica', 'bold');
            doc.text('ITEMS', 20, 145);
            
            // Items table with blue header
            let yPos = 155;
            if (bill.items && bill.items.length > 0) {
                // Table header
                doc.setFillColor(37, 99, 235);
                doc.rect(20, yPos - 5, 170, 8, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text('Item', 25, yPos);
                doc.text('Quantity', 80, yPos);
                doc.text('Price/Unit', 120, yPos);
                doc.text('Subtotal', 160, yPos);
                
                // Reset text color
                doc.setTextColor(0, 0, 0);
                yPos += 10;
                
                // Table rows
                bill.items.forEach((item, index) => {
                    if (yPos > 250) {
                        doc.addPage();
                        yPos = 20;
                    }
                    
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    doc.text(item.title || item.bookTitle || 'N/A', 25, yPos);
                    doc.text((item.quantity || 1).toString(), 80, yPos);
                    doc.text(`Rs. ${(item.price || 0).toFixed(2)}`, 120, yPos);
                    doc.text(`Rs. ${(item.subtotal || (item.quantity || 1) * (item.price || 0)).toFixed(2)}`, 160, yPos);
                    yPos += 8;
                });
            }
            
            // Summary section
            yPos += 10;
            doc.setFont('helvetica', 'bold');
            doc.text('SUMMARY', 20, yPos);
            yPos += 15;
            
            // Calculate totals
            const subtotal = Number(bill.subtotal || bill.total || 0);
            const discount = Number(bill.discount || 0);
            const tax = Number(bill.tax || 0);
            const total = Number(bill.total || bill.totalAmount || subtotal - discount + tax);
            
            // Summary details
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Subtotal: Rs. ${subtotal.toFixed(2)}`, 120, yPos);
            yPos += 10;
            doc.text(`Discount: Rs. ${discount.toFixed(2)}`, 120, yPos);
            yPos += 10;
            doc.text(`Tax: Rs. ${tax.toFixed(2)}`, 120, yPos);
            yPos += 15;
            
            // Total with emphasis
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text(`TOTAL:`, 120, yPos);
            doc.text(`Rs. ${total.toFixed(2)}`, 160, yPos);
            
            // Footer
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(128, 128, 128);
            doc.text('Thank you for your purchase!', 105, yPos + 20, { align: 'center' });
            doc.text('For any queries, please contact us at support@pahanabookshop.com', 105, yPos + 27, { align: 'center' });
            
            // Add border
            doc.setDrawColor(200, 200, 200);
            doc.rect(10, 10, 190, yPos + 35, 'S');
            
            // Save the PDF
            const fileName = `bill-${bill.billNumber}-${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
            
            showToast('Bill PDF downloaded successfully', 'success');
        } else {
            showToast('Bill not found', 'error');
        }
    } catch (error) {
        console.error('Error downloading bill PDF:', error);
        showToast('Error generating PDF. Downloading as text file instead.', 'warning');
        // Fallback to text download
        const bill = currentBills.find(b => b.id === billId);
        if (bill) {
            downloadBillAsText(bill);
        }
    }
}

// Fallback function to download bill as text
function downloadBillAsText(bill) {
    const billContent = `
Pahana Book Shop
=================

Bill Number: ${bill.billNumber}
Date: ${bill.billDate ? new Date(bill.billDate).toLocaleDateString() : 'N/A'}
Customer: ${bill.customerName || 'N/A'}
Account: ${bill.customerAccount || 'N/A'}
Payment Method: ${bill.paymentMethod || 'N/A'}

Bill Items:
${bill.items && bill.items.length > 0 ? 
    bill.items.map((item, index) => 
        `${index + 1}. ${item.bookTitle || 'N/A'} - Qty: ${item.quantity || 1} - Price: Rs. ${(item.price || 0).toFixed(2)} - Subtotal: Rs. ${(item.subtotal || 0).toFixed(2)}`
    ).join('\n') : 
    'No items found'
}

Bill Summary:
Subtotal: Rs. ${(bill.subtotal || bill.total || 0).toFixed(2)}
Discount: Rs. ${(bill.discount || 0).toFixed(2)}
Tax: Rs. ${(bill.tax || 0).toFixed(2)}
Total Amount: Rs. ${(bill.total || bill.totalAmount || 0).toFixed(2)}

Generated on: ${new Date().toLocaleString()}
    `.trim();
    
    const blob = new Blob([billContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bill-${bill.billNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showToast('Bill downloaded as text file', 'success');
}



// Filter bill history
function filterBillHistory() {
    const searchTerm = document.getElementById('history-search').value.toLowerCase();
    const dateFilter = document.getElementById('history-date').value;
    
    if (!currentBills || currentBills.length === 0) {
        return;
    }
    
    let filteredBills = currentBills.filter(bill => {
        const matchesSearch = !searchTerm || 
            (bill.billNumber && bill.billNumber.toLowerCase().includes(searchTerm)) ||
            (bill.customerName && bill.customerName.toLowerCase().includes(searchTerm)) ||
            (bill.customerAccount && bill.customerAccount.toLowerCase().includes(searchTerm));
        
        const matchesDate = !dateFilter || 
            (bill.billDate && new Date(bill.billDate).toDateString() === new Date(dateFilter).toDateString());
        
        return matchesSearch && matchesDate;
    });
    
    displayBillHistory(filteredBills);
    showToast(`Found ${filteredBills.length} bills`, 'info');
}

// Clear bill history filters
function clearBillHistoryFilters() {
    document.getElementById('history-search').value = '';
    document.getElementById('history-date').value = '';
    
    if (currentBills && currentBills.length > 0) {
        displayBillHistory(currentBills);
        showToast('Filters cleared', 'info');
    }
}

// Load detailed reports
function loadDetailedReport() {
    if (typeof window.loadDetailedReport === 'function' && window.loadDetailedReport !== loadDetailedReport) {
        return window.loadDetailedReport();
    }
    return loadDetailedReportLegacy();
}

// Update reports - Enhanced version
function updateReports() {
    console.log('Updating reports with enhanced functionality...');
    // This will be handled by the enhanced reports script
    if (typeof window.loadAnalyticsData === 'function') {
        window.loadAnalyticsData();
    }
}

// Export report - Enhanced version (safe delegate)
function exportReport(format) {
    if (window.exportReport && window.exportReport !== exportReport) {
        return window.exportReport(format);
    }
}

// Print report - Enhanced version (safe delegate)
function printReport() {
    if (window.printReport && window.printReport !== printReport) {
        return window.printReport();
    }
    window.print();
}

// Renders the live bill preview panel (right side) with actions like Print, Save, Download, Email
function renderBillPreview(bill) {
    try {
        const container = document.getElementById('bill-preview');
        if (!container || !bill) return;

        const billDate = bill.billDate ? new Date(bill.billDate).toLocaleDateString() : '-';
        const subtotal = Number(bill.subtotal || 0).toFixed(2);
        const discount = Number(bill.discount || 0).toFixed(2);
        const tax = Number(bill.tax || 0).toFixed(2);
        const total = Number(bill.total || bill.totalAmount || 0).toFixed(2);

        const itemsRows = (bill.items || [])
            .map((it, idx) => `
                <tr>
                    <td>${idx + 1}</td>
                    <td>${it.title || '-'}</td>
                    <td>${it.quantity || 0}</td>
                    <td>Rs. ${Number(it.price || 0).toFixed(2)}</td>
                    <td>Rs. ${Number((it.quantity || 0) * (it.price || 0)).toFixed(2)}</td>
                </tr>
            `)
            .join('');

        // Determine if this is a new bill or existing bill
        const isNewBill = bill.id === (lastGeneratedBill?.id || lastGeneratedBill?._id);
        const headerIcon = isNewBill ? 'fa-check-circle' : 'fa-eye';
        const headerColor = isNewBill ? '#10b981' : '#3b82f6';
        const headerText = isNewBill ? 'Bill Generated Successfully!' : 'Viewing Bill Details';
        
        // Add success indicator for newly generated bills
        const successIndicator = isNewBill ? `
            <div class="success-indicator" style="
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                padding: 12px 20px;
                border-radius: 25px;
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 20px;
                display: inline-flex;
                align-items: center;
                gap: 10px;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                animation: pulse 2s infinite;
            ">
                <i class="fas fa-check-circle"></i>
                🎉 New Bill Generated Successfully!
            </div>
        ` : '';
        
        // Add viewing indicator for existing bills
        const viewingIndicator = isNewBill ? '' : `
            <div class="viewing-indicator" style="
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                margin-bottom: 16px;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
            ">
                <i class="fas fa-eye"></i>
                Viewing Existing Bill
            </div>
        `;
        
        container.innerHTML = `
            <div class="bill-card ${isNewBill ? 'new-bill' : ''}">
                ${successIndicator}
                ${viewingIndicator}
                <div class="bill-card-header">
                    <h3><i class="fas ${headerIcon}" style="color:${headerColor}"></i> ${headerText}</h3>
                </div>
                <div class="bill-meta">
                    <div><strong>Bill Number:</strong> ${bill.billNumber || '-'}</div>
                    <div><strong>Customer Name:</strong> ${bill.customerName || '-'}</div>
                    <div><strong>Account Number:</strong> ${bill.accountNumber || '-'}</div>
                    <div><strong>Bill Date:</strong> ${billDate}</div>
                    <div><strong>Payment Method:</strong> ${bill.paymentMethod || '-'}</div>
                    <div><strong>Transaction ID:</strong> ${bill.transactionId || '-'}</div>
                </div>
                <div class="bill-items">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Item</th>
                                <th>Qty</th>
                                <th>Price</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRows || '<tr><td colspan="5" style="text-align:center;color:#64748b">No items</td></tr>'}
                        </tbody>
                    </table>
                </div>
                <div class="bill-totals">
                    <div><span>Subtotal:</span><span>Rs. ${subtotal}</span></div>
                    <div><span>Discount:</span><span>- Rs. ${discount}</span></div>
                    <div><span>Tax:</span><span>Rs. ${tax}</span></div>
                    <div class="total"><span>Total Amount:</span><span>Rs. ${total}</span></div>
                    <div><span>Status:</span><span class="status-badge ${(bill.status || 'PENDING').toLowerCase()}">${bill.status || 'PENDING'}</span></div>
                </div>
                <div class="bill-actions">
                    <button class="btn-small" onclick="generateBillPDF(${JSON.stringify(bill).replace(/"/g, '&quot;')})"><i class="fas fa-print"></i> Print Bill</button>
                    <button class="btn-small" onclick="saveBillLocally()"><i class="fas fa-save"></i> Save Bill</button>
                    <button class="btn-small" onclick="downloadBillPDF('${bill.id || bill._id || bill.billNumber}')"><i class="fas fa-file-pdf"></i> Download PDF</button>
                    <button class="btn-small" onclick="emailBill('${bill.id || bill._id || bill.billNumber}')"><i class="fas fa-envelope"></i> Email Bill</button>
                </div>
            </div>
        `;
    } catch (err) {
        console.error('Failed to render bill preview:', err);
    }
}

// Clear bill preview
function clearBillPreview() {
    const container = document.getElementById('bill-preview');
    if (container) {
        container.innerHTML = `
            <div class="bill-preview-placeholder">
                <div class="placeholder-icon">
                    <i class="fas fa-file-invoice-dollar"></i>
                </div>
                <h3>Bill Preview</h3>
                <p>Generate a new bill or view an existing one to see the preview here.</p>
            </div>
        `;
    }
}

async function saveBillLocally() {
    try {
        if (!lastGeneratedBill) return;
        
        // Update bill status to SAVED in the database
        const response = await fetch(`http://localhost:8080/api/billing/status/${lastGeneratedBill.billNumber}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'SAVED' })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                // Update local bill status
                lastGeneratedBill.status = 'SAVED';
                
                // Save to localStorage as backup
                const key = `saved_bill_${lastGeneratedBill.billNumber || lastGeneratedBill.id}`;
                localStorage.setItem(key, JSON.stringify(lastGeneratedBill));
                
                // Refresh bill history to show updated status
                await loadBillHistory();
                
                // Update the bill preview to show SAVED status
                renderBillPreview(lastGeneratedBill);
                
                showImportantToast('Bill saved successfully! Status updated to SAVED', 'success');
            } else {
                showToast('Error updating bill status: ' + (result.message || 'Unknown error'), 'error');
            }
        } else {
            const errorText = await response.text();
            console.error('HTTP Error:', response.status, errorText);
            showToast('Error saving bill. Please try again.', 'error');
        }
    } catch (e) {
        console.error('Error saving bill:', e);
        showToast('Error saving bill. Please try again.', 'error');
    }
}

function downloadLatestBillPDF() {
    if (!lastGeneratedBill) return;
    
    // Check if jsPDF is available
    if (typeof window.jspdf === 'undefined') {
        showToast('PDF generation library not loaded. Please refresh the page.', 'error');
        return;
    }
    
    // Try different ways to access jsPDF
    let jsPDF;
    if (window.jspdf && window.jspdf.jsPDF) {
        jsPDF = window.jspdf.jsPDF;
    } else if (window.jspdf && window.jspdf.default) {
        jsPDF = window.jspdf.default;
    } else if (window.jsPDF) {
        jsPDF = window.jsPDF;
    } else {
        showToast('PDF generation library not loaded. Please refresh the page.', 'error');
        return;
    }
    
    const doc = new jsPDF();
    const bill = lastGeneratedBill;
    
    // Set up fonts and colors
    doc.setFont('helvetica');
    doc.setFontSize(12);
    
    // Header with blue background
    doc.setFillColor(37, 99, 235); // Blue header
    doc.rect(0, 0, 210, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('PAHANA BOOK SHOP', 105, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('Professional Book Retailer', 105, 25, { align: 'center' });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    // Invoice details section
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 20, 50);
    
    // Invoice number and date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice Number: ${bill.billNumber}`, 20, 65);
    doc.text(`Date: ${new Date(bill.billDate).toLocaleDateString()}`, 20, 72);
    doc.text(`Status: ${bill.status || 'SAVED'}`, 20, 79);
    
    // Customer information
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER INFORMATION', 20, 95);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${bill.customerName}`, 20, 105);
    doc.text(`Account: ${bill.accountNumber}`, 20, 112);
    doc.text(`Payment Method: ${(bill.paymentMethod || 'N/A').toUpperCase()}`, 20, 119);
    doc.text(`Transaction ID: ${bill.transactionId || bill.paymentMethod || 'CASH'}`, 20, 126);
    
    // Items section
    doc.setFont('helvetica', 'bold');
    doc.text('ITEMS', 20, 145);
    
    // Items table with blue header
    let yPos = 155;
    if (bill.items && bill.items.length > 0) {
        // Table header
        doc.setFillColor(37, 99, 235);
        doc.rect(20, yPos - 5, 170, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Item', 25, yPos);
        doc.text('Quantity', 80, yPos);
        doc.text('Price/Unit', 120, yPos);
        doc.text('Subtotal', 160, yPos);
        
        // Reset text color
        doc.setTextColor(0, 0, 0);
        yPos += 10;
        
        // Table rows
        bill.items.forEach((item, index) => {
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }
            
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(item.title || item.bookTitle || 'N/A', 25, yPos);
            doc.text((item.quantity || 1).toString(), 80, yPos);
            doc.text(`Rs. ${(item.price || 0).toFixed(2)}`, 120, yPos);
            doc.text(`Rs. ${(item.subtotal || (item.quantity || 1) * (item.price || 0)).toFixed(2)}`, 160, yPos);
            yPos += 8;
        });
    }
    
    // Summary section
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY', 20, yPos);
    yPos += 15;
    
    // Calculate totals
    const subtotal = Number(bill.subtotal || bill.total || 0);
    const discount = Number(bill.discount || 0);
    const tax = Number(bill.tax || 0);
    const total = Number(bill.total || bill.totalAmount || subtotal - discount + tax);
    
    // Summary details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Subtotal: Rs. ${subtotal.toFixed(2)}`, 120, yPos);
    yPos += 10;
    doc.text(`Discount: Rs. ${discount.toFixed(2)}`, 120, yPos);
    yPos += 10;
    doc.text(`Tax: Rs. ${tax.toFixed(2)}`, 120, yPos);
    yPos += 15;
    
    // Total with emphasis
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL:`, 120, yPos);
    doc.text(`Rs. ${total.toFixed(2)}`, 160, yPos);
    
    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text('Thank you for your purchase!', 105, yPos + 20, { align: 'center' });
    doc.text('For any queries, please contact us at support@pahanabookshop.com', 105, yPos + 27, { align: 'center' });
    
    // Add border
    doc.setDrawColor(200, 200, 200);
    doc.rect(10, 10, 190, yPos + 35, 'S');
    
    doc.save(`bill-${bill.billNumber}.pdf`);
}

function emailLatestBill() {
    if (!lastGeneratedBill) return;
    showToast('Email feature can be integrated with your SMTP provider. Placeholder action executed.', 'success');
}

// Email specific bill
function emailBill(billId) {
    showToast('Email feature can be integrated with your SMTP provider. Placeholder action executed.', 'success');
}

// Generate PDF for bill
function generateBillPDF(bill) {
    // Check if jsPDF is available
    if (typeof window.jspdf === 'undefined') {
        showToast('PDF generation library not loaded. Please refresh the page.', 'error');
        return;
    }
    
    // Try different ways to access jsPDF
    let jsPDF;
    if (window.jspdf && window.jspdf.jsPDF) {
        jsPDF = window.jspdf.jsPDF;
    } else if (window.jspdf && window.jspdf.default) {
        jsPDF = window.jspdf.default;
    } else if (window.jsPDF) {
        jsPDF = window.jsPDF;
    } else {
        showToast('PDF generation library not loaded. Please refresh the page.', 'error');
        return;
    }
    
    const doc = new jsPDF();
    
    // Set up fonts and colors
    doc.setFont('helvetica');
    doc.setFontSize(12);
    
    // Header with blue background
    doc.setFillColor(37, 99, 235); // Blue header
    doc.rect(0, 0, 210, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('PAHANA BOOK SHOP', 105, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('Professional Book Retailer', 105, 25, { align: 'center' });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    // Invoice details section
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 20, 50);
    
    // Invoice number and date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice Number: ${bill.billNumber}`, 20, 65);
    doc.text(`Date: ${new Date(bill.billDate).toLocaleDateString()}`, 20, 72);
    doc.text(`Status: ${bill.status || 'SAVED'}`, 20, 79);
    
    // Customer information
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER INFORMATION', 20, 95);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${bill.customerName}`, 20, 105);
    doc.text(`Account: ${bill.accountNumber}`, 20, 112);
    doc.text(`Payment Method: ${(bill.paymentMethod || 'N/A').toUpperCase()}`, 20, 119);
    doc.text(`Transaction ID: ${bill.transactionId || bill.paymentMethod || 'CASH'}`, 20, 126);
    
    // Items section
    doc.setFont('helvetica', 'bold');
    doc.text('ITEMS', 20, 145);
    
    // Items table with blue header
    let yPos = 155;
    if (bill.items && bill.items.length > 0) {
        // Table header
        doc.setFillColor(37, 99, 235);
        doc.rect(20, yPos - 5, 170, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Item', 25, yPos);
        doc.text('Quantity', 80, yPos);
        doc.text('Price/Unit', 120, yPos);
        doc.text('Subtotal', 160, yPos);
        
        // Reset text color
        doc.setTextColor(0, 0, 0);
        yPos += 10;
        
        // Table rows
        bill.items.forEach((item, index) => {
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }
            
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(item.title || item.bookTitle || 'N/A', 25, yPos);
            doc.text((item.quantity || 1).toString(), 80, yPos);
            doc.text(`Rs. ${(item.price || 0).toFixed(2)}`, 120, yPos);
            doc.text(`Rs. ${(item.subtotal || (item.quantity || 1) * (item.price || 0)).toFixed(2)}`, 160, yPos);
            yPos += 8;
        });
    }
    
    // Summary section
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY', 20, yPos);
    yPos += 15;
    
    // Calculate totals
    const subtotal = Number(bill.subtotal || bill.total || 0);
    const discount = Number(bill.discount || 0);
    const tax = Number(bill.tax || 0);
    const total = Number(bill.total || bill.totalAmount || subtotal - discount + tax);
    
    // Summary details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Subtotal: Rs. ${subtotal.toFixed(2)}`, 120, yPos);
    yPos += 10;
    doc.text(`Discount: Rs. ${discount.toFixed(2)}`, 120, yPos);
    yPos += 10;
    doc.text(`Tax: Rs. ${tax.toFixed(2)}`, 120, yPos);
    yPos += 15;
    
    // Total with emphasis
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL:`, 120, yPos);
    doc.text(`Rs. ${total.toFixed(2)}`, 160, yPos);
    
    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text('Thank you for your purchase!', 105, yPos + 20, { align: 'center' });
    doc.text('For any queries, please contact us at support@pahanabookshop.com', 105, yPos + 27, { align: 'center' });
    
    // Add border
    doc.setDrawColor(200, 200, 200);
    doc.rect(10, 10, 190, yPos + 35, 'S');
    
    // Show print dialog
    doc.autoPrint();
    doc.output('dataurlnewwindow');
    
    // Also save as PDF
    doc.save(`bill-${bill.billNumber}.pdf`);
}

 

// Handle billing form submission
async function handleBillingSubmit(e) {
    e.preventDefault();
    
    // Get the submit button and show loading state
    const submitBtn = e.target.querySelector('.generate-bill-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    submitBtn.disabled = true;
    
    console.log('Starting bill generation...');
    console.log('Selected customer:', selectedCustomer);
    console.log('Bill items:', billItems);
    
    // Validate customer
    if (!selectedCustomer) {
        showToast('Please fetch a customer first', 'error');
        return;
    }
    
    // Validate bill items
    if (billItems.length === 0) {
        showToast('Please add at least one book to the bill', 'error');
        return;
    }
    
    // Validate payment method
    const paymentMethod = document.getElementById('payment-method');
    if (!paymentMethod.value) {
        showToast('Please select a payment method', 'error');
        return;
    }
    
    // Calculate totals
    const totals = calculateBillTotal();
    console.log('Calculated totals:', totals);
    
    // Create bill data for real database
    const billData = {
        customerAccountNumber: selectedCustomer.accountNumber,
        items: billItems.map(item => ({
            bookId: item.bookId,
            title: item.title,
            quantity: parseInt(item.quantity),
            price: parseFloat(item.price)
        })),
        subtotal: parseFloat(totals.subtotal),
        discount: parseFloat(totals.discount),
        tax: parseFloat(totals.tax),
        total: parseFloat(totals.total),
        paymentMethod: paymentMethod.value,
        transactionId: document.getElementById('transaction-id').value || '',
        adminNotes: document.getElementById('admin-notes').value || ''
    };
    
    console.log('Sending bill data:', billData);
    
    try {
        // Save to real database
        const response = await fetch('http://localhost:8080/api/billing/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(billData)
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('Response result:', result);
            
            if (result.success) {
                // Longer success toast for billing actions
                showToast('Bill generated successfully!', 'success', 8000);
                
                // Cache the latest bill and show preview panel actions
                lastGeneratedBill = result.bill;
                
                // Show bill preview immediately and prominently
                renderBillPreview(result.bill);
                
                // Scroll to bill preview to make it visible
                const billPreview = document.getElementById('bill-preview');
                if (billPreview) {
                    // Add highlight effect to bill preview
                    billPreview.classList.add('new-bill-highlight');
                    billPreview.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Remove highlight class after animation
                    setTimeout(() => {
                        billPreview.classList.remove('new-bill-highlight');
                    }, 2000);
                }
                
                // Clear form fields but keep bill preview visible
                setTimeout(() => {
                    clearBillingFormFields();
                    loadBillHistory(); // Refresh bill history from database
                }, 3000); // Increased delay to 3 seconds for better user experience
                
                // Show countdown toast for form clearing
                setTimeout(() => {
                    showToast('Form will be cleared in 2 seconds...', 'info', 3000);
                }, 1000);
                
                // Add visual countdown indicator to the form
                const formSection = document.querySelector('.billing-form');
                if (formSection) {
                    const countdownDiv = document.createElement('div');
                    countdownDiv.className = 'form-clear-countdown';
                    countdownDiv.innerHTML = '<i class="fas fa-clock"></i> Form will be cleared in <span id="countdown-timer">3</span> seconds';
                    formSection.appendChild(countdownDiv);
                    
                    // Start countdown
                    let countdown = 3;
                    const countdownInterval = setInterval(() => {
                        countdown--;
                        const timerSpan = document.getElementById('countdown-timer');
                        if (timerSpan) {
                            timerSpan.textContent = countdown;
                        }
                        if (countdown <= 0) {
                            clearInterval(countdownInterval);
                            if (countdownDiv.parentNode) {
                                countdownDiv.parentNode.removeChild(countdownDiv);
                            }
                        }
                    }, 1000);
                }
            } else {
                console.error('Bill generation failed:', result.message);
                showToast('Error generating bill: ' + (result.message || 'Unknown error'), 'error');
            }
        } else {
            const errorText = await response.text();
            console.error('HTTP Error:', response.status, errorText);
            showToast('Error generating bill. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error generating bill:', error);
        showToast('Error generating bill. Please try again.', 'error');
    } finally {
        // Restore button state
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

function handleAddCustomer(e) {
    e.preventDefault();
    alert('Add customer handler not implemented yet.');
}

function handleAddBook(e) {
    e.preventDefault();
    
    // Get form data
    const formData = {
        title: document.getElementById('new-book-title').value,
        author: document.getElementById('new-book-author').value,
        category: document.getElementById('new-book-category').value,
        format: document.getElementById('new-book-format').value,
        price: parseFloat(document.getElementById('new-book-price').value),
        stockQuantity: parseInt(document.getElementById('new-book-stock').value),
        isbn: document.getElementById('new-book-isbn').value,
        language: document.getElementById('new-book-language').value,
        publishedYear: parseInt(document.getElementById('new-book-year').value),
        pages: parseInt(document.getElementById('new-book-pages').value),
        publisher: document.getElementById('new-book-publisher').value,
        imageUrl: document.getElementById('new-book-image').value,
        description: document.getElementById('new-book-description').value
    };
    
    // Validate required fields
    if (!formData.title || !formData.author || !formData.category || !formData.format || !formData.price) {
        showToast('Please fill in all required fields.', 'error');
        return;
    }
    
    // Try to add book to backend first
    const token = localStorage.getItem('adminToken');
    if (token) {
        addBookToBackend(formData);
    } else {
        // Fallback to demo data
        addBookToDemoData(formData);
    }
}

async function addBookToBackend(formData) {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch('http://localhost:8080/api/books', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showToast('Book added successfully to database!', 'success');
                closeModal('add-book-modal');
                loadBooks(); // Reload books list
                return;
            } else {
                showToast('Error adding book: ' + (data.message || 'Unknown error'), 'error');
            }
        } else {
            const errorText = await response.text();
            console.error('Backend error:', errorText);
            showToast('Error adding book to database. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error adding book to backend:', error);
        showToast('Network error. Please check your connection and try again.', 'error');
    }
}

function addBookToDemoData(formData) {
    // Add to demo data
    const newBook = {
        id: 'demo_' + Date.now(),
        ...formData,
        status: formData.stockQuantity > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
        rating: 0,
        ratingCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Add to current books array
    if (!currentBooks) {
        currentBooks = [];
    }
    currentBooks.unshift(newBook);
    
    // Update display
    displayBooks(currentBooks);
    
    // Close modal and show success
    closeModal('add-book-modal');
    showToast('Book added successfully to demo data!', 'success');
}

// Modal functions - Fixed to prevent auto-display
function showAddCustomerModal() {
    const modal = document.getElementById('add-customer-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('modal-active');
    }
}

function showAddBookModal() {
    const modal = document.getElementById('add-book-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('modal-active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('modal-active');
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
        e.target.classList.remove('modal-active');
    }
});

// Book action functions with enhanced styling
function viewBook(bookId) {
    console.log('Viewing book:', bookId);
    
    // Find the book in current books
    const book = currentBooks.find(b => b.id === bookId);
    if (!book) {
        alert('Book not found');
        return;
    }
    
    // Create and show book detail modal with enhanced styling
    const modal = document.createElement('div');
    modal.className = 'modal book-detail-modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-book"></i> Book Details</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div style="padding: 0 2rem 2rem 2rem;">
                <div class="book-detail-grid">
                    <div class="book-detail-image">
                        <img src="${book.imageUrl || 'https://via.placeholder.com/250x350?text=Book'}" 
                             alt="${book.title}" 
                             onerror="this.src='https://via.placeholder.com/250x350?text=Book'">
                    </div>
                    <div class="book-detail-info">
                        <h2>${book.title}</h2>
                        <p class="author">by ${book.author}</p>
                        
                        <div class="book-detail-stats">
                            <div class="book-stat-item">
                                <div class="book-stat-label">Price</div>
                                <div class="book-stat-value">Rs. ${book.price}</div>
                            </div>
                            <div class="book-stat-item">
                                <div class="book-stat-label">Stock</div>
                                <div class="book-stat-value">${book.stockQuantity || 0} units</div>
                            </div>
                            <div class="book-stat-item">
                                <div class="book-stat-label">Status</div>
                                <div class="book-stat-value">
                                    <span class="status-badge ${getStatusClass(book.status)}">${getStatusText(book.status)}</span>
                                </div>
                            </div>
                            <div class="book-stat-item">
                                <div class="book-stat-label">Rating</div>
                                <div class="book-stat-value">${generateStarRating(book.rating || 0)}</div>
                            </div>
                            <div class="book-stat-item">
                                <div class="book-stat-label">ISBN</div>
                                <div class="book-stat-value">${book.isbn || 'N/A'}</div>
                            </div>
                            <div class="book-stat-item">
                                <div class="book-stat-label">Publisher</div>
                                <div class="book-stat-value">${book.publisher || 'N/A'}</div>
                            </div>
                        </div>
                        
                        ${book.description ? `
                            <div class="book-description">
                                <h4>Description</h4>
                                <p>${book.description}</p>
                            </div>
                        ` : ''}
                        
                        <div class="form-actions">
                            <button onclick="editBook('${book.id}')" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 1rem 2rem; border: none; border-radius: 0.75rem; cursor: pointer; font-weight: 600;">
                                <i class="fas fa-edit"></i> Edit Book
                            </button>
                            <button onclick="this.closest('.modal').remove()" style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 1rem 2rem; border: none; border-radius: 0.75rem; cursor: pointer; font-weight: 600;">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Add animation
    setTimeout(() => {
        modal.classList.add('modal-active');
    }, 10);
}

function updateStock(bookId) {
    console.log('updateStock called with bookId:', bookId);
    console.log('currentBooks:', currentBooks);
    
    const book = currentBooks.find(b => b.id === bookId);
    if (!book) {
        console.error('Book not found for ID:', bookId);
        showToast('Book not found', 'error');
        return;
    }
    
    console.log('Found book:', book);
    
    // Populate the updated stock modal with new structure
    document.getElementById('stock-book-image').src = book.imageUrl || 'https://via.placeholder.com/150x200?text=Book';
    document.getElementById('stock-book-title').textContent = book.title;
    document.getElementById('stock-book-author').textContent = book.author;
    document.getElementById('stock-current-quantity').textContent = book.stockQuantity || 0;
    document.getElementById('stock-book-price').textContent = `Rs. ${book.price}`;
    document.getElementById('stock-book-rating').textContent = `${book.rating || 0}/5`;
    
    // Set current status with proper styling
    const currentStatus = book.status || 'IN_STOCK';
    const statusElement = document.getElementById('stock-current-status');
    statusElement.textContent = getStatusText(currentStatus);
    statusElement.className = '';
    statusElement.classList.add('status-badge', getStatusClass(currentStatus));
    
    // Update book status badge in overlay
    const bookStatusBadge = document.getElementById('stock-book-status-badge');
    if (bookStatusBadge) {
        bookStatusBadge.innerHTML = `<i class="fas fa-circle"></i><span>${getStatusText(currentStatus)}</span>`;
        bookStatusBadge.className = 'book-status-badge';
        bookStatusBadge.classList.add(getStatusClass(currentStatus).toLowerCase().replace('_', '-'));
    }
    
    // Set default values for form fields
    const quantityInput = document.getElementById('new-stock-quantity');
    const statusSelect = document.getElementById('stock-update-status');
    const form = document.getElementById('update-stock-form');
    
    if (quantityInput && statusSelect && form) {
        quantityInput.value = book.stockQuantity || 0;
        statusSelect.value = currentStatus;
        form.setAttribute('data-book-id', bookId);
        
        console.log('Form fields populated:', {
            quantity: quantityInput.value,
            status: statusSelect.value,
            bookId: form.getAttribute('data-book-id')
        });
    } else {
        console.error('Form elements not found:', {
            quantityInput: !!quantityInput,
            statusSelect: !!statusSelect,
            form: !!form
        });
    }
    
    // Show the modal
    showModal('update-stock-modal');
}



// Handle update stock form submission
function handleUpdateStockSubmit(event) {
    event.preventDefault();
    console.log('Form submitted!');
    
    const form = document.getElementById('update-stock-form');
    const bookId = form.getAttribute('data-book-id');
    const quantityInput = document.getElementById('new-stock-quantity');
    const statusSelect = document.getElementById('stock-update-status');
    
    console.log('Form elements found:', {
        form: !!form,
        bookId: bookId,
        quantityInput: !!quantityInput,
        statusSelect: !!statusSelect,
        quantityValue: quantityInput?.value,
        statusValue: statusSelect?.value
    });
    
    if (bookId) {
        saveStockChanges(bookId);
    } else {
        showToast('Book ID not found. Please try again.', 'error');
    }
}

async function saveStockChanges(bookId) {
    const newQuantity = parseInt(document.getElementById('new-stock-quantity').value);
    const newStatus = document.getElementById('stock-update-status').value;

    if (Number.isNaN(newQuantity) || newQuantity < 0) {
        showToast('Please enter a valid non-negative quantity', 'error');
        return;
    }
    if (!newStatus) {
        showToast('Please select a stock status', 'error');
        return;
    }

    // Show loading state
    const updateBtn = document.querySelector('.update-btn.enhanced');
    const originalText = updateBtn.innerHTML;
    updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>UPDATING...</span>';
    updateBtn.disabled = true;

    try {
        // Persist to backend so all pages (including booklist.html) see the change
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`http://localhost:8080/api/books/${bookId}/stock`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ stockQuantity: newQuantity, status: newStatus })
        });

        if (!response.ok) {
            // If backend failed, throw to try local fallback and message
            const errText = await response.text();
            throw new Error(`HTTP ${response.status} ${response.statusText}: ${errText}`);
        }

        const data = await response.json().catch(() => ({}));
        const updatedBook = data.book || null;

        // Update local cache
        const bookIndex = currentBooks.findIndex(b => b.id === bookId);
        if (bookIndex !== -1) {
            currentBooks[bookIndex].stockQuantity = updatedBook?.stockQuantity ?? newQuantity;
            currentBooks[bookIndex].status = updatedBook?.status ?? newStatus;
        }

        // Close modal and refresh UI
        closeModal('update-stock-modal');
        showToast('Stock updated successfully', 'success');
        await loadBooks(currentPage);
        await updateBookStats();

        // Notify other tabs/pages (e.g., customer book list) to refresh
        try {
            const payload = { bookId, stockQuantity: newQuantity, status: newStatus, at: Date.now() };
            localStorage.setItem('booksUpdated', JSON.stringify(payload));
        } catch (_) { /* ignore storage errors */ }
    } catch (error) {
        console.error('Error updating stock:', error);

        // As a resilience fallback, update locally so the admin still sees the change
        try {
            const bookIndex = currentBooks.findIndex(b => b.id === bookId);
            if (bookIndex !== -1) {
                currentBooks[bookIndex].stockQuantity = newQuantity;
                currentBooks[bookIndex].status = newStatus;
            }
            closeModal('update-stock-modal');
            await loadBooks(currentPage);
            await updateBookStats();
            showToast('Backend update failed, applied local update only', 'warning');
        } catch (_) {
            showToast(`Error updating stock: ${error.message}`, 'error');
        }
    } finally {
        updateBtn.innerHTML = originalText;
        updateBtn.disabled = false;
    }
}

function deleteBook(bookId) {
    console.log('deleteBook called with bookId:', bookId);
    console.log('currentBooks:', currentBooks);
    
    // Find the book in current books
    const book = currentBooks.find(b => b.id === bookId);
    if (!book) {
        console.error('Book not found for ID:', bookId);
        alert('Book not found');
        return;
    }
    
    console.log('Found book:', book);
    
    // Show confirmation modal with enhanced styling
    const modal = document.createElement('div');
    modal.className = 'modal delete-confirmation-modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-exclamation-triangle"></i> Delete Book</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div style="padding: 2rem; text-align: center;">
                <div class="delete-warning-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h4 style="margin-bottom: 1rem; color: #1e293b;">Are you sure you want to delete this book?</h4>
                <div class="delete-book-title">${book.title}</div>
                <div class="delete-book-author">by ${book.author}</div>
                <div class="delete-warning-text">This action cannot be undone.</div>
                
                <div class="form-actions" style="justify-content: center; margin-top: 2rem;">
                    <button type="button" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button type="submit" onclick="confirmDeleteBook('${book.id}')" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                        <i class="fas fa-trash"></i> Delete Book
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Add animation
    setTimeout(() => {
        modal.classList.add('modal-active');
    }, 10);
}

function confirmDeleteBook(bookId) {
    // TODO: Send delete request to backend
    console.log('Confirming delete for book:', bookId);
    
    // For now, just show success message
    alert('Book deleted successfully!');
    // Close any open modals
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
        modal.classList.remove('modal-active');
    });
    
    // Reload books to show updated data
    loadBooks(currentPage);
} 

function editBook(bookId) {
    console.log('editBook called with bookId:', bookId);
    // Close any open generic modals (e.g., Book Details) so edit modal is not hidden behind
    try {
        document.querySelectorAll('.modal').forEach(m => {
            if (m.id !== 'edit-book-modal' && getComputedStyle(m).display !== 'none') {
                m.style.display = 'none';
                m.classList.remove('modal-active');
            }
        });
    } catch (_) {}

    // Show the edit modal immediately for faster UX
    showModal('edit-book-modal');

    // Find the book in the cached list
    let book = currentBooks ? currentBooks.find(b => String(b.id) === String(bookId)) : null;

    const formEl = document.getElementById('edit-book-form');
    if (formEl) formEl.setAttribute('data-book-id', bookId);

    const applyToForm = (bk) => {
        if (!bk) return;
        document.getElementById('edit-book-title').value = bk.title || '';
        document.getElementById('edit-book-author').value = bk.author || '';
        document.getElementById('edit-book-category').value = bk.category || '';
        document.getElementById('edit-book-format').value = bk.format || '';
        document.getElementById('edit-book-price').value = bk.price ?? '';
        document.getElementById('edit-book-stock').value = bk.stockQuantity ?? 0;
        document.getElementById('edit-book-isbn').value = bk.isbn || '';
        document.getElementById('edit-book-language').value = bk.language || 'English';
        document.getElementById('edit-book-year').value = bk.publishedYear || 2024;
        document.getElementById('edit-book-pages').value = bk.pages || 200;
        document.getElementById('edit-book-publisher').value = bk.publisher || 'Pahana Books';
        document.getElementById('edit-book-image').value = bk.imageUrl || '';
        document.getElementById('edit-book-description').value = bk.description || '';
        // Focus first field for quick editing
        document.getElementById('edit-book-title').focus();
    };

    if (book) {
        applyToForm(book);
    } else {
        // If not in cache, fetch from backend then populate
        (async () => {
            try {
                const res = await fetch(`http://localhost:8080/api/books/${bookId}`);
                if (res.ok) {
                    const data = await res.json();
                    const fetched = data.book || data || null;
                    applyToForm(fetched);
                } else {
                    showToast('Could not load book details from server', 'error');
                }
            } catch (err) {
                console.error('Failed to fetch book by id', err);
            }
        })();
    }
}

async function saveBookChanges(bookId) {
    // Get form values
    const formData = {
        title: document.getElementById('edit-book-title').value,
        author: document.getElementById('edit-book-author').value,
        category: document.getElementById('edit-book-category').value,
        format: document.getElementById('edit-book-format').value,
        price: parseFloat(document.getElementById('edit-book-price').value),
        stockQuantity: parseInt(document.getElementById('edit-book-stock').value),
        isbn: document.getElementById('edit-book-isbn').value,
        language: document.getElementById('edit-book-language').value,
        publishedYear: parseInt(document.getElementById('edit-book-year').value),
        pages: parseInt(document.getElementById('edit-book-pages').value),
        publisher: document.getElementById('edit-book-publisher').value,
        imageUrl: document.getElementById('edit-book-image').value,
        description: document.getElementById('edit-book-description').value
    };
    
    // Validate required fields
    if (!formData.title || !formData.author || !formData.category || !formData.format || !formData.price || formData.stockQuantity < 0) {
        showToast('Please fill in all required fields correctly.', 'error');
        return;
    }
    
    try {
        // Show loading state
        const saveBtn = document.querySelector('#edit-book-form button[type="submit"]');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;
        
        // Try to send update to backend first
        try {
            const response = await fetch(`http://localhost:8080/api/books/${bookId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    // Update the book in current books array
                    const bookIndex = currentBooks.findIndex(b => b.id === bookId);
                    if (bookIndex !== -1) {
                        currentBooks[bookIndex] = { ...currentBooks[bookIndex], ...formData };
                    }
                    
                    // Close modal
                    closeModal('edit-book-modal');
                    
                    // Show success message
                    showToast('Book updated successfully!', 'success');
                    
                    // Reload books to show updated data
                    await loadBooks(currentPage);
                    await updateBookStats();

                    // Notify booklist page to refresh
                    try {
                        localStorage.setItem('booksUpdated', JSON.stringify({ bookId, at: Date.now(), type: 'edit' }));
                    } catch (_) {}
                    return;
                }
            }
        } catch (backendError) {
            console.log('Backend update failed, updating local data:', backendError);
        }
        
        // If backend fails, update local data
        const bookIndex = currentBooks.findIndex(b => b.id === bookId);
        if (bookIndex !== -1) {
            currentBooks[bookIndex] = { ...currentBooks[bookIndex], ...formData };
        }
        
        // Close modal
        closeModal('edit-book-modal');
        
        // Show success message
        showToast('Book updated successfully! (Local update)', 'success');
        
        // Reload books to show updated data
        await loadBooks(currentPage);
        await updateBookStats();
        try {
            localStorage.setItem('booksUpdated', JSON.stringify({ bookId, at: Date.now(), type: 'edit-local' }));
        } catch (_) {}
        
    } catch (error) {
        console.error('Error updating book:', error);
        showToast(`Error updating book: ${error.message}`, 'error');
        
        // Reset button state
        const saveBtn = document.querySelector('#edit-book-form button[type="submit"]');
        if (saveBtn) {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
} 

// Refresh customer data
async function refreshCustomerData() {
    console.log('Refreshing customer data...');
    await loadCustomers();
    
    // Also update dashboard stats
    await loadDashboardData();
}

// Refresh all data
async function refreshAllData() {
    console.log('Refreshing all data...');
    
    // Show loading state
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.classList.add('loading');
        refreshBtn.disabled = true;
    }
    
    try {
        await Promise.all([
            loadDashboardData(),
            loadCustomers(),
            loadOrders(),
            loadBooks(currentPage),
            updateBookStats()
        ]);
        console.log('All data refreshed successfully');
        
        // Show success message
        showToast('Data refreshed successfully!', 'success');
    } catch (error) {
        console.error('Error refreshing data:', error);
        showToast('Error refreshing data. Please try again.', 'error');
    } finally {
        // Remove loading state
        if (refreshBtn) {
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
        }
    }
} 

// Show toast notification
// Show toast notification
const ADMIN_TOAST_FIXED_DURATION_MS = 5000; // 5 seconds for all admin toasts as requested
const ADMIN_TOAST_IMPORTANT_DURATION_MS = 20000; // 20 seconds for important notifications

function showToast(message, type = 'info') {
    console.log('showToast called with:', message, type);
    
    // Remove any existing toasts to prevent overlap
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(existingToast => {
        existingToast.remove();
    });
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <div class="toast-progress"></div>
    `;
    
    document.body.appendChild(toast);
    console.log('Toast element created and added to DOM');

    // Trigger CSS transition (double rAF prevents race condition)
    requestAnimationFrame(() => requestAnimationFrame(() => {
        toast.classList.add('show');
        console.log('Toast show class added, should be visible now');
    }));

    // Auto-hide after fixed duration - 5 seconds as requested
    let hideTimer = setTimeout(removeToast, 5000);

    function removeToast() {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) document.body.removeChild(toast);
        }, 500); // match CSS transition duration
    }

    // Pause timer on hover
    toast.addEventListener('mouseenter', () => {
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
    });

    // Resume timer on mouse leave
    toast.addEventListener('mouseleave', () => {
        if (!hideTimer) hideTimer = setTimeout(removeToast, 5000);
    });

    // Allow click to dismiss immediately
    toast.addEventListener('click', () => removeToast());
}

// Show important toast notification that stays longer
function showImportantToast(message, type = 'info') {
    // Remove any existing toasts to prevent overlap
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(existingToast => {
        existingToast.remove();
    });
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} toast-important`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <div class="toast-progress important"></div>
    `;
    
    document.body.appendChild(toast);

    // Trigger CSS transition
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));

    // Auto-hide after longer duration for important messages
    let hideTimer = setTimeout(removeToast, ADMIN_TOAST_IMPORTANT_DURATION_MS);

    function removeToast() {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) document.body.removeChild(toast);
        }, 500);
    }

    // Pause timer on hover
    toast.addEventListener('mouseenter', () => {
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
    });

    // Resume timer on mouse leave
    toast.addEventListener('mouseleave', () => {
        if (!hideTimer) hideTimer = setTimeout(removeToast, ADMIN_TOAST_IMPORTANT_DURATION_MS);
    });

    // Allow click to dismiss immediately
    toast.addEventListener('click', () => removeToast());
}

// Customer action functions with enhanced styling
function viewCustomer(customerId) {
    console.log('Viewing customer:', customerId);
    
    // Find the customer in current customers
    const customer = currentCustomers ? currentCustomers.find(c => c.id === customerId) : null;
    if (!customer) {
        showToast('Customer not found', 'error');
        return;
    }
    
    // Create and show customer detail modal with enhanced styling
    const modal = document.createElement('div');
    modal.className = 'modal customer-detail-modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content modern-modal">
            <div class="modal-header modern-header">
                <div class="header-content">
                    <div class="header-icon">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="header-text">
                        <h3>Customer Details</h3>
                        <p>View and manage customer information</p>
                    </div>
                </div>
                <button class="close-btn modern-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="modal-body modern-body">
                <div class="customer-profile-section">
                    <div class="customer-avatar-large">
                        <div class="avatar-circle">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="customer-name-display">
                            <h2>${customer.name || 'N/A'}</h2>
                            <span class="account-badge">${customer.accountNumber || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="customer-info-grid">
                    <div class="info-card">
                        <div class="info-icon">
                            <i class="fas fa-envelope"></i>
                        </div>
                        <div class="info-content">
                            <label>Email Address</label>
                            <span class="info-value">${customer.email || 'Not provided'}</span>
                        </div>
                    </div>
                    
                    <div class="info-card">
                        <div class="info-icon">
                            <i class="fas fa-phone"></i>
                        </div>
                        <div class="info-content">
                            <label>Phone Number</label>
                            <span class="info-value">${customer.phone || 'Not provided'}</span>
                        </div>
                    </div>
                    
                    <div class="info-card">
                        <div class="info-icon">
                            <i class="fas fa-calendar-alt"></i>
                        </div>
                        <div class="info-content">
                            <label>Registration Date</label>
                            <span class="info-value">${customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            }) : 'Not available'}</span>
                        </div>
                    </div>
                    
                    <div class="info-card">
                        <div class="info-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="info-content">
                            <label>Status</label>
                            <span class="status-badge-modern active">Active</span>
                        </div>
                    </div>
                </div>
                
                ${customer.address ? `
                <div class="customer-address-section">
                    <div class="section-header">
                        <i class="fas fa-map-marker-alt"></i>
                        <h4>Address Information</h4>
                    </div>
                    <div class="address-content">
                        <p>${customer.address}</p>
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div class="modal-footer modern-footer">
                <div class="action-buttons">
                    <button class="action-btn primary-btn" onclick="editCustomer('${customer.id}')">
                        <i class="fas fa-edit"></i>
                        <span>Edit Customer</span>
                    </button>
                    <button class="action-btn secondary-btn" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                        <span>Close</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Add animation
    setTimeout(() => {
        modal.classList.add('modal-active');
    }, 10);
}

function editCustomer(customerId) {
    console.log('Editing customer:', customerId);
    
    // Find the customer in current customers
    const customer = currentCustomers ? currentCustomers.find(c => c.id === customerId) : null;
    if (!customer) {
        showToast('Customer not found', 'error');
        return;
    }
    
    // Create and show edit customer modal with enhanced styling
    const modal = document.createElement('div');
    modal.className = 'modal edit-customer-modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content modern-modal">
            <div class="modal-header modern-header">
                <div class="header-content">
                    <div class="header-icon">
                        <i class="fas fa-edit"></i>
                    </div>
                    <div class="header-text">
                        <h3>Edit Customer</h3>
                        <p>Update customer information</p>
                    </div>
                </div>
                <button class="close-btn modern-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="modal-body modern-body">
                <form id="edit-customer-form" class="modern-form">
                    <div class="form-section">
                        <div class="section-header">
                            <i class="fas fa-user"></i>
                            <h4>Basic Information</h4>
                        </div>
                        <div class="form-grid">
                            <div class="form-group modern-group">
                                <label class="modern-label">
                                    <i class="fas fa-id-card"></i>
                                    Account Number *
                                </label>
                                <input type="text" id="edit-customer-account" value="${customer.accountNumber || ''}" 
                                       class="modern-input" required>
                            </div>
                            <div class="form-group modern-group">
                                <label class="modern-label">
                                    <i class="fas fa-user"></i>
                                    Full Name *
                                </label>
                                <input type="text" id="edit-customer-name" value="${customer.name || ''}" 
                                       class="modern-input" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <div class="section-header">
                            <i class="fas fa-envelope"></i>
                            <h4>Contact Information</h4>
                        </div>
                        <div class="form-grid">
                            <div class="form-group modern-group">
                                <label class="modern-label">
                                    <i class="fas fa-envelope"></i>
                                    Email Address *
                                </label>
                                <input type="email" id="edit-customer-email" value="${customer.email || ''}" 
                                       class="modern-input" required>
                            </div>
                            <div class="form-group modern-group">
                                <label class="modern-label">
                                    <i class="fas fa-phone"></i>
                                    Phone Number *
                                </label>
                                <input type="tel" id="edit-customer-phone" value="${customer.phone || ''}" 
                                       class="modern-input" placeholder="+94 71 123 4567" required>
                            </div>
                        </div>
                    </div>
                    

                    
                    <div class="form-section">
                        <div class="section-header">
                            <i class="fas fa-info-circle"></i>
                            <h4>Additional Information</h4>
                        </div>
                        <div class="info-display">
                            <div class="info-item">
                                <label>Registration Date</label>
                                <span>${customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                }) : 'Not available'}</span>
                            </div>
                            <div class="info-item">
                                <label>Customer Status</label>
                                <span class="status-badge-modern active">Active</span>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            
            <div class="modal-footer modern-footer">
                <div class="action-buttons">
                    <button type="button" class="action-btn secondary-btn" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                        <span>Cancel</span>
                    </button>
                    <button type="submit" form="edit-customer-form" class="action-btn primary-btn">
                        <i class="fas fa-save"></i>
                        <span>Save Changes</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Add animation
    setTimeout(() => {
        modal.classList.add('modal-active');
    }, 10);
    
    // Add form submit handler
    document.getElementById('edit-customer-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveCustomerChanges(customerId);
    });
}

function saveCustomerChanges(customerId) {
    // Get form values
    const formData = {
        accountNumber: document.getElementById('edit-customer-account').value,
        name: document.getElementById('edit-customer-name').value,
        email: document.getElementById('edit-customer-email').value,
        phone: document.getElementById('edit-customer-phone').value
    };
    
    // Validate required fields
    if (!formData.accountNumber || !formData.name || !formData.email || !formData.phone) {
        showToast('Please fill in all required fields.', 'error');
        return;
    }
    
    // Send update to backend
    const token = localStorage.getItem('adminToken');
    fetch(`http://localhost:8080/api/admin/customers/${customerId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Customer updated successfully!', 'success');
            document.querySelector('.modal').remove();
            loadCustomers(); // Reload customer list
        } else {
            showToast('Error updating customer: ' + (data.message || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        console.error('Error updating customer:', error);
        showToast('Error updating customer. Please try again.', 'error');
    });
}

function deleteCustomer(customerId) {
    console.log('Deleting customer:', customerId);
    
    // Find the customer in current customers
    const customer = currentCustomers ? currentCustomers.find(c => c.id === customerId) : null;
    if (!customer) {
        showToast('Customer not found', 'error');
        return;
    }
    
    // Show confirmation modal with enhanced styling
    const modal = document.createElement('div');
    modal.className = 'modal delete-confirmation-modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-exclamation-triangle"></i> Delete Customer</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div style="padding: 2rem; text-align: center;">
                <div class="delete-warning-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h4 style="margin-bottom: 1rem; color: #1e293b;">Are you sure you want to delete this customer?</h4>
                <div class="delete-customer-name">${customer.name}</div>
                <div class="delete-customer-account">Account: ${customer.accountNumber}</div>
                <div class="delete-warning-text">This action cannot be undone.</div>
                
                <div class="form-actions" style="justify-content: center; margin-top: 2rem;">
                    <button type="button" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button type="submit" onclick="confirmDeleteCustomer('${customer.id}')" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                        <i class="fas fa-trash"></i> Delete Customer
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Add animation
    setTimeout(() => {
        modal.classList.add('modal-active');
    }, 10);
}

async function confirmDeleteCustomer(customerId) {
    // Close the modal immediately for better UX
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
    
    // Check if we're using demo data (no token or demo customers)
    const token = localStorage.getItem('adminToken');
    const isUsingDemoData = !token || !currentCustomers || currentCustomers.length === 0;
    
    if (isUsingDemoData) {
        console.log('Using demo data deletion for customer:', customerId);
        handleDemoCustomerDeletion(customerId);
        return;
    }
    
    try {
        // Try to delete from backend first
        console.log('Attempting to delete customer from backend:', customerId, 'with token:', token ? 'present' : 'missing');
        
        const response = await fetch(`http://localhost:8080/api/admin/customers/${customerId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Delete response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Delete response data:', data);
            if (data.success) {
                showToast('Customer deleted successfully from database!', 'success');
                // Reload customers from backend to get updated list
                loadCustomers();
                return;
            } else {
                console.log('Backend returned success: false');
                showToast('Error deleting customer: ' + (data.message || 'Unknown error'), 'error');
            }
        } else {
            console.log('Backend returned error status:', response.status);
            const errorText = await response.text();
            console.log('Error response:', errorText);
            showToast('Error deleting customer from database. Please try again.', 'error');
        }
        
    } catch (error) {
        console.error('Error deleting customer from backend:', error);
        showToast('Network error. Please check your connection and try again.', 'error');
    }
}

function handleDemoCustomerDeletion(customerId) {
    // Remove customer from current customers array
    if (currentCustomers) {
        const customerIndex = currentCustomers.findIndex(c => c.id === customerId);
        if (customerIndex !== -1) {
            currentCustomers.splice(customerIndex, 1);
            
            // Update the display
            displayCustomers(currentCustomers);
            
            // Show success message briefly
            showToast('Customer deleted successfully!', 'success');
            return;
        }
    }
    
    // If customer not found in demo data
    showToast('Customer not found', 'error');
} 

// Refresh all book-related data comprehensively
async function refreshAllBookData() {
    try {
        console.log('Refreshing all book data...');
        
        // Refresh books list
        await loadBooks(currentPage);
        
        // Refresh dashboard data (includes total book count)
        await loadDashboardData();
        
        // Refresh book statistics specifically
        await updateBookStats();
        
        // Force a re-render of the books display
        if (currentBooks && currentBooks.length > 0) {
            displayBooks(currentBooks);
        }
        
        console.log('All book data refreshed successfully');
    } catch (error) {
        console.error('Error refreshing book data:', error);
        showToast('Error refreshing data. Please refresh the page manually.', 'error');
    }
}

// Manual refresh function for debugging and data consistency
async function manualRefreshBookData() {
    try {
        showToast('Refreshing book data...', 'info');
        
        // Show loading state
        const refreshBtn = document.querySelector('.manual-refresh-btn');
        if (refreshBtn) {
            const originalText = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            refreshBtn.disabled = true;
            
            setTimeout(() => {
                refreshBtn.innerHTML = originalText;
                refreshBtn.disabled = false;
            }, 2000);
        }
        
        // Refresh all data
        await refreshAllBookData();
        
        showToast('Book data refreshed successfully!', 'success');
        
    } catch (error) {
        console.error('Error during manual refresh:', error);
        showToast('Error refreshing data. Please try again.', 'error');
    }
}

// Helper functions for status display
function getStatusClass(status) {
    switch(status) {
        case 'IN_STOCK': return 'in-stock';
        case 'LOW_STOCK': return 'low-stock';
        case 'OUT_OF_STOCK': return 'out-of-stock';
        default: return 'in-stock';
    }
}

function getStatusText(status) {
    switch(status) {
        case 'IN_STOCK': return 'IN STOCK';
        case 'LOW_STOCK': return 'LOW STOCK';
        case 'OUT_OF_STOCK': return 'OUT OF STOCK';
        default: return 'IN STOCK';
    }
}

function showModal(modalId) {
    console.log('showModal called with:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        console.log('Modal found, setting display to flex');
        modal.style.display = 'flex';
        modal.classList.add('modal-active');
        console.log('Modal display set to:', modal.style.display);
        console.log('Modal classes:', modal.className);
    } else {
        console.error('Modal not found:', modalId);
        alert(`Modal ${modalId} not found. Please check the HTML structure.`);
    }
}

function closeModal(modalId) {
    console.log('closeModal called with:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        console.log('Modal found, setting display to none');
        modal.style.display = 'none';
        modal.classList.remove('modal-active');
        console.log('Modal display set to:', modal.style.display);
    } else {
        console.error('Modal not found:', modalId);
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
        e.target.classList.remove('modal-active');
    }
});

// Export functions to global scope
window.testNotification = testNotification;
window.showSimpleNotification = showSimpleNotification;
window.deleteBill = deleteBill;