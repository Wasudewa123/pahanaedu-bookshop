package com.example.demo.repository;

import com.example.demo.model.Book;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookRepository extends MongoRepository<Book, String> {
    
    // Find books by title or author containing search term
    Page<Book> findByTitleContainingIgnoreCaseOrAuthorContainingIgnoreCase(String title, String author, Pageable pageable);
    
    // Find books by category
    Page<Book> findByCategory(String category, Pageable pageable);
    
    // Find books by status
    Page<Book> findByStatus(String status, Pageable pageable);
    
    // Find books by price range
    Page<Book> findByPriceBetween(Double minPrice, Double maxPrice, Pageable pageable);
    
    // Find non-archived books
    List<Book> findByArchivedFalse();
    
    // Count methods
    long countByTitleContainingIgnoreCaseOrAuthorContainingIgnoreCase(String title, String author);
    long countByCategory(String category);
    long countByStatus(String status);
    long countByPriceBetween(Double minPrice, Double maxPrice);
    
    // Get all unique categories
    @Query("SELECT DISTINCT category FROM Book WHERE category IS NOT NULL")
    List<String> findAllCategories();
}







