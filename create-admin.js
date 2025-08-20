const { MongoClient } = require('mongodb');

async function createAdmin() {
    const uri = "mongodb://localhost:27017";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db("pahandb");
        const adminCollection = db.collection("admins");

        // Check if admin already exists
        const existingAdmin = await adminCollection.findOne({ username: "admin" });
        if (existingAdmin) {
            console.log("Admin already exists!");
            return;
        }

        // Create admin with BCrypt hashed password
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash("admin123", 10);

        const admin = {
            username: "admin",
            password: hashedPassword,
            name: "System Administrator",
            email: "admin@pahana.com",
            role: "SUPER_ADMIN",
            isActive: true,
            createdAt: new Date(),
            lastLogin: null
        };

        await adminCollection.insertOne(admin);
        console.log("Admin created successfully!");
        console.log("Username: admin");
        console.log("Password: admin123");

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await client.close();
    }
}

createAdmin(); 