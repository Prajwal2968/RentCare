// backend/routes/paymentRoutes.js
const express = require("express");
const router = express.Router();
const Stripe = require("stripe");

router.post("/create-checkout-session", async (req, res) => {
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const { tenant, propertyId } = req.body;

  if (!tenant || !propertyId || !tenant.rentAmount || !tenant.flatNo) {
      return res.status(400).json({ error: "Tenant details, property ID, and rent amount are required." });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: `Rent for Flat ${tenant.flatNo}`,
            },
            // Ensure rentAmount is a number (it is, due to schema change)
            unit_amount: tenant.rentAmount * 100, // Stripe expects amount in smallest currency unit
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/payment-success/${tenant.flatNo}/${propertyId}`,
      cancel_url: `${process.env.CLIENT_URL}/payment-cancelled`,
      // Optionally pass metadata
      metadata: {
        propertyId: propertyId,
        flatNo: tenant.flatNo,
        rentAmount: tenant.rentAmount 
      }
    });

    res.json({ id: session.id });
  } catch (err) {
    console.error("Stripe session creation error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;