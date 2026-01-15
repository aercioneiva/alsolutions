const express = require('express');
const controller = require('../controllers/contact-controller');

const router = express.Router();

router.route('/:number/:contract').get(controller.getContact);
router.route('/').post(controller.createContact);

module.exports = router;
