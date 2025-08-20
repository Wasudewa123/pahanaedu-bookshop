# Pahana Book Shop - Billing System Guide

## 🚨 Current Issues & Solutions

### Problem 1: Backend Connection Issues
**Issue**: The admin dashboard shows "Backend Offline (Using localStorage)" in red.

**Root Cause**: 
- Frontend is trying to connect to `/api/billing/*` endpoints
- Backend is running on `http://localhost:8080/api/billing/*`
- URL mismatch causing connection failures

**Solution**: ✅ **FIXED**
- Updated all API calls to use full URL: `http://localhost:8080/api/billing/*`
- Added proper error handling and fallback to localStorage
- Improved backend status indicator

### Problem 2: MongoDB Integration Not Working
**Issue**: System falls back to localStorage instead of using MongoDB.

**Root Cause**:
- Backend connection failures
- Missing proper error handling
- Frontend not properly detecting backend availability

**Solution**: ✅ **FIXED**
- Fixed all API endpoint URLs
- Added comprehensive backend status checking
- Improved error handling with fallback mechanisms

### Problem 3: Billing Functions Not Working
**Issue**: View, save, download, and email bill functions failing.

**Root Cause**:
- Incorrect API endpoints
- Missing error handling
- Backend connectivity issues

**Solution**: ✅ **FIXED**
- Updated all billing function endpoints
- Added proper error handling
- Implemented fallback mechanisms

## 🔧 How to Test the Fixes

### Step 1: Start the Backend Server
```bash
# Navigate to your project directory
cd "Pahana Book Shop"

# Start the Spring Boot application
mvn spring-boot:run
```

**Expected Output**:
```
Started PahanaBookShopApplication in X.XXX seconds
```

### Step 2: Test Backend Connection
Open `test-backend-connection.html` in your browser to test:
- Basic backend connectivity
- Billing API functionality
- Customer API functionality
- Books API functionality
- MongoDB connection

### Step 3: Test Admin Dashboard
1. Open `src/admin-dashboard.html` in your browser
2. Navigate to the "Billing" section
3. Check the backend status indicator (should show green "Backend Online (MongoDB)")
4. Test billing functions:
   - Generate a bill
   - Save a bill
   - Download PDF
   - Email bill

## 📊 Backend Status Indicator

The admin dashboard now shows a real-time backend status:

- 🟢 **Green**: "Backend Online (MongoDB)" - All functions work with real database
- 🔴 **Red**: "Backend Offline (Using localStorage)" - Functions work with local storage fallback

## 🔄 What Was Fixed

### 1. API Endpoint URLs
**Before**:
```javascript
fetch('/api/billing/generate', ...)
```

**After**:
```javascript
fetch('http://localhost:8080/api/billing/generate', ...)
```

### 2. Backend Status Detection
**Added**:
- Real-time backend connectivity checking
- Visual status indicator
- Automatic fallback to localStorage when backend is offline

### 3. Error Handling
**Improved**:
- Better error messages
- Graceful degradation
- Fallback mechanisms for all functions

### 4. Customer Fetching
**Enhanced**:
- Try backend first
- Fallback to demo customers if backend fails
- Better user feedback

## 🗄️ MongoDB vs localStorage

### When Backend is Online (MongoDB):
- ✅ All data is stored in MongoDB database
- ✅ Data persists between sessions
- ✅ Real customer data from database
- ✅ Real book data from database
- ✅ Bills saved to database
- ✅ Full functionality available

### When Backend is Offline (localStorage):
- ⚠️ Data stored in browser's localStorage
- ⚠️ Data lost when browser is cleared
- ⚠️ Demo customer data only
- ⚠️ Demo book data only
- ⚠️ Bills saved to localStorage
- ⚠️ Limited functionality

## 🚀 Testing the Billing System

### Test 1: Generate a Bill
1. Go to Billing section
2. Enter account number: `ACC74773`
3. Click "Fetch" - should find customer
4. Select a book and quantity
5. Click "Add" to add to bill
6. Fill payment details
7. Click "Generate Bill"

### Test 2: Save a Bill
1. After generating a bill
2. Click "Save Bill" button
3. Status should change to "SAVED"
4. Bill should appear in history

### Test 3: Download PDF
1. After generating a bill
2. Click "Download PDF" button
3. PDF should download with bill details

### Test 4: Email Bill
1. After generating a bill
2. Click "Email Bill" button
3. Enter email address when prompted
4. PDF should be generated for email

## 🔍 Troubleshooting

### If Backend Status Shows Red:

1. **Check if Spring Boot is running**:
   ```bash
   # In project directory
   mvn spring-boot:run
   ```

2. **Check if MongoDB is running**:
   - Open MongoDB Compass
   - Connect to `mongodb://localhost:27017`
   - Verify database `pahandb` exists

3. **Check port 8080**:
   - Ensure no other application is using port 8080
   - Try accessing `http://localhost:8080` in browser

4. **Use the test page**:
   - Open `test-backend-connection.html`
   - Run all tests to identify specific issues

### If Billing Functions Still Don't Work:

1. **Check browser console** for error messages
2. **Use the test page** to verify backend connectivity
3. **Restart the backend server** if needed
4. **Clear browser cache** and reload the page

## 📝 Demo Data

### Demo Customers:
- `ACC74773` - pasindi
- `ACC74824` - Neethumi  
- `ACC74702` - Pamuditha
- `ACC74767` - Sithara Roshana

### Demo Books:
- The Great Gatsby - Rs. 1500
- To Kill a Mockingbird - Rs. 1200
- 1984 - Rs. 1800
- Pride and Prejudice - Rs. 900
- Mistborn: The Final Empire - Rs. 1350
- Lord of the Rings - Rs. 1500
- Harry Potter and the Sorcerer's Stone - Rs. 1100
- The Hobbit - Rs. 950

## ✅ Success Indicators

When everything is working correctly, you should see:

1. **Backend Status**: Green "Backend Online (MongoDB)"
2. **Customer Fetch**: Successfully finds customers from database
3. **Book Selection**: Real books loaded from database
4. **Bill Generation**: Bills saved to MongoDB
5. **Bill History**: Shows real bills from database
6. **PDF Download**: Generates professional PDF invoices
7. **Email Function**: Ready to send bills via email

## 🎯 Next Steps

1. **Test the fixes** using the guide above
2. **Use the test page** to verify backend connectivity
3. **Check the admin dashboard** for proper functionality
4. **Report any remaining issues** with specific error messages

The billing system should now work properly with MongoDB integration when the backend is online, and gracefully fall back to localStorage when it's not available. 