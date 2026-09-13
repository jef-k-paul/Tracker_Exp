//Creating expense API route
const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/expenseController");


router.post("/", expenseController.addExpense);
router.get("/check-duplicate", expenseController.checkDuplicate);
router.get("/", expenseController.expenses);

module.exports = router;