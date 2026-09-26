//Creating expense API route
const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/expenseController");
const { authenticateToken } = require("../middlewares/authMiddleware");

// All expense routes require authentication
router.use(authenticateToken);

router.post("/", expenseController.addExpense);
router.get("/all-time-paid", expenseController.getAllTimePaid);
router.get("/all-time-share", expenseController.getAllTimeShare);
router.get("/check-duplicate", expenseController.checkDuplicate);
router.get("/", expenseController.expenses);

module.exports = router;