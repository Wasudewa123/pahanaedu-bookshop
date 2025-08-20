// Enhanced Reports and Analytics JavaScript
// This file contains all the functionality for the Reports & Analytics section

let analyticsData = null;
let categoryChart = null;
let revenueChart = null;
let salesTrendChart = null;
let salesChart = null;
let customerChart = null;

// Initialize analytics when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Set default date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    const startDateInput = document.getElementById('report-start-date');
    const endDateInput = document.getElementById('report-end-date');
    
    if (startDateInput) startDateInput.value = startDate.toISOString().split('T')[0];
    if (endDateInput) endDateInput.value = endDate.toISOString().split('T')[0];
    
    // Load analytics data
    loadAnalyticsData();
    
    // Set up event listeners
    setupEventListeners();
});

// Set up event listeners
function setupEventListeners() {
    const startDateInput = document.getElementById('report-start-date');
    const endDateInput = document.getElementById('report-end-date');
    const reportTypeSelect = document.getElementById('report-type');
    
    if (startDateInput) {
        startDateInput.addEventListener('change', updateReports);
    }
    
    if (endDateInput) {
        endDateInput.addEventListener('change', updateReports);
    }
    
    if (reportTypeSelect) {
        reportTypeSelect.addEventListener('change', loadDetailedReport);
    }
}

// Load real analytics data from backend
async function loadAnalyticsData() {
    try {
        showLoadingState();
        
        const startDate = document.getElementById('report-start-date')?.value;
        const endDate = document.getElementById('report-end-date')?.value;
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const response = await fetch(`http://localhost:8080/api/analytics/dashboard?${params.toString()}`);
        if (!response.ok) {
            throw new Error('Failed to fetch analytics data');
        }
        
        const data = await response.json();
        if (data.success) {
            analyticsData = data.analytics;
            updateAnalyticsDisplay();
            renderCharts();
            // Load detailed report after charts
            setTimeout(loadDetailedReport, 0);
        } else {
            throw new Error(data.message || 'Failed to load analytics');
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
        showErrorState('Failed to load analytics data. Please check your backend connection.');
        // Still try to populate detailed reports from any cached data
        try { renderDetailedReportFromCache(); } catch (_) {}
    }
}

// Show loading state
function showLoadingState() {
    // Do NOT replace entire card contents (it removes required elements like
    // #top-books-list, #recent-bills-list, #category-chart, #revenue-chart).
    // Instead, put a loading placeholder inside the known containers while
    // preserving their DOM nodes and IDs so later renderers can find them.

    const setHolder = (selectorOrEl, html) => {
        const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
        if (el) el.innerHTML = html;
    };

    const loadingHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading analytics...</p>
        </div>`;

    // Top books list
    setHolder('#top-books-list', loadingHTML);
    // Recent bills list
    setHolder('#recent-bills-list', loadingHTML);

    // Ensure canvases exist for charts and clear them
    const ensureCanvas = (id) => {
        let canvas = document.getElementById(id);
        if (!canvas) {
            const cardContent = document.querySelector(`[data-canvas="${id}"]`) || document.querySelector(`#${id}-container`) || null;
            if (cardContent) {
                canvas = document.createElement('canvas');
                canvas.id = id;
                cardContent.innerHTML = '';
                cardContent.appendChild(canvas);
            }
        } else {
            // Clear any previous drawing by resetting width
            const w = canvas.width; const h = canvas.height; canvas.width = w; canvas.height = h;
        }
        return canvas;
    };

    ensureCanvas('category-chart');
    ensureCanvas('revenue-chart');
}

// Show error state
function showErrorState(message) {
    const statsCards = document.querySelectorAll('.stat-card');
    statsCards.forEach(card => {
        const content = card.querySelector('.stat-content h3');
        if (content) {
            content.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
        }
    });
    
    showToast(message, 'error');
}

// Update analytics display with real data
function updateAnalyticsDisplay() {
    if (!analyticsData) return;
    
    // Update quick stats
    const revenueElement = document.getElementById('total-revenue-stat');
    const ordersElement = document.getElementById('total-orders-stat');
    const customersElement = document.getElementById('total-customers-stat');
    const booksElement = document.getElementById('total-books-stat');
    
    if (revenueElement) revenueElement.textContent = `Rs. ${formatCurrency(analyticsData.totalRevenue)}`;
    if (ordersElement) ordersElement.textContent = analyticsData.totalOrders;
    if (customersElement) customersElement.textContent = analyticsData.totalCustomers;
    if (booksElement) booksElement.textContent = analyticsData.totalBooks;
    
    // Update change indicators
    const revenueChange = document.getElementById('revenue-change');
    if (revenueChange) {
        const change = analyticsData.revenueChange;
        const changeText = change >= 0 ? `+${change}%` : `${change}%`;
        const changeClass = change >= 0 ? 'positive' : 'negative';
        revenueChange.textContent = changeText;
        revenueChange.className = `stat-change ${changeClass}`;
    }
    
    // Update other change indicators
    const ordersChange = document.getElementById('orders-change');
    const customersChange = document.getElementById('customers-change');
    const booksChange = document.getElementById('books-change');
    
    if (ordersChange) ordersChange.textContent = 'Updated';
    if (customersChange) customersChange.textContent = 'Updated';
    if (booksChange) booksChange.textContent = 'Updated';
}

// Render all charts with real data
function renderCharts() {
    if (!analyticsData) return;
    
    renderTopBooksChart();
    renderCategoryChart();
    renderRevenueChart();
    renderSalesTrendChart();
    renderRecentBills();
}

// Render top selling books chart
function renderTopBooksChart() {
    const container = document.getElementById('top-books-list');
    if (!container || !analyticsData.topBooks) return;
    
    container.innerHTML = '';
    
    analyticsData.topBooks.forEach((book, index) => {
        const item = document.createElement('div');
        item.className = 'top-book-item enhanced';
        
        const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
        const percentage = Math.round((book.quantity / Math.max(...analyticsData.topBooks.map(b => b.quantity))) * 100);
        
        item.innerHTML = `
            <div class="rank-badge ${rankClass}">
                <span class="rank-number">${index + 1}</span>
                ${index < 3 ? `<i class="fas fa-trophy"></i>` : ''}
            </div>
            <div class="book-info">
                <div class="book-title">${book.title}</div>
                <div class="sales-info">
                    <span class="sales-count">${book.quantity} sold</span>
                    <span class="sales-percentage">${percentage}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
        
        container.appendChild(item);
    });
}

// Render category performance chart
function renderCategoryChart() {
    const canvas = document.getElementById('category-chart');
    if (!canvas || !analyticsData.categoryPerformance) return;
    
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    // Ensure canvas has an explicit size before chart init
    if (!canvas.width || !canvas.height) {
        canvas.width = canvas.clientWidth || 600;
        canvas.height = 260;
    }
    const ctx = canvas.getContext('2d');
    const labels = Object.keys(analyticsData.categoryPerformance || {});
    const data = Object.values(analyticsData.categoryPerformance || {});

    if (!labels.length) {
        // Show friendly empty state
        const holder = canvas.parentElement;
        if (holder) {
            holder.innerHTML = '<div class="no-data-content"><i class="fas fa-inbox"></i><p>No category data available</p></div>';
        }
        return;
    }
    
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
                    '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Render revenue by payment method chart
function renderRevenueChart() {
    const canvas = document.getElementById('revenue-chart');
    if (!canvas || !analyticsData.paymentMethodRevenue) return;
    
    if (revenueChart) {
        revenueChart.destroy();
    }
    
    if (!canvas.width || !canvas.height) {
        canvas.width = canvas.clientWidth || 600;
        canvas.height = 260;
    }
    const ctx = canvas.getContext('2d');
    const labels = Object.keys(analyticsData.paymentMethodRevenue || {});
    const data = Object.values(analyticsData.paymentMethodRevenue || {});

    if (!labels.length) {
        const holder = canvas.parentElement;
        if (holder) {
            holder.innerHTML = '<div class="no-data-content"><i class="fas fa-inbox"></i><p>No revenue data available</p></div>';
        }
        return;
    }
    
    revenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue (Rs.)',
                data: data,
                backgroundColor: [
                    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
                    '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
                ],
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Revenue: Rs. ${formatCurrency(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'Rs. ' + formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// Render sales trend line chart using recent 30 days
function renderSalesTrendChart() {
    const canvas = document.getElementById('sales-trend-chart');
    if (!canvas || !analyticsData || !analyticsData.salesTrend) return;
    if (salesTrendChart) salesTrendChart.destroy();
    const labels = Object.keys(analyticsData.salesTrend);
    const data = Object.values(analyticsData.salesTrend).map(v => Math.round(Number(v || 0)));
    if (!labels.length) return;
    const ctx = canvas.getContext('2d');
    salesTrendChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Daily Revenue (Rs.)', data, borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.15)', fill: true, tension: 0.3, pointRadius: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
}

// Render recent bills
function renderRecentBills() {
    const container = document.getElementById('recent-bills-list');
    if (!container || !analyticsData.recentBills) return;
    
    container.innerHTML = '';
    
    analyticsData.recentBills.forEach(bill => {
        const item = document.createElement('div');
        item.className = 'activity-item bill-item enhanced';
        
        const billDate = bill.billDate ? new Date(bill.billDate).toLocaleDateString() : 'N/A';
        const statusClass = bill.status ? bill.status.toLowerCase() : 'pending';
        
        item.innerHTML = `
            <div class="activity-icon">
                <i class="fas fa-file-invoice-dollar"></i>
            </div>
            <div class="activity-content">
                <div class="bill-header">
                    <strong class="bill-number">${bill.billNumber}</strong>
                    <span class="bill-status ${statusClass}">${bill.status || 'PENDING'}</span>
                </div>
                <div class="bill-details">
                    <span class="customer-name">${bill.customerName}</span>
                    <span class="bill-date">${billDate}</span>
                </div>
                <div class="payment-method">
                    <i class="fas fa-credit-card"></i>
                    ${bill.paymentMethod || 'N/A'}
                </div>
            </div>
            <div class="amount-value">
                <span class="currency">Rs.</span>
                <span class="amount">${formatCurrency(bill.total)}</span>
            </div>
        `;
        
        container.appendChild(item);
    });
}

// Load detailed reports based on type
async function loadDetailedReport() {
    const reportType = document.getElementById('report-type')?.value || 'bills';
    const startDate = document.getElementById('report-start-date')?.value;
    const endDate = document.getElementById('report-end-date')?.value;
    
    try {
        const params = new URLSearchParams({
            reportType: reportType
        });
        
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        const response = await fetch(`http://localhost:8080/api/analytics/reports?${params}`);
        if (!response.ok) {
            throw new Error('Failed to fetch detailed report');
        }
        
        const data = await response.json();
        if (data.success) {
            renderDetailedReport(data.reportData, reportType);
        } else {
            throw new Error(data.message || 'Failed to load report');
        }
    } catch (error) {
        console.error('Error loading detailed report:', error);
        // Fallback to cached data if available
        if (!renderDetailedReportFromCache()) {
            showToast('Failed to load detailed report', 'error');
        }
    }
}

// Render detailed report table
function renderDetailedReport(reportData, reportType) {
    const tbody = document.getElementById('detailed-reports-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    let data = [];
    let headers = [];
    
    if (reportType === 'bills' && reportData.bills) {
        data = reportData.bills;
        headers = ['Date', 'Bill Number', 'Customer', 'Items', 'Total Amount', 'Payment Method', 'Status'];
    } else if (reportType === 'books' && reportData.books) {
        data = reportData.books;
        headers = ['Title', 'Author', 'Category', 'Price', 'Stock', 'Rating'];
    } else if (reportType === 'customers' && reportData.customers) {
        data = reportData.customers;
        headers = ['Account Number', 'Name', 'Email', 'Phone', 'Registration Date'];
    }
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${headers.length}" class="no-data">
                    <div class="no-data-content">
                        <i class="fas fa-inbox"></i>
                        <p>No data available for this report</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    data.forEach(item => {
        const row = document.createElement('tr');
        
        if (reportType === 'bills') {
            const date = item.date ? new Date(item.date).toLocaleDateString() : 'N/A';
            const statusClass = item.status ? item.status.toLowerCase() : 'pending';
            
            row.innerHTML = `
                <td>${date}</td>
                <td><strong>${item.billNumber}</strong></td>
                <td>${item.customerName}</td>
                <td>${item.items}</td>
                <td class="amount">Rs. ${formatCurrency(item.totalAmount)}</td>
                <td>${item.paymentMethod || 'N/A'}</td>
                <td><span class="status-badge ${statusClass}">${item.status || 'PENDING'}</span></td>
            `;
        } else if (reportType === 'books') {
            const stockClass = item.stock > 10 ? 'in-stock' : item.stock > 0 ? 'low-stock' : 'out-of-stock';
            
            row.innerHTML = `
                <td><strong>${item.title}</strong></td>
                <td>${item.author}</td>
                <td>${item.category}</td>
                <td class="amount">Rs. ${formatCurrency(item.price)}</td>
                <td><span class="stock-badge ${stockClass}">${item.stock}</span></td>
                <td>${item.rating.toFixed(1)}/5</td>
            `;
        } else if (reportType === 'customers') {
            const regDate = item.registrationDate ? new Date(item.registrationDate).toLocaleDateString() : 'N/A';
            
            row.innerHTML = `
                <td><strong>${item.accountNumber}</strong></td>
                <td>${item.name}</td>
                <td>${item.email}</td>
                <td>${item.phone}</td>
                <td>${regDate}</td>
            `;
        }
        
        tbody.appendChild(row);
    });
}

// Fallback: render from window.__reports_cache if API not available
function renderDetailedReportFromCache() {
    const cache = window.__reports_cache || {};
    const bills = cache.bills || [];
    const tbody = document.getElementById('detailed-reports-body');
    if (!tbody) return false;
    tbody.innerHTML = '';
    if (!bills.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data"><div class="no-data-content"><i class="fas fa-inbox"></i><p>No data available</p></div></td></tr>';
        return true;
    }
    bills
        .sort((a,b)=> new Date(b.billDate||b.date||0) - new Date(a.billDate||a.date||0))
        .slice(0,200)
        .forEach(b=>{
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(b.billDate || b.date || Date.now()).toLocaleDateString()}</td>
                <td>${b.billNumber || ''}</td>
                <td>${b.customerName || ''}</td>
                <td>${(b.items||[]).length}</td>
                <td class="amount">Rs. ${formatCurrency(b.total || b.totalAmount || 0)}</td>
                <td>${(b.paymentMethod || '').toUpperCase()}</td>
                <td><span class="status-badge ${String(b.status||'').toLowerCase()}">${b.status || ''}</span></td>`;
            tbody.appendChild(tr);
        });
    return true;
}

// Export comprehensive PDF report (modern design)
async function exportComprehensivePDF() {
    try {
        showToast('Generating modern analytics report...', 'info');

        const response = await fetch('http://localhost:8080/api/analytics/export');
        if (!response.ok) throw new Error('Failed to fetch export data');
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to export data');
        const exportData = data.exportData || {};

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'pt', 'a4');

        // Theme
        const COLORS = {
            brand: [37, 99, 235],        // Indigo-600
            accent: [16, 185, 129],      // Emerald-500
            muted: [107, 114, 128],      // Gray-500
            dark: [17, 24, 39],          // Gray-900
            border: [229, 231, 235],     // Gray-200
            light: [243, 244, 246]       // Gray-100
        };
        const MARGIN = 40;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let y = 0;

        // Optional brand overrides
        if (window.__pahana_brand && window.__pahana_brand.brand && window.__pahana_brand.accent) {
            COLORS.brand = window.__pahana_brand.brand;
            COLORS.accent = window.__pahana_brand.accent;
        }

        // Cover page (with logo)
        const logoDataUrl = await getBrandLogoDataUrl();
        drawCoverPage(doc, {
            pageWidth, pageHeight, COLORS, margin: MARGIN,
            logo: logoDataUrl,
            title: 'Pahana Edu Book Shop',
            subtitle: 'Comprehensive Analytics Report'
        });

        // New page for contents
        doc.addPage();
        // Header banner on each content page
        y = drawBrandHeaderModern(doc, { pageWidth, margin: MARGIN, COLORS });

        // KPI cards
        y = drawKPIGrid(doc, {
            y,
            margin: MARGIN,
            pageWidth,
            COLORS,
            summary: exportData.summary || {
                totalRevenue: 0, totalOrders: 0, totalCustomers: 0, totalBooks: 0
            }
        });

        // Charts grid (2 per row)
        y += 12;
        y = drawSectionDivider(doc, 'Analytics', y, MARGIN, COLORS);
        y = drawChartsGrid(doc, { y, margin: MARGIN, pageWidth, COLORS });

        // Recent bills table
        y += 18;
        y = drawSectionDivider(doc, 'Detailed Tables', y, MARGIN, COLORS);
        y = drawTableSection(doc, {
            title: 'Recent Bills',
            y,
            COLORS,
            margin: MARGIN,
            head: [['Date', 'Bill #', 'Customer', 'Items', 'Total', 'Payment', 'Status']],
            body:
                (exportData.bills || [])
                    .sort((a,b) => new Date(b.billDate||b.date||0) - new Date(a.billDate||a.date||0))
                    .slice(0, 12)
                    .map(b => [
                        new Date(b.billDate || b.date || Date.now()).toLocaleDateString(),
                        b.billNumber || '',
                        b.customerName || '',
                        (b.items || []).length,
                        `Rs. ${formatCurrency(b.total || b.totalAmount || 0)}`,
                        (b.paymentMethod || 'N/A').toUpperCase(),
                        (b.status || '').toUpperCase()
                    ])
        });

        // Top books table
        y = drawTableSection(doc, {
            title: 'Top Books by Stock',
            y,
            COLORS,
            margin: MARGIN,
            head: [['Title', 'Author', 'Category', 'Price', 'Stock', 'Rating']],
            body:
                (exportData.books || [])
                    .sort((a,b) => (b.stockQuantity||0) - (a.stockQuantity||0))
                    .slice(0, 10)
                    .map(book => [
                        book.title,
                        book.author,
                        book.category,
                        `Rs. ${formatCurrency(book.price)}`,
                        book.stockQuantity,
                        `${Number(book.rating||0).toFixed(1)}/5`
                    ])
        });

        // Footer with page numbers
        addPDFFooter(doc);

        // Save
        const fileName = `pahana-analytics-report-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        showToast('PDF report generated successfully!', 'success');
    } catch (error) {
        console.error('Error generating PDF:', error);
        showToast('Failed to generate PDF report', 'error');
    }
}

// Try to load a brand logo as DataURL (from provided override or local candidates)
async function getBrandLogoDataUrl() {
    if (window.__pahana_logo_disabled) return null;
    const url = window.__pahana_logo_url;
    if (!url) return null;
    try {
        return await loadImageAsDataURL(url, 300, 120);
    } catch (_) {
        return null;
    }
}

function loadImageAsDataURL(url, maxW = 300, maxH = 120) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                const r = Math.min(maxW / w, maxH / h, 1);
                w = Math.round(w * r); h = Math.round(h * r);
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/png'));
            } catch (e) { reject(e); }
        };
        img.onerror = reject;
        img.src = url;
    });
}

// Draw a full cover page
function drawCoverPage(doc, { pageWidth, pageHeight, COLORS, margin, logo, title, subtitle }) {
    // Top brand band
    const bandH = Math.min(220, pageHeight * 0.32);
    doc.setFillColor(...COLORS.brand);
    doc.rect(0, 0, pageWidth, bandH, 'F');

    // Logo centered
    if (logo) {
        const logoW = 180, logoH = 72;
        const x = (pageWidth - logoW) / 2;
        const y = 42;
        try { doc.addImage(logo, 'PNG', x, y, logoW, logoH); } catch (_) {}
    }

    // Title and subtitle centered below
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(255, 255, 255);
    doc.text(title || 'Pahana Book Shop', pageWidth / 2, bandH - 36, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.text(subtitle || 'Analytics Report', pageWidth / 2, bandH - 16, { align: 'center' });

    // Meta box
    const boxW = pageWidth - margin * 2;
    const boxH = 68;
    const boxY = bandH + 28;
    doc.setFillColor(...COLORS.light);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(margin, boxY, boxW, boxH, 8, 8, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.dark);
    doc.text('Report Overview', margin + 16, boxY + 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, margin + 16, boxY + 44);
}

// Draw modern brand header with band and titles
function drawBrandHeaderModern(doc, { pageWidth, margin, COLORS }) {
    const bandHeight = 68;
    doc.setFillColor(...COLORS.brand);
    doc.rect(0, 0, pageWidth, bandHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255,255,255);
    doc.setFontSize(24);
    doc.text('Pahana Book Shop', margin, 36);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const dateTxt = `Generated on: ${new Date().toLocaleDateString()}`;
    doc.text('Comprehensive Analytics Report', margin, 54);
    doc.text(dateTxt, pageWidth - margin - doc.getTextWidth(dateTxt), 54);

    // return next y position
    return bandHeight + 20;
}

// Draw KPI cards grid (2 per row, responsive sizing)
function drawKPIGrid(doc, { y, margin, pageWidth, COLORS, summary }) {
    const cardGap = 14;
    const colWidth = (pageWidth - margin * 2 - cardGap) / 2;
    const cardHeight = 64;
    const metrics = [
        { label: 'Total Revenue', value: `Rs. ${formatCurrency(summary.totalRevenue || 0)}` },
        { label: 'Total Orders', value: String(summary.totalOrders || 0) },
        { label: 'Total Customers', value: String(summary.totalCustomers || 0) },
        { label: 'Total Books', value: String(summary.totalBooks || 0) }
    ];
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...COLORS.dark);
    doc.text('Executive Summary', margin, y);
    y += 10;

    metrics.forEach((m, idx) => {
        const row = Math.floor(idx / 2);
        const col = idx % 2;
        const x = margin + col * (colWidth + cardGap);
        const top = y + 16 + row * (cardHeight + cardGap);
        // card background
        doc.setFillColor(...COLORS.light);
        doc.setDrawColor(...COLORS.border);
        doc.roundedRect(x, top, colWidth, cardHeight, 6, 6, 'FD');
        // value
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...COLORS.brand);
        doc.text(m.value, x + 14, top + 28);
        // label
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.muted);
        doc.text(m.label, x + 14, top + 46);
    });
    return y + 16 + 2 * (cardHeight + cardGap);
}

// Draw charts in a 2x2 grid (auto uses existing canvases)
function drawChartsGrid(doc, { y, margin, pageWidth, COLORS }) {
    const chartIds = [
        { id: 'category-chart', title: 'Category Performance' },
        { id: 'revenue-chart', title: 'Revenue by Payment Method' },
        { id: 'sales-trend-chart', title: 'Sales Trend' },
        { id: 'stock-status-chart', title: 'Stock Status Overview' }
    ];
    const gap = 16;
    const colWidth = (pageWidth - margin * 2 - gap) / 2;
    const imgW = colWidth;
    const imgH = 150;

    for (let i = 0; i < chartIds.length; i++) {
        const c = chartIds[i];
        const canvas = document.getElementById(c.id);
        if (!canvas) continue;
        const row = Math.floor(i / 2);
        const col = i % 2;
        const x = margin + col * (colWidth + gap);
        const top = y + row * (imgH + 32);

        // title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...COLORS.dark);
        doc.text(c.title, x, top + 12);

        try {
            const img = canvas.toDataURL('image/png');
            doc.addImage(img, 'PNG', x, top + 16, imgW, imgH);
        } catch (_) {
            // draw placeholder
            doc.setDrawColor(...COLORS.border);
            doc.rect(x, top + 16, imgW, imgH);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(...COLORS.muted);
            doc.text('No chart data', x + 10, top + 32);
        }
    }
    // advance y by rows used
    const rows = Math.ceil(chartIds.filter(c=>document.getElementById(c.id)).length / 2);
    return y + rows * (imgH + 32);
}

// Draw a table section with title
function drawTableSection(doc, { title, y, COLORS, margin, head, body }) {
    if (!body || body.length === 0) return y;
    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.dark);
    doc.text(title, margin, y);
    // Table
    doc.autoTable({
        startY: y + 6,
        head,
        body,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: COLORS.accent, textColor: [255,255,255] },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { left: margin, right: margin }
    });
    return doc.lastAutoTable.finalY + 16;
}

// Draw a labeled section divider
function drawSectionDivider(doc, title, y, margin, COLORS) {
    const lineY = y + 4;
    doc.setDrawColor(...COLORS.border);
    doc.line(margin, lineY, doc.internal.pageSize.getWidth() - margin, lineY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.accent);
    doc.text(title, margin, y);
    return y + 12;
}

// Expose helpers for customization
window.setAnalyticsLogoUrl = function(url) { window.__pahana_logo_url = url; };
window.setAnalyticsBrandColors = function(brandRGBArray, accentRGBArray) { window.__pahana_brand = { brand: brandRGBArray, accent: accentRGBArray }; };
window.disableAnalyticsLogo = function() { window.__pahana_logo_disabled = true; };

// Add PDF header
function addPDFHeader(doc) {
    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(59, 130, 246); // Blue color
    doc.text('Pahana Book Shop', 40, 40);
    
    doc.setFontSize(16);
    doc.setTextColor(107, 114, 128); // Gray color
    doc.text('Comprehensive Analytics Report', 40, 65);
    
    // Date
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 40, 85);
    
    // Line separator
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(1);
    doc.line(40, 100, 550, 100);
}

// Add PDF summary section
function addPDFSummary(doc, summary) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(17, 24, 39);
    doc.text('Executive Summary', 40, 130);
    
    // Summary table
    const summaryData = [
        ['Metric', 'Value'],
        ['Total Revenue', `Rs. ${formatCurrency(summary.totalRevenue)}`],
        ['Total Orders', summary.totalOrders.toString()],
        ['Total Customers', summary.totalCustomers.toString()],
        ['Total Books', summary.totalBooks.toString()]
    ];
    
    doc.autoTable({
        startY: 150,
        head: [summaryData[0]],
        body: summaryData.slice(1),
        theme: 'grid',
        styles: {
            fontSize: 12,
            cellPadding: 8
        },
        headStyles: {
            fillColor: [59, 130, 246],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        alternateRowStyles: {
            fillColor: [249, 250, 251]
        }
    });
}

// Add PDF charts
function addPDFCharts(doc, startY) {
    let yPosition = startY;
    
    // Try to add category chart
    const categoryCanvas = document.getElementById('category-chart');
    if (categoryCanvas) {
        try {
            const imgData = categoryCanvas.toDataURL('image/png');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('Category Performance', 40, yPosition);
            doc.addImage(imgData, 'PNG', 40, yPosition + 10, 240, 120);
            yPosition += 150;
        } catch (e) {
            console.warn('Could not add category chart to PDF:', e);
        }
    }
    
    // Try to add revenue chart
    const revenueCanvas = document.getElementById('revenue-chart');
    if (revenueCanvas) {
        try {
            const imgData = revenueCanvas.toDataURL('image/png');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('Revenue by Payment Method', 40, yPosition);
            doc.addImage(imgData, 'PNG', 40, yPosition + 10, 240, 120);
            yPosition += 150;
        } catch (e) {
            console.warn('Could not add revenue chart to PDF:', e);
        }
    }

    // Try to add sales trend chart
    const trendCanvas = document.getElementById('sales-trend-chart');
    if (trendCanvas) {
        try {
            const imgData = trendCanvas.toDataURL('image/png');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('Sales Trend (Last 30 Days)', 300, startY); // place to the right when possible
            doc.addImage(imgData, 'PNG', 300, startY + 10, 240, 120);
            yPosition = Math.max(yPosition, startY + 150);
        } catch (e) {
            console.warn('Could not add sales trend chart to PDF:', e);
        }
    }
    
    return yPosition;
}

// Add PDF detailed tables
function addPDFDetailedTables(doc, exportData, startY) {
    let yPosition = startY;
    
    // Recent Bills Table
    if (exportData.bills && exportData.bills.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Recent Bills', 40, yPosition);
        
        const billsData = exportData.bills.slice(0, 10).map(bill => [
            new Date(bill.billDate).toLocaleDateString(),
            bill.billNumber,
            bill.customerName,
            bill.items ? bill.items.length : 0,
            `Rs. ${formatCurrency(bill.total)}`,
            bill.paymentMethod || 'N/A',
            bill.status || 'PENDING'
        ]);
        
        doc.autoTable({
            startY: yPosition + 10,
            head: [['Date', 'Bill #', 'Customer', 'Items', 'Total', 'Payment', 'Status']],
            body: billsData,
            theme: 'striped',
            styles: {
                fontSize: 9,
                cellPadding: 5
            },
            headStyles: {
                fillColor: [59, 130, 246],
                textColor: [255, 255, 255]
            }
        });
        
        yPosition = doc.lastAutoTable.finalY + 20;
    }
    
    // Top Books Table
    if (exportData.books && exportData.books.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Top Books by Stock', 40, yPosition);
        
        const booksData = exportData.books.slice(0, 10).map(book => [
            book.title,
            book.author,
            book.category,
            `Rs. ${formatCurrency(book.price)}`,
            book.stockQuantity,
            `${book.rating.toFixed(1)}/5`
        ]);
        
        doc.autoTable({
            startY: yPosition + 10,
            head: [['Title', 'Author', 'Category', 'Price', 'Stock', 'Rating']],
            body: booksData,
            theme: 'striped',
            styles: {
                fontSize: 9,
                cellPadding: 5
            },
            headStyles: {
                fillColor: [16, 185, 129],
                textColor: [255, 255, 255]
            }
        });
        
        yPosition = doc.lastAutoTable.finalY + 20;
    }
    
    return yPosition;
}

// Add PDF footer
function addPDFFooter(doc) {
    const pageCount = doc.internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Footer text
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.text('Pahana Book Shop - Analytics Report', 40, doc.internal.pageSize.height - 30);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 100, doc.internal.pageSize.height - 30);
    }
}

// Update reports based on date range
function updateReports() {
    loadAnalyticsData();
    loadDetailedReport();
}

// Export report (wrapper for PDF export)
function exportReport(type) {
    if (type === 'pdf') {
        exportComprehensivePDF();
    } else {
        showToast('Only PDF export is currently supported', 'info');
    }
}

// Print report
function printReport() {
    window.print();
}

// Show all top books (expandable view)
function showAllTopBooks() {
    if (!analyticsData || !analyticsData.topBooks) {
        showToast('No top books data available', 'info');
        return;
    }
    
    // Create modal with all top books
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-trophy"></i> All Top Selling Books</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="top-books-grid">
                    ${analyticsData.topBooks.map((book, index) => `
                        <div class="top-book-card">
                            <div class="rank-badge ${index < 3 ? ['gold', 'silver', 'bronze'][index] : ''}">
                                ${index + 1}
                            </div>
                            <div class="book-details">
                                <h4>${book.title}</h4>
                                <p class="sales-count">${book.quantity} copies sold</p>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${(book.quantity / Math.max(...analyticsData.topBooks.map(b => b.quantity))) * 100}%"></div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Utility functions
function formatCurrency(amount) {
    return Number(amount || 0).toLocaleString('en-LK', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
}

const ADMIN_REPORTS_TOAST_FIXED_MS = 5000; // 5 seconds as requested
function showToast(message, type = 'info', _durationMsIgnored) {
    // Remove any existing toasts to prevent overlap
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(existingToast => {
        existingToast.remove();
    });
    
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <div class="toast-progress"></div>
    `;
    
    document.body.appendChild(toast);
    
    // Show/hide with pause-on-hover and click-to-dismiss
    const autoDuration = ADMIN_REPORTS_TOAST_FIXED_MS;
    let hideTimer = setTimeout(removeToast, autoDuration);

    function removeToast() {
        if (toast && toast.parentNode) {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 500);
        }
    }

    // Add show class for animation
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));

    toast.addEventListener('mouseenter', () => {
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    });
    toast.addEventListener('mouseleave', () => {
        if (!hideTimer) hideTimer = setTimeout(removeToast, autoDuration);
    });
    toast.addEventListener('click', removeToast);
}

// Export functions to global scope
window.loadAnalyticsData = loadAnalyticsData;
window.updateReports = updateReports;
window.exportReport = exportReport;
window.printReport = printReport;
window.showAllTopBooks = showAllTopBooks;
window.loadDetailedReport = loadDetailedReport;
window.testNotification = testNotification;
window.showSimpleNotification = showSimpleNotification;
