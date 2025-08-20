package com.example.demo.controller;
import com.example.demo.model.Book;
import com.example.demo.service.BookService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/books")
@CrossOrigin(origins = "*")
public class BookController {

    @Autowired
    private BookService bookService;

    // Get all books with advanced filtering
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllBooks(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortOrder,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<Book> books = bookService.findBooksWithFilters(
                search, category, status, minPrice, maxPrice, sortBy, sortOrder, page, size);
            
            long totalBooks = bookService.countBooksWithFilters(
                search, category, status, minPrice, maxPrice);
            
            response.put("success", true);
            response.put("books", books);
            response.put("totalBooks", totalBooks);
            response.put("currentPage", page);
            response.put("pageSize", size);
            response.put("totalPages", (int) Math.ceil((double) totalBooks / size));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving books: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // Get all books for customer display (no pagination)
    @GetMapping("/all")
    public ResponseEntity<Map<String, Object>> getAllBooksForCustomer() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<Book> books = bookService.findAll();
            
            response.put("success", true);
            response.put("books", books);
            response.put("totalBooks", books.size());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving books: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // Get book statistics
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getBookStats() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Map<String, Object> stats = bookService.getBookStatistics();
            response.put("success", true);
            response.put("stats", stats);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving book statistics: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // Get all categories
    @GetMapping("/categories")
    public ResponseEntity<Map<String, Object>> getAllCategories() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<String> categories = bookService.getAllCategories();
            response.put("success", true);
            response.put("categories", categories);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving categories: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // Add new book
    @PostMapping
    public ResponseEntity<Map<String, Object>> addBook(@RequestBody Book book) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Book savedBook = bookService.save(book);
            response.put("success", true);
            response.put("book", savedBook);
            response.put("message", "Book added successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error adding book: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // Get book by ID
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getBookById(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Book book = bookService.findById(id);
            if (book != null) {
                response.put("success", true);
                response.put("book", book);
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Book not found");
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving book: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // Update book
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateBook(@PathVariable String id, @RequestBody Book book) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Book updatedBook = bookService.updateBook(id, book);
            if (updatedBook != null) {
                response.put("success", true);
                response.put("book", updatedBook);
                response.put("message", "Book updated successfully");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Book not found");
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error updating book: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // Update book details (including stock, price, title)
    @PutMapping("/{id}/details")
    public ResponseEntity<Map<String, Object>> updateBookDetails(@PathVariable String id, @RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Integer quantity = (Integer) request.get("stockQuantity");
            String status = (String) request.get("status");
            Double price = (Double) request.get("price");
            String title = (String) request.get("title");
            
            if (quantity == null) {
                response.put("success", false);
                response.put("message", "stockQuantity is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            Book updatedBook = bookService.updateBookDetails(id, quantity.intValue(), status, price, title);
            if (updatedBook != null) {
                response.put("success", true);
                response.put("book", updatedBook);
                response.put("message", "Book details updated successfully");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Book not found");
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error updating book details: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // Update stock quantity and status
    @PutMapping("/{id}/stock")
    public ResponseEntity<Map<String, Object>> updateStock(@PathVariable String id, @RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Integer quantity = (Integer) request.get("stockQuantity");
            String status = (String) request.get("status");
            
            if (quantity == null) {
                response.put("success", false);
                response.put("message", "stockQuantity is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            Book updatedBook = bookService.updateStock(id, quantity.intValue(), status);
            if (updatedBook != null) {
                response.put("success", true);
                response.put("book", updatedBook);
                response.put("message", "Stock updated successfully");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Book not found");
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error updating stock: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // Archive book (soft delete)
    @PutMapping("/{id}/archive")
    public ResponseEntity<Map<String, Object>> archiveBook(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Book archivedBook = bookService.archiveBook(id);
            if (archivedBook != null) {
                response.put("success", true);
                response.put("book", archivedBook);
                response.put("message", "Book archived successfully");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Book not found");
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error archiving book: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // Delete book (hard delete)
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteBook(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            bookService.deleteById(id);
            response.put("success", true);
            response.put("message", "Book deleted successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error deleting book: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}
