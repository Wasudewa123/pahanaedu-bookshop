package com.example.demo.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Document(collection = "bills")
public class Bill {
    @Id
    private String id;
    
    // Basic Bill Information
    private String billNumber;
    private String accountNumber;
    private String customerName;
    private LocalDateTime billDate;
    private String status; // PENDING, SAVED, PAID, FAILED
    
    // Payment Information
    private String paymentMethod; // CASH, CARD, UPI, BANK_TRANSFER
    private String transactionId;
    
    // Bill Items (Books)
    private List<BillItem> items;
    
    // Financial Calculations
    private double subtotal;
    private double discount;
    private double tax;
    private double total;
    
    // Additional Information
    private String adminNotes;
    
    // Legacy fields for backward compatibility
    private int unitsConsumed;
    private double ratePerUnit;
    private double totalAmount;

    public Bill() {
        this.billDate = LocalDateTime.now();
        this.status = "PENDING";
        this.billNumber = generateBillNumber();
    }

    // Constructor for backward compatibility
    public Bill(String accountNumber, String customerName, int unitsConsumed, double ratePerUnit) {
        this();
        this.accountNumber = accountNumber;
        this.customerName = customerName;
        this.unitsConsumed = unitsConsumed;
        this.ratePerUnit = ratePerUnit;
        this.totalAmount = unitsConsumed * ratePerUnit;
    }

    // Generate unique bill number
    private String generateBillNumber() {
        return "BILL" + System.currentTimeMillis() % 100000;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getBillNumber() { return billNumber; }
    public void setBillNumber(String billNumber) { this.billNumber = billNumber; }

    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public LocalDateTime getBillDate() { return billDate; }
    public void setBillDate(LocalDateTime billDate) { this.billDate = billDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }

    public List<BillItem> getItems() { return items; }
    public void setItems(List<BillItem> items) { this.items = items; }

    public double getSubtotal() { return subtotal; }
    public void setSubtotal(double subtotal) { this.subtotal = subtotal; }

    public double getDiscount() { return discount; }
    public void setDiscount(double discount) { this.discount = discount; }

    public double getTax() { return tax; }
    public void setTax(double tax) { this.tax = tax; }

    public double getTotal() { return total; }
    public void setTotal(double total) { this.total = total; }

    public String getAdminNotes() { return adminNotes; }
    public void setAdminNotes(String adminNotes) { this.adminNotes = adminNotes; }

    // Legacy getters and setters for backward compatibility
    public int getUnitsConsumed() { return unitsConsumed; }
    public void setUnitsConsumed(int unitsConsumed) { 
        this.unitsConsumed = unitsConsumed;
        this.totalAmount = unitsConsumed * ratePerUnit;
    }

    public double getRatePerUnit() { return ratePerUnit; }
    public void setRatePerUnit(double ratePerUnit) { 
        this.ratePerUnit = ratePerUnit;
        this.totalAmount = unitsConsumed * ratePerUnit;
    }

    public double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(double totalAmount) { this.totalAmount = totalAmount; }
} 