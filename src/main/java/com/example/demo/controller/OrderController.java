package com.example.demo.controller;

import com.example.demo.model.Order;
import com.example.demo.model.Book;
import com.example.demo.service.OrderService;
import com.example.demo.service.BookService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
public class OrderController {
    @Autowired
    private OrderService orderService;
    
    @Autowired
    private BookService bookService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> placeOrder(@RequestBody Order order) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Debug: Log the received order data
            System.out.println("Received order data:");
            System.out.println("Book ID: " + order.getBookId());
            System.out.println("Book Title: " + order.getBookTitle());
            System.out.println("First Name: " + order.getFirstName());
            System.out.println("Last Name: " + order.getLastName());
            System.out.println("Customer Name: " + order.getCustomerName());
            System.out.println("Email: " + order.getEmail());
            System.out.println("Phone: " + order.getPhone());
            System.out.println("Quantity: " + order.getQuantity());
            System.out.println("Payment Method: " + order.getPaymentMethod());
            System.out.println("Company: " + order.getCompany());
            System.out.println("Street Address: " + order.getStreetAddress());
            System.out.println("City: " + order.getCity());
            System.out.println("Postal Code: " + order.getPostalCode());
            System.out.println("Country: " + order.getCountry());
            System.out.println("State: " + order.getState());
            
            // Set order metadata
            order.setOrderDate(LocalDateTime.now());
            order.setStatus("PENDING");
            
            // Combine first and last name for customerName if not provided
            if (order.getCustomerName() == null || order.getCustomerName().isEmpty()) {
                String fullName = (order.getFirstName() != null ? order.getFirstName() : "") + 
                                " " + (order.getLastName() != null ? order.getLastName() : "");
                order.setCustomerName(fullName.trim());
            }
            
            // Validate required fields
            if (order.getBookId() == null || order.getBookId().isEmpty()) {
                response.put("success", false);
                response.put("message", "Book ID is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (order.getEmail() == null || order.getEmail().isEmpty()) {
                response.put("success", false);
                response.put("message", "Email is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (order.getPaymentMethod() == null || order.getPaymentMethod().isEmpty()) {
                response.put("success", false);
                response.put("message", "Payment method is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Ensure all fields are properly set (even if empty)
            if (order.getPhone() == null) order.setPhone("");
            if (order.getCompany() == null) order.setCompany("");
            if (order.getStreetAddress() == null) order.setStreetAddress("");
            if (order.getCity() == null) order.setCity("");
            if (order.getPostalCode() == null) order.setPostalCode("");
            if (order.getCountry() == null) order.setCountry("");
            if (order.getState() == null) order.setState("");
            if (order.getFirstName() == null) order.setFirstName("");
            if (order.getLastName() == null) order.setLastName("");
            
            // Save the order
            Order savedOrder = orderService.placeOrder(order);
            
            response.put("success", true);
            response.put("message", "Order placed successfully!");
            response.put("orderId", savedOrder.getId());
            response.put("order", savedOrder);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to place order: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/email/{email}")
    public ResponseEntity<List<Map<String, Object>>> getOrdersByEmail(@PathVariable String email) {
        try {
            List<Order> orders = orderService.getOrdersByEmail(email);
            List<Map<String, Object>> enhancedOrders = new ArrayList<>();
            
            for (Order order : orders) {
                Map<String, Object> enhancedOrder = new HashMap<>();
                
                // Add all order fields
                enhancedOrder.put("id", order.getId());
                enhancedOrder.put("bookId", order.getBookId());
                enhancedOrder.put("bookTitle", order.getBookTitle());
                enhancedOrder.put("firstName", order.getFirstName());
                enhancedOrder.put("lastName", order.getLastName());
                enhancedOrder.put("customerName", order.getCustomerName());
                enhancedOrder.put("email", order.getEmail());
                enhancedOrder.put("phone", order.getPhone());
                enhancedOrder.put("quantity", order.getQuantity());
                enhancedOrder.put("totalPrice", order.getTotalPrice());
                enhancedOrder.put("paymentMethod", order.getPaymentMethod());
                enhancedOrder.put("company", order.getCompany());
                enhancedOrder.put("streetAddress", order.getStreetAddress());
                enhancedOrder.put("city", order.getCity());
                enhancedOrder.put("postalCode", order.getPostalCode());
                enhancedOrder.put("country", order.getCountry());
                enhancedOrder.put("state", order.getState());
                enhancedOrder.put("orderDate", order.getOrderDate());
                enhancedOrder.put("status", order.getStatus());
                
                // Add book image URL
                try {
                    Book book = bookService.findById(order.getBookId());
                    enhancedOrder.put("bookImageUrl", book.getImageUrl());
                } catch (Exception e) {
                    enhancedOrder.put("bookImageUrl", null);
                }
                
                enhancedOrders.add(enhancedOrder);
            }
            
            return ResponseEntity.ok(enhancedOrders);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping
    public ResponseEntity<List<Order>> getAllOrders() {
        try {
            List<Order> orders = orderService.getAllOrders();
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Optional<Order>> getOrderById(@PathVariable String id) {
        try {
            Optional<Order> order = orderService.getOrderById(id);
            if (order.isPresent()) {
                return ResponseEntity.ok(order);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> updateOrderStatus(@PathVariable String id, @RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String status = request.get("status");
            if (status == null || status.isEmpty()) {
                response.put("success", false);
                response.put("message", "Status is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            Order updatedOrder = orderService.updateOrderStatus(id, status);
            
            response.put("success", true);
            response.put("message", "Order status updated successfully!");
            response.put("order", updatedOrder);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to update order status: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
} 