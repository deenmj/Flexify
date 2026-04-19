import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import { logAdminAction } from "../utils/auditLogger.js";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Ensure receipts folder exists
const receiptsDir = path.join(process.cwd(), "uploads", "receipts");
if (!fs.existsSync(receiptsDir)) fs.mkdirSync(receiptsDir, { recursive: true });

// Multer for payment receipts
const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, receiptsDir),
  filename: (req, file, cb) => {
    cb(null, `receipt-${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`);
  },
});
const paymentUpload = multer({
  storage: receiptStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only image or PDF files are allowed"), false);
  },
});

/**
 * Request subscription upgrade or renewal
 */
router.post("/subscribe", protect, paymentUpload.single("receipt"), async (req, res) => {
  try {
    const { tier, duration, amount, reference } = req.body;
    if (!['BASIC', 'STANDARD', 'ENTERPRISE'].includes(tier)) {
      return res.status(400).json({ message: "Invalid tier" });
    }
    if (!['MONTHLY', 'BI_ANNUAL'].includes(duration)) {
        return res.status(400).json({ message: "Invalid duration" });
    }
    if (!reference) {
        return res.status(400).json({ message: "Payment reference is required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const receiptPath = req.file ? `/uploads/receipts/${req.file.filename}` : null;

    // Create a pending payment record
    const payment = await Payment.create({
        user: user._id,
        tier,
        duration,
        amount,
        reference,
        status: "pending",
        receiptImage: receiptPath
    });
    
    res.json({ 
      message: `Your payment request for ${tier} (${duration}) has been submitted for verification. Activation takes 2-4 hours.`,
      paymentId: payment._id
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Generate PayHere Parameters for Checkout
 */
router.post("/payhere-params", protect, async (req, res) => {
  try {
    const { tier, duration, amount } = req.body;
    
    // 1. Create a pending payment record
    const payment = await Payment.create({
      user: req.user._id,
      tier,
      duration,
      amount,
      method: "PAYHERE",
      status: "pending",
      reference: `PH_${Date.now()}`
    });

    const merchantId = process.env.PAYHERE_MERCHANT_ID;
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
    const orderId = payment._id.toString();
    const currency = "LKR";

    // Hash calculation: Upper(md5(merchant_id + order_id + amount + currency + Upper(md5(merchant_secret))))
    const hashedSecret = crypto.createHash("md5").update(merchantSecret).digest("hex").toUpperCase();
    const hash = crypto.createHash("md5")
      .update(merchantId + orderId + amount + currency + hashedSecret)
      .digest("hex")
      .toUpperCase();

    res.json({
      merchant_id: merchantId,
      return_url: process.env.PAYHERE_RETURN_URL,
      cancel_url: process.env.PAYHERE_CANCEL_URL,
      notify_url: process.env.PAYHERE_NOTIFY_URL,
      order_id: orderId,
      items: `Rentify ${tier} Subscription (${duration})`,
      currency,
      amount,
      hash,
      payhere_url: process.env.PAYHERE_ENV === 'live' ? 'https://www.payhere.lk/pay/checkout' : 'https://sandbox.payhere.lk/pay/checkout',
      first_name: req.user.name.split(" ")[0],
      last_name: req.user.name.split(" ").slice(1).join(" ") || "User",
      email: req.user.email,
      phone: req.user.phone || "0771234567",
      address: req.user.address || "Sri Lanka",
      city: "Colombo",
      country: "Sri Lanka"
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * PayHere Notify (Webhook)
 * This endpoint is called by PayHere asynchronously
 */
router.post("/payhere-notify", async (req, res) => {
  try {
    const {
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      payment_id
    } = req.body;

    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;

    // Verify Hash: Upper(md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + Upper(md5(merchant_secret))))
    const hashedSecret = crypto.createHash("md5").update(merchantSecret).digest("hex").toUpperCase();
    const localHash = crypto.createHash("md5")
      .update(merchant_id + order_id + payhere_amount + payhere_currency + status_code + hashedSecret)
      .digest("hex")
      .toUpperCase();

    if (localHash !== md5sig) {
      console.error("❌ PayHere Hash Mismatch!");
      return res.status(400).send("Invalid signature");
    }

    const payment = await Payment.findById(order_id).populate("user");
    if (!payment) return res.status(404).send("Order not found");

    if (status_code == "2") { // Success
      if (payment.status !== "approved") {
        payment.status = "approved";
        payment.transactionId = payment_id;
        payment.paidAt = new Date();
        await payment.save();

        const user = await User.findById(payment.user._id);
        const now = new Date();
        let currentEndDate = user.subscription.endDate && user.subscription.endDate > now 
          ? new Date(user.subscription.endDate) 
          : now;
        
        if (payment.duration === "MONTHLY") {
          currentEndDate.setMonth(currentEndDate.getMonth() + 1);
        } else if (payment.duration === "BI_ANNUAL") {
          currentEndDate.setMonth(currentEndDate.getMonth() + 6);
        }

        user.subscription.tier = payment.tier;
        user.subscription.status = "active";
        user.subscription.endDate = currentEndDate;
        const graceDate = new Date(currentEndDate);
        graceDate.setDate(graceDate.getDate() + 5);
        user.subscription.gracePeriodEnd = graceDate;
        await user.save();

        // Real-time notification via Socket.io
        const io = req.app.get("io");
        if (io) {
          io.to(user._id.toString()).emit("subscriptionActivated", {
            tier: payment.tier,
            endDate: currentEndDate
          });
          // Also notify admins
          io.to("admin_room").emit("pendingUpdate", { type: "PAYMENT", status: "auto_approved" });
        }

        console.log(`✅ Subscription Activated Automatically: ${user.email} (Order: ${order_id})`);
      }
    } else if (status_code == "0" || status_code == "-1") {
      payment.status = "pending";
      await payment.save();
    } else if (status_code == "-2") {
      payment.status = "failed";
      await payment.save();
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("PayHere Notify Error:", err.message);
    res.status(500).send(err.message);
  }
});

export default router;
