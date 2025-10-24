const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


exports.createOrder = async (req, res) => {
    try {
        const { amount, currency } = req.body;

        const options = {
            amount: amount * 100,
            currency: currency || "INR",
            receipt: "receipt_order_" + Date.now(),
            payment_capture: 1,
        };

        const order = await razorpay.orders.create(options);
        res.status(200).json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
        });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ success: false, message: "Something went wrong!" });
    }
};


exports.verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = req.body;

        const generated_signature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (generated_signature === razorpay_signature) {

            res.status(200).json({ success: true, message: "Payment verified successfully!" });
        } else {
            res.status(400).json({ success: false, message: "Payment verification failed!" });
        }
    } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


exports.refundPayment = async (req, res) => {
    try {
        const { payment_id, amount } = req.body;

        const refund = await razorpay.payments.refund(payment_id, {
            amount: amount * 100,
        });

        res.status(200).json({ success: true, message: "Refund initiated successfully!", refund });
    } catch (error) {
        console.error("Error initiating refund:", error);
        res.status(500).json({ success: false, message: "Something went wrong with the refund!" });
    }
};