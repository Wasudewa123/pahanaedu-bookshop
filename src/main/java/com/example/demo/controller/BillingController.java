package com.example.demo.controller;

import com.example.demo.model.Customer;
import com.example.demo.model.Bill;
import com.example.demo.service.CustomerService;
import com.example.demo.service.BillingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.List;

@RestController
@RequestMapping("/api/billing")
@CrossOrigin(origins = "*")
public class BillingController {

    @Autowired
    private CustomerService customerService;

    @Autowired
    private BillingService billingService;

    @GetMapping("/customer/{accountNumber}")
    public ResponseEntity<Map<String, Object>> getCustomerByAccountNumber(@PathVariable String accountNumber) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Optional<Customer> customer = customerService.findByAccountNumber(accountNumber);
            if (customer.isPresent()) {
                response.put("success", true);
                response.put("customer", customer.get());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Customer not found with account number: " + accountNumber);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error finding customer: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // Enhanced bill generation with items, discounts, taxes
    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generateBill(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Bill bill = billingService.generateBill(request);
            
            response.put("success", true);
            response.put("bill", bill);
            response.put("message", "Bill generated successfully");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error generating bill: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // Legacy bill generation for backward compatibility
    @PostMapping("/generate-legacy")
    public ResponseEntity<Map<String, Object>> generateLegacyBill(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String accountNumber = (String) request.get("accountNumber");
            Object unitsObj = request.get("unitsConsumed");
            Object rateObj = request.get("ratePerUnit");
            
            // Handle type conversion properly
            Integer unitsConsumed = null;
            Double ratePerUnit = null;
            
            if (unitsObj instanceof Integer) {
                unitsConsumed = (Integer) unitsObj;
            } else if (unitsObj instanceof Double) {
                unitsConsumed = ((Double) unitsObj).intValue();
            } else if (unitsObj instanceof String) {
                unitsConsumed = Integer.parseInt((String) unitsObj);
            }
            
            if (rateObj instanceof Double) {
                ratePerUnit = (Double) rateObj;
            } else if (rateObj instanceof Integer) {
                ratePerUnit = ((Integer) rateObj).doubleValue();
            } else if (rateObj instanceof String) {
                ratePerUnit = Double.parseDouble((String) rateObj);
            }
            
            if (accountNumber == null || unitsConsumed == null || ratePerUnit == null) {
                response.put("success", false);
                response.put("message", "Missing required fields");
                return ResponseEntity.badRequest().body(response);
            }
            
            Bill bill = billingService.generateBill(accountNumber, unitsConsumed, ratePerUnit);
            
            response.put("success", true);
            response.put("bill", bill);
            response.put("message", "Bill generated successfully");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error generating bill: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/history/{accountNumber}")
    public ResponseEntity<Map<String, Object>> getBillingHistory(@PathVariable String accountNumber) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<Bill> bills = billingService.getBillingHistory(accountNumber);
            response.put("success", true);
            response.put("bills", bills);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving billing history: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/all")
    public ResponseEntity<Map<String, Object>> getAllBills() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<Bill> bills = billingService.getAllBills();
            response.put("success", true);
            response.put("bills", bills);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving all bills: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/bill/{billNumber}")
    public ResponseEntity<Map<String, Object>> getBillByBillNumber(@PathVariable String billNumber) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Optional<Bill> bill = billingService.getBillByBillNumber(billNumber);
            if (bill.isPresent()) {
                response.put("success", true);
                response.put("bill", bill.get());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Bill not found with bill number: " + billNumber);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving bill: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PutMapping("/status/{billNumber}")
    public ResponseEntity<Map<String, Object>> updateBillStatus(
            @PathVariable String billNumber, 
            @RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String status = request.get("status");
            if (status == null) {
                response.put("success", false);
                response.put("message", "Status is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            Bill bill = billingService.updateBillStatusByBillNumber(billNumber, status);
            response.put("success", true);
            response.put("bill", bill);
            response.put("message", "Bill status updated successfully");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error updating bill status: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @DeleteMapping("/bill/{billNumber}")
    public ResponseEntity<Map<String, Object>> deleteBill(@PathVariable String billNumber) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            billingService.deleteBillByBillNumber(billNumber);
            response.put("success", true);
            response.put("message", "Bill deleted successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error deleting bill: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchBills(@RequestParam String searchTerm) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<Bill> bills = billingService.searchBills(searchTerm);
            response.put("success", true);
            response.put("bills", bills);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error searching bills: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<Map<String, Object>> getBillsByStatus(@PathVariable String status) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<Bill> bills = billingService.getBillsByStatus(status);
            response.put("success", true);
            response.put("bills", bills);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving bills by status: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
} 