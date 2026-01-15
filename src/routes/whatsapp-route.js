const express = require('express');
const controller = require('../controllers/whatsapp-controller');

const router = express.Router();

router.route('/').post(controller.webhook);
router.route('/').get(controller.webhookConfig);

module.exports = router;
