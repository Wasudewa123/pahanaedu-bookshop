package com.example.demo.model;

public class BillItem {
    private String bookId;
    private String title;
    private int quantity;
    private double price;
    private double subtotal;

    public BillItem() {}

    public BillItem(String bookId, String title, int quantity, double price) {
        this.bookId = bookId;
        this.title = title;
        this.quantity = quantity;
        this.price = price;
        this.subtotal = quantity * price;
    }

    // Getters and Setters
    public String getBookId() { return bookId; }
    public void setBookId(String bookId) { this.bookId = bookId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { 
        this.quantity = quantity;
        this.subtotal = quantity * price;
    }

    public double getPrice() { return price; }
    public void setPrice(double price) { 
        this.price = price;
        this.subtotal = quantity * price;
    }

    public double getSubtotal() { return subtotal; }
    public void setSubtotal(double subtotal) { this.subtotal = subtotal; }
} 