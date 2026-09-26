const express = require('express');
const memberController = require("../controllers/memberController");
const { authenticateToken } = require("../middlewares/authMiddleware");
const router = express.Router();

router.use(authenticateToken);
router.get("/", memberController.getMembers);

module.exports = router;