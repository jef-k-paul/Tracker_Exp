const express = require("express");
const categoryController = require("../controllers/categoryController");
const { authenticateToken } = require("../middlewares/authMiddleware");
const router = express.Router();

router.use(authenticateToken);
router.get("/", categoryController.getCategories);

module.exports = router;