package com.example.demo.service;

import com.example.demo.model.Order;
import com.example.demo.model.Book;
import com.example.demo.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class OrderService {
    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private BookService bookService;

    public Order placeOrder(Order order) {
        order.setOrderDate(LocalDateTime.now());
        order.setStatus("PENDING");
        
        // Debug: Log what we're about to save
        System.out.println("Saving order to database:");
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
        System.out.println("Total Price: " + order.getTotalPrice());
        
        // Save the order
        Order savedOrder = orderRepository.save(order);
        
        // Debug: Log what was actually saved
        System.out.println("Order saved with ID: " + savedOrder.getId());
        
        return savedOrder;
    }

    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    public Optional<Order> getOrderById(String id) {
        return orderRepository.findById(id);
    }

    public Order updateOrderStatus(String id, String status) {
        Optional<Order> opt = orderRepository.findById(id);
        if (opt.isPresent()) {
            Order order = opt.get();
            order.setStatus(status);
            return orderRepository.save(order);
        }
        throw new RuntimeException("Order not found");
    }

    public Order updateOrder(String id, String customerName, Integer quantity, Double totalPrice, String status) {
        Optional<Order> opt = orderRepository.findById(id);
        if (opt.isPresent()) {
            Order order = opt.get();
            order.setCustomerName(customerName);
            order.setQuantity(quantity);
            order.setTotalPrice(totalPrice);
            order.setStatus(status);
            return orderRepository.save(order);
        }
        throw new RuntimeException("Order not found");
    }

    public void deleteOrder(String id) {
        Optional<Order> opt = orderRepository.findById(id);
        if (opt.isPresent()) {
            orderRepository.deleteById(id);
        } else {
            throw new RuntimeException("Order not found");
        }
    }

    public List<Order> getOrdersByEmail(String email) {
        List<Order> orders = orderRepository.findByEmail(email);
        
        // Enhance orders with book image URLs
        for (Order order : orders) {
            try {
                Book book = bookService.findById(order.getBookId());
                // Update book title to ensure it's current
                order.setBookTitle(book.getTitle());
            } catch (Exception e) {
                System.out.println("Error fetching book details for order: " + e.getMessage());
            }
        }
        
        return orders;
    }
} 