const express = require("express");
const router = express.Router();
const summaryController = require('../controllers/summaryController');
const { authenticateToken } = require("../middlewares/authMiddleware");

router.use(authenticateToken);
router.get("/", summaryController.getSummary);

module.exports = router;    