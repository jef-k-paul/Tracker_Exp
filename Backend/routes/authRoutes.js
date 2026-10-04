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

// Circle Member Management & Leave Flow
router.get("/circles/:circleId/members", authenticateToken, authController.getCircleMembers);
router.delete("/circles/:circleId/members/:memberId", authenticateToken, authController.removeMember);
router.post("/circles/:circleId/leave", authenticateToken, authController.requestLeaveCircle);
router.post("/circles/:circleId/cancel-leave", authenticateToken, authController.cancelLeaveCircle);
router.get("/circles/pending-leaves", authenticateToken, authController.getPendingLeaveRequests);
router.post("/circles/leave-requests/:requestId/approve", authenticateToken, authController.approveLeaveRequest);
router.post("/circles/leave-requests/:requestId/reject", authenticateToken, authController.rejectLeaveRequest);

module.exports = router;