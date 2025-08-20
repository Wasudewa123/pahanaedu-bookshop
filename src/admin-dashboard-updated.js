// Updated editOrder function with modern design
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

// Updated saveOrderChanges function with better error handling and dashboard updates
function saveOrderChanges(orderId) {
    // Get form values
    const formData = {
        customerName: document.getElementById('edit-order-customer').value,
        bookTitle: document.getElementById('edit-order-book') ? document.getElementById('edit-order-book').value : null,
        quantity: parseInt(document.getElementById('edit-order-quantity').value),
        totalPrice: parseFloat(document.getElementById('edit-order-price').value),
        status: document.getElementById('edit-order-status').value
    };
    
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
    
    // Send update to backend
    const token = localStorage.getItem('adminToken');
    fetch(`http://localhost:8080/api/admin/orders/${orderId}`, {
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
            showToast('Order updated successfully!', 'success');
            document.querySelector('.modal').remove();
            
            // Update all relevant data
            loadOrders(); // Reload order list
            loadRecentOrders(); // Update recent orders in dashboard
            loadDashboardData(); // Refresh dashboard stats
            
            // Trigger customer dashboard update if needed
            updateCustomerDashboard();
            
        } else {
            showToast('Error updating order: ' + (data.message || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        console.error('Error updating order:', error);
        showToast('Error updating order. Please try again.', 'error');
    })
    .finally(() => {
        // Restore button state
        saveButton.innerHTML = originalText;
        saveButton.disabled = false;
    });
}

// Function to update customer dashboard
function updateCustomerDashboard() {
    // This function can be called to refresh customer dashboard data
    // It will be implemented to sync changes across different views
    console.log('Updating customer dashboard...');
    
    // If customer dashboard is open in another tab/window, we can send a message
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
}
