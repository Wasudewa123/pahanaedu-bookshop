document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM Content Loaded - Starting book loading...");
  
  // Load books immediately without retry delays
  try {
    await loadBooksForCategories();
    loadRecommendedBooks(); // Load recommended books
  } catch (error) {
    console.error("Failed to load books:", error);
    // Only show error message if it's a network/server error
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      showErrorMessage("Server is starting up. Please wait a moment and refresh the page.");
    }
  }
  
  // Ad slide functionality
  const adSlide = document.getElementById("adSlide");
  const closeAdBtn = document.getElementById("closeAd");
  
  // Auto-hide ad after 5 seconds
  setTimeout(() => {
    if (adSlide && !adSlide.classList.contains('hidden')) {
      hideAdSlide();
    }
  }, 5000);
  
  // Close ad button functionality
  if (closeAdBtn) {
    closeAdBtn.addEventListener("click", hideAdSlide);
  }
  
  function hideAdSlide() {
    if (adSlide) {
      adSlide.classList.add('hidden');
      setTimeout(() => {
        adSlide.style.display = 'none';
      }, 600);
    }
  }

  // Dashboard Modal functionality
  const dashboardModal = document.getElementById("dashboardModal");
  const dashboardModalClose = document.getElementById("dashboardModalClose");
  const dashboardLink = document.getElementById("dashboardLink");
  
  // Open dashboard modal
  if (dashboardLink) {
    dashboardLink.addEventListener("click", (e) => {
      e.preventDefault();
      openDashboardModal();
    });
  }
  
  // Close dashboard modal
  if (dashboardModalClose) {
    dashboardModalClose.addEventListener("click", closeDashboardModal);
  }
  
  // Close modal when clicking outside
  if (dashboardModal) {
    dashboardModal.addEventListener("click", (e) => {
      if (e.target === dashboardModal) {
        closeDashboardModal();
      }
    });
  }
  
  function openDashboardModal() {
    if (dashboardModal) {
      dashboardModal.classList.add("show");
      document.body.style.overflow = "hidden"; // Prevent background scrolling
    }
  }
  
  function closeDashboardModal() {
    if (dashboardModal) {
      dashboardModal.classList.remove("show");
      document.body.style.overflow = ""; // Restore scrolling
    }
  }

  // Search functionality
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.querySelector(".search-btn");
  
  if (searchInput && searchBtn) {
    searchBtn.addEventListener("click", performSearch);
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        performSearch();
      }
    });
  }
  
  function performSearch() {
    const query = searchInput.value.trim().toLowerCase();
    if (query) {
      // Filter books based on search query
      filterBooks(query);
    }
  }
  
  function filterBooks(query) {
    const bookCards = document.querySelectorAll('.book-card');
    bookCards.forEach(card => {
      const title = card.querySelector('.book-title').textContent.toLowerCase();
      const author = card.querySelector('.book-author').textContent.toLowerCase();
      const desc = card.querySelector('.book-desc').textContent.toLowerCase();
      
      if (title.includes(query) || author.includes(query) || desc.includes(query)) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  }

  // Profile bar logic with photo support
  const profileBar = document.getElementById("profile-bar");
  const token = localStorage.getItem("token");
  
  if (token) {
    try {
      const res = await fetch("http://localhost:8080/api/customers/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const profile = await res.json();
        
        // Check for stored profile photo
        const storedPhoto = localStorage.getItem("userProfilePhoto");
        let avatarContent = "";
        
        if (storedPhoto) {
          avatarContent = `<img src="${storedPhoto}" alt="Profile Photo">`;
        } else if (profile.profilePhoto) {
          avatarContent = `<img src="${profile.profilePhoto}" alt="Profile Photo">`;
        } else {
          const initials = (profile.name || profile.username || "U").split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);
          avatarContent = `<span>${initials}</span>`;
        }
        
        profileBar.innerHTML = `
          <div class="profile-info" id="profileInfo" style="cursor:pointer;display:flex;align-items:center;gap:10px;">
            <div class="profile-avatar">${avatarContent}</div>
            <span class="profile-name">${profile.name || profile.username}</span>
            <span class="profile-caret">&#9662;</span>
          </div>
          <div class="profile-dropdown" id="profileDropdown" style="display:none;">
            <a href="#" id="dashboardModalBtn">Dashboard</a>
            <a href="profile-edit.html">Edit Profile</a>
            <a href="order.html">My Orders</a>
            <a href="#" id="logoutBtn">Logout</a>
          </div>
        `;
        
        // Update dashboard modal user info
        updateDashboardUserInfo(profile, storedPhoto);
        
        // Dropdown logic
        const profileInfo = document.getElementById("profileInfo");
        const profileDropdown = document.getElementById("profileDropdown");
        const dashboardModalBtn = document.getElementById("dashboardModalBtn");
        
        if (profileInfo && profileDropdown) {
          profileInfo.addEventListener("click", () => {
            profileDropdown.style.display = profileDropdown.style.display === "block" ? "none" : "block";
          });
          
          document.addEventListener("click", (e) => {
            if (!profileBar.contains(e.target)) {
              profileDropdown.style.display = "none";
            }
          });
          
          // Dashboard modal button
          if (dashboardModalBtn) {
            dashboardModalBtn.addEventListener("click", (e) => {
              e.preventDefault();
              profileDropdown.style.display = "none";
              openDashboardModal();
            });
          }
          
          document.getElementById("logoutBtn").onclick = function() {
            localStorage.removeItem("token");
            localStorage.removeItem("userProfilePhoto");
            window.location.href = "landingpage.html";
          };
        }
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("userProfilePhoto");
        profileBar.innerHTML = "";
      }
    } catch (e) {
      localStorage.removeItem("token");
      localStorage.removeItem("userProfilePhoto");
      profileBar.innerHTML = "";
    }
  } else {
    profileBar.innerHTML = "";
  }

  // Update dashboard modal user information
  function updateDashboardUserInfo(profile, photoUrl) {
    const dashboardUserAvatar = document.getElementById("dashboardUserAvatar");
    const dashboardUserName = document.getElementById("dashboardUserName");
    const dashboardUserEmail = document.getElementById("dashboardUserEmail");
    
    if (dashboardUserAvatar) {
      if (photoUrl) {
        dashboardUserAvatar.innerHTML = `<img src="${photoUrl}" alt="Profile Photo">`;
      } else if (profile.profilePhoto) {
        dashboardUserAvatar.innerHTML = `<img src="${profile.profilePhoto}" alt="Profile Photo">`;
      } else {
        const initials = (profile.name || profile.username || "U").split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);
        dashboardUserAvatar.innerHTML = `<span>${initials}</span>`;
      }
    }
    
    if (dashboardUserName) {
      dashboardUserName.textContent = profile.name || profile.username || "Welcome";
    }
    
    if (dashboardUserEmail) {
      dashboardUserEmail.textContent = profile.email || "user@example.com";
    }
  }

  // Dashboard modal logout functionality
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("token");
      localStorage.removeItem("userProfilePhoto");
      closeDashboardModal();
      window.location.href = "landingpage.html";
    });
  }

});

// Listen for admin stock updates across tabs and refresh lists
window.addEventListener('storage', (e) => {
  if (e.key === 'booksUpdated') {
    try {
      const data = JSON.parse(e.newValue || '{}');
      if (data && data.bookId) {
        console.log('Detected stock update from admin:', data);
        // Re-fetch with a small debounce to avoid rapid reloads
        clearTimeout(window.__booksRefreshTimer);
        window.__booksRefreshTimer = setTimeout(() => {
          loadBooksForCategories();
          loadRecommendedBooks();
        }, 250);
      }
    } catch (_) {
      // ignore
    }
  }
});

// Carousel scrolling functionality
window.scrollCarousel = function(carouselId, direction) {
  const carousel = document.getElementById(carouselId);
  const container = carousel.querySelector('.book-container');
  const scrollAmount = 300; // Adjust scroll amount as needed
  
  if (container) {
    const currentScroll = container.scrollLeft;
    const newScroll = currentScroll + (direction * scrollAmount);
    container.scrollTo({
      left: newScroll,
      behavior: 'smooth'
    });
  }
};

// Load books for different categories
async function loadBooksForCategories() {
  try {
    console.log("Fetching books from API...");
    
    // Add timeout and better error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const res = await fetch("http://localhost:8080/api/books/all", {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log("Response status:", res.status);
    console.log("Response headers:", res.headers);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status} - ${res.statusText}`);
    }
    
    const response = await res.json();
    console.log("API Response received:", response);
    
    // Extract books from the response object
    const allBooks = response.books || [];
    console.log("Books extracted:", allBooks);
    
    if (!Array.isArray(allBooks) || allBooks.length === 0) {
      console.log("No books found in response");
      showNoBooksMessage();
      return;
    }
    
    console.log(`Total books loaded: ${allBooks.length}`);
    
    // Categorize books (you can modify this logic based on your book data structure)
    const categorizedBooks = categorizeBooks(allBooks);
    console.log("Categorized books:", categorizedBooks);
    
    // Load books for each category
    loadCategoryBooks('featuredContainer', categorizedBooks.featured);
    loadCategoryBooks('newArrivalsContainer', categorizedBooks.newArrivals);
    loadCategoryBooks('childrenContainer', categorizedBooks.children);
    loadCategoryBooks('novelsContainer', categorizedBooks.novels);
    loadCategoryBooks('enhancedNovelsContainer', categorizedBooks.novels); // Load same novels for enhanced section
    
    // Load ALL books in the "All Books" section
    loadCategoryBooks('allBooksContainer', allBooks);

    // Expose for recommendations to avoid showing the same first items
    window.__allBooksCache = allBooks;
    window.__allBooksFirstIds = allBooks.slice(0, 12).map(b => b.id);
    
  } catch (e) {
    console.error("Failed to load books:", e);
    console.error("Error details:", e.message);
    
    // Show appropriate error message
    if (e.name === 'AbortError') {
      showErrorMessage("Request timed out. Please check your internet connection and try again.");
    } else if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
      showErrorMessage("Cannot connect to server. Please check if the server is running on port 8080.");
    } else if (e.message.includes('HTTP error! status: 500')) {
      showErrorMessage("Server error. Please try again in a moment.");
    } else {
      showErrorMessage("Unable to load books. Please check if the server is running and try again.");
    }
  }
}

// Categorize books based on title, author, or description
function categorizeBooks(books) {
  const categories = {
    featured: [],
    newArrivals: [],
    children: [],
    novels: []
  };
  
  // Shuffle books to ensure random distribution
  const shuffledBooks = [...books].sort(() => Math.random() - 0.5);
  
  books.forEach((book) => {
    const title = (book.title || '').toLowerCase();
    const author = (book.author || '').toLowerCase();
    const desc = (book.description || '').toLowerCase();
    const category = (book.category || '').toLowerCase();
    
    // Featured: First 8 books (or all if less than 8)
    if (categories.featured.length < 8) {
      categories.featured.push(book);
    }
    
    // New Arrivals: Next 8 books (or remaining if less than 8)
    if (categories.newArrivals.length < 8 && categories.featured.length >= 8) {
      categories.newArrivals.push(book);
    }
    
    // Children: Books with children-related keywords or category
    if (title.includes('children') || title.includes('kid') || title.includes('story') || 
        desc.includes('children') || desc.includes('kid') || desc.includes('story') ||
        category.includes('children') || category.includes('kid')) {
      categories.children.push(book);
    }
    
    // Novels: Books with novel/fiction keywords or category
    if (title.includes('novel') || title.includes('fiction') || 
        desc.includes('novel') || desc.includes('fiction') ||
        category.includes('novel') || category.includes('fiction')) {
      categories.novels.push(book);
    }
  });
  
  // If any category is empty, distribute remaining books
  const remainingBooks = books.filter(book => 
    !categories.featured.includes(book) && 
    !categories.newArrivals.includes(book) && 
    !categories.children.includes(book) && 
    !categories.novels.includes(book)
  );
  
  // Distribute remaining books to empty categories
  remainingBooks.forEach((book, index) => {
    if (categories.children.length === 0) {
      categories.children.push(book);
    } else if (categories.novels.length === 0) {
      categories.novels.push(book);
    } else if (categories.newArrivals.length < 8) {
      categories.newArrivals.push(book);
    } else if (categories.featured.length < 8) {
      categories.featured.push(book);
    } else {
      // Add to the category with the least books
      const categoryCounts = {
        featured: categories.featured.length,
        newArrivals: categories.newArrivals.length,
        children: categories.children.length,
        novels: categories.novels.length
      };
      
      const minCategory = Object.keys(categoryCounts).reduce((a, b) => 
        categoryCounts[a] < categoryCounts[b] ? a : b
      );
      
      categories[minCategory].push(book);
    }
  });
  
  return categories;
}

// Load books for a specific category
function loadCategoryBooks(containerId, books) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with ID '${containerId}' not found`);
    return;
  }
  
  console.log(`Loading ${books ? books.length : 0} books for ${containerId}`);
  
  if (!books || books.length === 0) {
    container.innerHTML = '<div class="no-books">No books available in this category.</div>';
    return;
  }
  
  try {
    container.innerHTML = books.map(book => {
    // Determine stock status using backend status field only (no counts shown)
    const status = (book.status || '').toUpperCase();
    let stockStatus = 'In Stock';
    let stockClass = 'in-stock';
    let orderDisabled = false;

    if (status === 'LOW_STOCK') {
      stockStatus = 'Low Stock';
      stockClass = 'low-stock';
    } else if (status === 'OUT_OF_STOCK') {
      stockStatus = 'Out of Stock';
      stockClass = 'out-of-stock';
      orderDisabled = true;
    } else {
      stockStatus = 'In Stock';
      stockClass = 'in-stock';
    }

    return `
      <div class="book-card">
        <div class="book-img-wrap">
          <img src="${book.imageUrl || 'image/bookstore.webp'}" alt="${book.title}" class="book-img" onerror="this.src='image/bookstore.webp'">
          <div class="stock-badge ${stockClass}">${stockStatus}</div>
        </div>
        <div class="book-info">
          <h3 class="book-title">${book.title || 'Untitled'}</h3>
          <p class="book-author">by ${book.author || 'Unknown Author'}</p>
          <p class="book-desc">${book.description || 'No description available'}</p>
          <div class="book-bottom">
            <span class="book-price">Rs. ${(book.price || 0).toFixed(2)}</span>
            <button class="order-btn ${orderDisabled ? 'disabled' : ''}" 
                    onclick="${orderDisabled ? 'return false' : `orderBook('${(book.id || '').replace(/'/g, '\\\'')}', '${(book.title || '').replace(/'/g, '\\\'')}', ${book.price || 0}, '${(book.author || '').replace(/'/g, '\\\'')}', '${(book.description || '').replace(/'/g, '\\\'')}', '${(book.imageUrl || '').replace(/'/g, '\\\'')}')`}"
                    ${orderDisabled ? 'disabled' : ''}>
              ${orderDisabled ? 'Out of Stock' : 'Order'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
    
    console.log(`Successfully loaded ${books.length} books for ${containerId}`);
  } catch (error) {
    console.error(`Error loading books for ${containerId}:`, error);
    container.innerHTML = '<div class="error">Error loading books for this category.</div>';
  }
}

function showNoBooksMessage() {
  const containers = ['featuredContainer', 'newArrivalsContainer', 'childrenContainer', 'novelsContainer'];
  containers.forEach(containerId => {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '<div class="no-books">No books available.</div>';
    }
  });
}

function showErrorMessage(message = "Failed to load books. Please try again later.") {
  const containers = ['featuredContainer', 'newArrivalsContainer', 'childrenContainer', 'novelsContainer'];
  containers.forEach(containerId => {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="error" style="text-align: center; padding: 30px; color: #721c24; background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%); border: 1px solid #f5c6cb; border-radius: 10px; margin: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
          <i class="fas fa-exclamation-triangle" style="margin-right: 10px; font-size: 1.2em;"></i>
          <div style="margin-bottom: 15px; font-weight: bold;">${message}</div>
          <div style="font-size: 0.9em; margin-bottom: 20px; opacity: 0.8;">
            The server is starting up. This usually takes 30-60 seconds.
          </div>
          <button onclick="location.reload()" style="background: linear-gradient(45deg, #667eea, #764ba2); color: white; border: none; padding: 12px 24px; border-radius: 25px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 15px rgba(102,126,234,0.3); transition: all 0.3s ease;">
            <i class="fas fa-redo"></i> Refresh Page
          </button>
          <br><br>
          <button onclick="retryLoadBooks()" style="background: linear-gradient(45deg, #28a745, #20c997); color: white; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; margin-left: 10px; font-weight: bold;">
            <i class="fas fa-sync-alt"></i> Try Again
          </button>
        </div>
      `;
    }
  });
}

// Function to retry loading books
function retryLoadBooks() {
  console.log("Retrying to load books...");
  loadBooksForCategories();
}

// Check if server is running
async function checkServerStatus() {
  try {
    console.log("Checking server status...");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch("http://localhost:8080/api/books", {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log("Server is running and ready!");
      return true;
    } else {
      console.log("Server responded but with status:", response.status);
      return false;
    }
  } catch (error) {
    console.log("Server is not ready yet:", error.message);
    return false;
  }
}

// Order book functionality
window.orderBook = function(id, title, price, author, description, imageUrl) {
  // Store complete book details in localStorage for the order page
  const bookDetails = {
    id: id,
    title: title,
    price: price,
    author: author,
    description: description,
    imageUrl: imageUrl
  };
  localStorage.setItem('selectedBook', JSON.stringify(bookDetails));
  localStorage.setItem('selectedBookId', id);
  localStorage.setItem('selectedBookTitle', title);
  localStorage.setItem('bookBasePrice', price);
  
  // Navigate to order page
  window.location.href = `order.html?bookId=${encodeURIComponent(id)}&bookTitle=${encodeURIComponent(title)}`;
};



// Enhanced animations for service features
function animateServiceFeatures() {
  const serviceItems = document.querySelectorAll('.service-item');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, index * 200);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  
  serviceItems.forEach(item => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(30px)';
    item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(item);
  });
}

// Initialize animations when page loads
document.addEventListener('DOMContentLoaded', function() {
  animateServiceFeatures();
  
  // Initialize footer animations
  animateFooterSections();
});

// Footer scroll animations
function animateFooterSections() {
  const footerSections = document.querySelectorAll('.footer-section.animate-on-scroll');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.animation = `fadeInUp 0.8s ease ${index * 0.2}s forwards`;
        }, 100);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  
  footerSections.forEach(section => {
    observer.observe(section);
  });
}

// Add floating animation to logo
function animateLogo() {
  const logoIcon = document.querySelector('.logo-icon');
  if (logoIcon) {
    logoIcon.style.animation = 'float 3s ease-in-out infinite';
  }
}

// Initialize logo animation
document.addEventListener('DOMContentLoaded', function() {
  animateLogo();
});

// Recommended Books Functionality (mixed, not same as All Books)
async function loadRecommendedBooks() {
  const recommendedContainer = document.getElementById("recommendedContainer");
  if (!recommendedContainer) return;

  // Prefer server-side sorted lists to differ from All Books
  const endpoints = [
    "http://localhost:8080/api/books?status=IN_STOCK&sortBy=rating&sortOrder=desc&page=0&size=24",
    "http://localhost:8080/api/books?sortBy=createdAt&sortOrder=desc&page=0&size=24",
    "http://localhost:8080/api/books/all"
  ];

  let books = [];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data)) {
        books = data;
      } else if (Array.isArray(data.books)) {
        books = data.books;
      }
      if (books.length > 0) break;
    } catch (_) {
      // try next endpoint
    }
  }

  if (!Array.isArray(books) || books.length === 0) {
    recommendedContainer.innerHTML = '<div class="no-books">No recommendations available.</div>';
    return;
  }

  // Exclude the first set of books shown in "All Books" (first 12 by default)
  const excludeIds = Array.isArray(window.__allBooksFirstIds) ? new Set(window.__allBooksFirstIds) : new Set();
  let candidates = books.filter(b => !excludeIds.has(b.id));

  // If filtering removed too many, fall back to all fetched books
  if (candidates.length < 6) candidates = books.slice();

  // Shuffle to mix results
  candidates.sort(() => Math.random() - 0.5);

  const recommendedBooks = candidates.slice(0, 8);

  recommendedContainer.innerHTML = recommendedBooks.map(book => `
    <div class="book-card" onclick="orderBook('${(book.id || '').replace(/'/g, "\\'")}', '${(book.title || '').replace(/'/g, "\\'")}', ${book.price || 0}, '${(book.author || '').replace(/'/g, "\\'")}', '${(book.description || '').replace(/'/g, "\\'")}', '${(book.imageUrl || '').replace(/'/g, "\\'")}')">
      <div class="book-img-wrap">
        <img src="${book.imageUrl || 'image/bookstore.webp'}" alt="${book.title || 'Book'}" class="book-img" onerror="this.src='image/bookstore.webp'">
        <div class="stock-badge ${((book.status||'').toUpperCase()==='OUT_OF_STOCK')?'out-of-stock':((book.status||'').toUpperCase()==='LOW_STOCK')?'low-stock':'in-stock'}">${((book.status||'').toUpperCase()==='OUT_OF_STOCK')?'Out of Stock':((book.status||'').toUpperCase()==='LOW_STOCK')?'Low Stock':'In Stock'}</div>
      </div>
      <div class="book-info">
        <div class="book-title">${book.title || 'Untitled'}</div>
        <div class="book-author">${book.author || 'Unknown Author'}</div>
        <div class="book-desc">${book.description || 'No description available'}</div>
        <div class="book-bottom">
          <div class="book-price">Rs. ${((book.price || 0).toFixed ? book.price.toFixed(2) : Number(book.price || 0).toFixed(2))}</div>
          <button class="order-btn" onclick="event.stopPropagation(); orderBook('${(book.id || '').replace(/'/g, "\\'")}', '${(book.title || '').replace(/'/g, "\\'")}', ${book.price || 0}, '${(book.author || '').replace(/'/g, "\\'")}', '${(book.description || '').replace(/'/g, "\\'")}', '${(book.imageUrl || '').replace(/'/g, "\\'")}')">
            <i class="fas fa-shopping-cart"></i>
            Order Now
          </button>
        </div>
      </div>
    </div>
  `).join("");
}

function redirectToOrder(bookTitle) {
  // Fallback: go to order page with just the title
  localStorage.setItem('selectedBookTitle', bookTitle || '');
  window.location.href = 'order.html';
}