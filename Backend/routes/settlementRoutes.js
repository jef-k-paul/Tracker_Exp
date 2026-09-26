const express = require("express");
const router = express.Router();
const settlementController = require("../controllers/settlementController");
const { authenticateToken } = require("../middlewares/authMiddleware");

router.use(authenticateToken);
router.get("/", settlementController.getSettlements);

module.exports = router;