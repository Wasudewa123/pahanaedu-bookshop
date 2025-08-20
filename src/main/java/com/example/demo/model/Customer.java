package com.example.demo.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Document(collection = "customers")
public class Customer {

    @Id
    private String id;
    private String accountNumber; // Unique account number
    private String username;
    private String name;
    private String password;
    private LocalDate dob;
    private String email;
    private String phone; // Added phone field
    private String address; // Added address field
    private String profilePhoto;
    private LocalDateTime createdAt; // Added registration date field

    public Customer() {
        this.createdAt = LocalDateTime.now(); // Set creation time automatically
    }

    public Customer(String username, String name, String password, LocalDate dob, String email) {
        this.username = username;
        this.name = name;
        this.password = password;
        this.dob = dob;
        this.email = email;
        this.accountNumber = generateAccountNumber();
        this.createdAt = LocalDateTime.now(); // Set creation time automatically
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public LocalDate getDob() { return dob; }
    public void setDob(LocalDate dob) { this.dob = dob; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getProfilePhoto() { return profilePhoto; }
    public void setProfilePhoto(String profilePhoto) { this.profilePhoto = profilePhoto; }

    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    // Generate unique account number
    private String generateAccountNumber() {
        return "ACC" + System.currentTimeMillis() % 100000;
    }
}
