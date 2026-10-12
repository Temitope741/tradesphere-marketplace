// controllers/webhook.controller.js
const Order = require('../models/Order.model');
const { verifyNombaSignature } = require('../utils/nomba');

// @desc    Handle Nomba webhook events
// @route   POST /api/webhooks/nomba
// @access  Public (verified via signature, not auth token)
exports.handleNombaWebhook = async (req, res) => {
  try {
    const isValid = verifyNombaSignature(req.body, req.headers);

    if (!isValid) {
      console.warn('Nomba webhook: invalid signature, rejecting request');
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const { event_type, data } = req.body;
    console.log(`📩 Nomba webhook received: ${event_type}`);

    if (event_type === 'payment_success') {
      // Confirmed via Nomba's "Fetch checkout transaction" schema: the order
      // object's orderReference field echoes back exactly what we sent when
      // creating the checkout. merchantTxRef is kept as a fallback only.
      const reference = data?.order?.orderReference || data?.transaction?.merchantTxRef;

      if (!reference) {
        console.warn('Nomba webhook: payment_success with no matching reference', data);
        return res.status(200).json({ success: true }); // ack anyway, nothing to do
      }

      const result = await Order.updateMany(
        { paymentReference: reference, paymentStatus: { $ne: 'paid' } },
        { paymentStatus: 'paid' }
      );

      console.log(`✅ Nomba webhook: marked ${result.modifiedCount} order(s) paid for ref ${reference}`);
    }

    // Acknowledge quickly regardless of event type — Nomba retries on
    // non-2xx responses, so always return 200 once signature is verified.
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Nomba webhook error:', error);
    // Return 200 even on internal errors, once past signature verification,
    // to avoid endless retries. Flip to 500 temporarily if you want retries
    // while actively debugging.
    res.status(200).json({ success: false });
  }
};