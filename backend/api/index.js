require("dotenv").config({ path: require('path').resolve(process.cwd(), '.env') });
const express = require("express");
const cors = require("cors");
const connectDB = require("../config/db");

const paymentRoutes = require("../routes/paymentRoutes");
const userRoutes = require("../routes/userRoutes");
const propertyRoutes = require("../routes/propertyRoutes");

const app = express();

// Connect to MongoDB
connectDB();

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));
app.use(express.json());

// API Routes
app.use("/api/payment", paymentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/properties", propertyRoutes);

// Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack || err);
  res.status(err.status || 500).send(err.message || 'Something broke!');
});

// ✅ This is needed on Render (or any standard Node server)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
