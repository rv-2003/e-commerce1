import express from "express";
import Razorpay from "razorpay";

const router = express.Router();

router.post("/create-order", async (req, res) => {
  try {
    console.log("✅ /create-order called");
    console.log("Request body:", req.body);

    const { amount } = req.body;

    if (!amount || amount <= 0) {
      console.error("❌ Invalid amount:", amount);
      return res.status(400).json({ message: "Invalid amount" });
    }

    // ✅ Create Razorpay instance INSIDE route
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("❌ Razorpay keys not set in environment variables");
      return res.status(500).json({ message: "Razorpay keys not configured" });
    }

    console.log("Razorpay Key ID:", process.env.RAZORPAY_KEY_ID);

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: amount * 100, // amount in paise
      currency: "INR",
    };

    console.log("Creating Razorpay order with options:", options);

    const order = await razorpay.orders.create(options);

    console.log("✅ Razorpay order created:", order);

    res.json(order);
  } catch (error) {
    console.error("❌ Error in /create-order:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;