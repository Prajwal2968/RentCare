// backend/routes/userRoutes.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const mongoose = require('mongoose');

// GET all users (e.g., for AdminPanel to list owners)
router.get("/", async (req, res) => {
  try {
    const users = await User.find(req.query); // Allows filtering like /users?role=owner
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new user (e.g., Admin adds an owner)
router.post("/", async (req, res) => {
  const { role, email, password } = req.body;
  if (!role || !email || !password) {
    return res.status(400).json({ message: "Role, email, and password are required." });
  }
  // Add password hashing here in a real app
  const newUser = new User({ role, email, password });
  try {
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (err) {
    if (err.code === 11000) { // Duplicate email
        return res.status(400).json({ message: "Email already exists." });
    }
    res.status(400).json({ message: err.message });
  }
});

// GET a specific user by ID
router.get("/:id", async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid user ID format' });
    }
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT (update) a user by ID
router.put("/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid user ID format' });
  }
  try {
    const { email, password, role } = req.body;
    const updateData = {};
    if (email) updateData.email = email;
    if (password) updateData.password = password; // Re-hash if password changes!
    if (role) updateData.role = role;

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!updatedUser) return res.status(404).json({ message: "User not found" });
    res.json(updatedUser);
  } catch (err) {
    if (err.code === 11000) {
        return res.status(400).json({ message: "Email already exists for another user." });
    }
    res.status(400).json({ message: err.message });
  }
});

// DELETE a user by ID
router.delete("/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid user ID format' });
  }
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;