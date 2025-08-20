package com.example.demo.controller;

import com.example.demo.model.Customer;
import com.example.demo.repository.CustomerRepository;
import com.example.demo.service.CustomerService;
import com.example.demo.util.JwtUtil;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Base64;

@RestController
@RequestMapping("/api/customers")
@CrossOrigin(origins = "*")
public class CustomerController {

    @Autowired
    private CustomerService customerService;

    @Autowired
private CustomerRepository customerRepository;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/register")
    public Customer register(@RequestBody Customer customer) {
        return customerService.registerCustomer(customer);
    }

    @GetMapping("/profile")
    public ResponseEntity<Customer> getProfile(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String token = authHeader.substring(7);
        String username = jwtUtil.extractUsername(token);

        Optional<Customer> customer = customerRepository.findByUsername(username);
        if (customer.isPresent()) {
            Customer c = customer.get();
            System.out.println("Profile fetch - Username: " + c.getUsername() + ", Profile photo: " + (c.getProfilePhoto() != null ? "Present" : "Not present"));
        }
        return customer.map(ResponseEntity::ok)
                       .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(HttpServletRequest request, @RequestBody Map<String, String> updates) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String token = authHeader.substring(7);
        String username = jwtUtil.extractUsername(token);
        Optional<Customer> customerOpt = customerRepository.findByUsername(username);
        if (customerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        Customer customer = customerOpt.get();
        
        // Log the current state before update
        System.out.println("Before update - Profile photo: " + (customer.getProfilePhoto() != null ? "Present" : "Not present"));
        
        if (updates.containsKey("name")) {
            customer.setName(updates.get("name"));
        }
        if (updates.containsKey("dob")) {
            customer.setDob(java.time.LocalDate.parse(updates.get("dob")));
        }
        
        customerRepository.save(customer);
        
        // Log the state after update
        System.out.println("After update - Profile photo: " + (customer.getProfilePhoto() != null ? "Present" : "Not present"));
        
        return ResponseEntity.ok().build();
    }

    @PostMapping("/profile/photo")
    public ResponseEntity<?> uploadProfilePhoto(HttpServletRequest request, @RequestParam("profilePhoto") MultipartFile file) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        String token = authHeader.substring(7);
        String username = jwtUtil.extractUsername(token);
        Optional<Customer> customerOpt = customerRepository.findByUsername(username);
        
        if (customerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        
        try {
            // Validate file type
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return ResponseEntity.badRequest().body("Only image files are allowed");
            }
            
            // Validate file size (5MB limit)
            if (file.getSize() > 5 * 1024 * 1024) {
                return ResponseEntity.badRequest().body("File size must be less than 5MB");
            }
            
            // Convert image to Base64 for storage
            byte[] imageBytes = file.getBytes();
            String base64Image = Base64.getEncoder().encodeToString(imageBytes);
            String dataUrl = "data:" + contentType + ";base64," + base64Image;
            
            Customer customer = customerOpt.get();
            System.out.println("Photo upload - Before: " + (customer.getProfilePhoto() != null ? "Present" : "Not present"));
            customer.setProfilePhoto(dataUrl);
            customerRepository.save(customer);
            System.out.println("Photo upload - After: " + (customer.getProfilePhoto() != null ? "Present" : "Not present"));
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Profile photo uploaded successfully");
            response.put("photoUrl", dataUrl);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Failed to upload photo: " + e.getMessage());
        }
    }

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Map<String, String> loginData) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                loginData.get("username"),
                loginData.get("password")
            )
        );

        User user = (User) authentication.getPrincipal();
        String token = jwtUtil.generateToken(user.getUsername());

        Map<String, String> response = new HashMap<>();
        response.put("token", token);
        return response;
    }
}
