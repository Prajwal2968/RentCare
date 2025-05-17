// backend/routes/propertyRoutes.js
const express = require("express");
const router = express.Router();
const Property = require("../models/Property");
const mongoose = require('mongoose');

// Middleware to validate MongoDB ObjectId
const validateObjectId = (paramName = 'id') => (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
        return res.status(400).json({ message: `Invalid ${paramName} format` });
    }
    next();
};

// GET all properties
router.get("/", async (req, res) => {
  try {
    const properties = await Property.find(req.query);
    res.json(properties);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new property
router.post("/", async (req, res) => {
  const { name, location, ownerId, tenants = [], maintenanceRequests = [] } = req.body;

  if (!name || !location) {
    return res.status(400).json({ message: "Property name and location are required." });
  }

  const newProperty = new Property({ name, location, ownerId, tenants, maintenanceRequests });

  try {
    const savedProperty = await newProperty.save();
    res.status(201).json(savedProperty);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET a specific property by ID
router.get("/:id", validateObjectId('id'), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: "Property not found" });
    res.json(property);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT (update) a property by ID
router.put("/:id", validateObjectId('id'), async (req, res) => {
  try {
    const updateData = req.body;

    const updatedProperty = await Property.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedProperty) return res.status(404).json({ message: "Property not found" });

    res.json(updatedProperty);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE a property by ID
router.delete("/:id", validateObjectId('id'), async (req, res) => {
  try {
    const deletedProperty = await Property.findByIdAndDelete(req.params.id);
    if (!deletedProperty) return res.status(404).json({ message: "Property not found" });

    res.json({ message: "Property deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update tenant payment status after payment (used by PaymentSuccess component)
router.put("/:propertyId/tenants/:tenantFlatNo/payment-success", validateObjectId('propertyId'), async (req, res) => {
  const { propertyId, tenantFlatNo } = req.params;
  const { rentAmount } = req.body;

  try {
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ error: "Property not found" });

    const tenant = property.tenants.find(t => t.flatNo === tenantFlatNo);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const paymentDate = new Date().toISOString().split("T")[0];
    tenant.paymentStatus = "Paid";
    tenant.lastNotify = paymentDate;
    tenant.paymentHistory.push({
      amount: Number(rentAmount),
      date: paymentDate,
      status: "Paid"
    });

    await property.save();

    res.json({ message: "Payment status updated successfully", tenant: tenant.toJSON() });
  } catch (error) {
    console.error("Error updating payment status in DB:", error);
    res.status(500).json({ error: "Failed to update payment status: " + error.message });
  }
});

module.exports = router;
