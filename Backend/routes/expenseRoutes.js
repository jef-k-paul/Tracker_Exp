//Creating expense API route
const express = require("express");
const route = express.Router();
const expenseController = require("../controllers/expenseController");


router.post("/", expenseController.addExpense);

module.exports = router;