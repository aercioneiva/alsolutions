const express = require('express');
const router = express.Router();

const contactRoutes = require('./contact-route');
const sendMessageRoutes = require('./send-message-route');
const companyRoutes = require('./company-route');
const chargeNotificationRoutes = require('./charge-notification-route');
const contractNotificationRoutes = require('./contract-notification-route');
const whatsappRoutes = require('./whatsapp-route');
const chatwootRoutes = require('./chatwoot-route');

router.use('/v1/contact', contactRoutes);
router.use('/v1/company', companyRoutes);
router.use('/v1/send-message', sendMessageRoutes);
router.use('/v1/charge-notification', chargeNotificationRoutes);
router.use('/v1/contract-notification', contractNotificationRoutes);
router.use('/v1/whatsapp-webhook', whatsappRoutes);
router.use('/v1/chatwoot-webhook', chatwootRoutes);

module.exports = router;
