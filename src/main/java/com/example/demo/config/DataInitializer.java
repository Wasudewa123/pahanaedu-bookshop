package com.example.demo.config;

import com.example.demo.model.Book;
import com.example.demo.model.Customer;
import com.example.demo.model.Admin;
import com.example.demo.repository.BookRepository;
import com.example.demo.repository.CustomerRepository;
import com.example.demo.repository.AdminRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Arrays;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Initialize books if none exist
        if (bookRepository.count() == 0) {
            Book book1 = new Book();
            book1.setTitle("The Great Gatsby");
            book1.setAuthor("F. Scott Fitzgerald");
            book1.setDescription("A story of the fabulously wealthy Jay Gatsby and his love for the beautiful Daisy Buchanan.");
            book1.setPrice(15.99);
            book1.setImageUrl("https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300");
            book1.setCategory("Novels");
            book1.setStockQuantity(25);
            book1.setStatus("IN_STOCK");
            book1.setIsbn("978-0743273565");
            book1.setLanguage("English");
            book1.setPublishedYear(1925);
            book1.setFormat("Paperback");
            book1.setPublisher("Scribner");
            book1.setPages(180);
            book1.setRating(4.5);
            book1.setRatingCount(1200);

            Book book2 = new Book();
            book2.setTitle("To Kill a Mockingbird");
            book2.setAuthor("Harper Lee");
            book2.setDescription("The story of young Scout Finch and her father Atticus in a racially divided Alabama town.");
            book2.setPrice(12.99);
            book2.setImageUrl("https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300");
            book2.setCategory("Novels");
            book2.setStockQuantity(30);
            book2.setStatus("IN_STOCK");
            book2.setIsbn("978-0446310789");
            book2.setLanguage("English");
            book2.setPublishedYear(1960);
            book2.setFormat("Paperback");
            book2.setPublisher("Grand Central Publishing");
            book2.setPages(281);
            book2.setRating(4.8);
            book2.setRatingCount(2100);

            Book book3 = new Book();
            book3.setTitle("1984");
            book3.setAuthor("George Orwell");
            book3.setDescription("A dystopian novel about totalitarianism and surveillance society.");
            book3.setPrice(14.99);
            book3.setImageUrl("https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300");
            book3.setCategory("Novels");
            book3.setStockQuantity(20);
            book3.setStatus("IN_STOCK");
            book3.setIsbn("978-0451524935");
            book3.setLanguage("English");
            book3.setPublishedYear(1949);
            book3.setFormat("Paperback");
            book3.setPublisher("Signet");
            book3.setPages(328);
            book3.setRating(4.6);
            book3.setRatingCount(1800);

            Book book4 = new Book();
            book4.setTitle("The Cat in the Hat");
            book4.setAuthor("Dr. Seuss");
            book4.setDescription("A classic children's book about a mischievous cat who brings fun and chaos to a rainy day.");
            book4.setPrice(8.99);
            book4.setImageUrl("https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300");
            book4.setCategory("Children");
            book4.setStockQuantity(50);
            book4.setStatus("IN_STOCK");
            book4.setIsbn("978-0394800011");
            book4.setLanguage("English");
            book4.setPublishedYear(1957);
            book4.setFormat("Hardcover");
            book4.setPublisher("Random House");
            book4.setPages(61);
            book4.setRating(4.7);
            book4.setRatingCount(950);

            Book book5 = new Book();
            book5.setTitle("Harry Potter and the Sorcerer's Stone");
            book5.setAuthor("J.K. Rowling");
            book5.setDescription("The first book in the Harry Potter series, following the young wizard's journey at Hogwarts.");
            book5.setPrice(19.99);
            book5.setImageUrl("https://images.unsplash.com/photo-1603871165848-0aa92c869fa1?w=300");
            book5.setCategory("Children");
            book5.setStockQuantity(35);
            book5.setStatus("IN_STOCK");
            book5.setIsbn("978-0590353427");
            book5.setLanguage("English");
            book5.setPublishedYear(1997);
            book5.setFormat("Hardcover");
            book5.setPublisher("Scholastic");
            book5.setPages(223);
            book5.setRating(4.9);
            book5.setRatingCount(3200);

            Book book6 = new Book();
            book6.setTitle("The Hobbit");
            book6.setAuthor("J.R.R. Tolkien");
            book6.setDescription("A fantasy novel about Bilbo Baggins' journey with thirteen dwarves to reclaim their homeland.");
            book6.setPrice(16.99);
            book6.setImageUrl("https://images.unsplash.com/photo-1621351183012-e2f9972dd9bf?w=300");
            book6.setCategory("Novels");
            book6.setStockQuantity(15);
            book6.setStatus("LOW_STOCK");
            book6.setIsbn("978-0547928241");
            book6.setLanguage("English");
            book6.setPublishedYear(1937);
            book6.setFormat("Paperback");
            book6.setPublisher("Houghton Mifflin Harcourt");
            book6.setPages(366);
            book6.setRating(4.8);
            book6.setRatingCount(2400);

            Book book7 = new Book();
            book7.setTitle("Pride and Prejudice");
            book7.setAuthor("Jane Austen");
            book7.setDescription("A classic romance novel about the relationship between Elizabeth Bennet and Mr. Darcy.");
            book7.setPrice(11.99);
            book7.setImageUrl("https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300");
            book7.setCategory("Novels");
            book7.setStockQuantity(0);
            book7.setStatus("OUT_OF_STOCK");
            book7.setIsbn("978-0141439518");
            book7.setLanguage("English");
            book7.setPublishedYear(1813);
            book7.setFormat("Paperback");
            book7.setPublisher("Penguin Classics");
            book7.setPages(432);
            book7.setRating(4.7);
            book7.setRatingCount(1900);

            Book book8 = new Book();
            book8.setTitle("The Little Prince");
            book8.setAuthor("Antoine de Saint-Exupéry");
            book8.setDescription("A poetic tale about a young prince who visits various planets in space.");
            book8.setPrice(9.99);
            book8.setImageUrl("https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300");
            book8.setCategory("Children");
            book8.setStockQuantity(40);
            book8.setStatus("IN_STOCK");
            book8.setIsbn("978-0156013987");
            book8.setLanguage("English");
            book8.setPublishedYear(1943);
            book8.setFormat("Paperback");
            book8.setPublisher("Mariner Books");
            book8.setPages(96);
            book8.setRating(4.6);
            book8.setRatingCount(1100);

            bookRepository.saveAll(Arrays.asList(book1, book2, book3, book4, book5, book6, book7, book8));
            System.out.println("Sample books initialized with 8 books");
        }

        // Initialize with default admin if none exist
        if (adminRepository.count() == 0) {
            Admin defaultAdmin = new Admin();
            defaultAdmin.setUsername("admin");
            defaultAdmin.setPassword(passwordEncoder.encode("admin123"));
            defaultAdmin.setName("System Administrator");
            defaultAdmin.setEmail("admin@pahana.com");
            defaultAdmin.setRole("SUPER_ADMIN");
            defaultAdmin.setActive(true);
            defaultAdmin.setCreatedAt(java.time.LocalDateTime.now());
            adminRepository.save(defaultAdmin);
            System.out.println("Default admin created: username=admin, password=admin123");
        } else {
            // Check if existing admin has plain text password and update it
            adminRepository.findByUsername("admin").ifPresent(admin -> {
                if (admin.getPassword().equals("admin123")) {
                    // Password is plain text, hash it
                    admin.setPassword(passwordEncoder.encode("admin123"));
                    adminRepository.save(admin);
                    System.out.println("Updated admin password to hashed version");
                }
            });
        }

        // Initialize sample customers if none exist
        if (customerRepository.count() == 0) {
            Customer customer1 = new Customer();
            customer1.setUsername("pasindi.silva");
            customer1.setName("Pasindi Silva");
            customer1.setPassword(passwordEncoder.encode("password123"));
            customer1.setEmail("pasindi.silva@email.com");
            customer1.setPhone("+94 71 234 5678");
            customer1.setAddress("123 Main Street, Colombo 03, Sri Lanka");
            customer1.setDob(LocalDate.of(1995, 5, 15));
            customer1.setAccountNumber("ACC74773");
            customer1.setCreatedAt(java.time.LocalDateTime.now());

            Customer customer2 = new Customer();
            customer2.setUsername("neethumi.perera");
            customer2.setName("Neethumi Perera");
            customer2.setPassword(passwordEncoder.encode("password123"));
            customer2.setEmail("neethumi.perera@email.com");
            customer2.setPhone("+94 77 345 6789");
            customer2.setAddress("456 Lake Road, Kandy, Sri Lanka");
            customer2.setDob(LocalDate.of(1992, 8, 22));
            customer2.setAccountNumber("ACC74824");
            customer2.setCreatedAt(java.time.LocalDateTime.now());

            Customer customer3 = new Customer();
            customer3.setUsername("pamuditha.fernando");
            customer3.setName("Pamuditha Fernando");
            customer3.setPassword(passwordEncoder.encode("password123"));
            customer3.setEmail("pamuditha.fernando@email.com");
            customer3.setPhone("+94 76 456 7890");
            customer3.setAddress("789 Hill Street, Galle, Sri Lanka");
            customer3.setDob(LocalDate.of(1990, 12, 10));
            customer3.setAccountNumber("ACC74702");
            customer3.setCreatedAt(java.time.LocalDateTime.now());

            Customer customer4 = new Customer();
            customer4.setUsername("sithara.roshana");
            customer4.setName("Sithara Roshana");
            customer4.setPassword(passwordEncoder.encode("password123"));
            customer4.setEmail("sithara.roshana@email.com");
            customer4.setPhone("+94 75 567 8901");
            customer4.setAddress("321 Beach Road, Negombo, Sri Lanka");
            customer4.setDob(LocalDate.of(1988, 3, 28));
            customer4.setAccountNumber("ACC74767");
            customer4.setCreatedAt(java.time.LocalDateTime.now());

            Customer customer5 = new Customer();
            customer5.setUsername("dilshan.kumar");
            customer5.setName("Dilshan Kumar");
            customer5.setPassword(passwordEncoder.encode("password123"));
            customer5.setEmail("dilshan.kumar@email.com");
            customer5.setPhone("+94 78 678 9012");
            customer5.setAddress("654 Temple Road, Anuradhapura, Sri Lanka");
            customer5.setDob(LocalDate.of(1993, 7, 14));
            customer5.setAccountNumber("ACC74895");
            customer5.setCreatedAt(java.time.LocalDateTime.now());

            Customer customer6 = new Customer();
            customer6.setUsername("anjali.patel");
            customer6.setName("Anjali Patel");
            customer6.setPassword(passwordEncoder.encode("password123"));
            customer6.setEmail("anjali.patel@email.com");
            customer6.setPhone("+94 79 789 0123");
            customer6.setAddress("987 Garden Street, Jaffna, Sri Lanka");
            customer6.setDob(LocalDate.of(1991, 11, 5));
            customer6.setAccountNumber("ACC74912");
            customer6.setCreatedAt(java.time.LocalDateTime.now());

            customerRepository.saveAll(Arrays.asList(customer1, customer2, customer3, customer4, customer5, customer6));
            System.out.println("Sample customers initialized with phone numbers");
        } else {
            // Update existing customers with account numbers if they don't have them
            customerRepository.findAll().forEach(customer -> {
                if (customer.getAccountNumber() == null || customer.getAccountNumber().isEmpty()) {
                    customer.setAccountNumber(generateAccountNumber());
                    customerRepository.save(customer);
                    System.out.println("Added account number to customer: " + customer.getName() + " - " + customer.getAccountNumber());
                }
            });
        }
    }

    private String generateAccountNumber() {
        return "ACC" + System.currentTimeMillis() % 100000;
    }
} 