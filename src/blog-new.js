// Blog API Configuration
const API_BASE_URL = 'http://localhost:8080/api/blog';

// Global variables
let allBlogs = [];
let currentFilter = 'all';
let currentPage = 0;
const postsPerPage = 6;

// DOM Elements
const blogGrid = document.getElementById('blogGrid');
const loadingSkeleton = document.getElementById('loadingSkeleton');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const filterBtns = document.querySelectorAll('.filter-btn');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const popularPosts = document.getElementById('popularPosts');
const newsletterForm = document.getElementById('newsletterForm');
const backToTopBtn = document.getElementById('backToTop');

// Initialize the blog page
document.addEventListener('DOMContentLoaded', function() {
    initializeBlog();
    initializeEventListeners();
    initializeBackToTop();
});

// Initialize blog functionality
async function initializeBlog() {
    try {
        showLoading(true);
        await loadAllBlogs();
        await loadPopularBlogs();
        showLoading(false);
        displayBlogs();
    } catch (error) {
        console.error('Error initializing blog:', error);
        showError('Failed to load blog posts. Please try again later.');
        showLoading(false);
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Search functionality
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Filter buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            setActiveFilter(filter);
        });
    });

    // Load more button
    loadMoreBtn.addEventListener('click', loadMorePosts);

    // Newsletter form
    newsletterForm.addEventListener('submit', handleNewsletterSubmit);

    // Category links
    document.querySelectorAll('.category-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const category = this.dataset.category;
            filterByCategory(category);
        });
    });
}

// Load all blogs from API
async function loadAllBlogs() {
    try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allBlogs = await response.json();
        return allBlogs;
    } catch (error) {
        console.error('Error loading blogs:', error);
        // Fallback to sample data if API is not available
        allBlogs = getSampleBlogs();
        return allBlogs;
    }
}

// Load popular blogs
async function loadPopularBlogs() {
    try {
        const response = await fetch(`${API_BASE_URL}/popular`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const popularBlogs = await response.json();
        displayPopularPosts(popularBlogs);
    } catch (error) {
        console.error('Error loading popular blogs:', error);
        // Use first 3 blogs as popular if API fails
        const popularBlogs = allBlogs.slice(0, 3);
        displayPopularPosts(popularBlogs);
    }
}

// Display blogs based on current filter and page
function displayBlogs() {
    const filteredBlogs = getFilteredBlogs();
    const paginatedBlogs = getPaginatedBlogs(filteredBlogs);
    
    if (currentPage === 0) {
        blogGrid.innerHTML = '';
    }
    
    paginatedBlogs.forEach(blog => {
        const blogCard = createBlogCard(blog);
        blogGrid.appendChild(blogCard);
    });
    
    // Show/hide load more button
    const hasMorePosts = (currentPage + 1) * postsPerPage < filteredBlogs.length;
    loadMoreBtn.style.display = hasMorePosts ? 'flex' : 'none';
}

// Create blog card element
function createBlogCard(blog) {
    const card = document.createElement('article');
    card.className = 'blog-card';
    card.style.animationDelay = `${Math.random() * 0.5}s`;
    
    const date = new Date(blog.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    card.innerHTML = `
        <div class="blog-card-image" style="background-image: url('${blog.coverImage || 'image/Nature-Books-collage.png'}')"></div>
        <div class="blog-card-content">
            <h3 class="blog-card-title">${blog.title}</h3>
            <p class="blog-card-excerpt">${blog.summary}</p>
            <div class="blog-card-meta">
                <div class="blog-card-author">
                    <i class="fas fa-user"></i>
                    <span>${blog.author || 'Admin'}</span>
                </div>
                <div class="blog-card-date">${date}</div>
            </div>
            <a href="blog-single.html?id=${blog.id}" class="read-more-btn">
                Read More <i class="fas fa-arrow-right"></i>
            </a>
        </div>
    `;
    
    return card;
}

// Display popular posts in sidebar
function displayPopularPosts(popularBlogs) {
    popularPosts.innerHTML = '';
    
    popularBlogs.forEach(blog => {
        const date = new Date(blog.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
        
        const popularPost = document.createElement('div');
        popularPost.className = 'popular-post';
        popularPost.innerHTML = `
            <div class="popular-post-image" style="background-image: url('${blog.coverImage || 'image/Nature-Books-collage.png'}')"></div>
            <div class="popular-post-content">
                <h4>${blog.title}</h4>
                <div class="popular-post-date">${date}</div>
            </div>
        `;
        
        popularPost.addEventListener('click', () => {
            window.location.href = `blog-single.html?id=${blog.id}`;
        });
        
        popularPosts.appendChild(popularPost);
    });
}

// Get filtered blogs based on current filter
function getFilteredBlogs() {
    switch (currentFilter) {
        case 'featured':
            return allBlogs.filter(blog => blog.featured);
        case 'popular':
            return allBlogs.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
        default:
            return allBlogs;
    }
}

// Get paginated blogs
function getPaginatedBlogs(blogs) {
    const start = currentPage * postsPerPage;
    const end = start + postsPerPage;
    return blogs.slice(start, end);
}

// Set active filter
function setActiveFilter(filter) {
    currentFilter = filter;
    currentPage = 0;
    
    // Update active button
    filterBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });
    
    displayBlogs();
}

// Handle search
function handleSearch() {
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        displayBlogs();
        return;
    }
    
    // Search in all blogs
    const searchResults = allBlogs.filter(blog => 
        blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        blog.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (blog.content && blog.content.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    displaySearchResults(searchResults, searchTerm);
}

// Display search results
function displaySearchResults(results, searchTerm) {
    blogGrid.innerHTML = '';
    
    if (results.length === 0) {
        blogGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>No results found for "${searchTerm}"</h3>
                <p>Try searching with different keywords.</p>
            </div>
        `;
        return;
    }
    
    results.forEach(blog => {
        const blogCard = createBlogCard(blog);
        blogGrid.appendChild(blogCard);
    });
    
    loadMoreBtn.style.display = 'none';
}

// Filter by category
function filterByCategory(category) {
    const categoryBlogs = allBlogs.filter(blog => 
        blog.tags && blog.tags.some(tag => 
            tag.toLowerCase().includes(category.toLowerCase())
        )
    );
    
    displaySearchResults(categoryBlogs, category);
}

// Load more posts
function loadMorePosts() {
    currentPage++;
    displayBlogs();
}

// Handle newsletter subscription
function handleNewsletterSubmit(e) {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    
    // Simulate newsletter subscription
    showNotification('Thank you for subscribing to our newsletter!', 'success');
    e.target.reset();
}

// Show/hide loading skeleton
function showLoading(show) {
    loadingSkeleton.style.display = show ? 'grid' : 'none';
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close"><i class="fas fa-times"></i></button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : '#2196F3'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
}

// Show error message
function showError(message) {
    showNotification(message, 'error');
}

// Initialize back to top button
function initializeBackToTop() {
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });
    
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Sample blog data (fallback)
function getSampleBlogs() {
    return [
        {
            id: '1',
            title: 'A Journey into the Enchanting Depths of Books',
            summary: 'Our readers recount their immersive encounters with books that have transported them to magical realms, challenging their perspectives and expanding their understanding of the world.',
            content: '<h2>Discover the Magic</h2><p>Books can transport you to places you\'ve never been and introduce you to people you\'ll never meet...</p>',
            coverImage: 'image/Nature-Books-collage.png',
            author: 'Admin',
            date: '2024-07-01T12:00:00Z',
            tags: ['Inspiration', 'Books'],
            featured: true,
            viewCount: 1250
        },
        {
            id: '2',
            title: 'Discovering Strengths and Embracing Change',
            summary: 'Change is challenging, but books help us grow stronger and discover our hidden potential through stories of transformation.',
            content: '<h2>Embrace Change</h2><p>Reading stories of transformation helps us understand that change is not just inevitable...</p>',
            coverImage: 'image/TTT-NatureCovers.jpg',
            author: 'Admin',
            date: '2024-07-02T12:00:00Z',
            tags: ['Change', 'Growth'],
            featured: false,
            viewCount: 890
        },
        {
            id: '3',
            title: 'The Power of Reading in Education',
            summary: 'Explore how reading enhances learning, improves vocabulary, and develops critical thinking skills in students.',
            content: '<h2>Educational Benefits</h2><p>Reading is fundamental to education and personal development...</p>',
            coverImage: 'image/Best-Book-Covers.jpg',
            author: 'Admin',
            date: '2024-07-03T12:00:00Z',
            tags: ['Education', 'Learning'],
            featured: true,
            viewCount: 1560
        }
    ];
}

// Add CSS for notifications
const notificationStyles = `
<style>
@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.notification-close {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 0.9rem;
}

.no-results {
    text-align: center;
    padding: 3rem;
    color: #666;
}

.no-results i {
    font-size: 3rem;
    color: #ccc;
    margin-bottom: 1rem;
}

.no-results h3 {
    margin-bottom: 0.5rem;
    color: #333;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', notificationStyles); 