const express = require('express');
const controller = require('../controllers/chatwoot-controller');

const router = express.Router();

router.route('/').post(controller.webhook);

module.exports = router;
