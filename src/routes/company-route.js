const express = require('express');
const controller = require('../controllers/company-controller');

const router = express.Router();

router.route('/').post(controller.createCompany);
router.route('/').put(controller.updateCompany);

module.exports = router;
