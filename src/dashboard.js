// Removed ad slide functionality (no longer used)

async function loadProfile() {
  const token = localStorage.getItem("token");
  if (!token) return window.location.href = "login.html";

  const res = await fetch("http://localhost:8080/api/customers/profile", {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (res.ok) {
    const profile = await res.json();
    // Top bar with avatar, info, edit, logout
    const initials = (profile.name || profile.username || "U").split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);
    document.getElementById("profile-bar").innerHTML = `
      <div class="profile-info">
        <div class="profile-avatar">${initials}</div>
        <div class="profile-details">
          <span>${profile.name} <small>(${profile.username})</small></span>
          <small>${profile.email}</small>
        </div>
      </div>
    `;
    
    // Spectacular left-aligned profile card with animated name
    document.getElementById("profile").innerHTML = `
      <div class="profile-card">
        <div class="profile-avatar-lg">${initials}</div>
        <div class="profile-details">
          <h2 class="animated-name">${profile.name.split('').map((letter, index) => 
            `<span class="name-letter" style="animation-delay: ${index * 0.1}s">${letter}</span>`
          ).join('')}</h2>
        </div>
      </div>
    `;
    
    // Load customer details
    loadCustomerDetails(profile);
    
    // Fetch and display user orders by email
    fetchUserOrders(profile.email);
    
    // Test if orders exist in database
    testOrdersExist();
    
    // Load recommended books
    loadRecommendedBooks();
  } else {
    alert("Unauthorized or expired session");
    localStorage.removeItem("token");
    window.location.href = "login.html";
  }
}

function loadCustomerDetails(profile) {
  const customerInfo = document.getElementById("customer-info");
  if (customerInfo) {
    customerInfo.innerHTML = `
      <div class="customer-detail-row">
        <i class="fa fa-user"></i>
        <span><strong>Name:</strong> ${profile.name}</span>
      </div>
      <div class="customer-detail-row">
        <i class="fa fa-at"></i>
        <span><strong>Username:</strong> ${profile.username}</span>
      </div>
      <div class="customer-detail-row">
        <i class="fa fa-envelope"></i>
        <span><strong>Email:</strong> ${profile.email}</span>
      </div>
      <div class="customer-detail-row">
        <i class="fa fa-calendar"></i>
        <span><strong>Date of Birth:</strong> ${profile.dob || 'Not specified'}</span>
      </div>
      <div class="customer-detail-row">
        <i class="fa fa-clock"></i>
        <span><strong>Member Since:</strong> ${new Date().getFullYear()}</span>
      </div>
    `;
  }
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "landingpage.html";
}

function editProfile(e) {
  e.preventDefault();
  alert("Edit profile feature coming soon!");
}

// Listen for order updates from admin panel
function setupOrderUpdateListener() {
    // Listen for messages from admin panel
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'ORDER_UPDATED') {
            console.log('Order update received, refreshing dashboard...');
            refreshCustomerDashboard();
        }
    });
    
    // Listen for broadcast channel messages
    if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('order_updates');
        channel.onmessage = function(event) {
            if (event.data && event.data.type === 'ORDER_UPDATED') {
                console.log('Order update broadcast received, refreshing dashboard...');
                refreshCustomerDashboard();
            }
        };
    }
    
    // Listen for localStorage changes (cross-tab communication)
    window.addEventListener('storage', function(event) {
        if (event.key === 'orderUpdateTrigger') {
            console.log('Order update detected via localStorage, refreshing dashboard...');
            refreshCustomerDashboard();
        }
    });
    
    // Check for updates every 5 seconds as fallback
    setInterval(function() {
        const lastUpdate = localStorage.getItem('orderUpdateTrigger');
        const lastCheck = localStorage.getItem('lastOrderCheck') || '0';
        
        if (lastUpdate && parseInt(lastUpdate) > parseInt(lastCheck)) {
            console.log('Order update detected via polling, refreshing dashboard...');
            localStorage.setItem('lastOrderCheck', lastUpdate);
            refreshCustomerDashboard();
        }
    }, 5000);
}

// Refresh customer dashboard data
async function refreshCustomerDashboard() {
    try {
        // Get current user email from localStorage or profile
        const token = localStorage.getItem("token");
        if (!token) return;
        
        const res = await fetch("http://localhost:8080/api/customers/profile", {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
            const profile = await res.json();
            
            // Refresh orders
            await fetchUserOrders(profile.email);
            
            // Show success notification
            showOrderUpdateNotification();
        }
    } catch (error) {
        console.error('Error refreshing dashboard:', error);
    }
}

// Show notification when orders are updated
function showOrderUpdateNotification() {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'order-update-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-sync-alt"></i>
            <span>Your orders have been updated!</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Enhanced fetchUserOrders with better error handling
async function fetchUserOrders(email) {
    const orderList = document.getElementById("order-list");
    orderList.innerHTML = '<div class="loading">Loading your orders...</div>';
  
    console.log('Fetching orders for email:', email);
  
    try {
        const token = localStorage.getItem("token");
        console.log('Token available:', !!token);
    
        const url = `http://localhost:8080/api/orders/email/${encodeURIComponent(email)}`;
        console.log('Fetching from URL:', url);
    
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        console.log('Request headers:', headers);
    
        const res = await fetch(url, { headers });
        console.log('Response status:', res.status);
        console.log('Response ok:', res.ok);
    
        if (!res.ok) {
            console.error('Failed to fetch orders. Status:', res.status);
            const errorText = await res.text();
            console.error('Error response:', errorText);
            throw new Error(`Failed to fetch orders: ${res.status}`);
        }
    
        const orders = await res.json();
        console.log('Orders received:', orders);
    
        if (!Array.isArray(orders) || orders.length === 0) {
            console.log('No orders found for email:', email);
            orderList.innerHTML = `
                <div class="no-orders">
                    <i class="fa fa-shopping-bag" style="font-size: 3rem; color: #d1c4e9; margin-bottom: 16px;"></i>
                    <h3>No Orders Yet</h3>
                    <p>Start your reading journey by browsing our collection!</p>
                    <button class="shop-now-btn" onclick="window.location.href='booklist.html'" style="margin-top: 16px;">
                        Browse Books
                    </button>
                </div>
            `;
            return;
        }
    
        // Sort orders by date (newest first)
        orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
    
        orderList.innerHTML = orders.map((order, index) => `
            <div class="order-item" style="animation-delay: ${index * 0.1}s;">
                <div class="order-header">
                    <div class="book-image-container">
                        <img src="${order.bookImageUrl || 'https://via.placeholder.com/80x120/6c09b3/ffffff?text=📚'}" 
                             alt="${order.bookTitle}" 
                             class="book-image"
                             onerror="this.src='https://via.placeholder.com/80x120/6c09b3/ffffff?text=📚'">
                    </div>
                    <div class="order-title-section">
                        <div class="order-title">
                            <i class="fa fa-book"></i> ${order.bookTitle} 
                            <span class="order-status ${order.status?.toLowerCase()}">${order.status}</span>
                        </div>
                        <div class="order-meta">
                            <i class="fa fa-hashtag"></i> Quantity: ${order.quantity} 
                            <i class="fa fa-money-bill" style="margin-left: 16px;"></i> Total: Rs. ${order.totalPrice.toFixed(2)}
                        </div>
                        <div class="order-meta">
                            <i class="fa fa-calendar-alt"></i> Ordered: ${order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            }) : '-'}
                        </div>
                        <div class="order-meta">
                            <i class="fa fa-credit-card"></i> Payment: ${order.paymentMethod || '-'}
                        </div>
                        <div class="order-meta">
                            <i class="fa fa-map-marker-alt"></i> Address: ${order.streetAddress || '-'}
                        </div>
                        <div class="order-meta">
                            <i class="fa fa-globe"></i> Country: ${order.country || '-'}
                        </div>
                    </div>
                </div>
            </div>
        `).join("");
    } catch (e) {
        console.error('Error fetching orders:', e);
    
        // Try without authentication as fallback
        try {
            console.log('Trying without authentication...');
            const res = await fetch(`http://localhost:8080/api/orders/email/${encodeURIComponent(email)}`);
      
            if (res.ok) {
                const orders = await res.json();
                console.log('Orders received (no auth):', orders);
        
                if (Array.isArray(orders) && orders.length > 0) {
                    // Sort orders by date (newest first)
                    orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
                    
                    // Display orders
                    orderList.innerHTML = orders.map((order, index) => `
                        <div class="order-item" style="animation-delay: ${index * 0.1}s;">
                            <div class="order-header">
                                <div class="book-image-container">
                                    <img src="${order.bookImageUrl || 'https://via.placeholder.com/80x120/6c09b3/ffffff?text=📚'}" 
                                         alt="${order.bookTitle}" 
                                         class="book-image"
                                         onerror="this.src='https://via.placeholder.com/80x120/6c09b3/ffffff?text=📚'">
                                </div>
                                <div class="order-title-section">
                                    <div class="order-title">
                                        <i class="fa fa-book"></i> ${order.bookTitle} 
                                        <span class="order-status ${order.status?.toLowerCase()}">${order.status}</span>
                                    </div>
                                    <div class="order-meta">
                                        <i class="fa fa-hashtag"></i> Quantity: ${order.quantity} 
                                        <i class="fa fa-money-bill" style="margin-left: 16px;"></i> Total: Rs. ${order.totalPrice.toFixed(2)}
                                    </div>
                                    <div class="order-meta">
                                        <i class="fa fa-calendar-alt"></i> Ordered: ${order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-US', { 
                                            year: 'numeric', 
                                            month: 'short', 
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        }) : '-'}
                                    </div>
                                    <div class="order-meta">
                                        <i class="fa fa-credit-card"></i> Payment: ${order.paymentMethod || '-'}
                                    </div>
                                    <div class="order-meta">
                                        <i class="fa fa-map-marker-alt"></i> Address: ${order.streetAddress || '-'}
                                    </div>
                                    <div class="order-meta">
                                        <i class="fa fa-globe"></i> Country: ${order.country || '-'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join("");
                } else {
                    orderList.innerHTML = `
                        <div class="no-orders">
                            <i class="fa fa-shopping-bag" style="font-size: 3rem; color: #d1c4e9; margin-bottom: 16px;"></i>
                            <h3>No Orders Yet</h3>
                            <p>Start your reading journey by browsing our collection!</p>
                            <button class="shop-now-btn" onclick="window.location.href='booklist.html'" style="margin-top: 16px;">
                                Browse Books
                            </button>
                        </div>
                    `;
                }
            } else {
                throw new Error('Failed to fetch orders without authentication');
            }
        } catch (fallbackError) {
            console.error('Fallback error:', fallbackError);
            orderList.innerHTML = `
                <div class="error-state">
                    <i class="fa fa-exclamation-triangle" style="font-size: 3rem; color: #ef4444; margin-bottom: 16px;"></i>
                    <h3>Unable to Load Orders</h3>
                    <p>There was an error loading your orders. Please try refreshing the page.</p>
                    <button class="retry-btn" onclick="location.reload()" style="margin-top: 16px;">
                        <i class="fa fa-refresh"></i> Retry
                    </button>
                </div>
            `;
        }
    }
}

// Recommended Books Carousel (fetch from real MongoDB via backend API)
async function loadRecommendedBooks() {
  const recommendedContainer = document.getElementById("recommendedContainer");
  if (!recommendedContainer) return;

  const endpoints = [
    // Top rated in-stock books first
    "http://localhost:8080/api/books?status=IN_STOCK&sortBy=rating&sortOrder=desc&page=0&size=12",
    // Fallback: newest arrivals
    "http://localhost:8080/api/books?sortBy=createdAt&sortOrder=desc&page=0&size=12",
    // Fallback: all books (no pagination endpoint also exists)
    "http://localhost:8080/api/books/all"
  ];

  let books = [];

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      // '/api/books' returns an object with 'books'; '/api/books/all' returns { books: [...] }
      if (Array.isArray(data)) {
        books = data; // In case any endpoint returns an array directly
      } else if (Array.isArray(data.books)) {
        books = data.books;
      }
      if (books.length > 0) break;
    } catch (e) {
      // Try next endpoint
    }
  }

  if (!Array.isArray(books) || books.length === 0) {
    recommendedContainer.innerHTML = `<div class="loading">No recommended books available right now.</div>`;
    return;
  }

  // Only show non-archived books and ensure basic fields
  const displayBooks = books
    .filter(b => !b.archived)
    .slice(0, 12);

  recommendedContainer.innerHTML = displayBooks.map(book => `
    <div class="recommended-book" onclick="redirectToOrder('${(book.title || '').replace(/'/g, "\'")}')">
      <img src="${book.imageUrl || ''}" alt="${book.title || 'Book'}" onerror="this.src='https://via.placeholder.com/200x150/6c09b3/ffffff?text=📚'">
      <div class="recommended-book-info">
        <div class="recommended-book-title">${book.title || '-'}</div>
        <div class="recommended-book-author">${book.author || ''}</div>
        <div class="recommended-book-price">Rs. ${(typeof book.price === 'number' ? book.price.toFixed(2) : '-')}
        </div>
      </div>
    </div>
  `).join("");
}

function scrollRecommended(direction) {
  const container = document.getElementById("recommendedContainer");
  if (!container) return;
  
  const scrollAmount = 220; // Width of book card + gap
  const currentScroll = container.scrollLeft;
  const newScroll = currentScroll + (direction * scrollAmount);
  
  container.scrollTo({
    left: newScroll,
    behavior: 'smooth'
  });
}

function redirectToOrder(bookTitle) {
  // Store the selected book in localStorage for the order page
  localStorage.setItem('selectedBook', bookTitle);
  window.location.href = 'order.html';
}

// Test function to check if orders exist in database
async function testOrdersExist() {
  try {
    console.log('Testing if orders exist in database...');
    const response = await fetch('http://localhost:8080/api/orders');
    if (response.ok) {
      const orders = await response.json();
      console.log('Total orders in database:', orders.length);
      if (orders.length > 0) {
        console.log('Sample order:', orders[0]);
        console.log('Order emails:', orders.map(o => o.email));
      } else {
        console.log('No orders found in database');
      }
    } else {
      console.error('Failed to fetch orders for testing');
    }
  } catch (error) {
    console.error('Error testing orders:', error);
  }
}

// Enhanced animations and interactions
document.addEventListener('DOMContentLoaded', function() {
  // Add scroll animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);
  
  // Observe all sections for animation
  document.querySelectorAll('.bookshop-info, .blog-section, .recommended-section').forEach(section => {
    observer.observe(section);
  });
  
  // Add hover effects for interactive elements
  document.querySelectorAll('.action-btn, .nav-btn, .read-more-btn').forEach(btn => {
    btn.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-2px)';
    });
    
    btn.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
    });
  });

  // Setup order update listener
  setupOrderUpdateListener();
});

// Initialize the dashboard
document.addEventListener("DOMContentLoaded", loadProfile);
  