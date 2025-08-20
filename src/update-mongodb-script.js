// MongoDB Script to Update Existing Orders with New Fields
// Run this in MongoDB Compass or MongoDB Shell

// Connect to the database
use pahandb;

// Update all existing orders to include the new fields
db.orders.updateMany(
  {}, // Update all documents
  {
    $set: {
      // Add new customer information fields
      firstName: "",
      lastName: "",
      phone: "",
      
      // Add new shipping address fields
      company: "",
      streetAddress: "",
      city: "",
      postalCode: "",
      country: "",
      state: "",
      
      // Ensure these fields exist (they should already be there)
      paymentMethod: "CASH_ON_DELIVERY",
      totalPrice: 1500
    }
  }
);

// Verify the update worked
print("Updated documents count: " + db.orders.countDocuments());

// Show a sample document to verify the structure
print("Sample updated document:");
printjson(db.orders.findOne()); 