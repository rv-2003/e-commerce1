import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";

import crypto from "crypto";
// Utility Function
function calcPrices(orderItems) {
  const itemsPrice = orderItems.reduce(
    (acc, item) => acc + item.price * item.qty,
    0
  );

  const shippingPrice = itemsPrice > 1000 ? 0 : 50;
  const taxRate = 0.18;
  const taxPrice = (itemsPrice * taxRate).toFixed(2);

  const totalPrice = (
    itemsPrice +
    shippingPrice +
    parseFloat(taxPrice)
  ).toFixed(2);

  return {
    itemsPrice: itemsPrice.toFixed(2),
    shippingPrice: shippingPrice.toFixed(2),
    taxPrice,
    totalPrice,
  };
}

const createOrder = async (req, res) => {
  try {
    const { orderItems, shippingAddress, paymentMethod } = req.body;
    console.log("Payment Method:", paymentMethod);

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: "No order items" });
    }

    // Fetch products from DB using 'product' field
    const itemsFromDB = await Product.find({
      _id: { $in: orderItems.map((x) => x.product) },
    });

    const dbOrderItems = orderItems.map((itemFromClient) => {
      const matchingItemFromDB = itemsFromDB.find(
        (itemFromDB) => itemFromDB._id.toString() === itemFromClient.product
      );

      if (!matchingItemFromDB) {
        throw new Error(`Product not found: ${itemFromClient.product}`);
      }

      return {
        name: matchingItemFromDB.name,
        qty: itemFromClient.qty,
        price: matchingItemFromDB.price,
        image: matchingItemFromDB.image,
        product: matchingItemFromDB._id,
      };
    });

    const { itemsPrice, taxPrice, shippingPrice, totalPrice } = calcPrices(dbOrderItems);

    const order = new Order({
      orderItems: dbOrderItems,
      user: req.user._id, // ensure auth middleware is used
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    });

    const createdOrder = await order.save();
    res.status(201).json(createdOrder);
  } catch (error) {
    console.error("❌ createOrder error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).populate("user", "id username");
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const countTotalOrders = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    res.json({ totalOrders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const calculateTotalSales = async (req, res) => {
  try {
    const orders = await Order.find();
    const totalSales = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    res.json({ totalSales });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const calcualteTotalSalesByDate = async (req, res) => {
  try {
    const salesByDate = await Order.aggregate([
      {
        $match: {
          isPaid: true,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$paidAt" },
          },
          totalSales: { $sum: "$totalPrice" },
        },
      },
    ]);

    res.json(salesByDate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const findOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "username email"
    );

    if (order) {
      res.json(order);
    } else {
      res.status(404);
      throw new Error("Order not found");
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const markOrderAsPaid = async (req, res) => {
  try {
    
    console.log("✅ markOrderAsPaid called for order:", req.params.id);

    const order = await Order.findById(req.params.id);

    if (!order) {
      console.error("❌ Order not found");
      return res.status(404).json({ message: "Order not found" });
    }

    console.log("Order found:", order._id, "isPaid:", order.isPaid);

    if (order.isPaid) {
      console.warn("⚠️ Order already paid");
      return res.status(400).json({ message: "Order already paid" });
    }

    console.log("Request body:", req.body);

    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      console.error("❌ Missing Razorpay payment details");
      return res.status(400).json({ message: "Missing payment details" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    console.log("String to verify signature:", body);

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    console.log("Expected signature:", expectedSignature);
    console.log("Received signature:", razorpay_signature);

    if (expectedSignature !== razorpay_signature) {
      console.error("❌ Invalid payment signature");
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    console.log("✅ Payment signature verified");

    // Mark order as paid
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentMethod = "Razorpay";

    order.paymentResult = {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    };

    // Reduce stock
    console.log("Reducing stock for order items...");
    for (const item of order.orderItems) {
      const product = await Product.findById(item.product);
      if (product) {
        console.log(
          `Product ${product._id} stock before: ${product.countInStock}, qty ordered: ${item.qty}`
        );
        product.countInStock -= item.qty;
        await product.save();
        console.log(`Product ${product._id} stock after: ${product.countInStock}`);
      } else {
        console.warn(`⚠️ Product not found: ${item.product}`);
      }
    }

    const updatedOrder = await order.save();
    console.log("✅ Order marked as paid:", updatedOrder._id);

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error("❌ markOrderAsPaid error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

const markOrderAsDelivered = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isDelivered = true;
      order.deliveredAt = Date.now();

      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404);
      throw new Error("Order not found");
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export {
  createOrder,
  getAllOrders,
  getUserOrders,
  countTotalOrders,
  calculateTotalSales,
  calcualteTotalSalesByDate,
  findOrderById,
  markOrderAsPaid,
  markOrderAsDelivered,
};
