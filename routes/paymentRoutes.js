const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { createOrder, verifyPayment, refundPayment } = require('../controller/paymentController');

router.get('/check-routes', ()=>console.log("payment route"));
router.post('/create-order', authMiddleware, createOrder);
router.post('/verify-payment', authMiddleware, verifyPayment);
router.post('/refund', authMiddleware, refundPayment);

module.exports = router;