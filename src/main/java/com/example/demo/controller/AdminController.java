package com.example.demo.controller;

import com.example.demo.model.Admin;
import com.example.demo.model.Customer;
import com.example.demo.model.Order;
import com.example.demo.model.Book;
import com.example.demo.model.Bill;
import com.example.demo.service.AdminService;
import com.example.demo.service.CustomerService;
import com.example.demo.service.OrderService;
import com.example.demo.service.BookService;
import com.example.demo.service.BillingService;
import com.example.demo.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    @Autowired
    private AdminService adminService;

    @Autowired
    private CustomerService customerService;

    @Autowired
    private OrderService orderService;

    @Autowired
    private BookService bookService;

    @Autowired
    private BillingService billingService;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> loginData) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String username = loginData.get("username");
            String password = loginData.get("password");
            
            if (adminService.validateCredentials(username, password)) {
                // Update last login
                adminService.updateLastLogin(username);
                
                // Generate JWT token
                Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password)
                );
                User user = (User) authentication.getPrincipal();
                String token = jwtUtil.generateToken(user.getUsername());
                
                // Get admin details
                Optional<Admin> admin = adminService.findByUsername(username);
                
                response.put("success", true);
                response.put("token", token);
                response.put("admin", admin.get());
                response.put("message", "Login successful");
                
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Invalid credentials");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Login failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardData() {
        Map<String, Object> dashboardData = new HashMap<>();
        
        try {
            // Get counts
            List<Customer> customers = customerService.getAllCustomers();
            List<Order> orders = orderService.getAllOrders();
            List<Book> books = bookService.findAll();
            
            // Calculate statistics
            long totalCustomers = customers.size();
            long totalOrders = orders.size();
            long totalBooks = books.size();
            
            // Calculate revenue
            double totalRevenue = orders.stream()
                .filter(order -> "COMPLETED".equals(order.getStatus()))
                .mapToDouble(Order::getTotalPrice)
                .sum();
            
            // Recent orders (last 10)
            List<Order> recentOrders = orders.stream()
                .sorted((o1, o2) -> o2.getOrderDate().compareTo(o1.getOrderDate()))
                .limit(10)
                .toList();
            
            dashboardData.put("totalCustomers", totalCustomers);
            dashboardData.put("totalOrders", totalOrders);
            dashboardData.put("totalBooks", totalBooks);
            dashboardData.put("totalRevenue", totalRevenue);
            dashboardData.put("recentOrders", recentOrders);
            dashboardData.put("success", true);
            
            return ResponseEntity.ok(dashboardData);
        } catch (Exception e) {
            dashboardData.put("success", false);
            dashboardData.put("message", "Failed to load dashboard data: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(dashboardData);
        }
    }

    @GetMapping("/customers")
    public ResponseEntity<List<Customer>> getAllCustomers() {
        try {
            List<Customer> customers = customerService.getAllCustomers();
            // Ensure all customers have account numbers
            customers.forEach(customer -> {
                if (customer.getAccountNumber() == null || customer.getAccountNumber().isEmpty()) {
                    customer.setAccountNumber("ACC" + System.currentTimeMillis() % 100000);
                    customerService.updateCustomer(customer);
                }
            });
            return ResponseEntity.ok(customers);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/customers")
    public ResponseEntity<Map<String, Object>> addCustomer(@RequestBody Customer customer) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Generate account number if not provided
            if (customer.getAccountNumber() == null || customer.getAccountNumber().isEmpty()) {
                customer.setAccountNumber("ACC" + System.currentTimeMillis() % 100000);
            }
            
            Customer savedCustomer = customerService.addCustomer(customer);
            
            response.put("success", true);
            response.put("message", "Customer added successfully");
            response.put("customer", savedCustomer);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to add customer: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/customers/{id}")
    public ResponseEntity<Map<String, Object>> updateCustomer(@PathVariable String id, @RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            System.out.println("=== UPDATE CUSTOMER REQUEST ===");
            System.out.println("Customer ID: " + id);
            System.out.println("Request body: " + request);
            
            // Extract fields from request
            String accountNumber = String.valueOf(request.get("accountNumber"));
            String name = String.valueOf(request.get("name"));
            String email = String.valueOf(request.get("email"));
            String phone = String.valueOf(request.get("phone"));
            String address = String.valueOf(request.get("address"));
            
            // Remove "null" strings
            if ("null".equals(accountNumber)) accountNumber = null;
            if ("null".equals(name)) name = null;
            if ("null".equals(email)) email = null;
            if ("null".equals(phone)) phone = null;
            if ("null".equals(address)) address = null;
            
            System.out.println("Parsed values:");
            System.out.println("Account Number: " + accountNumber);
            System.out.println("Name: " + name);
            System.out.println("Email: " + email);
            System.out.println("Phone: " + phone);
            System.out.println("Address: " + address);
            
            // Validate required fields
            if (name == null || name.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Customer name is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (email == null || email.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Email is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (phone == null || phone.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Phone number is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Update the customer
            Customer updatedCustomer = customerService.updateCustomerById(id, accountNumber, name, email, phone, address);
            
            System.out.println("Customer updated successfully: " + updatedCustomer.getId());
            
            response.put("success", true);
            response.put("message", "Customer updated successfully");
            response.put("customer", updatedCustomer);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.out.println("ERROR in updateCustomer: " + e.getMessage());
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "Failed to update customer: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/orders")
    public ResponseEntity<List<Order>> getAllOrders() {
        try {
            List<Order> orders = orderService.getAllOrders();
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/orders/{id}/status")
    public ResponseEntity<Map<String, Object>> updateOrderStatus(@PathVariable String id, @RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String status = request.get("status");
            Order updatedOrder = orderService.updateOrderStatus(id, status);
            
            response.put("success", true);
            response.put("message", "Order status updated successfully");
            response.put("order", updatedOrder);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to update order status: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/orders/{id}")
    @CrossOrigin(origins = "*")
    public ResponseEntity<Map<String, Object>> updateOrder(@PathVariable String id, @RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Debug: Log the incoming request
            System.out.println("=== UPDATE ORDER REQUEST ===");
            System.out.println("Order ID: " + id);
            System.out.println("Request body: " + request);
            
            // Extract fields from request with safe conversion
            String customerName = String.valueOf(request.get("customerName"));
            String quantityStr = String.valueOf(request.get("quantity"));
            String totalPriceStr = String.valueOf(request.get("totalPrice"));
            String status = String.valueOf(request.get("status"));
            
            // Convert to proper types
            Integer quantity = Integer.parseInt(quantityStr);
            Double totalPrice = Double.parseDouble(totalPriceStr);
            
            System.out.println("Parsed values:");
            System.out.println("Customer Name: " + customerName);
            System.out.println("Quantity: " + quantity);
            System.out.println("Total Price: " + totalPrice);
            System.out.println("Status: " + status);
            
            // Validate required fields
            if (customerName == null || customerName.trim().isEmpty() || "null".equals(customerName)) {
                response.put("success", false);
                response.put("message", "Customer name is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (quantity == null || quantity <= 0) {
                response.put("success", false);
                response.put("message", "Quantity must be greater than 0");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (totalPrice == null || totalPrice <= 0) {
                response.put("success", false);
                response.put("message", "Total price must be greater than 0");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (status == null || status.trim().isEmpty() || "null".equals(status)) {
                response.put("success", false);
                response.put("message", "Status is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            System.out.println("All validations passed, calling orderService.updateOrder...");
            
            // Update the order
            Order updatedOrder = orderService.updateOrder(id, customerName, quantity, totalPrice, status);
            
            System.out.println("Order updated successfully: " + updatedOrder.getId());
            
            response.put("success", true);
            response.put("message", "Order updated successfully");
            response.put("order", updatedOrder);
            
            return ResponseEntity.ok(response);
        } catch (NumberFormatException e) {
            System.out.println("Number format error: " + e.getMessage());
            response.put("success", false);
            response.put("message", "Invalid number format: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            System.out.println("ERROR in updateOrder: " + e.getMessage());
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "Failed to update order: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> registerAdmin(@RequestBody Admin admin) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Admin registeredAdmin = adminService.registerAdmin(admin);
            response.put("success", true);
            response.put("message", "Admin registered successfully");
            response.put("admin", registeredAdmin);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to register admin: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @GetMapping("/profile")
    public ResponseEntity<Admin> getAdminProfile(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.substring(7); // Remove "Bearer "
            String username = jwtUtil.extractUsername(token);
            Optional<Admin> admin = adminService.findByUsername(username);
            
            if (admin.isPresent()) {
                return ResponseEntity.ok(admin.get());
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    @GetMapping("/test")
    public ResponseEntity<Map<String, Object>> testEndpoint() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Admin controller is working");
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/orders/{id}")
    public ResponseEntity<Map<String, Object>> deleteOrder(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            System.out.println("=== DELETE ORDER REQUEST ===");
            System.out.println("Order ID: " + id);
            
            orderService.deleteOrder(id);
            
            System.out.println("Order deleted successfully: " + id);
            
            response.put("success", true);
            response.put("message", "Order deleted successfully");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.out.println("ERROR in deleteOrder: " + e.getMessage());
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "Failed to delete order: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @DeleteMapping("/customers/{id}")
    public ResponseEntity<Map<String, Object>> deleteCustomer(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            System.out.println("=== DELETE CUSTOMER REQUEST ===");
            System.out.println("Customer ID: " + id);
            
            customerService.deleteCustomer(id);
            
            System.out.println("Customer deleted successfully: " + id);
            
            response.put("success", true);
            response.put("message", "Customer deleted successfully");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.out.println("ERROR in deleteCustomer: " + e.getMessage());
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "Failed to delete customer: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/bills")
    public ResponseEntity<Map<String, Object>> getAllBills() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<Bill> bills = billingService.getAllBills();
            response.put("success", true);
            response.put("bills", bills);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving bills: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
} 