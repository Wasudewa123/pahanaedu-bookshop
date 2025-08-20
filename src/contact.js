// Contact Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all functionality
    initializeContactPage();
});

function initializeContactPage() {
    console.log('🚀 Initializing contact page...');
    
    // Initialize form handling
    initializeContactForm();
    
    // Initialize animations
    initializeAnimations();
    
    // Initialize user profile functionality
    initializeUserProfile();
    
    // Initialize smooth scrolling
    initializeSmoothScrolling();
    
    // Initialize form validation
    initializeFormValidation();
    
    // Initialize success/error messages
    initializeMessages();
    
    // Initialize carousel
    console.log('🎠 About to initialize carousel...');
    initializeCarousel();
    console.log('✅ Contact page initialization complete');
}

// Contact Form Handling
function initializeContactForm() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', handleFormSubmit);
        
        // Add real-time validation
        const inputs = contactForm.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('blur', validateField);
            input.addEventListener('input', clearFieldError);
        });
    }
}

function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Show loading state
    const submitBtn = form.querySelector('.submit-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    submitBtn.disabled = true;
    
    // Remove any existing messages
    removeFormMessage();
    
    // Add timestamp and source info
    formData.append('_timestamp', new Date().toISOString());
    formData.append('_source', 'Pahana Book Shop Contact Form');
    
    console.log('📧 Submitting form to Formspree...');
    
    // Real form submission using Formspree
    fetch('https://formspree.io/f/mdkdwkkq', {
        method: 'POST',
        body: formData,
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => {
        console.log('📧 Formspree response status:', response.status);
        if (response.ok) {
            showFormMessage('✅ Thank you! Your message has been sent successfully. We\'ll get back to you within 24 hours.', 'success');
            form.reset();
            console.log('✅ Form submitted successfully');
        } else {
            throw new Error(`Form submission failed with status: ${response.status}`);
        }
    })
    .catch(error => {
        console.error('❌ Form submission error:', error);
        showFormMessage('❌ Sorry, there was an error sending your message. Please try again or contact us directly at pahanaedu327@gmail.com', 'error');
    })
    .finally(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}

function validateField(event) {
    const field = event.target;
    const value = field.value.trim();
    const fieldName = field.name;
    
    // Remove existing error styling
    field.classList.remove('error');
    
    // Validate based on field type
    let isValid = true;
    let errorMessage = '';
    
    switch (fieldName) {
        case 'name':
            if (value.length < 2) {
                isValid = false;
                errorMessage = 'Name must be at least 2 characters long';
            }
            break;
            
        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address';
            }
            break;
            
        case 'phone':
            if (value && !/^[\+]?[0-9\s\-\(\)]{10,}$/.test(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid phone number';
            }
            break;
            
        case 'subject':
            if (!value) {
                isValid = false;
                errorMessage = 'Please select a subject';
            }
            break;
            
        case 'message':
            if (value.length < 10) {
                isValid = false;
                errorMessage = 'Message must be at least 10 characters long';
            }
            break;
    }
    
    if (!isValid) {
        field.classList.add('error');
        showFieldError(field, errorMessage);
    }
}

function clearFieldError(event) {
    const field = event.target;
    field.classList.remove('error');
    hideFieldError(field);
}

function showFieldError(field, message) {
    // Remove existing error message
    hideFieldError(field);
    
    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        color: #e74c3c;
        font-size: 0.8rem;
        margin-top: 5px;
        animation: slideIn 0.3s ease;
    `;
    
    // Insert after the field
    field.parentNode.appendChild(errorDiv);
}

function hideFieldError(field) {
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
}

function initializeFormValidation() {
    // Add CSS for error states
    const style = document.createElement('style');
    style.textContent = `
        .form-group input.error,
        .form-group select.error,
        .form-group textarea.error {
            border-color: #e74c3c;
            box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
}

// Animations
function initializeAnimations() {
    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animateElements = document.querySelectorAll('.contact-card, .feature-item, .info-card');
    animateElements.forEach(el => {
        observer.observe(el);
    });
    
    // Add CSS for animations
    const animationStyle = document.createElement('style');
    animationStyle.textContent = `
        .contact-card,
        .feature-item,
        .info-card {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.6s ease;
        }
        
        .contact-card.animate-in,
        .feature-item.animate-in,
        .info-card.animate-in {
            opacity: 1;
            transform: translateY(0);
        }
        
        .contact-card:nth-child(1) { transition-delay: 0.1s; }
        .contact-card:nth-child(2) { transition-delay: 0.2s; }
        .contact-card:nth-child(3) { transition-delay: 0.3s; }
        .contact-card:nth-child(4) { transition-delay: 0.4s; }
        
        .feature-item:nth-child(1) { transition-delay: 0.1s; }
        .feature-item:nth-child(2) { transition-delay: 0.2s; }
        .feature-item:nth-child(3) { transition-delay: 0.3s; }
        .feature-item:nth-child(4) { transition-delay: 0.4s; }
        .feature-item:nth-child(5) { transition-delay: 0.5s; }
        .feature-item:nth-child(6) { transition-delay: 0.6s; }
    `;
    document.head.appendChild(animationStyle);
}

// User Profile Functionality
function initializeUserProfile() {
    // Check if user is logged in
    const token = localStorage.getItem('authToken');
    const profileBar = document.getElementById('profile-bar');
    
    if (token) {
        // User is logged in
        displayUserProfile();
    } else {
        // User is not logged in
        displayLoginButton();
    }
    
    // Initialize dashboard modal
    initializeDashboardModal();
}

function displayUserProfile() {
    const profileBar = document.getElementById('profile-bar');
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    profileBar.innerHTML = `
        <div class="profile-info" id="profileInfo">
            <div class="profile-avatar">
                <img src="${userData.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdlZWEiLz4KPHN2ZyB4PSIxMCIgeT0iMTAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAxMmMyLjIxIDAgNC0xLjc5IDQtNHMtMS43OS00LTQtNC00IDEuNzktNCA0IDEuNzkgNCA0IDR6bTAgMmMtMi42NyAwLTggMS4zNC04IDR2MmgxNnYtMmMwLTIuNjYtNS4zMy00LTgtNHoiLz4KPC9zdmc+Cjwvc3ZnPgo='}" alt="User Avatar">
            </div>
            <div class="profile-name">${userData.name || 'User'}</div>
            <div class="profile-caret">
                <i class="fas fa-chevron-down"></i>
            </div>
        </div>
        <div class="profile-dropdown" id="profileDropdown">
            <a href="dashboard.html">
                <i class="fas fa-tachometer-alt"></i>
                Dashboard
            </a>
            <a href="profile-edit.html">
                <i class="fas fa-user-edit"></i>
                Edit Profile
            </a>
            <a href="order.html">
                <i class="fas fa-shopping-cart"></i>
                My Orders
            </a>
            <a href="#" id="logoutBtn">
                <i class="fas fa-sign-out-alt"></i>
                Logout
            </a>
        </div>
    `;
    
    // Add event listeners
    const profileInfo = document.getElementById('profileInfo');
    const profileDropdown = document.getElementById('profileDropdown');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (profileInfo) {
        profileInfo.addEventListener('click', toggleProfileDropdown);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!profileInfo?.contains(e.target)) {
            profileDropdown?.classList.remove('show');
        }
    });
}

function displayLoginButton() {
    const profileBar = document.getElementById('profile-bar');
    profileBar.innerHTML = `
        <a href="login.html" class="login-btn">
            <i class="fas fa-sign-in-alt"></i>
            Login
        </a>
    `;
}

function toggleProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.classList.toggle('show');
}

function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.reload();
}

// Dashboard Modal
function initializeDashboardModal() {
    const dashboardModal = document.getElementById('dashboardModal');
    const dashboardModalClose = document.getElementById('dashboardModalClose');
    const dashboardLink = document.getElementById('dashboardLink');
    
    if (dashboardLink) {
        dashboardLink.addEventListener('click', (e) => {
            e.preventDefault();
            dashboardModal.classList.add('show');
        });
    }
    
    if (dashboardModalClose) {
        dashboardModalClose.addEventListener('click', () => {
            dashboardModal.classList.remove('show');
        });
    }
    
    // Close modal when clicking outside
    dashboardModal?.addEventListener('click', (e) => {
        if (e.target === dashboardModal) {
            dashboardModal.classList.remove('show');
        }
    });
    
    // Load user data in modal
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const dashboardUserName = document.getElementById('dashboardUserName');
    const dashboardUserEmail = document.getElementById('dashboardUserEmail');
    const dashboardUserAvatar = document.getElementById('dashboardUserAvatar');
    
    if (dashboardUserName) {
        dashboardUserName.textContent = userData.name || 'Welcome';
    }
    
    if (dashboardUserEmail) {
        dashboardUserEmail.textContent = userData.email || 'user@example.com';
    }
    
    if (dashboardUserAvatar && userData.avatar) {
        dashboardUserAvatar.innerHTML = `<img src="${userData.avatar}" alt="User Avatar">`;
    }
}

// Smooth Scrolling
function initializeSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Messages
function initializeMessages() {
    // Add message container to body
    const messageContainer = document.createElement('div');
    messageContainer.id = 'messageContainer';
    messageContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
    `;
    document.body.appendChild(messageContainer);
}

function showSuccessMessage(message) {
    showMessage(message, 'success');
}

function showErrorMessage(message) {
    showMessage(message, 'error');
}

function showMessage(message, type) {
    const messageContainer = document.getElementById('messageContainer');
    const messageElement = document.createElement('div');
    
    messageElement.className = `message message-${type}`;
    messageElement.innerHTML = `
        <div class="message-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="message-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    messageElement.style.cssText = `
        background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        animation: slideInRight 0.3s ease;
        max-width: 400px;
    `;
    
    messageContainer.appendChild(messageElement);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        removeMessage(messageElement);
    }, 5000);
    
    // Close button functionality
    const closeBtn = messageElement.querySelector('.message-close');
    closeBtn.addEventListener('click', () => {
        removeMessage(messageElement);
    });
}

function removeMessage(messageElement) {
    messageElement.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
        messageElement.remove();
    }, 300);
}

// New function to show inline form messages
function showFormMessage(message, type) {
    removeFormMessage(); // Remove any existing messages
    
    const form = document.getElementById('contactForm');
    const messageDiv = document.createElement('div');
    messageDiv.className = `form-message ${type}`;
    messageDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Insert message after the form
    form.parentNode.insertBefore(messageDiv, form.nextSibling);
    
    // Auto remove after 8 seconds
    setTimeout(() => {
        removeFormMessage();
    }, 8000);
}

// New function to remove form messages
function removeFormMessage() {
    const existingMessage = document.querySelector('.form-message');
    if (existingMessage) {
        existingMessage.remove();
    }
}

// Add CSS for messages
const messageStyles = document.createElement('style');
messageStyles.textContent = `
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
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .message-content {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
    }
    
    .message-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 5px;
        border-radius: 50%;
        transition: background 0.3s ease;
    }
    
    .message-close:hover {
        background: rgba(255, 255, 255, 0.2);
    }
    
    .profile-dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        background: white;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        padding: 10px 0;
        min-width: 200px;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-10px);
        transition: all 0.3s ease;
        z-index: 1000;
    }
    
    .profile-dropdown.show {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
    }
    
    .profile-dropdown a {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 20px;
        color: #333;
        text-decoration: none;
        transition: background 0.3s ease;
    }
    
    .profile-dropdown a:hover {
        background: #f8f9fa;
    }
    
    .login-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        text-decoration: none;
        border-radius: 25px;
        font-weight: 600;
        transition: all 0.3s ease;
    }
    
    .login-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }
`;
document.head.appendChild(messageStyles);

// Search functionality
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.querySelector('.search-btn');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
}

function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();
    
    if (query) {
        // Redirect to booklist with search query
        window.location.href = `booklist.html?search=${encodeURIComponent(query)}`;
    }
}

// Initialize search
initializeSearch();

// Add loading animation for form submission
function addLoadingAnimation() {
    const style = document.createElement('style');
    style.textContent = `
        .submit-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
        
        .fa-spinner {
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

addLoadingAnimation();

// Add hover effects for contact cards
function addContactCardEffects() {
    const style = document.createElement('style');
    style.textContent = `
        .contact-card {
            position: relative;
            overflow: hidden;
        }
        
        .contact-card::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.1), transparent);
            transition: left 0.5s ease;
        }
        
        .contact-card:hover::after {
            left: 100%;
        }
        
        .card-link {
            position: relative;
            overflow: hidden;
        }
        
        .card-link::before {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 0;
            height: 2px;
            background: currentColor;
            transition: width 0.3s ease;
        }
        
        .card-link:hover::before {
            width: 100%;
        }
    `;
    document.head.appendChild(style);
}

addContactCardEffects();

// Initialize carousel functionality
function initializeCarousel() {
    console.log('🎠 Starting carousel initialization...');
    
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    let currentSlide = 0;
    let autoPlayInterval = null;

    console.log('Found slides:', slides.length);
    console.log('Found dots:', dots.length);

    // Simple function to show a specific slide
    function showSlide(index) {
        console.log('🖼️ Showing slide:', index);
        
        // Remove active class from all slides and dots
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        // Add active class to current slide and dot
        slides[index].classList.add('active');
        dots[index].classList.add('active');
        
        // Update the indicator text
        const indicator = document.getElementById('carouselIndicator');
        if (indicator) {
            indicator.querySelector('span').textContent = `Slide ${index + 1} of ${slides.length}`;
        }
        
        currentSlide = index;
        console.log('✅ Slide visibility updated, currentSlide:', currentSlide);
    }

    // Function to go to next slide
    function nextSlide() {
        const nextIndex = (currentSlide + 1) % slides.length;
        console.log('⏭️ Next slide:', nextIndex);
        showSlide(nextIndex);
    }

    // Function to start auto-play
    function startAutoPlay() {
        console.log('▶️ Starting auto-play');
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
        }
        autoPlayInterval = setInterval(() => {
            console.log('⏰ Auto-play interval triggered');
            nextSlide();
        }, 2000); // Change every 2 seconds
        console.log('⏰ Auto-play interval set');
    }

    // Function to stop auto-play
    function stopAutoPlay() {
        console.log('⏸️ Stopping auto-play');
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
        }
    }

    // Initialize the carousel
    if (slides.length > 0) {
        console.log('🎠 Initializing carousel with', slides.length, 'slides');
        
        // Show the first slide
        showSlide(0);
        
        // Start auto-play
        startAutoPlay();

        // Add click events to dots
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                console.log('👆 Dot clicked:', index);
                showSlide(index);
                stopAutoPlay();
                setTimeout(() => {
                    startAutoPlay();
                }, 1000);
            });
        });

        // Pause auto-play on hover
        const carouselContainer = document.querySelector('.carousel-container');
        if (carouselContainer) {
            carouselContainer.addEventListener('mouseenter', stopAutoPlay);
            carouselContainer.addEventListener('mouseleave', startAutoPlay);
            console.log('🎯 Hover events added to carousel container');
        }
        
        console.log('✅ Carousel initialization complete');
    } else {
        console.error('❌ No carousel slides found!');
    }
} 