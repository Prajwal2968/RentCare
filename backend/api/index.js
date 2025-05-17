// backend/api/index.js
console.log("--- BACKEND API FUNCTION START ---"); // First log

try {
    // Ensure .env is loaded correctly in different environments
    // For Vercel deployment, variables are injected. For 'vercel dev', this helps.
    if (process.env.NODE_ENV !== 'production') {
        require("dotenv").config({ path: require('path').resolve(process.cwd(), '../.env') }); // Assumes .env is in backend root, one level up from api/
        console.log("dotenv configured for non-production.");
    } else {
        console.log("Running in production-like environment, expecting Vercel env vars.");
    }

    const express = require("express");
    console.log("Express loaded.");
    const cors = require("cors");
    console.log("CORS loaded.");
    const connectDB = require("../config/db"); // Adjust path relative to this api/index.js file
    console.log("DB config loaded.");

    const paymentRoutes = require("../routes/paymentRoutes"); // Adjust path
    console.log("Payment routes loaded.");
    const userRoutes = require("../routes/userRoutes"); // Adjust path
    console.log("User routes loaded.");
    const propertyRoutes = require("../routes/propertyRoutes"); // Adjust path
    console.log("Property routes loaded.");

    const app = express();
    console.log("Express app initialized.");

    console.log("Attempting to connect to DB...");
    connectDB(); 
    // Note: connectDB itself logs success/failure, which you'll see in runtime logs

    // Middlewares
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    console.log("Client URL for CORS:", clientUrl);
    app.use(cors({
      origin: clientUrl,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      credentials: true
    }));
    app.use(express.json());
    console.log("CORS and express.json middleware applied.");

    // API Routes
    app.use("/api/payment", paymentRoutes); 
    app.use("/users", userRoutes);         
    app.use("/properties", propertyRoutes); 
    console.log("API routes mounted.");

    // Test route to see if base app is working
    app.get("/api/ping", (req, res) => { // Note: /api/ping due to rewrite, will be /ping
        console.log("GET /api/ping (rewritten from /ping) received");
        res.status(200).json({ message: "Backend pong!", timestamp: new Date().toISOString() });
    });
    console.log("Test /api/ping route mounted.");


    // Basic error handler
    app.use((err, req, res, next) => {
      console.error("--- UNHANDLED ERROR ---");
      console.error("Error Message:", err.message);
      console.error("Error Stack:", err.stack);
      console.error("Request URL:", req.originalUrl);
      console.error("Request Method:", req.method);
      res.status(err.status || 500).send(err.message || 'Something broke!');
    });
    console.log("Error handler mounted.");

    console.log("--- BACKEND API FUNCTION READY TO EXPORT ---");
    module.exports = app;

} catch (e) {
    console.error("--- FATAL ERROR INITIALIZING API FUNCTION ---");
    console.error(e);
    // If we crash here, Vercel might return a 500 or a 404 if it can't even load the module
    // This module.exports is a fallback if the try block fails before app is defined.
    module.exports = (req, res) => {
        res.status(500).send("Serverless function failed to initialize. Check logs.");
    };
}
