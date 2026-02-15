// packages
import path from "path";
import express from "express";
import dotenv from "dotenv";
dotenv.config();
import cookieParser from "cookie-parser";
import cors from "cors";
// Load env


// Utils
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js"; // ✅ ADD THIS

const port = process.env.PORT || 5000;

connectDB();

const app = express();


// Allow frontend domain
app.use(cors({
  origin: ["https://e-commerce1-nine-theta.vercel.app", "http://localhost:5173"], // Replace with your frontend URL
  credentials: true, // if you use cookies
}));



app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use("/api/users", userRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes); // ✅ ADD THIS



const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname + "/uploads")));

app.listen(port, () =>
  console.log(`Server running on port: ${port}`)
);