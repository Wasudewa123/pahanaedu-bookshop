package com.example.demo.controller;

import com.example.demo.model.Bill;
import com.example.demo.model.Book;
import com.example.demo.model.Order;
import com.example.demo.service.BillingService;
import com.example.demo.service.BookService;
import com.example.demo.service.CustomerService;
import com.example.demo.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = "*")
public class AnalyticsController {

    @Autowired
    private BillingService billingService;

    @Autowired
    private BookService bookService;

    @Autowired
    private CustomerService customerService;

    @Autowired
    private OrderService orderService;

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardAnalytics(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<Bill> bills = billingService.getAllBills();
            List<Book> books = bookService.findAll();
            // customers list available if needed later
            List<Order> orders = orderService.getAllOrders();

            // Determine date range (default: last 30 days)
            LocalDate endRange = (endDate != null) ? LocalDate.parse(endDate) : LocalDate.now();
            LocalDate startRange = (startDate != null) ? LocalDate.parse(startDate) : endRange.minusDays(30);

            // Filter bills and orders within range (inclusive)
            List<Bill> rangedBills = bills.stream()
                .filter(b -> b.getBillDate() != null)
                .filter(b -> {
                    LocalDate d = b.getBillDate().toLocalDate();
                    return !d.isBefore(startRange) && !d.isAfter(endRange);
                })
                .toList();

            List<Order> rangedOrders = orders.stream()
                .filter(o -> o.getOrderDate() != null)
                .filter(o -> {
                    LocalDate d = o.getOrderDate().toLocalDate();
                    return !d.isBefore(startRange) && !d.isAfter(endRange);
                })
                .toList();

            // Calculate total revenue
            double totalRevenue = rangedBills.stream()
                .mapToDouble(bill -> bill.getTotal())
                .sum();

            // Calculate revenue for last 7 days
            LocalDate sevenDaysAgo = endRange.minusDays(7);
            double lastWeekRevenue = rangedBills.stream()
                .filter(bill -> {
                    if (bill.getBillDate() == null) return false;
                    LocalDate billDate = bill.getBillDate().toLocalDate();
                    return (!billDate.isBefore(sevenDaysAgo)) && (!billDate.isAfter(endRange));
                })
                .mapToDouble(bill -> bill.getTotal())
                .sum();

            // Calculate revenue for previous 7 days
            LocalDate fourteenDaysAgo = endRange.minusDays(14);
            double previousWeekRevenue = rangedBills.stream()
                .filter(bill -> {
                    if (bill.getBillDate() == null) return false;
                    LocalDate billDate = bill.getBillDate().toLocalDate();
                    return billDate.isAfter(fourteenDaysAgo) && billDate.isBefore(sevenDaysAgo);
                })
                .mapToDouble(bill -> bill.getTotal())
                .sum();

            // Calculate percentage change
            double revenueChange = previousWeekRevenue > 0 ? 
                ((lastWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100 : 0;

            // Top selling books (within range)
            Map<String, Integer> bookSales = new HashMap<>();
            rangedOrders.forEach(order -> {
                String bookTitle = order.getBookTitle();
                if (bookTitle != null) {
                    bookSales.put(bookTitle, bookSales.getOrDefault(bookTitle, 0) + order.getQuantity());
                }
            });

            List<Map<String, Object>> topBooks = bookSales.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(5)
                .map(entry -> {
                    Map<String, Object> book = new HashMap<>();
                    book.put("title", entry.getKey());
                    book.put("quantity", entry.getValue());
                    return book;
                })
                .collect(Collectors.toList());

            // Category performance: quantity sold by category within range
            Map<String, String> bookIdToCategory = books.stream()
                .collect(Collectors.toMap(Book::getId, b -> b.getCategory() != null ? b.getCategory() : "Uncategorized", (a,b2)->a));
            Map<String, Integer> categoryCounts = new HashMap<>();
            rangedOrders.forEach(o -> {
                String category = bookIdToCategory.getOrDefault(o.getBookId(), "Uncategorized");
                categoryCounts.put(category, categoryCounts.getOrDefault(category, 0) + o.getQuantity());
            });

            // Revenue by payment method
            Map<String, Double> paymentMethodRevenue = rangedBills.stream()
                .collect(Collectors.groupingBy(
                    bill -> bill.getPaymentMethod() != null ? bill.getPaymentMethod().toUpperCase() : "UNKNOWN",
                    Collectors.summingDouble(bill -> bill.getTotal())
                ));

            // Recent bills
            List<Map<String, Object>> recentBills = rangedBills.stream()
                .sorted((b1, b2) -> {
                    LocalDate date1 = b1.getBillDate() != null ? 
                        b1.getBillDate().toLocalDate() : LocalDate.MIN;
                    LocalDate date2 = b2.getBillDate() != null ? 
                        b2.getBillDate().toLocalDate() : LocalDate.MIN;
                    return date2.compareTo(date1);
                })
                .limit(6)
                .map(bill -> {
                    Map<String, Object> billData = new HashMap<>();
                    billData.put("billNumber", bill.getBillNumber());
                    billData.put("customerName", bill.getCustomerName());
                    billData.put("total", bill.getTotal());
                    billData.put("billDate", bill.getBillDate());
                    billData.put("paymentMethod", bill.getPaymentMethod());
                    billData.put("status", bill.getStatus());
                    return billData;
                })
                .collect(Collectors.toList());

            // Daily revenue series within range (for trend chart)
            Map<String, Double> salesTrend = new LinkedHashMap<>();
            for (LocalDate d = startRange; !d.isAfter(endRange); d = d.plusDays(1)) {
                salesTrend.put(d.toString(), 0.0);
            }
            rangedBills.forEach(b -> {
                LocalDate d = b.getBillDate().toLocalDate();
                String key = d.toString();
                if (salesTrend.containsKey(key)) {
                    salesTrend.put(key, salesTrend.get(key) + b.getTotal());
                }
            });

            // Stock status counts
            long inStock = books.stream().filter(book -> book.getStockQuantity() > 10).count();
            long lowStock = books.stream().filter(book -> book.getStockQuantity() > 0 && book.getStockQuantity() <= 10).count();
            long outOfStock = books.stream().filter(book -> book.getStockQuantity() <= 0).count();

            // Build response
            Map<String, Object> analytics = new HashMap<>();
            analytics.put("totalRevenue", totalRevenue);
            analytics.put("totalOrders", rangedOrders.size());
            // Count distinct customers within range based on bills or orders
            long distinctCustomers = rangedBills.stream().map(Bill::getCustomerName).filter(Objects::nonNull).map(String::trim).filter(s->!s.isEmpty()).distinct().count();
            analytics.put("totalCustomers", (int) distinctCustomers);
            analytics.put("totalBooks", books.size());
            analytics.put("revenueChange", Math.round(revenueChange * 100.0) / 100.0);
            analytics.put("lastWeekRevenue", lastWeekRevenue);
            analytics.put("topBooks", topBooks);
            analytics.put("categoryPerformance", categoryCounts);
            analytics.put("paymentMethodRevenue", paymentMethodRevenue);
            analytics.put("recentBills", recentBills);
            analytics.put("salesTrend", salesTrend);
            analytics.put("stockStatus", Map.of(
                "inStock", inStock,
                "lowStock", lowStock,
                "outOfStock", outOfStock
            ));

            response.put("success", true);
            response.put("analytics", analytics);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving analytics: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/reports")
    public ResponseEntity<Map<String, Object>> getDetailedReports(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String reportType) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<Bill> bills = billingService.getAllBills();
            List<Book> books = bookService.findAll();
            // Retrieve customers if needed for future analytics
            var customers = customerService.getAllCustomers();
            List<Order> orders = orderService.getAllOrders();

            // Filter by date range if provided
            if (startDate != null && endDate != null) {
                LocalDate start = LocalDate.parse(startDate);
                LocalDate end = LocalDate.parse(endDate);
                
                bills = bills.stream()
                    .filter(bill -> {
                        if (bill.getBillDate() == null) return false;
                        LocalDate billDate = bill.getBillDate().toLocalDate();
                        return !billDate.isBefore(start) && !billDate.isAfter(end);
                    })
                    .collect(Collectors.toList());
            }

            Map<String, Object> reportData = new HashMap<>();
            
            if ("bills".equals(reportType) || reportType == null) {
                // Billing report
                List<Map<String, Object>> billReport = bills.stream()
                    .map(bill -> {
                        Map<String, Object> billData = new HashMap<>();
                        billData.put("date", bill.getBillDate());
                        billData.put("billNumber", bill.getBillNumber());
                        billData.put("customerName", bill.getCustomerName());
                        billData.put("items", bill.getItems() != null ? bill.getItems().size() : 0);
                        billData.put("totalAmount", bill.getTotal());
                        billData.put("paymentMethod", bill.getPaymentMethod());
                        billData.put("status", bill.getStatus());
                        return billData;
                    })
                    .collect(Collectors.toList());
                
                reportData.put("bills", billReport);
            } else if ("books".equals(reportType)) {
                // Book performance report
                List<Map<String, Object>> bookReport = books.stream()
                    .map(book -> {
                        Map<String, Object> bookData = new HashMap<>();
                        bookData.put("title", book.getTitle());
                        bookData.put("author", book.getAuthor());
                        bookData.put("category", book.getCategory());
                        bookData.put("price", book.getPrice());
                        bookData.put("stock", book.getStockQuantity());
                        bookData.put("rating", book.getRating());
                        return bookData;
                    })
                    .collect(Collectors.toList());
                
                reportData.put("books", bookReport);
            } else if ("customers".equals(reportType)) {
                // Customer report
                List<Map<String, Object>> customerReport = customers.stream()
                    .map(customer -> {
                        Map<String, Object> customerData = new HashMap<>();
                        customerData.put("accountNumber", customer.getAccountNumber());
                        customerData.put("name", customer.getName());
                        customerData.put("email", customer.getEmail());
                        customerData.put("phone", customer.getPhone());
                        customerData.put("registrationDate", customer.getCreatedAt());
                        return customerData;
                    })
                    .collect(Collectors.toList());
                
                reportData.put("customers", customerReport);
            }

            response.put("success", true);
            response.put("reportData", reportData);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error generating report: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/export")
    public ResponseEntity<Map<String, Object>> exportAnalytics(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Get all data for export
            List<Bill> bills = billingService.getAllBills();
            List<Book> books = bookService.findAll();
            var customers = customerService.getAllCustomers();
            List<Order> orders = orderService.getAllOrders();

            // Calculate summary statistics
            double totalRevenue = bills.stream()
                .mapToDouble(bill -> bill.getTotal())
                .sum();

            Map<String, Object> exportData = new HashMap<>();
            exportData.put("summary", Map.of(
                "totalRevenue", totalRevenue,
                "totalOrders", orders.size(),
                "totalCustomers", customers.size(),
                "totalBooks", books.size(),
                "generatedAt", new Date().toString()
            ));
            
            exportData.put("bills", bills);
            exportData.put("books", books);
            exportData.put("customers", customers);
            exportData.put("orders", orders);

            response.put("success", true);
            response.put("exportData", exportData);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error exporting data: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}
