// backend/server.js
require("dotenv").config(); // Load .env variables
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const paymentRoutes = require("./routes/paymentRoutes");
const userRoutes = require("./routes/userRoutes");
const propertyRoutes = require("./routes/propertyRoutes");

const app = express();

// Connect to MongoDB
connectDB();

// Middlewares
app.use(cors({ // Configure CORS more restrictively for production
  origin: process.env.CLIENT_URL || "http://localhost:3000", // Allow requests from your frontend
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));
app.use(express.json()); // To parse JSON request bodies

// API Routes
app.use("/api/payment", paymentRoutes);
app.use("/users", userRoutes);         // e.g., http://localhost:5001/users
app.use("/properties", propertyRoutes); // e.g., http://localhost:5001/properties

// Basic error handler (optional, can be more sophisticated)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});