const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticateToken } = require("../middlewares/authMiddleware");

// Public Auth Endpoints
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/login-key", authController.loginWithKey);
router.get("/generate-key", authController.generateKey);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// Authenticated Profile & Circle Endpoints
router.post("/update-email", authenticateToken, authController.updateEmail);
router.post("/join-circle", authenticateToken, authController.joinCircle);
router.post("/create-circle", authenticateToken, authController.createCircle);
router.post("/switch-circle", authenticateToken, authController.switchCircle);
router.get("/my-circles", authenticateToken, authController.getMyCircles);
router.get("/me", authenticateToken, authController.getMe);

module.exports = router;