# 🔧 Fix for 405 Error - Method Not Allowed

## 🚨 **Problem:**
You're getting a 405 error when trying to generate bills. This means the HTTP method (POST) is not allowed for the endpoint.

## ✅ **Solution Steps:**

### **Step 1: Check if Backend is Running**

1. **Open Command Prompt/Terminal**
2. **Navigate to your project:**
   ```bash
   cd "C:\Users\Pasan\Downloads\Pahana Book Shop"
   ```

3. **Start the backend:**
   ```bash
   ./mvnw spring-boot:run
   ```

4. **Wait for this message:**
   ```
   Started PahanaBookShopApplication in X.XXX seconds
   ```

### **Step 2: Test the Backend**

1. **Open** `test-405-error.html` in your browser
2. **Click "Test All Endpoints"**
3. **Check which endpoints return 405 errors**

### **Step 3: Common 405 Error Causes**

#### **Cause 1: Backend Not Running**
- **Solution:** Start the backend with `./mvnw spring-boot:run`

#### **Cause 2: Wrong URL**
- **Check:** Make sure you're calling `/api/billing/generate` (not `/api/billing/generate/`)

#### **Cause 3: Wrong HTTP Method**
- **Check:** Make sure you're using POST for `/api/billing/generate`

#### **Cause 4: CORS Issues**
- **Check:** Backend has `@CrossOrigin(origins = "*")` annotation

### **Step 4: Test the Fix**

1. **Open** `src/admin-dashboard.html`
2. **Try generating a bill**
3. **Check browser console** for detailed error messages
4. **Look for toast messages** indicating success or failure

### **Step 5: Alternative - Use Fallback Mode**

If the backend still has issues, the system will automatically use localStorage:

1. **Generate a bill** - Should work with fallback
2. **Check console** - Should show "Fallback mode" message
3. **All features work** - Even without backend

## 🔍 **Debugging Information:**

### **Check Backend Status:**
```bash
# Check if port 8080 is in use
netstat -ano | findstr 8080

# Kill process if needed
taskkill /PID [PID] /F
```

### **Check Application Logs:**
When you run `./mvnw spring-boot:run`, look for:
- ✅ **"Started PahanaBookShopApplication"** = Success
- ❌ **"APPLICATION FAILED TO START"** = Error
- ❌ **"Port 8080 was already in use"** = Port conflict

### **Test API Endpoints:**
```bash
# Test if backend responds
curl http://localhost:8080/api/billing/all

# Test bill generation
curl -X POST http://localhost:8080/api/billing/generate \
  -H "Content-Type: application/json" \
  -d '{"customerAccountNumber":"ACC74773","customerName":"Test","items":[],"paymentMethod":"CASH","subtotal":0,"discount":0,"tax":0,"total":0}'
```

## 🎯 **Quick Fix:**

### **If Backend Won't Start:**
1. **Kill any process using port 8080:**
   ```bash
   netstat -ano | findstr 8080
   taskkill /PID [PID] /F
   ```

2. **Start backend:**
   ```bash
   ./mvnw spring-boot:run
   ```

### **If Still Getting 405:**
1. **Use the fallback mode** - It works without backend
2. **Check browser console** for detailed error messages
3. **Test with** `test-405-error.html`

## 🎉 **Expected Result:**

After fixing:
- ✅ **Backend running** on port 8080
- ✅ **Bill generation** works with MongoDB
- ✅ **All API endpoints** respond correctly
- ✅ **Fallback mode** available if needed

**The billing system will work regardless!** 🚀 