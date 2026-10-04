const jwt = require("jsonwebtoken");
const authService = require("../services/authServices");
const userRepository = require("../repositories/userRepository");
const { JWT_SECRET } = require("../middlewares/authMiddleware");

const buildUserPayload = (user, activeCircle) => {
  return {
    userId: user.userId || user.user_id,
    email: user.email,
    name: activeCircle?.member_name || user.name,
    accessKey: user.accessKey || user.access_key || activeCircle?.access_key || null,
    access_key: user.accessKey || user.access_key || activeCircle?.access_key || null,
    memberId: activeCircle?.member_id || null,
    member_id: activeCircle?.member_id || null,
    role: activeCircle?.role || "MEMBER",
    circleId: activeCircle?.circle_id || null,
    circle_id: activeCircle?.circle_id || null,
    circleName: activeCircle?.circle_name || null,
    circle_name: activeCircle?.circle_name || null,
    familyCode: activeCircle?.family_code || null,
    family_code: activeCircle?.family_code || null
  };
};

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "3d" });
};

// 1. Individual User Registration
exports.register = async (req, res) => {
  try {
    const { email, password, name, accessKey } = req.body;
    const user = await authService.register({ email, password, name, accessKey });

    const payload = buildUserPayload(user, null);
    const token = generateToken(payload);

    res.status(201).json({
      message: "Account registered successfully!",
      token,
      user: payload,
      circles: [],
      activeCircle: null
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(400).json({ message: err.message || "Registration failed." });
  }
};

// 2. Individual User Login
exports.login = async (req, res) => {
  try {
    if (req.body.accessKey && !req.body.email) {
      return exports.loginWithKey(req, res);
    }

    const { email, password, circleId } = req.body;
    const { user, circles, activeCircle } = await authService.loginWithCredentials({
      email,
      password,
      circleId
    });

    const payload = buildUserPayload(user, activeCircle);
    const token = generateToken(payload);

    res.json({
      message: "Login successful!",
      token,
      user: payload,
      circles,
      activeCircle
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(401).json({ message: err.message || "Invalid credentials." });
  }
};

// 3. Request Password Reset OTP (Nodemailer Gmail SMTP)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await authService.requestPasswordReset(email);
    res.json(result);
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(400).json({ message: err.message || "Failed to process reset request." });
  }
};

// 4. Reset Password with 6-Digit OTP
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const result = await authService.resetPasswordWithOtp({ email, otp, newPassword });
    res.json(result);
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(400).json({ message: err.message || "Failed to reset password." });
  }
};

// 5. Join a Circle using Invite Code
exports.joinCircle = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { familyCode, memberName } = req.body;

    const result = await authService.joinCircle({
      userId,
      familyCode,
      memberName
    });

    const user = await userRepository.findById(userId);
    const payload = buildUserPayload(user, result.activeCircle);
    const token = generateToken(payload);

    res.json({
      message: result.message,
      token,
      user: payload,
      circles: result.circles,
      activeCircle: result.activeCircle
    });
  } catch (err) {
    console.error("Join circle error:", err);
    res.status(400).json({ message: err.message || "Failed to join circle." });
  }
};

// 6. Create a New Circle
exports.createCircle = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { circleName, memberName } = req.body;

    const result = await authService.createCircleForUser({
      userId,
      circleName,
      memberName
    });

    const user = await userRepository.findById(userId);
    const payload = buildUserPayload(user, result.activeCircle);
    const token = generateToken(payload);

    res.status(201).json({
      message: result.message,
      token,
      user: payload,
      circles: result.circles,
      activeCircle: result.activeCircle
    });
  } catch (err) {
    console.error("Create circle error:", err);
    res.status(400).json({ message: err.message || "Failed to create circle." });
  }
};

// 7. Switch Active Circle
exports.switchCircle = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { circleId } = req.body;

    const circles = await authService.getUserCircles(userId);
    const selectedCircle = circles.find((c) => c.circle_id === Number(circleId));

    if (!selectedCircle) {
      return res.status(403).json({ message: "You are not a member of this circle." });
    }

    const user = await userRepository.findById(userId);
    const payload = buildUserPayload(user, selectedCircle);
    const token = generateToken(payload);

    res.json({
      message: `Switched to ${selectedCircle.circle_name}`,
      token,
      user: payload,
      circles,
      activeCircle: selectedCircle
    });
  } catch (err) {
    console.error("Switch circle error:", err);
    res.status(400).json({ message: err.message || "Failed to switch circle." });
  }
};

// 8. Get User's Circles
exports.getMyCircles = async (req, res) => {
  try {
    const userId = req.user.userId;
    const circles = await authService.getUserCircles(userId);
    res.json({ circles });
  } catch (err) {
    console.error("Get circles error:", err);
    res.status(500).json({ message: "Failed to retrieve circles." });
  }
};

// 9. Legacy Access Key Login (KEY1-KEY4 test fallback)
exports.loginWithKey = async (req, res) => {
  try {
    const accessKey = req.body.accessKey;
    if (!accessKey) {
      return res.status(400).json({ message: "Personal Access ID is required." });
    }

    const member = await authService.loginWithKey(accessKey);
    if (!member) {
      return res.status(401).json({ message: "Invalid Access ID." });
    }

    if (!member.email) {
      return res.status(400).json({ message: "No email address found for this account. Email registration is mandatory." });
    }

    const payload = {
      userId: member.user_id || member.member_id,
      email: member.email,
      name: member.name,
      memberId: member.member_id,
      member_id: member.member_id,
      role: member.role,
      circleId: member.circle_id || 1,
      circle_id: member.circle_id || 1,
      circleName: member.circle_name || "Paul Family",
      circle_name: member.circle_name || "Paul Family",
      familyCode: member.family_code || "PAUL-101",
      family_code: member.family_code || "PAUL-101"
    };

    const token = generateToken(payload);

    res.json({
      token,
      user: payload,
      circles: [
        {
          circle_id: member.circle_id || 1,
          circle_name: member.circle_name || "Paul Family",
          family_code: member.family_code || "PAUL-101",
          member_id: member.member_id,
          role: member.role,
          member_name: member.name
        }
      ],
      activeCircle: {
        circle_id: member.circle_id || 1,
        circle_name: member.circle_name || "Paul Family",
        family_code: member.family_code || "PAUL-101",
        member_id: member.member_id,
        role: member.role,
        member_name: member.name
      }
    });
  } catch (err) {
    console.error("Legacy login error:", err);
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
};

// 10. Update Email Address with Identity Verification
exports.updateEmail = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const { newEmail, confirmEmail, verificationKey } = req.body;
    const updatedUser = await authService.updateEmail({
      userId,
      newEmail,
      confirmEmail,
      verificationKey
    });

    // Rebuild updated user payload and new token
    const circles = await authService.getUserCircles(userId);
    const activeCircle = circles.find((c) => c.circle_id === Number(req.user.circleId)) || circles[0] || null;
    const payload = buildUserPayload(updatedUser, activeCircle);
    const token = generateToken(payload);

    res.json({
      message: "Email updated successfully!",
      token,
      user: payload
    });
  } catch (err) {
    console.error("Update email error:", err.message);
    res.status(400).json({ message: err.message || "Failed to update email." });
  }
};

// 11. Get Current User Profile (Fresh from DB)
exports.getMe = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const circles = await authService.getUserCircles(userId);
    const activeCircleId = req.user?.circleId;
    const activeCircle = circles.find((c) => c.circle_id === Number(activeCircleId)) || circles[0] || null;

    const payload = buildUserPayload(user, activeCircle);
    const token = generateToken(payload);

    res.json({
      user: payload,
      circles,
      activeCircle,
      token
    });
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ message: "Failed to retrieve user profile." });
  }
};

// 12. Generate unique Access ID preview from name
exports.generateKey = async (req, res) => {
  try {
    const { name } = req.query;
    const key = await authService.generateAccessKey(name);
    res.json({ accessKey: key });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate key" });
  }
};

// 13. Get circle members (with first names and leave status)
exports.getCircleMembers = async (req, res) => {
  try {
    const { circleId } = req.params;
    const requestingUserId = req.user.userId;
    const members = await authService.getCircleMembers(circleId, requestingUserId);
    res.json({ members });
  } catch (err) {
    console.error("Get circle members error:", err.message);
    res.status(400).json({ message: err.message || "Failed to load circle members." });
  }
};

// 14. Admin removes a circle member directly
exports.removeMember = async (req, res) => {
  try {
    const { circleId, memberId } = req.params;
    const requestingUserId = req.user.userId;

    const result = await authService.removeCircleMember({
      circleId,
      memberId,
      requestingUserId
    });

    res.json(result);
  } catch (err) {
    console.error("Remove circle member error:", err.message);
    res.status(400).json({ message: err.message || "Failed to remove member." });
  }
};

// 15. Member requests to leave a circle
exports.requestLeaveCircle = async (req, res) => {
  try {
    const { circleId } = req.params;
    const requestingUserId = req.user.userId;

    const result = await authService.requestLeaveCircle({
      circleId,
      requestingUserId
    });

    res.json(result);
  } catch (err) {
    console.error("Request leave circle error:", err.message);
    res.status(400).json({ message: err.message || "Failed to submit leave request." });
  }
};

// 16. Member cancels pending leave request
exports.cancelLeaveCircle = async (req, res) => {
  try {
    const { circleId } = req.params;
    const requestingUserId = req.user.userId;

    const result = await authService.cancelLeaveCircle({
      circleId,
      requestingUserId
    });

    res.json(result);
  } catch (err) {
    console.error("Cancel leave circle error:", err.message);
    res.status(400).json({ message: err.message || "Failed to cancel leave request." });
  }
};

// 17. Admin gets pending leave requests across circles
exports.getPendingLeaveRequests = async (req, res) => {
  try {
    const adminUserId = req.user.userId;
    const requests = await authService.getPendingLeaveRequests(adminUserId);
    res.json({ requests });
  } catch (err) {
    console.error("Get pending leave requests error:", err.message);
    res.status(500).json({ message: "Failed to retrieve pending leave requests." });
  }
};

// 18. Admin approves member leave request
exports.approveLeaveRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const requestingUserId = req.user.userId;

    const result = await authService.approveLeaveRequest({
      requestId,
      requestingUserId
    });

    res.json(result);
  } catch (err) {
    console.error("Approve leave request error:", err.message);
    res.status(400).json({ message: err.message || "Failed to approve leave request." });
  }
};

// 19. Admin rejects member leave request
exports.rejectLeaveRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const requestingUserId = req.user.userId;

    const result = await authService.rejectLeaveRequest({
      requestId,
      requestingUserId
    });

    res.json(result);
  } catch (err) {
    console.error("Reject leave request error:", err.message);
    res.status(400).json({ message: err.message || "Failed to reject leave request." });
  }
};