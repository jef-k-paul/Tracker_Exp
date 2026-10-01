const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const userRepository = require("../repositories/userRepository");
const circleRepository = require("../repositories/circleRepository");
const memberRepository = require("../repositories/memberRepository");
const emailService = require("./emailService");

// Helper to generate short, crisp, unique Access ID from first name
const generateAccessKeyFromFirstName = async (fullName) => {
  // Extract section before first space, or full name if no space entered
  const rawFirst = (fullName || "").trim().split(/\s+/)[0] || "USER";
  const cleanFirst = rawFirst.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6) || "USER";

  let isUnique = false;
  let attempts = 0;
  let candidate = "";

  while (!isUnique && attempts < 15) {
    attempts++;
    const randNum = Math.floor(100 + Math.random() * 900);
    candidate = `${cleanFirst}-${randNum}`;

    const existingUser = await userRepository.findByAccessKey(candidate);
    const existingMember = await memberRepository.findById(candidate);
    if (!existingUser && !existingMember) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    candidate = `${cleanFirst}-${Date.now().toString().slice(-4)}`;
  }

  return candidate;
};

exports.generateAccessKey = generateAccessKeyFromFirstName;

// 1. User Registration (Individual Account with Personal Access Key)
exports.register = async ({ email, password, name, accessKey }) => {
  const cleanEmail = email?.trim()?.toLowerCase();
  const cleanName = name?.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    throw new Error("A valid email address is mandatory for registration.");
  }
  if (!password || password.length < 4) {
    throw new Error("Password / PIN is mandatory and must be at least 4 characters.");
  }
  if (!cleanName || cleanName.length < 2) {
    throw new Error("Full name is mandatory and must be at least 2 characters.");
  }

  const existing = await userRepository.findByEmail(cleanEmail);
  if (existing) {
    throw new Error("An account with this email already exists. Please log in.");
  }

  // Determine Access Key
  let finalKey = accessKey?.trim()?.toUpperCase();
  if (finalKey) {
    const takenUser = await userRepository.findByAccessKey(finalKey);
    const takenMember = await memberRepository.findById(finalKey);
    if (takenUser || takenMember) {
      throw new Error(`The Access ID "${finalKey}" is already taken. Please click refresh to generate another.`);
    }
  } else {
    finalKey = await generateAccessKeyFromFirstName(cleanName);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = await userRepository.createUser({
    email: cleanEmail,
    passwordHash,
    name: cleanName,
    accessKey: finalKey
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
  const emailRes = await emailService.sendPasswordResetOtp(cleanEmail, otp);

  return {
    simulated: emailRes.simulated,
    otp: emailRes.simulated ? otp : undefined,
    message: emailRes.simulated
      ? `[Dev Mode: Gmail SMTP not configured] Your 6-digit OTP code is: ${otp} (also logged to terminal). To receive real emails, set EMAIL_USER & EMAIL_PASS in Backend/.env.`
      : "A 6-digit reset code has been sent to your email inbox."
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

// 8. Access ID login support (KEY1-KEY4 and custom generated keys)
exports.loginWithKey = async (accessKey) => {
  const cleanKey = accessKey?.trim()?.toUpperCase();
  if (!cleanKey) return null;

  // 1. Try finding in members table (legacy keys like KEY1-KEY4)
  const member = await memberRepository.findById(cleanKey);
  if (member) return member;

  // 2. Try finding in users table by access_key
  const user = await userRepository.findByAccessKey(cleanKey);
  if (user) {
    const circles = await userRepository.getUserCircles(user.user_id);
    const activeCircle = circles[0] || null;
    return {
      member_id: activeCircle?.member_id || null,
      user_id: user.user_id,
      name: activeCircle?.member_name || user.name,
      role: activeCircle?.role || "MEMBER",
      access_key: user.access_key,
      circle_id: activeCircle?.circle_id || null,
      email: user.email,
      circle_name: activeCircle?.circle_name || null,
      family_code: activeCircle?.family_code || null
    };
  }

  return null;
};

// 9. Update Email Address with Identity Verification
exports.updateEmail = async ({ userId, newEmail, confirmEmail, verificationKey }) => {
  const cleanNew = newEmail?.trim()?.toLowerCase();
  const cleanConfirm = confirmEmail?.trim()?.toLowerCase();
  const cleanKey = verificationKey?.trim();

  if (!cleanNew || !cleanNew.includes("@")) {
    throw new Error("Please enter a valid new email address.");
  }
  if (cleanNew !== cleanConfirm) {
    throw new Error("New email and confirm email do not match.");
  }
  if (!cleanKey) {
    throw new Error("Please enter your current password or Access ID for verification.");
  }

  const user = await userRepository.findByIdWithPassword(userId);
  if (!user) {
    throw new Error("User not found.");
  }

  if (user.email.toLowerCase() === cleanNew) {
    throw new Error("New email must be different from your current email.");
  }

  // Verify identity: check password OR check access_key in members table
  let isVerified = false;
  if (user.password_hash) {
    isVerified = await bcrypt.compare(cleanKey, user.password_hash);
  }
  if (!isVerified) {
    const hasKey = await userRepository.checkAccessKey(userId, cleanKey);
    if (hasKey) {
      isVerified = true;
    }
  }

  if (!isVerified) {
    throw new Error("Verification failed: Incorrect password or Access ID.");
  }

  // Check if new email is already used by another account
  const existingUser = await userRepository.findByEmail(cleanNew);
  if (existingUser && existingUser.user_id !== userId) {
    throw new Error("This email is already in use by another account.");
  }

  await userRepository.updateEmail(userId, cleanNew);

  const updatedUser = await userRepository.findById(userId);
  return updatedUser;
};