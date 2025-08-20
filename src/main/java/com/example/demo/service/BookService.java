package com.example.demo.service;

import com.example.demo.model.Book;
import com.example.demo.repository.BookRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;

@Service
public class BookService {
    @Autowired
    private BookRepository bookRepository;

    // Find books with advanced filtering
    public List<Book> findBooksWithFilters(String search, String category, String status, 
                                         Double minPrice, Double maxPrice, String sortBy, 
                                         String sortOrder, int page, int size) {
        
        // Create sort object
        Sort sort = Sort.unsorted();
        if (sortBy != null && !sortBy.isEmpty()) {
            if ("desc".equalsIgnoreCase(sortOrder)) {
                sort = Sort.by(Sort.Direction.DESC, sortBy);
            } else {
                sort = Sort.by(Sort.Direction.ASC, sortBy);
            }
        }
        
        // Create pageable object
        Pageable pageable = PageRequest.of(page, size, sort);
        
        // Build query based on filters
        if (search != null && !search.isEmpty()) {
            return bookRepository.findByTitleContainingIgnoreCaseOrAuthorContainingIgnoreCase(
                search, search, pageable).getContent();
        }
        
        if (category != null && !category.isEmpty()) {
            return bookRepository.findByCategory(category, pageable).getContent();
        }
        
        if (status != null && !status.isEmpty()) {
            return bookRepository.findByStatus(status, pageable).getContent();
        }
        
        if (minPrice != null && maxPrice != null) {
            return bookRepository.findByPriceBetween(minPrice, maxPrice, pageable).getContent();
        }
        
        // Return all books if no filters
        return bookRepository.findAll(pageable).getContent();
    }

    // Count books with filters
    public long countBooksWithFilters(String search, String category, String status, 
                                    Double minPrice, Double maxPrice) {
        
        if (search != null && !search.isEmpty()) {
            return bookRepository.countByTitleContainingIgnoreCaseOrAuthorContainingIgnoreCase(search, search);
        }
        
        if (category != null && !category.isEmpty()) {
            return bookRepository.countByCategory(category);
        }
        
        if (status != null && !status.isEmpty()) {
            return bookRepository.countByStatus(status);
        }
        
        if (minPrice != null && maxPrice != null) {
            return bookRepository.countByPriceBetween(minPrice, maxPrice);
        }
        
        return bookRepository.count();
    }

    // Get book statistics
    public Map<String, Object> getBookStatistics() {
        Map<String, Object> stats = new HashMap<>();
        
        long totalBooks = bookRepository.count();
        long inStockBooks = bookRepository.countByStatus("IN_STOCK");
        long outOfStockBooks = bookRepository.countByStatus("OUT_OF_STOCK");
        long lowStockBooks = bookRepository.countByStatus("LOW_STOCK");
        
        // Calculate total stock quantities
        List<Book> allBooks = bookRepository.findByArchivedFalse();
        int inStockQuantity = allBooks.stream()
                .filter(book -> "IN_STOCK".equals(book.getStatus()))
                .mapToInt(Book::getStockQuantity)
                .sum();
        int lowStockQuantity = allBooks.stream()
                .filter(book -> "LOW_STOCK".equals(book.getStatus()))
                .mapToInt(Book::getStockQuantity)
                .sum();
        int outOfStockQuantity = allBooks.stream()
                .filter(book -> "OUT_OF_STOCK".equals(book.getStatus()))
                .mapToInt(Book::getStockQuantity)
                .sum();
        
        stats.put("totalBooks", totalBooks);
        stats.put("inStockBooks", inStockBooks);
        stats.put("outOfStockBooks", outOfStockBooks);
        stats.put("lowStockBooks", lowStockBooks);
        stats.put("inStockQuantity", inStockQuantity);
        stats.put("lowStockQuantity", lowStockQuantity);
        stats.put("outOfStockQuantity", outOfStockQuantity);
        
        return stats;
    }

    // Get all categories
    public List<String> getAllCategories() {
        return bookRepository.findAllCategories();
    }

    // Find all books (basic)
    public List<Book> findAll() {
        return bookRepository.findAll();
    }

    // Save new book
    public Book save(Book book) {
        book.setCreatedAt(LocalDateTime.now());
        book.setUpdatedAt(LocalDateTime.now());
        return bookRepository.save(book);
    }

    // Find book by ID
    public Book findById(String id) {
        Optional<Book> book = bookRepository.findById(id);
        return book.orElse(null);
    }

    // Update book
    public Book updateBook(String id, Book bookDetails) {
        Optional<Book> bookOptional = bookRepository.findById(id);
        if (bookOptional.isPresent()) {
            Book book = bookOptional.get();
            
            // Update fields
            book.setTitle(bookDetails.getTitle());
            book.setAuthor(bookDetails.getAuthor());
            book.setDescription(bookDetails.getDescription());
            book.setImageUrl(bookDetails.getImageUrl());
            book.setPrice(bookDetails.getPrice());
            book.setCategory(bookDetails.getCategory());
            book.setIsbn(bookDetails.getIsbn());
            book.setLanguage(bookDetails.getLanguage());
            book.setPublishedYear(bookDetails.getPublishedYear());
            book.setFormat(bookDetails.getFormat());
            book.setStockQuantity(bookDetails.getStockQuantity());
            book.setRating(bookDetails.getRating());
            book.setRatingCount(bookDetails.getRatingCount());
            book.setPublisher(bookDetails.getPublisher());
            book.setPages(bookDetails.getPages());
            
            book.setUpdatedAt(LocalDateTime.now());
            
            return bookRepository.save(book);
        }
        return null;
    }

    // Update book details (including stock, price, title)
    public Book updateBookDetails(String id, int quantity, String status, Double price, String title) {
        Optional<Book> bookOptional = bookRepository.findById(id);
        if (bookOptional.isPresent()) {
            Book book = bookOptional.get();
            
            // Update stock and status
            book.setStockQuantity(quantity);
            if (status != null && !status.trim().isEmpty()) {
                book.setStatus(status);
            }
            
            // Update price if provided
            if (price != null && price > 0) {
                book.setPrice(price);
            }
            
            // Update title if provided
            if (title != null && !title.trim().isEmpty()) {
                book.setTitle(title);
            }
            
            book.setUpdatedAt(LocalDateTime.now());
            return bookRepository.save(book);
        }
        return null;
    }

    // Update stock quantity and status
    public Book updateStock(String id, int quantity, String status) {
        Optional<Book> bookOptional = bookRepository.findById(id);
        if (bookOptional.isPresent()) {
            Book book = bookOptional.get();
            book.setStockQuantity(quantity);
            if (status != null && !status.trim().isEmpty()) {
                book.setStatus(status);
            }
            book.setUpdatedAt(LocalDateTime.now());
            return bookRepository.save(book);
        }
        return null;
    }

    // Archive book (soft delete)
    public Book archiveBook(String id) {
        Optional<Book> bookOptional = bookRepository.findById(id);
        if (bookOptional.isPresent()) {
            Book book = bookOptional.get();
            book.setArchived(true);
            book.setUpdatedAt(LocalDateTime.now());
            return bookRepository.save(book);
        }
        return null;
    }

    // Delete book (hard delete)
    public void deleteById(String id) {
        bookRepository.deleteById(id);
    }
}