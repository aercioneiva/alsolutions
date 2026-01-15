const express = require('express');
const controller = require('../controllers/send-message-controller');

const router = express.Router();

router.route('/:contract').get(controller.sendMessage);

module.exports = router;
