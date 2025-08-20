package com.example.demo.service;

import com.example.demo.model.Bill;
import com.example.demo.model.BillItem;
import com.example.demo.model.Customer;
import com.example.demo.repository.BillRepository;
import com.example.demo.repository.CustomerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.HashMap;

@Service
public class BillingService {

    @Autowired
    private BillRepository billRepository;

    @Autowired
    private CustomerRepository customerRepository;

    // Enhanced bill generation with items, discounts, taxes
    public Bill generateBill(Map<String, Object> billData) {
        try {
            // Find customer by account number
            String accountNumber = (String) billData.get("customerAccountNumber");
            if (accountNumber == null || accountNumber.trim().isEmpty()) {
                throw new RuntimeException("Customer account number is required");
            }
            
            Optional<Customer> customer = customerRepository.findByAccountNumber(accountNumber);
            if (customer.isEmpty()) {
                throw new RuntimeException("Customer not found with account number: " + accountNumber);
            }

            Customer c = customer.get();
            Bill bill = new Bill();
            
            // Set basic information
            bill.setAccountNumber(accountNumber);
            bill.setCustomerName(c.getName());
            bill.setPaymentMethod((String) billData.get("paymentMethod"));
            bill.setTransactionId((String) billData.get("transactionId"));
            bill.setAdminNotes((String) billData.get("adminNotes"));
            
            // Set items with proper error handling
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> itemsData = (List<Map<String, Object>>) billData.get("items");
            if (itemsData == null || itemsData.isEmpty()) {
                throw new RuntimeException("At least one item is required for bill generation");
            }
            
            List<BillItem> items = itemsData.stream()
                .map(item -> {
                    try {
                        return new BillItem(
                            (String) item.get("bookId"),
                            (String) item.get("title"),
                            convertToInteger(item.get("quantity")),
                            convertToDouble(item.get("price"))
                        );
                    } catch (Exception e) {
                        throw new RuntimeException("Error processing bill item: " + e.getMessage());
                    }
                })
                .toList();
            bill.setItems(items);
            
            // Set financial calculations with proper type conversion
            bill.setSubtotal(convertToDouble(billData.get("subtotal")));
            bill.setDiscount(convertToDouble(billData.get("discount")));
            bill.setTax(convertToDouble(billData.get("tax")));
            bill.setTotal(convertToDouble(billData.get("total")));
            
            return billRepository.save(bill);
        } catch (Exception e) {
            throw new RuntimeException("Error generating bill: " + e.getMessage(), e);
        }
    }

    // Legacy method for backward compatibility
    public Bill generateBill(String accountNumber, int unitsConsumed, double ratePerUnit) {
        // Find customer by account number
        Optional<Customer> customer = customerRepository.findByAccountNumber(accountNumber);
        if (customer.isEmpty()) {
            throw new RuntimeException("Customer not found with account number: " + accountNumber);
        }

        Customer c = customer.get();
        Bill bill = new Bill(accountNumber, c.getName(), unitsConsumed, ratePerUnit);
        
        return billRepository.save(bill);
    }

    public List<Bill> getBillingHistory(String accountNumber) {
        return billRepository.findByAccountNumberOrderByBillDateDesc(accountNumber);
    }

    public List<Bill> getAllBills() {
        return billRepository.findAll();
    }

    public Optional<Bill> getBillById(String id) {
        return billRepository.findById(id);
    }

    public Optional<Bill> getBillByBillNumber(String billNumber) {
        return billRepository.findByBillNumber(billNumber);
    }

    public Bill updateBillStatus(String id, String status) {
        Optional<Bill> billOpt = billRepository.findById(id);
        if (billOpt.isPresent()) {
            Bill bill = billOpt.get();
            bill.setStatus(status);
            return billRepository.save(bill);
        }
        throw new RuntimeException("Bill not found with id: " + id);
    }

    public Bill updateBillStatusByBillNumber(String billNumber, String status) {
        Optional<Bill> billOpt = billRepository.findByBillNumber(billNumber);
        if (billOpt.isPresent()) {
            Bill bill = billOpt.get();
            bill.setStatus(status);
            return billRepository.save(bill);
        }
        throw new RuntimeException("Bill not found with bill number: " + billNumber);
    }

    public void deleteBill(String id) {
        billRepository.deleteById(id);
    }

    public void deleteBillByBillNumber(String billNumber) {
        Optional<Bill> billOpt = billRepository.findByBillNumber(billNumber);
        if (billOpt.isPresent()) {
            billRepository.delete(billOpt.get());
        }
    }

    public List<Bill> getBillsByStatus(String status) {
        return billRepository.findByStatus(status);
    }

    public List<Bill> searchBills(String searchTerm) {
        // This would need to be implemented in BillRepository
        // For now, return all bills and filter in service
        List<Bill> allBills = billRepository.findAll();
        return allBills.stream()
            .filter(bill -> 
                bill.getBillNumber().toLowerCase().contains(searchTerm.toLowerCase()) ||
                bill.getCustomerName().toLowerCase().contains(searchTerm.toLowerCase()) ||
                bill.getAccountNumber().toLowerCase().contains(searchTerm.toLowerCase())
            )
            .toList();
    }

    // Helper method to safely convert Object to Integer
    private Integer convertToInteger(Object value) {
        if (value == null) {
            return 0;
        }
        if (value instanceof Integer) {
            return (Integer) value;
        }
        if (value instanceof Double) {
            return ((Double) value).intValue();
        }
        if (value instanceof Long) {
            return ((Long) value).intValue();
        }
        if (value instanceof String) {
            try {
                return Integer.parseInt((String) value);
            } catch (NumberFormatException e) {
                return 0;
            }
        }
        return 0;
    }

    // Helper method to safely convert Object to Double
    private Double convertToDouble(Object value) {
        if (value == null) {
            return 0.0;
        }
        if (value instanceof Double) {
            return (Double) value;
        }
        if (value instanceof Integer) {
            return ((Integer) value).doubleValue();
        }
        if (value instanceof Long) {
            return ((Long) value).doubleValue();
        }
        if (value instanceof String) {
            try {
                return Double.parseDouble((String) value);
            } catch (NumberFormatException e) {
                return 0.0;
            }
        }
        return 0.0;
    }
} 