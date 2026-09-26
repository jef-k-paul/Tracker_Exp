const express = require("express");
const router = express.Router();
const settlementController = require("../controllers/settlementController");
const { authenticateToken } = require("../middlewares/authMiddleware");

// All settlement routes require authentication
router.use(authenticateToken);

router.get("/pending-count", settlementController.getPendingCount);
router.get("/pending", settlementController.getPendingSettlements);
router.post("/initiate", settlementController.initiateSettlement);
router.put("/:id/confirm", settlementController.confirmSettlement);
router.put("/:id/reject", settlementController.rejectSettlement);
router.get("/", settlementController.getSettlements);

module.exports = router;