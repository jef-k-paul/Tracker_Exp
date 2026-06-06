const express = require("express");
console.log("settelements routes loaded now!!! 123 123 123")
const router = express.Router();
const settlementController = require("../controllers/settlementController");

router.get("/", settlementController.getSettlements);

module.exports = router;