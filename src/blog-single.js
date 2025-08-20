// Blog Single Page JavaScript
// API Configuration
const API_BASE_URL = 'http://localhost:8080/api/blog';

// DOM Elements
const loadingSkeleton = document.getElementById('loadingSkeleton');
const blogContent = document.getElementById('blogContent');
const blogTitle = document.getElementById('blogTitle');
const blogImage = document.getElementById('blogImage');
const blogBody = document.getElementById('blogBody');
const blogTags = document.getElementById('blogTags');
const blogAuthor = document.getElementById('blogAuthor');
const blogDate = document.getElementById('blogDate');
const blogViews = document.getElementById('blogViews');
const relatedPosts = document.getElementById('relatedPosts');
const popularPosts = document.getElementById('popularPosts');
const tagsCloud = document.getElementById('tagsCloud');
const backToTopBtn = document.getElementById('backToTop');
const newsletterForm = document.getElementById('newsletterForm');

// Get blog ID from URL parameters
function getBlogIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id') || '1'; // Default to first blog if no ID
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Load blog post by ID
async function loadBlogPost(blogId) {
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/${blogId}`);
        
        if (!response.ok) {
            throw new Error('Blog post not found');
        }
        
        const blog = await response.json();
        displayBlogPost(blog);
        
        // Load related content
        await loadRelatedContent(blog);
        
    } catch (error) {
        console.error('Error loading blog post:', error);
        
        // Fallback to sample data
        const sampleBlog = getSampleBlogById(blogId);
        if (sampleBlog) {
            displayBlogPost(sampleBlog);
            loadRelatedContent(sampleBlog);
        } else {
            showError('Failed to load blog post. Please try again.');
        }
    } finally {
        showLoading(false);
    }
}

// Display blog post
function displayBlogPost(blog) {
    // Set page title
    document.title = `${blog.title} - Pahana Edu Book Shop`;
    
    // Update breadcrumb
    updateBreadcrumb(blog.title);
    
    // Display blog content
    blogTitle.textContent = blog.title;
    blogImage.src = blog.coverImage || 'https://via.placeholder.com/800x400/764ba2/ffffff?text=Blog+Image';
    blogImage.alt = blog.title;
    blogBody.innerHTML = blog.content;
    
    // Display tags
    displayTags(blog.tags);
    
    // Update meta information
    updateMetaInfo(blog);
    
    // Show content
    blogContent.style.display = 'block';
    
    // Initialize social sharing
    initializeSocialSharing(blog);
}

// Display tags
function displayTags(tags) {
    if (!tags || tags.length === 0) {
        blogTags.innerHTML = '<span class="tag">General</span>';
        return;
    }
    
    blogTags.innerHTML = tags.map(tag => 
        `<span class="tag">${tag}</span>`
    ).join('');
}

// Update meta information
function updateMetaInfo(blog) {
    blogAuthor.textContent = blog.author || 'Admin';
    blogDate.textContent = formatDate(blog.createdAt || new Date());
    blogViews.textContent = blog.views || Math.floor(Math.random() * 1000) + 100;
}

// Update breadcrumb
function updateBreadcrumb(title) {
    const breadcrumb = document.querySelector('.breadcrumb-link');
    if (breadcrumb) {
        breadcrumb.innerHTML = `<i class="fas fa-arrow-left"></i> Back to Blog`;
    }
}

// Load related content
async function loadRelatedContent(currentBlog) {
    try {
        // Load related posts
        const relatedResponse = await fetch(`${API_BASE_URL}/related/${currentBlog.id || 1}`);
        if (relatedResponse.ok) {
            const relatedBlogs = await relatedResponse.json();
            displayRelatedPosts(relatedBlogs);
        } else {
            // Fallback to sample related posts
            const sampleRelated = getSampleRelatedPosts(currentBlog);
            displayRelatedPosts(sampleRelated);
        }
        
        // Load popular posts
        const popularResponse = await fetch(`${API_BASE_URL}/popular`);
        if (popularResponse.ok) {
            const popularBlogs = await popularResponse.json();
            displayPopularPosts(popularBlogs);
        } else {
            // Fallback to sample popular posts
            const samplePopular = getSamplePopularPosts();
            displayPopularPosts(samplePopular);
        }
        
        // Load tags cloud
        const tagsResponse = await fetch(`${API_BASE_URL}/tags`);
        if (tagsResponse.ok) {
            const tags = await tagsResponse.json();
            displayTagsCloud(tags);
        } else {
            // Fallback to sample tags
            const sampleTags = getSampleTags();
            displayTagsCloud(sampleTags);
        }
        
    } catch (error) {
        console.error('Error loading related content:', error);
        
        // Fallback to sample data
        const sampleRelated = getSampleRelatedPosts(currentBlog);
        const samplePopular = getSamplePopularPosts();
        const sampleTags = getSampleTags();
        
        displayRelatedPosts(sampleRelated);
        displayPopularPosts(samplePopular);
        displayTagsCloud(sampleTags);
    }
}

// Display popular posts
function displayPopularPosts(popularBlogs) {
    if (!popularBlogs || popularBlogs.length === 0) {
        popularPosts.innerHTML = '<p>No popular posts available</p>';
        return;
    }
    
    popularPosts.innerHTML = popularBlogs.map((blog, index) => `
        <a href="blog-single.html?id=${blog.id}" class="popular-post">
            <div class="popular-post-number">${index + 1}</div>
            <div class="popular-post-content">
                <h4>${blog.title}</h4>
                <span class="views">${blog.views || Math.floor(Math.random() * 500) + 50} views</span>
            </div>
        </a>
    `).join('');
}

// Display related posts
function displayRelatedPosts(relatedBlogs) {
    if (!relatedBlogs || relatedBlogs.length === 0) {
        relatedPosts.innerHTML = '<p>No related posts available</p>';
        return;
    }
    
    relatedPosts.innerHTML = relatedBlogs.map(blog => `
        <a href="blog-single.html?id=${blog.id}" class="related-post">
            <div class="related-post-image">
                <img src="${blog.coverImage || 'https://via.placeholder.com/80x60/764ba2/ffffff?text=Blog'}" alt="${blog.title}">
            </div>
            <div class="related-post-content">
                <h4>${blog.title}</h4>
                <span class="date">${formatDate(blog.createdAt || new Date())}</span>
            </div>
        </a>
    `).join('');
}

// Display tags cloud
function displayTagsCloud(tags) {
    if (!tags || tags.length === 0) {
        tagsCloud.innerHTML = '<p>No tags available</p>';
        return;
    }
    
    tagsCloud.innerHTML = tags.map(tag => 
        `<span class="tag">${tag}</span>`
    ).join('');
}

// Initialize social sharing
function initializeSocialSharing(blog) {
    // Store blog data for sharing
    window.currentBlog = blog;
}

// Social sharing functions
function shareOnFacebook() {
    const blog = window.currentBlog;
    if (blog) {
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent(blog.title);
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank');
    }
}

function shareOnTwitter() {
    const blog = window.currentBlog;
    if (blog) {
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent(blog.title);
        window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
    }
}

function shareOnWhatsApp() {
    const blog = window.currentBlog;
    if (blog) {
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent(blog.title);
        window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
    }
}

function shareOnLinkedIn() {
    const blog = window.currentBlog;
    if (blog) {
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent(blog.title);
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
    }
}

// Show loading state
function showLoading(show) {
    if (show) {
        loadingSkeleton.style.display = 'block';
        blogContent.style.display = 'none';
    } else {
        loadingSkeleton.style.display = 'none';
    }
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <div style="text-align: center; padding: 2rem; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; margin: 1rem 0;">
            <i class="fas fa-exclamation-triangle" style="color: #856404; font-size: 2rem; margin-bottom: 1rem;"></i>
            <p style="color: #856404; font-weight: 500;">${message}</p>
        </div>
    `;
    
    const mainContent = document.querySelector('.blog-post');
    mainContent.appendChild(errorDiv);
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

// Handle newsletter form submission
function handleNewsletterSubmit(e) {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    
    // Simulate newsletter subscription
    showNotification('Thank you for subscribing to our newsletter!', 'success');
    e.target.reset();
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; padding: 1rem 1.5rem; border-radius: 8px; color: white; font-weight: 500; z-index: 10000; animation: slideInRight 0.3s ease;">
            <div style="background: ${type === 'success' ? '#28a745' : '#17a2b8'}; padding: 1rem; border-radius: 8px;">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}" style="margin-right: 0.5rem;"></i>
                ${message}
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Sample data functions
function getSampleBlogById(blogId) {
    const sampleBlogs = getSampleBlogs();
    return sampleBlogs.find(blog => blog.id == blogId) || sampleBlogs[0];
}

function getSampleBlogs() {
    return [
        {
            id: 1,
            title: "Top 10 Study Tips for Exam Success",
            content: `
                <h2>Introduction</h2>
                <p>Success in exams doesn't happen by chance. It requires careful planning, consistent effort, and effective study strategies. In this comprehensive guide, we'll explore the top 10 study tips that have helped thousands of students achieve their academic goals.</p>
                
                <h2>1. Create a Study Schedule</h2>
                <p>Planning your study time is crucial for exam success. Create a realistic schedule that allocates specific time slots for each subject. Remember to include breaks and review sessions.</p>
                
                <h2>2. Use Active Learning Techniques</h2>
                <p>Instead of passively reading, engage with the material through:</p>
                <ul>
                    <li>Summarizing information in your own words</li>
                    <li>Creating mind maps and diagrams</li>
                    <li>Teaching concepts to others</li>
                    <li>Practicing with past exam papers</li>
                </ul>
                
                <h2>3. Find Your Optimal Study Environment</h2>
                <p>Identify where you study best - whether it's a quiet library, a coffee shop, or your bedroom. Ensure your study space is well-lit, comfortable, and free from distractions.</p>
                
                <h2>4. Take Regular Breaks</h2>
                <p>Your brain needs rest to process information effectively. Follow the Pomodoro Technique: study for 25 minutes, then take a 5-minute break.</p>
                
                <h2>5. Practice Self-Testing</h2>
                <p>Regular self-assessment helps identify knowledge gaps. Create flashcards, take practice quizzes, and explain concepts to yourself.</p>
                
                <h2>6. Stay Organized</h2>
                <p>Keep your notes, materials, and study resources well-organized. Use folders, digital tools, or apps to maintain order.</p>
                
                <h2>7. Get Adequate Sleep</h2>
                <p>Sleep is essential for memory consolidation. Aim for 7-9 hours of quality sleep, especially before exam days.</p>
                
                <h2>8. Maintain a Healthy Lifestyle</h2>
                <p>Regular exercise, proper nutrition, and stress management contribute to better cognitive function and exam performance.</p>
                
                <h2>9. Use Multiple Learning Resources</h2>
                <p>Don't rely on just one textbook. Use various resources like online videos, podcasts, study groups, and educational apps.</p>
                
                <h2>10. Review and Reflect</h2>
                <p>Regularly review your progress and adjust your study strategies accordingly. Reflect on what works best for you.</p>
                
                <h2>Conclusion</h2>
                <p>Remember, effective studying is a skill that improves with practice. Start implementing these tips gradually and find what works best for your learning style.</p>
            `,
            author: "Dr. Sarah Johnson",
            createdAt: "2024-01-15",
            views: 1247,
            tags: ["Study Tips", "Exam Preparation", "Education"],
            coverImage: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=400&fit=crop"
        },
        {
            id: 2,
            title: "The Benefits of Reading for Mental Health",
            content: `
                <h2>Introduction</h2>
                <p>Reading is not just a way to gain knowledge; it's also a powerful tool for maintaining and improving mental health. In today's fast-paced world, taking time to read can provide much-needed mental respite and numerous psychological benefits.</p>
                
                <h2>Stress Reduction</h2>
                <p>Reading has been shown to reduce stress levels by up to 68%. When you immerse yourself in a good book, your mind focuses on the narrative, allowing your body to relax and your heart rate to slow down.</p>
                
                <h2>Improved Sleep Quality</h2>
                <p>Reading before bed can help you fall asleep faster and enjoy better sleep quality. Unlike screen time, reading a physical book doesn't emit blue light that can interfere with your circadian rhythm.</p>
                
                <h2>Enhanced Empathy</h2>
                <p>Fiction reading, in particular, has been linked to increased empathy. When you read about characters' experiences and emotions, you develop a better understanding of different perspectives and human experiences.</p>
                
                <h2>Cognitive Benefits</h2>
                <p>Regular reading strengthens neural connections and can help prevent cognitive decline. It's like exercise for your brain, keeping it active and healthy.</p>
                
                <h2>Mental Escape</h2>
                <p>Books provide a healthy escape from daily stressors. They transport you to different worlds, times, and experiences, offering a mental break from reality.</p>
                
                <h2>Conclusion</h2>
                <p>Incorporating reading into your daily routine can significantly improve your mental well-being. Start with just 20 minutes a day and gradually increase your reading time.</p>
            `,
            author: "Dr. Michael Chen",
            createdAt: "2024-01-10",
            views: 892,
            tags: ["Mental Health", "Reading", "Wellness"],
            coverImage: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=400&fit=crop"
        },
        {
            id: 3,
            title: "New Arrivals: Must-Read Books This Month",
            content: `
                <h2>Welcome to Our Latest Collection</h2>
                <p>We're excited to introduce our newest arrivals, carefully selected to inspire, educate, and entertain our readers. From academic textbooks to leisure reading, we have something for everyone.</p>
                
                <h2>Academic Excellence</h2>
                <p>Our academic section features the latest editions of textbooks and reference materials for students at all levels. We've also added comprehensive study guides and practice materials.</p>
                
                <h2>Fiction Favorites</h2>
                <p>Discover new authors and revisit classic stories in our fiction section. From contemporary novels to timeless classics, we have a diverse selection to satisfy every reader's taste.</p>
                
                <h2>Children's Corner</h2>
                <p>Nurture a love for reading in young minds with our carefully curated children's books. From picture books for toddlers to chapter books for young readers, we have age-appropriate options.</p>
                
                <h2>Special Offers</h2>
                <p>Don't miss our special discounts on selected titles. Visit our store or check our website for current promotions and bundle deals.</p>
            `,
            author: "Pahana Edu Team",
            createdAt: "2024-01-05",
            views: 567,
            tags: ["New Arrivals", "Books", "Reading"],
            coverImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&h=400&fit=crop"
        }
    ];
}

function getSampleRelatedPosts(currentBlog) {
    const allBlogs = getSampleBlogs();
    return allBlogs.filter(blog => blog.id !== currentBlog.id).slice(0, 3);
}

function getSamplePopularPosts() {
    return [
        { id: 1, title: "Top 10 Study Tips for Exam Success", views: 1247 },
        { id: 2, title: "The Benefits of Reading for Mental Health", views: 892 },
        { id: 3, title: "New Arrivals: Must-Read Books This Month", views: 567 },
        { id: 4, title: "How to Develop a Reading Habit", views: 445 },
        { id: 5, title: "Best Books for Students", views: 334 }
    ];
}

function getSampleTags() {
    return ["Study Tips", "Exam Preparation", "Education", "Mental Health", "Reading", "Wellness", "New Arrivals", "Books", "Students", "Learning"];
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    const blogId = getBlogIdFromUrl();
    loadBlogPost(blogId);
    initializeBackToTop();
    
    // Add newsletter form event listener
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', handleNewsletterSubmit);
    }
    
    // Add search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                // Implement search functionality
                showNotification('Search feature coming soon!', 'info');
            }
        });
    }
});

// Add smooth scrolling for anchor links
document.addEventListener('click', (e) => {
    if (e.target.matches('a[href^="#"]')) {
        e.preventDefault();
        const target = document.querySelector(e.target.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
});

// Add loading animation for images
document.addEventListener('DOMContentLoaded', function() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('load', function() {
            this.style.opacity = '1';
        });
        
        img.addEventListener('error', function() {
            this.src = 'image/placeholder.jpg';
        });
    });
});

// Add intersection observer for animations
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

// Observe elements for animation
document.addEventListener('DOMContentLoaded', function() {
    const animatedElements = document.querySelectorAll('.blog-post, .sidebar-widget');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}); 