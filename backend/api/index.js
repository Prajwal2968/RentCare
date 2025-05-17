// backend/api/index.js
require("dotenv").config({ path: require('path').resolve(process.cwd(), '.env') }); // Ensure .env is loaded relative to project root
const express = require("express");
const cors = require("cors");
const connectDB = require("../config/db"); // Adjust path relative to this api/index.js file

const paymentRoutes = require("../routes/paymentRoutes"); // Adjust path
const userRoutes = require("../routes/userRoutes");         // Adjust path
const propertyRoutes = require("../routes/propertyRoutes"); // Adjust path

const app = express();

// Connect to MongoDB - Call it once
connectDB();

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));
app.use(express.json());

// API Routes - IMPORTANT: Vercel will route all requests starting with /api/ to this function.
// So your frontend should call, e.g., your-backend.vercel.app/api/users
// OR you set up rewrites in vercel.json for the backend.
app.use("/api/payment", paymentRoutes); // Will be accessible via /api/payment
app.use("/users", userRoutes);         // Will be accessible via /api/users (if this file is api/index.js)
app.use("/properties", propertyRoutes); // Will be accessible via /api/properties

// If you want routes like /users instead of /api/users when calling from frontend,
// you'll need rewrites in the backend's vercel.json (see step 2).

// Basic error handler
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack || err);
  res.status(err.status || 500).send(err.message || 'Something broke!');
});

// Export the app for Vercel
module.exports = app;