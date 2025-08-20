# MongoDB Database Setup Guide for Pahana Book Shop

## Overview
This guide will help you manually create and configure MongoDB databases for the Pahana Book Shop application. The application uses a single MongoDB database called `pahandb` for all data.

## Prerequisites
- MongoDB installed and running on your system
- MongoDB Compass (optional, for GUI management)
- Access to MongoDB shell (mongosh or mongo)

## Step 1: Verify MongoDB is Running

### Check if MongoDB is running:
```bash
# On Windows
netstat -an | findstr :27017

# On Linux/Mac
netstat -an | grep :27017
```

If you see `LISTENING` on port 27017, MongoDB is running.

## Step 2: Connect to MongoDB

### Option A: Using MongoDB Shell
```bash
# Connect to MongoDB
mongosh

# Or if using older version
mongo
```

### Option B: Using MongoDB Compass
1. Open MongoDB Compass
2. Connect to: `mongodb://localhost:27017`

## Step 3: Create the Database

### Using MongoDB Shell:
```javascript
// Switch to the database (this creates it if it doesn't exist)
use pahandb

// Verify the database exists
show dbs
```

### Using MongoDB Compass:
1. Click "Create Database"
2. Database Name: `pahandb`
3. Collection Name: `book` (this will be created automatically)

## Step 4: Create Collections

### Using MongoDB Shell:
```javascript
// Switch to the database
use pahandb

// Create collections
db.createCollection("book")
db.createCollection("customer")
db.createCollection("order")
db.createCollection("bill")
db.createCollection("admin")

// Verify collections were created
show collections
```

### Using MongoDB Compass:
1. Click on the `pahandb` database
2. Click "Create Collection" for each collection:
   - `book`
   - `customer`
   - `order`
   - `bill`
   - `admin`

## Step 5: Insert Sample Data (Optional)

### Sample Book Data:
```javascript
// Switch to the database
use pahandb

// Insert sample books
db.book.insertMany([
  {
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    description: "A classic American novel about the Jazz Age",
    price: 15.99,
    category: "Novels",
    isbn: "978-0743273565",
    language: "English",
    publishedYear: 1925,
    format: "Paperback",
    stockQuantity: 50,
    status: "IN_STOCK",
    rating: 4.5,
    ratingCount: 120,
    publisher: "Scribner",
    pages: 180,
    imageUrl: "https://example.com/gatsby.jpg",
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Harry Potter and the Philosopher's Stone",
    author: "J.K. Rowling",
    description: "The first book in the Harry Potter series",
    price: 12.99,
    category: "Children",
    isbn: "978-0747532699",
    language: "English",
    publishedYear: 1997,
    format: "Hardcover",
    stockQuantity: 75,
    status: "IN_STOCK",
    rating: 4.8,
    ratingCount: 200,
    publisher: "Bloomsbury",
    pages: 223,
    imageUrl: "https://example.com/harry-potter.jpg",
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
])
```

## Step 6: Verify Database Setup

### Check Database and Collections:
```javascript
// List all databases
show dbs

// Switch to our database
use pahandb

// List all collections
show collections

// Check book collection
db.book.find().pretty()

// Count documents in each collection
db.book.countDocuments()
db.customer.countDocuments()
db.order.countDocuments()
db.bill.countDocuments()
db.admin.countDocuments()
```

## Step 7: Test the Application

1. **Start the Spring Boot Application:**
   ```bash
   # In your project directory
   mvn spring-boot:run
   ```

2. **Test API Endpoints:**
   - Open: `http://localhost:8080/api/books`
   - Should return JSON with books data

3. **Test Admin Dashboard:**
   - Open: `src/admin-dashboard.html`
   - Try adding a new book
   - Check if it appears in MongoDB

## Step 8: Troubleshooting

### Common Issues:

1. **MongoDB not running:**
   ```bash
   # Start MongoDB (Windows)
   net start MongoDB
   
   # Start MongoDB (Linux/Mac)
   sudo systemctl start mongod
   ```

2. **Connection refused:**
   - Check if MongoDB is running on port 27017
   - Verify firewall settings
   - Check MongoDB configuration

3. **Database not found:**
   - Make sure you created the `pahandb` database
   - Check if collections exist

4. **Application can't connect:**
   - Verify `application.properties` has correct MongoDB URI
   - Check if Spring Boot application is running
   - Look for connection errors in application logs

## Step 9: Monitoring and Maintenance

### View Database Statistics:
```javascript
// Get database stats
db.stats()

// Get collection stats
db.book.stats()
```

### Backup Database:
```bash
# Create backup
mongodump --db pahandb --out ./backup

# Restore backup
mongorestore --db pahandb ./backup/pahandb
```

## Configuration Files

### application.properties:
```properties
spring.application.name=Pahana Book Shop
server.port=8080

# MongoDB Configuration
spring.data.mongodb.uri=mongodb://localhost:27017/pahandb

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
jwt.secret=VGhpcy1pcy1hLXN1cGVyLXNlY3JldC1rZXktZm9yLXBhaGFuYS1ib29rc2hvcC1hcGktMTIzNDU2Nzg5MA==
```

## Next Steps

1. **Add more sample data** to test all features
2. **Configure indexes** for better performance
3. **Set up regular backups**
4. **Monitor database performance**

## Support

If you encounter issues:
1. Check MongoDB logs
2. Check Spring Boot application logs
3. Verify database connection
4. Test API endpoints manually

---

**Note:** This guide assumes MongoDB is installed and running on your system. If you haven't installed MongoDB, please refer to the official MongoDB installation guide for your operating system. 