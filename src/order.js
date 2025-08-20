document.addEventListener("DOMContentLoaded", async () => {
  console.log("Order page loaded - initializing...");
  
  // Initialize all functionality
  await initializeOrderPage();
  initializeFormHandling();
  initializeRecentlyBoughtBooks();
  initializeFooterAnimations();
});

// Global variable to store current book's base price
let currentBookBasePrice = 0;

// Initialize order page
async function initializeOrderPage() {
  try {
    // Get book details from URL parameters or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('bookId') || localStorage.getItem('selectedBookId');
    const bookTitle = urlParams.get('bookTitle') || localStorage.getItem('selectedBookTitle');
    
    // Check if we have stored book details in localStorage
    const storedBook = localStorage.getItem('selectedBook');
    if (storedBook) {
      try {
        const bookDetails = JSON.parse(storedBook);
        console.log("Using stored book details:", bookDetails);
        displayBookDetails(bookDetails);
        // Initialize quantity handler after displaying book details
        initializeQuantityHandler();
        return; // Exit early if we have stored details
      } catch (error) {
        console.error("Error parsing stored book details:", error);
      }
    }
    
    if (bookId && bookTitle) {
      await loadBookDetails(bookId, bookTitle);
    } else {
      // Load default book or show error
      showDefaultBook();
    }
    
    // Initialize quantity change handler AFTER book details are loaded
    // This ensures currentBookBasePrice is set before event listeners are attached
    initializeQuantityHandler();
    
  } catch (error) {
    console.error("Error initializing order page:", error);
    showDefaultBook();
    // Initialize quantity handler even if there's an error
    initializeQuantityHandler();
  }
}

// Load book details from API
async function loadBookDetails(bookId, bookTitle) {
  try {
    console.log("Loading book details for:", bookId, bookTitle);
    
    // Try to fetch from API first
    const response = await fetch(`http://localhost:8080/api/books/${bookId}`);
    
    if (response.ok) {
      const book = await response.json();
      console.log("Book details from API:", book);
      displayBookDetails(book);
    } else {
      // If API fails, try to get from all books
      console.log("Single book API failed, trying to get from all books...");
      const allBooksResponse = await fetch('http://localhost:8080/api/books/all');
      
      if (allBooksResponse.ok) {
        const allBooksData = await allBooksResponse.json();
        const allBooks = allBooksData.books || [];
        
        // Find the book by ID
        const foundBook = allBooks.find(book => book.id === bookId || book._id === bookId);
        
        if (foundBook) {
          console.log("Found book in all books:", foundBook);
          displayBookDetails(foundBook);
        } else {
          // Create book data from URL parameters
          const urlBook = {
            id: bookId,
            title: decodeURIComponent(bookTitle),
            author: "Unknown Author",
            price: 2550.00,
            description: "A fascinating book that will captivate your imagination and expand your knowledge.",
            imageUrl: "image/bookstore.webp"
          };
          console.log("Using URL book data:", urlBook);
          displayBookDetails(urlBook);
        }
      } else {
        // Create book data from URL parameters
        const urlBook = {
          id: bookId,
          title: decodeURIComponent(bookTitle),
          author: "Unknown Author",
          price: 2550.00,
          description: "A fascinating book that will captivate your imagination and expand your knowledge.",
          imageUrl: "image/bookstore.webp"
        };
        console.log("Using URL book data:", urlBook);
        displayBookDetails(urlBook);
      }
    }
  } catch (error) {
    console.error("Error loading book details:", error);
    // Create book data from URL parameters as fallback
    const urlBook = {
      id: bookId,
      title: decodeURIComponent(bookTitle),
      author: "Unknown Author",
      price: 2550.00,
      description: "A fascinating book that will captivate your imagination and expand your knowledge.",
      imageUrl: "image/bookstore.webp"
    };
    console.log("Using fallback URL book data:", urlBook);
    displayBookDetails(urlBook);
  }
}

// Display book details on the page
function displayBookDetails(book) {
  const bookImage = document.getElementById('bookImage');
  const bookTitle = document.getElementById('bookTitle');
  const bookAuthor = document.getElementById('bookAuthor');
  const bookPrice = document.getElementById('bookPrice');
  const bookDescription = document.getElementById('bookDescription');
  
  if (bookImage) bookImage.src = book.imageUrl || 'image/bookstore.webp';
  if (bookTitle) bookTitle.textContent = book.title || 'Book Title';
  if (bookAuthor) bookAuthor.textContent = `by ${book.author || 'Unknown Author'}`;
  
  // Store the base price for this specific book instance in page variable
  currentBookBasePrice = book.price || 0;
  console.log("Set current book base price to:", currentBookBasePrice);
  
  if (bookDescription) bookDescription.textContent = book.description || 'Book description will be displayed here...';
  
  // Update quantity display AFTER setting the base price
  updateQuantityDisplay();
  
  // Animate the book cover
  animateBookCover();
}

// Show default book if no book is selected
function showDefaultBook() {
  const defaultBook = {
    id: 'default',
    title: 'Sample Book',
    author: 'Sample Author',
    price: 1500.00,
    description: 'This is a sample book for demonstration purposes. Please select a book from our catalog.',
    imageUrl: 'image/bookstore.webp'
  };
  displayBookDetails(defaultBook);
}

// Initialize quantity change handler
function initializeQuantityHandler() {
  const quantityInput = document.getElementById('quantity');
  console.log("Initializing quantity handler - quantityInput found:", !!quantityInput);
  
  if (quantityInput) {
    // Add event listeners for real-time updates
    quantityInput.addEventListener('change', function() {
      console.log("Quantity changed to:", this.value);
      updateQuantityDisplay();
    });
    quantityInput.addEventListener('input', function() {
      console.log("Quantity input to:", this.value);
      updateQuantityDisplay();
    });
    
    // Add visual feedback for quantity changes
    quantityInput.addEventListener('focus', function() {
      this.style.borderColor = '#007bff';
      this.style.boxShadow = '0 0 0 2px rgba(0, 123, 255, 0.25)';
    });
    
    quantityInput.addEventListener('blur', function() {
      this.style.borderColor = '#ddd';
      this.style.boxShadow = 'none';
    });
    
    console.log("Event listeners attached to quantity input");
    
    // Test the initial calculation
    console.log("Testing initial price calculation...");
    updateQuantityDisplay();
  } else {
    console.error("quantityInput element not found!");
  }
}

// Update quantity display with animation
function updateQuantityDisplay() {
  const quantityInput = document.getElementById('quantity');
  const quantityDisplay = document.getElementById('quantityDisplay');
  const bookPrice = document.getElementById('bookPrice');
  
  console.log("updateQuantityDisplay called");
  console.log("currentBookBasePrice:", currentBookBasePrice);
  console.log("quantityInput found:", !!quantityInput);
  console.log("bookPrice found:", !!bookPrice);
  
  if (quantityInput && quantityDisplay && bookPrice) {
    const quantity = parseInt(quantityInput.value) || 1;
    quantityDisplay.textContent = quantity;
    
    // Calculate total price
    const totalPrice = currentBookBasePrice * quantity;
    
    console.log("Calculating price:", currentBookBasePrice, "×", quantity, "=", totalPrice);
    
    // Update price with animation
    bookPrice.textContent = `Rs. ${totalPrice.toFixed(2)}`;
    
    // Add animation effect
    bookPrice.style.transform = 'scale(1.1)';
    bookPrice.style.color = '#28a745';
    bookPrice.style.fontWeight = 'bold';
    
    // Reset animation after 300ms
    setTimeout(() => {
      bookPrice.style.transform = 'scale(1)';
      bookPrice.style.color = '#007bff';
      bookPrice.style.fontWeight = 'normal';
    }, 300);
    
    console.log("Price updated:", totalPrice, "for quantity:", quantity);
  } else {
    console.error("Missing elements:", {
      quantityInput: !!quantityInput,
      quantityDisplay: !!quantityDisplay,
      bookPrice: !!bookPrice
    });
  }
}

// Animate book cover
function animateBookCover() {
  const bookCover = document.querySelector('.book-cover');
  if (bookCover) {
    bookCover.style.animation = 'none';
    setTimeout(() => {
      bookCover.style.animation = 'bookFloat 3s ease-in-out infinite';
    }, 100);
  }
}

// Initialize form handling
function initializeFormHandling() {
  const orderForm = document.getElementById('orderForm');
  if (orderForm) {
    orderForm.addEventListener('submit', handleOrderSubmission);
  }
  
  // Initialize payment method selection
  initializePaymentMethods();
}

// Handle order submission
async function handleOrderSubmission(event) {
  event.preventDefault();
  
  try {
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    submitBtn.disabled = true;
    
    // Collect form data
    const formData = new FormData(event.target);
    
    // Debug: Log all form data
    console.log("Form data being collected:");
    for (let [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }
    
    const orderData = {
      // Book information
      bookId: localStorage.getItem('selectedBookId') || 'default',
      bookTitle: localStorage.getItem('selectedBookTitle') || 'Sample Book',
      
      // Customer information
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      customerName: formData.get('firstName') + ' ' + formData.get('lastName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      
      // Order details
      quantity: parseInt(formData.get('quantity')),
      paymentMethod: formData.get('paymentMethod'),
      totalPrice: currentBookBasePrice * parseInt(formData.get('quantity')),
      
      // Shipping address
      company: formData.get('company'),
      streetAddress: formData.get('streetAddress'),
      city: formData.get('city'),
      postalCode: formData.get('postalCode'),
      country: formData.get('country'),
      state: formData.get('state')
    };
    
    console.log("Final order data being sent:", orderData);
    
    // Debug: Show exactly what will be sent to backend
    console.log("=== DETAILED ORDER DATA DEBUG ===");
    console.log("Book ID:", orderData.bookId);
    console.log("Book Title:", orderData.bookTitle);
    console.log("First Name:", orderData.firstName);
    console.log("Last Name:", orderData.lastName);
    console.log("Customer Name:", orderData.customerName);
    console.log("Email:", orderData.email);
    console.log("Phone:", orderData.phone);
    console.log("Quantity:", orderData.quantity);
    console.log("Payment Method:", orderData.paymentMethod);
    console.log("Company:", orderData.company);
    console.log("Street Address:", orderData.streetAddress);
    console.log("City:", orderData.city);
    console.log("Postal Code:", orderData.postalCode);
    console.log("Country:", orderData.country);
    console.log("State:", orderData.state);
    console.log("Total Price:", orderData.totalPrice);
    console.log("=== END DEBUG ===");
    
    // Call the backend API
    const response = await fetch('http://localhost:8080/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData)
    });
    
    const result = await response.json();
    console.log("Backend response:", result);
    console.log("Response status:", response.status);
    
    // Check if the response is successful (status 200-299)
    if (response.ok) {
      // Check if result has success property
      if (result.success === true) {
        // Show success message
        showOrderSuccess(orderData, result.orderId);
      } else if (result.success === false) {
        // Show error message
        showOrderError(result.message || "Failed to place order");
      } else {
        // If no success property, assume it's successful if we got a 200 response
        console.log("No success property in response, assuming success");
        showOrderSuccess(orderData, result.id || result._id || Date.now());
      }
    } else {
      // HTTP error status
      showOrderError(`HTTP ${response.status}: ${result.message || "Failed to place order"}`);
    }
    
  } catch (error) {
    console.error("Error submitting order:", error);
    showOrderError("Failed to submit order. Please try again.");
  } finally {
    // Reset button
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-shopping-bag"></i> Place Order';
    submitBtn.disabled = false;
  }
}

// Show order success
function showOrderSuccess(orderData, orderId) {
  const successMessage = `
    <div class="order-success">
      <div class="success-icon">
        <i class="fas fa-check-circle"></i>
      </div>
      <h3>Order Placed Successfully!</h3>
      <p>Thank you for your order. We'll send you a confirmation email shortly.</p>
      <div class="order-details">
        <p><strong>Order ID:</strong> ${orderId || Date.now()}</p>
        <p><strong>Book:</strong> ${orderData.bookTitle}</p>
        <p><strong>Quantity:</strong> ${orderData.quantity}</p>
        <p><strong>Total:</strong> Rs. ${orderData.totalPrice.toFixed(2)}</p>
        <p><strong>Payment Method:</strong> ${orderData.paymentMethod}</p>
        <p><strong>Shipping Address:</strong> ${orderData.streetAddress}, ${orderData.city}, ${orderData.state}</p>
      </div>
      <button onclick="window.location.href='booklist.html'" class="continue-shopping-btn">
        <i class="fas fa-arrow-left"></i> Continue Shopping
      </button>
    </div>
  `;
  
  // Replace the form with success message
  const orderContainer = document.querySelector('.order-container');
  if (orderContainer) {
    orderContainer.innerHTML = successMessage;
  }
}

// Show order error
function showOrderError(message) {
  const errorMessage = `
    <div class="order-error">
      <div class="error-icon">
        <i class="fas fa-exclamation-circle"></i>
      </div>
      <h3>Order Failed</h3>
      <p>${message}</p>
      <button onclick="location.reload()" class="retry-btn">
        <i class="fas fa-redo"></i> Try Again
      </button>
    </div>
  `;
  
  // Replace the form with error message
  const orderContainer = document.querySelector('.order-container');
  if (orderContainer) {
    orderContainer.innerHTML = errorMessage;
  }
}

// Initialize payment methods
function initializePaymentMethods() {
  const paymentOptions = document.querySelectorAll('.payment-option input[type="radio"]');
  
  paymentOptions.forEach(option => {
    option.addEventListener('change', function() {
      // Remove active class from all labels
      document.querySelectorAll('.payment-option label').forEach(label => {
        label.classList.remove('active');
      });
      
      // Add active class to selected label
      if (this.checked) {
        this.nextElementSibling.classList.add('active');
      }
    });
  });
}

// Initialize recently bought books
async function initializeRecentlyBoughtBooks() {
  try {
    console.log("Loading recently bought books from database...");
    
    // Load real books from API
    const response = await fetch('http://localhost:8080/api/books/all');
    
    if (response.ok) {
      const data = await response.json();
      const books = data.books || [];
      console.log("Loaded books from database:", books.length);
      
      // Shuffle books to show different ones each time
      const shuffledBooks = [...books].sort(() => Math.random() - 0.5);
      const selectedBooks = shuffledBooks.slice(0, 8); // Show 8 books
      
      displayRecentlyBoughtBooks(selectedBooks);
    } else {
      console.error("Failed to load books from API");
      // Show mock data as fallback
      displayRecentlyBoughtBooks(getMockRecentlyBoughtBooks());
    }
  } catch (error) {
    console.error("Error loading recently bought books:", error);
    // Show mock data as fallback
    displayRecentlyBoughtBooks(getMockRecentlyBoughtBooks());
  }
}

// Display recently bought books
function displayRecentlyBoughtBooks(books) {
  const container = document.getElementById('recentlyBoughtContainer');
  if (!container) return;
  
  console.log("Displaying recently bought books:", books);
  
  container.innerHTML = books.map(book => `
    <div class="book-card" onclick="selectBook('${book.id || book._id}', '${book.title}')">
      <img src="${book.imageUrl || 'image/bookstore.webp'}" alt="${book.title}" onerror="this.src='image/bookstore.webp'">
      <h4>${book.title || 'Unknown Title'}</h4>
      <p>by ${book.author || 'Unknown Author'}</p>
      <p class="book-description">${book.description || 'A fascinating book that will captivate your imagination and expand your knowledge.'}</p>
      <div class="price">Rs. ${(book.price || 0).toFixed(2)}</div>
      <div class="book-badges">
        <span class="badge new">NEW</span>
        <span class="badge discount">10%</span>
      </div>
    </div>
  `).join('');
}

// Get mock recently bought books
function getMockRecentlyBoughtBooks() {
  return [
    {
      id: '1',
      title: 'THE GREATEST MALAYALAM STORIES',
      author: 'Various Authors',
      price: 3843.00,
      imageUrl: 'image/bookstore.webp'
    },
    {
      id: '2',
      title: 'JAMES',
      author: 'Percival Everett',
      price: 2835.00,
      imageUrl: 'image/bookstore.webp'
    },
    {
      id: '3',
      title: 'Dr NO',
      author: 'Percival Everett',
      price: 2520.00,
      imageUrl: 'image/bookstore.webp'
    },
    {
      id: '4',
      title: 'The Trees',
      author: 'Percival Everett',
      price: 2520.00,
      imageUrl: 'image/bookstore.webp'
    },
    {
      id: '5',
      title: 'SAME AS IT EVER WAS',
      author: 'Claire Lombardo',
      price: 3402.00,
      imageUrl: 'image/bookstore.webp'
    },
    {
      id: '6',
      title: 'SHIELD OF SPARROWS',
      author: 'Devney Perry',
      price: 3843.00,
      imageUrl: 'image/bookstore.webp'
    },
    {
      id: '7',
      title: 'SUNRISE ON THE REAPING',
      author: 'Suzanne Collins',
      price: 5355.00,
      imageUrl: 'image/bookstore.webp'
    },
    {
      id: '8',
      title: 'SPARK OF THE EVERFLAME',
      author: 'Penn Cole',
      price: 3735.00,
      imageUrl: 'image/bookstore.webp'
    }
  ];
}

// Select book from recently bought
function selectBook(bookId, bookTitle) {
  // Get the book details from the recently bought books
  const recentlyBoughtContainer = document.getElementById('recentlyBoughtContainer');
  if (recentlyBoughtContainer) {
    const bookCards = recentlyBoughtContainer.querySelectorAll('.book-card');
    let selectedBook = null;
    
    // Find the clicked book's details
    bookCards.forEach(card => {
      const cardTitle = card.querySelector('h4')?.textContent;
      if (cardTitle === bookTitle) {
        const author = card.querySelector('p')?.textContent.replace('by ', '') || 'Unknown Author';
        const priceText = card.querySelector('.price')?.textContent || 'Rs. 0.00';
        const price = parseFloat(priceText.replace('Rs. ', '')) || 0;
        const imageUrl = card.querySelector('img')?.src || 'image/bookstore.webp';
        const description = card.querySelector('.book-description')?.textContent || 'A fascinating book that will captivate your imagination and expand your knowledge.';
        
        selectedBook = {
          id: bookId,
          title: bookTitle,
          author: author,
          price: price,
          description: description,
          imageUrl: imageUrl
        };
      }
    });
    
    if (selectedBook) {
      // Store complete book details
      localStorage.setItem('selectedBook', JSON.stringify(selectedBook));
      localStorage.setItem('selectedBookId', bookId);
      localStorage.setItem('selectedBookTitle', bookTitle);
      
      console.log("Selected book details:", selectedBook);
    }
  }
  
  // Reload the page with new book
  window.location.href = `order.html?bookId=${encodeURIComponent(bookId)}&bookTitle=${encodeURIComponent(bookTitle)}`;
}

// Carousel scrolling functionality
window.scrollCarousel = function(carouselId, direction) {
  const carousel = document.getElementById(carouselId);
  const container = carousel.querySelector('.book-container');
  const scrollAmount = 300;
  
  if (container) {
    const currentScroll = container.scrollLeft;
    const newScroll = currentScroll + (direction * scrollAmount);
    container.scrollTo({
      left: newScroll,
      behavior: 'smooth'
    });
  }
};

// Initialize footer animations
function initializeFooterAnimations() {
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
  
  // Animate logo
  const logoIcon = document.querySelector('.logo-icon');
  if (logoIcon) {
    logoIcon.style.animation = 'float 3s ease-in-out infinite';
  }
}

// Add CSS for success/error messages and price animation
const style = document.createElement('style');
style.textContent = `
  /* Price styling with smooth transitions */
  .price {
    transition: all 0.3s ease;
    font-size: 24px;
    font-weight: bold;
    color: #007bff;
  }
  
  /* Price animation on update */
  .price.animate {
    transform: scale(1.1);
    color: #28a745;
    font-weight: bold;
  }
  
  /* Recently bought books styling */
  .book-card .book-description {
    font-size: 0.85rem;
    color: #666;
    line-height: 1.3;
    margin: 8px 0;
    font-style: italic;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .order-success, .order-error {
    text-align: center;
    padding: 40px;
    border-radius: 15px;
    margin: 20px 0;
  }
  
  .order-success {
    background: linear-gradient(135deg, #d4edda, #c3e6cb);
    border: 1px solid #c3e6cb;
    color: #155724;
  }
  
  .order-error {
    background: linear-gradient(135deg, #f8d7da, #f5c6cb);
    border: 1px solid #f5c6cb;
    color: #721c24;
  }
  
  .success-icon, .error-icon {
    font-size: 4rem;
    margin-bottom: 20px;
  }
  
  .success-icon i {
    color: #28a745;
  }
  
  .error-icon i {
    color: #dc3545;
  }
  
  .order-details {
    background: rgba(255, 255, 255, 0.5);
    padding: 20px;
    border-radius: 10px;
    margin: 20px 0;
    text-align: left;
  }
  
  .order-details p {
    margin: 10px 0;
  }
  
  .continue-shopping-btn, .retry-btn {
    background: linear-gradient(45deg, #667eea, #764ba2);
    color: white;
    border: none;
    padding: 12px 25px;
    border-radius: 25px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-top: 20px;
  }
  
  .continue-shopping-btn:hover, .retry-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
  }
  
  .book-badges {
    display: flex;
    gap: 5px;
    justify-content: center;
    margin-top: 10px;
  }
  
  .badge {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 600;
  }
  
  .badge.new {
    background: #17a2b8;
    color: white;
  }
  
  .badge.discount {
    background: #dc3545;
    color: white;
  }
  
  .payment-option label.active {
    border-color: #667eea;
    background: linear-gradient(45deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.2);
  }
`;

document.head.appendChild(style); 