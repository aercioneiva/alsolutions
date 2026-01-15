const express = require('express');
const controller = require('../controllers/contract-notification-controller');

const router = express.Router();

router.route('/:contract').post(controller.sendNotification);

module.exports = router;
