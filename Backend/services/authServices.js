const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const userRepository = require("../repositories/userRepository");
const circleRepository = require("../repositories/circleRepository");
const memberRepository = require("../repositories/memberRepository");
const emailService = require("./emailService");

// 1. User Registration (Individual Account)
exports.register = async ({ email, password, name }) => {
  const cleanEmail = email?.trim()?.toLowerCase();
  const cleanName = name?.trim();

  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("Please provide a valid email address.");
  }
  if (!password || password.length < 4) {
    throw new Error("Password / PIN must be at least 4 characters.");
  }
  if (!cleanName || cleanName.length < 2) {
    throw new Error("Full name must be at least 2 characters.");
  }

  const existing = await userRepository.findByEmail(cleanEmail);
  if (existing) {
    throw new Error("An account with this email already exists. Please log in.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = await userRepository.createUser({
    email: cleanEmail,
    passwordHash,
    name: cleanName
  });

  const newUser = await userRepository.findById(userId);
  return newUser;
};

// 2. User Login (Email + Password / PIN)
exports.loginWithCredentials = async ({ email, password, circleId }) => {
  const cleanEmail = email?.trim()?.toLowerCase();

  if (!cleanEmail || !password) {
    throw new Error("Please enter both email and password / PIN.");
  }

  const user = await userRepository.findByEmail(cleanEmail);
  if (!user) {
    throw new Error("Invalid email or password.");
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new Error("Invalid email or password.");
  }

  // Get all circles user is part of
  const circles = await userRepository.getUserCircles(user.user_id);

  // Pick active circle
  let activeCircle = null;
  if (circleId) {
    activeCircle = circles.find((c) => c.circle_id === Number(circleId)) || null;
  }
  if (!activeCircle && circles.length > 0) {
    activeCircle = circles[0];
  }

  return {
    user: {
      userId: user.user_id,
      email: user.email,
      name: user.name
    },
    circles,
    activeCircle
  };
};

// 3. Forgot Password / Request OTP
exports.requestPasswordReset = async (email) => {
  const cleanEmail = email?.trim()?.toLowerCase();
  if (!cleanEmail) {
    throw new Error("Please provide your email address.");
  }

  const user = await userRepository.findByEmail(cleanEmail);
  if (!user) {
    throw new Error("No account found with this email address.");
  }

  // Generate 6-digit random OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await userRepository.setResetOtp(user.user_id, otp, expiresAt);

  // Send email (or dev log)
  await emailService.sendPasswordResetOtp(cleanEmail, otp);

  return {
    message: "A 6-digit reset code has been sent to your email."
  };
};

// 4. Reset Password with OTP
exports.resetPasswordWithOtp = async ({ email, otp, newPassword }) => {
  const cleanEmail = email?.trim()?.toLowerCase();
  const cleanOtp = otp?.trim();

  if (!cleanEmail || !cleanOtp || !newPassword) {
    throw new Error("Email, reset code, and new password are required.");
  }
  if (newPassword.length < 4) {
    throw new Error("New password / PIN must be at least 4 characters.");
  }

  const user = await userRepository.findByEmail(cleanEmail);
  if (!user) {
    throw new Error("Invalid request. User not found.");
  }

  if (!user.reset_otp || user.reset_otp !== cleanOtp) {
    throw new Error("Invalid or incorrect reset code.");
  }

  if (new Date() > new Date(user.reset_otp_expires)) {
    throw new Error("Reset code has expired. Please request a new one.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await userRepository.updatePassword(user.user_id, passwordHash);

  return {
    message: "Password reset successful! You can now log in with your new password."
  };
};

// 5. Join a Circle using Invite Code (Family Code)
exports.joinCircle = async ({ userId, familyCode, memberName }) => {
  const cleanCode = familyCode?.trim()?.toUpperCase();
  if (!cleanCode) {
    throw new Error("Please enter an Invite Code.");
  }

  const circle = await circleRepository.getCircleByFamilyCode(cleanCode);
  if (!circle) {
    throw new Error("No Circle found with this Invite Code. Please check the code.");
  }

  const existingMember = await circleRepository.findMembership(circle.circle_id, userId);
  if (existingMember) {
    throw new Error(`You are already a member of ${circle.name}.`);
  }

  const user = await userRepository.findById(userId);
  const displayName = memberName?.trim() || user?.name || "Member";

  const memberId = await circleRepository.addMemberToCircle({
    circleId: circle.circle_id,
    userId,
    name: displayName,
    role: "MEMBER"
  });

  const updatedCircles = await userRepository.getUserCircles(userId);
  const activeCircle = updatedCircles.find((c) => c.circle_id === circle.circle_id);

  return {
    message: `Successfully joined ${circle.name}!`,
    circles: updatedCircles,
    activeCircle
  };
};

// 6. Create a New Circle
exports.createCircleForUser = async ({ userId, circleName, memberName }) => {
  const cleanCircle = circleName?.trim();
  if (!cleanCircle || cleanCircle.length < 2) {
    throw new Error("Circle name must be at least 2 characters.");
  }

  const user = await userRepository.findById(userId);
  const displayName = memberName?.trim() || user?.name || "Admin";

  // Generate unique family_code
  const prefix = cleanCircle.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "FAM";
  let familyCode = "";
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const candidate = `${prefix}-${randNum}`;
    const existing = await circleRepository.getCircleByFamilyCode(candidate);
    if (!existing) {
      familyCode = candidate;
      isUnique = true;
    }
  }

  if (!isUnique) {
    familyCode = `${prefix}-${Date.now().toString().slice(-4)}`;
  }

  const circleId = await circleRepository.createCircle({
    name: cleanCircle,
    familyCode,
    createdBy: userId
  });

  await circleRepository.addMemberToCircle({
    circleId,
    userId,
    name: displayName,
    role: "ADMIN"
  });

  const updatedCircles = await userRepository.getUserCircles(userId);
  const activeCircle = updatedCircles.find((c) => c.circle_id === circleId);

  return {
    message: `Circle "${cleanCircle}" created successfully!`,
    familyCode,
    circles: updatedCircles,
    activeCircle
  };
};

// 7. Get Circles for User
exports.getUserCircles = async (userId) => {
  return await userRepository.getUserCircles(userId);
};

// 8. Legacy login support for test keys (KEY1-KEY4)
exports.loginWithKey = async (accessKey) => {
  const member = await memberRepository.findById(accessKey);
  return member;
};