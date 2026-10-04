import React, { Component } from "react";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Box,
  Tabs,
  Tab,
  InputAdornment,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  Tooltip
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import GroupsIcon from "@mui/icons-material/Groups";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  loginWithCredentials,
  login as loginWithKey,
  registerUser,
  forgotPassword,
  resetPassword,
  joinCircle,
  createCircle
} from "../../services/apiServices";

class LoginPage extends Component {
  constructor(props) {
    super(props);

    this.state = {
      // 0: Access Key (Default Landing), 1: Email Sign In
      activeTab: 0,
      showRegister: false,
      showReset: false,

      // Form inputs
      email: "",
      password: "",
      name: "",
      showPassword: false,
      accessKey: "",
      registerAccessKey: "",
      userEditedKey: false,

      // Password Reset with OTP
      otpSent: false,
      otpCode: "",
      newPassword: "",
      showNewPassword: false,

      // Post-auth Circle Onboarding (if user has 0 circles)
      showCircleModal: false,
      circleModalTab: 0, // 0: Join Circle, 1: Create Circle
      familyCodeToJoin: "",
      circleNameToCreate: "",
      authUserData: null,

      // UI states
      loading: false,
      error: "",
      successMsg: ""
    };
  }

  componentDidMount() {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && (user.member_id || user.memberId || user.userId)) {
          window.location.href = "/dashboard";
        }
      } catch (e) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }
  }

  handleTabChange = (event, newValue) => {
    this.setState({
      activeTab: newValue,
      showRegister: false,
      showReset: false,
      error: "",
      successMsg: ""
    });
  };

  handleOpenRegister = () => {
    this.setState({
      showRegister: true,
      showReset: false,
      error: "",
      successMsg: ""
    });
  };

  handleOpenResetTab = () => {
    this.setState({
      showReset: true,
      showRegister: false,
      error: "",
      successMsg: ""
    });
  };

  handleBackToLogin = () => {
    this.setState({
      showRegister: false,
      showReset: false,
      error: "",
      successMsg: ""
    });
  };

  handleChange = (field) => (event) => {
    this.setState({ [field]: event.target.value });
  };

  handleToggleShowPassword = () => {
    this.setState((prev) => ({ showPassword: !prev.showPassword }));
  };

  handleToggleShowNewPassword = () => {
    this.setState((prev) => ({ showNewPassword: !prev.showNewPassword }));
  };

  // Process login success
  handleAuthSuccess = (data) => {
    localStorage.setItem("user", JSON.stringify(data.user || data));
    if (data.token) {
      localStorage.setItem("token", data.token);
    }

    // Check if user belongs to at least one circle
    const circles = data.circles || [];
    if (circles.length === 0 && !data.activeCircle && !data.user?.circle_id) {
      // User has no circle yet, prompt them to Join or Create a Circle
      this.setState({
        showCircleModal: true,
        authUserData: data,
        loading: false
      });
    } else {
      // User has a circle, proceed to dashboard
      window.location.href = "/dashboard";
    }
  };

  // 1. Handle Sign In (Email + Password / PIN)
  handleSignIn = (e) => {
    if (e) e.preventDefault();
    const { email, password } = this.state;

    if (!email.trim() || !password) {
      this.setState({ error: "Please enter your email and password / PIN." });
      return;
    }

    this.setState({ error: "", successMsg: "", loading: true });

    loginWithCredentials({
      email: email.trim(),
      password
    })
      .then((res) => {
        this.handleAuthSuccess(res.data);
      })
      .catch((err) => {
        const msg = err.response?.data?.message || "Invalid credentials. Please try again.";
        this.setState({ error: msg, loading: false });
      });
  };

  // Generate short, crisp, unique Access ID from first name
  generateKeyFromName = (fullName) => {
    const rawFirst = (fullName || "").trim().split(/\s+/)[0] || "USER";
    let cleanFirst = rawFirst.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (cleanFirst.length > 5) {
      cleanFirst = cleanFirst.slice(0, 5);
    }
    if (!cleanFirst) cleanFirst = "USER";
    const randNum = Math.floor(100 + Math.random() * 900);
    return `${cleanFirst}-${randNum}`;
  };

  handleNameChange = (e) => {
    const newName = e.target.value;
    const updates = { name: newName };
    if (!this.state.userEditedKey) {
      updates.registerAccessKey = this.generateKeyFromName(newName);
    }
    this.setState(updates);
  };

  handleRefreshKey = () => {
    const key = this.generateKeyFromName(this.state.name);
    this.setState({ registerAccessKey: key, userEditedKey: true });
  };

  // 2. Handle User Registration
  handleRegister = (e) => {
    if (e) e.preventDefault();
    const { name, email, password, registerAccessKey } = this.state;

    if (!name.trim()) {
      this.setState({ error: "Please enter your full name." });
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      this.setState({ error: "Please provide a valid email address." });
      return;
    }
    if (!password || password.length < 4) {
      this.setState({ error: "Password / PIN must be at least 4 characters." });
      return;
    }

    this.setState({ error: "", successMsg: "", loading: true });

    registerUser({
      name: name.trim(),
      email: email.trim(),
      password,
      accessKey: registerAccessKey.trim() || undefined
    })
      .then((res) => {
        this.handleAuthSuccess(res.data);
      })
      .catch((err) => {
        const msg = err.response?.data?.message || "Registration failed. Please try again.";
        this.setState({ error: msg, loading: false });
      });
  };

  // 3. Request Password Reset OTP
  handleRequestOtp = (e) => {
    if (e) e.preventDefault();
    const { email } = this.state;

    if (!email.trim() || !email.includes("@")) {
      this.setState({ error: "Please enter a valid email address." });
      return;
    }

    this.setState({ error: "", successMsg: "", loading: true });

    forgotPassword(email.trim())
      .then((res) => {
        this.setState({
          otpSent: true,
          otpCode: res.data?.otp || "",
          successMsg: res.data?.message || "6-digit OTP code sent!",
          loading: false
        });
      })
      .catch((err) => {
        const msg = err.response?.data?.message || "Failed to send reset code. Please check email.";
        this.setState({ error: msg, loading: false });
      });
  };

  // 4. Verify OTP and Reset Password
  handleResetPassword = (e) => {
    if (e) e.preventDefault();
    const { email, otpCode, newPassword } = this.state;

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      this.setState({ error: "Please enter the 6-digit verification code." });
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      this.setState({ error: "New password / PIN must be at least 4 characters." });
      return;
    }

    this.setState({ error: "", successMsg: "", loading: true });

    resetPassword({
      email: email.trim(),
      otp: otpCode.trim(),
      newPassword
    })
      .then((res) => {
        this.setState({
          activeTab: 0,
          showReset: false,
          showRegister: false,
          otpSent: false,
          password: "",
          otpCode: "",
          newPassword: "",
          successMsg: res.data?.message || "Password reset successful! Please sign in with your credentials or Access ID.",
          loading: false
        });
      })
      .catch((err) => {
        const msg = err.response?.data?.message || "Reset failed. Please check OTP code.";
        this.setState({ error: msg, loading: false });
      });
  };

  // 5. Handle Personal Access ID Login
  handleLegacyLogin = (e) => {
    if (e) e.preventDefault();
    const { accessKey } = this.state;

    if (!accessKey.trim()) {
      this.setState({ error: "Please enter your Access ID." });
      return;
    }

    this.setState({ error: "", loading: true });

    loginWithKey(accessKey.trim())
      .then((res) => {
        this.handleAuthSuccess(res.data);
      })
      .catch((err) => {
        const msg = err.response?.data?.message || "Invalid Access ID.";
        this.setState({ error: msg, loading: false });
      });
  };

  // 6. Post-Auth Modal: Join Circle
  handleModalJoinCircle = () => {
    const { familyCodeToJoin } = this.state;
    if (!familyCodeToJoin.trim()) {
      this.setState({ error: "Please enter an Invite Code." });
      return;
    }

    this.setState({ loading: true, error: "" });

    joinCircle({ familyCode: familyCodeToJoin.trim() })
      .then((res) => {
        const data = res.data;
        localStorage.setItem("user", JSON.stringify(data.user));
        if (data.token) localStorage.setItem("token", data.token);
        window.location.href = "/dashboard";
      })
      .catch((err) => {
        const msg = err.response?.data?.message || "Failed to join circle.";
        this.setState({ error: msg, loading: false });
      });
  };

  // 7. Post-Auth Modal: Create Circle
  handleModalCreateCircle = () => {
    const { circleNameToCreate } = this.state;
    if (!circleNameToCreate.trim()) {
      this.setState({ error: "Please enter a Circle / Family name." });
      return;
    }

    this.setState({ loading: true, error: "" });

    createCircle({ circleName: circleNameToCreate.trim() })
      .then((res) => {
        const data = res.data;
        localStorage.setItem("user", JSON.stringify(data.user));
        if (data.token) localStorage.setItem("token", data.token);
        window.location.href = "/dashboard";
      })
      .catch((err) => {
        const msg = err.response?.data?.message || "Failed to create circle.";
        this.setState({ error: msg, loading: false });
      });
  };

  render() {
    const {
      activeTab,
      showRegister,
      showReset,
      email,
      password,
      name,
      showPassword,
      accessKey,
      registerAccessKey,
      otpSent,
      otpCode,
      newPassword,
      showNewPassword,
      showCircleModal,
      circleModalTab,
      familyCodeToJoin,
      circleNameToCreate,
      loading,
      error,
      successMsg
    } = this.state;

    return (
      <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 5, md: 8 }, px: { xs: 1.5, sm: 3 }, width: "100%" }}>
        <Paper
          elevation={4}
          sx={{
            p: { xs: 2, sm: 4 },
            borderRadius: { xs: 2.5, sm: 3.5 },
            textAlign: "center",
            background: "#ffffff",
            border: "1px solid rgba(226, 232, 240, 0.8)",
            width: "100%",
            boxSizing: "border-box"
          }}
        >
          {/* Header Branding */}
          <Box display="flex" justifyContent="center" alignItems="center" mb={1}>
            <Box
              sx={{
                width: { xs: 40, sm: 48 },
                height: { xs: 40, sm: 48 },
                borderRadius: "50%",
                background: "linear-gradient(135deg, #0f172a 0%, #38bdf8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                mr: { xs: 1, sm: 1.5 }
              }}
            >
              <GroupsIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />
            </Box>
            <Typography
              variant="h5"
              fontWeight="bold"
              sx={{ letterSpacing: "-0.5px", fontSize: { xs: "1.15rem", sm: "1.5rem" } }}
            >
              Family Expense Tracker
            </Typography>
          </Box>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: { xs: 2, sm: 3 }, fontSize: { xs: "0.78rem", sm: "0.875rem" }, px: { xs: 0.5, sm: 0 } }}
          >
            Secure personal accounts, family circles & multi-tenant expense tracking
          </Typography>

          {/* Navigation Tabs (Strictly 2 tabs: 50/50 fullWidth for clean, uncluttered mobile view) */}
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
            <Tabs
              value={showRegister || showReset ? false : activeTab}
              onChange={this.handleTabChange}
              variant="fullWidth"
              textColor="primary"
              indicatorColor="primary"
              sx={{
                "& .MuiTab-root": {
                  minHeight: 44,
                  fontWeight: 600,
                  fontSize: { xs: "0.8rem", sm: "0.95rem" },
                  textTransform: "none",
                  py: 1,
                  px: { xs: 0.5, sm: 2 },
                  minWidth: 0
                }
              }}
            >
              <Tab
                icon={<VpnKeyIcon sx={{ fontSize: { xs: "1rem", sm: "1.2rem" } }} />}
                iconPosition="start"
                label="Access Key"
              />
              <Tab
                icon={<LockOutlinedIcon sx={{ fontSize: { xs: "1rem", sm: "1.2rem" } }} />}
                iconPosition="start"
                label="Email Sign In"
              />
            </Tabs>
          </Box>

          {/* Alerts */}
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, textAlign: "left" }}>
              {error}
            </Alert>
          )}

          {successMsg && (
            <Alert severity="success" sx={{ mb: 2.5, textAlign: "left" }}>
              {successMsg}
            </Alert>
          )}

          {/* TAB 0: ACCESS KEY (PRIMARY 1-CLICK DEFAULT LOGIN) */}
          {!showRegister && !showReset && activeTab === 0 && (
            <Box component="form" onSubmit={this.handleLegacyLogin}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: "left" }}>
                Enter your Personal Access ID for instant 1-click access:
              </Typography>

              <TextField
                fullWidth
                label="Personal Access ID"
                variant="outlined"
                value={accessKey}
                onChange={this.handleChange("accessKey")}
                placeholder="e.g. Name001"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <VpnKeyIcon fontSize="small" sx={{ color: "#0284c7" }} />
                    </InputAdornment>
                  )
                }}
                sx={{ mb: 1.5 }}
              />

              <Box display="flex" justifyContent="flex-end" mb={2}>
                <Button
                  variant="text"
                  size="small"
                  onClick={this.handleOpenResetTab}
                  sx={{ textTransform: "none", fontSize: "0.82rem", color: "#0284c7" }}
                >
                  Forgot Access ID? Reset with OTP
                </Button>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  py: 1.4,
                  fontWeight: "bold",
                  borderRadius: 2,
                  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                  "&:hover": { background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)" }
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Sign In with Access ID"}
              </Button>

              {/* Register Option in Access Key Section */}
              <Box
                mt={2.5}
                p={1.5}
                sx={{
                  bgcolor: "rgba(2, 132, 199, 0.05)",
                  borderRadius: 2,
                  border: "1px solid rgba(2, 132, 199, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  gap: 0.5
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.8rem", sm: "0.85rem" } }}>
                  Don't have a Personal Access ID yet?
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  onClick={this.handleOpenRegister}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    color: "#0284c7",
                    fontSize: { xs: "0.8rem", sm: "0.85rem" },
                    p: 0,
                    minWidth: 0,
                    "&:hover": { textDecoration: "underline", bgcolor: "transparent" }
                  }}
                >
                  Register & Generate One →
                </Button>
              </Box>
            </Box>
          )}

          {/* TAB 1: EMAIL & PASSWORD SIGN IN */}
          {!showRegister && !showReset && activeTab === 1 && (
            <Box component="form" onSubmit={this.handleSignIn}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: "left" }}>
                Sign in with your email and password or 6-digit PIN:
              </Typography>

              <TextField
                fullWidth
                label="Email Address"
                variant="outlined"
                type="email"
                value={email}
                onChange={this.handleChange("email")}
                placeholder="e.g. dad@paul.com"
                required
                sx={{ mb: 2.5 }}
              />

              <TextField
                fullWidth
                label="Password / PIN"
                variant="outlined"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={this.handleChange("password")}
                placeholder="Enter password or 6-digit PIN"
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={this.handleToggleShowPassword} edge="end" size="small">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{ mb: 1.5 }}
              />

              <Box display="flex" justifyContent="flex-end" mb={2}>
                <Button
                  variant="text"
                  size="small"
                  onClick={this.handleOpenResetTab}
                  sx={{ textTransform: "none", fontSize: "0.82rem", color: "#0284c7" }}
                >
                  Forgot password? Reset with OTP
                </Button>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  py: 1.4,
                  fontWeight: "bold",
                  borderRadius: 2,
                  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                  "&:hover": { background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)" }
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Sign In with Email"}
              </Button>

              {/* Register Option in Email Sign In Section */}
              <Box
                mt={2.5}
                p={1.5}
                sx={{
                  bgcolor: "rgba(2, 132, 199, 0.05)",
                  borderRadius: 2,
                  border: "1px solid rgba(2, 132, 199, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  gap: 0.5
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.8rem", sm: "0.85rem" } }}>
                  New to Family Expense Tracker?
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  onClick={this.handleOpenRegister}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    color: "#0284c7",
                    fontSize: { xs: "0.8rem", sm: "0.85rem" },
                    p: 0,
                    minWidth: 0,
                    "&:hover": { textDecoration: "underline", bgcolor: "transparent" }
                  }}
                >
                  Create an Account →
                </Button>
              </Box>
            </Box>
          )}

          {/* REGISTER VIEW (ACCESSIBLE FROM BOTH TABS) */}
          {showRegister && (
            <Box component="form" onSubmit={this.handleRegister}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                  Create Personal Account
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  onClick={this.handleBackToLogin}
                  sx={{ textTransform: "none", fontSize: "0.82rem", color: "#0284c7", fontWeight: 600 }}
                >
                  ← Back to Sign In
                </Button>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: "left" }}>
                Create your individual personal account:
              </Typography>

              <TextField
                fullWidth
                label="Full Name"
                variant="outlined"
                value={name}
                onChange={this.handleNameChange}
                placeholder="e.g. Jeffrey Paul or Jeffrey"
                required
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Personal Access ID (1-Click Login Key)"
                variant="outlined"
                value={registerAccessKey}
                onChange={(e) => this.setState({ registerAccessKey: e.target.value.toUpperCase(), userEditedKey: true })}
                placeholder="e.g. JEFF-412"
                helperText="Auto-generated from your first name. Click refresh to get another unique combination or edit directly."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <VpnKeyIcon fontSize="small" sx={{ color: "#0284c7" }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Generate another unique Access ID">
                        <IconButton onClick={this.handleRefreshKey} edge="end" size="small" sx={{ color: "#0284c7" }}>
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  )
                }}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Email Address"
                variant="outlined"
                type="email"
                value={email}
                onChange={this.handleChange("email")}
                placeholder="e.g. john@example.com"
                required
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Password / 6-Digit PIN"
                variant="outlined"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={this.handleChange("password")}
                placeholder="Min 4 characters or 6-digit PIN"
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={this.handleToggleShowPassword} edge="end" size="small">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{ mb: 3 }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  py: 1.4,
                  fontWeight: "bold",
                  borderRadius: 2,
                  background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                  "&:hover": { background: "linear-gradient(135deg, #0369a1 0%, #075985 100%)" }
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Create Account"}
              </Button>

              <Box mt={2.5} textAlign="center">
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{" "}
                  <Button
                    variant="text"
                    size="small"
                    onClick={this.handleBackToLogin}
                    sx={{ textTransform: "none", fontWeight: "bold", color: "#0284c7", p: 0, minWidth: 0, verticalAlign: "baseline" }}
                  >
                    Sign in here
                  </Button>
                </Typography>
              </Box>
            </Box>
          )}

          {/* RESET OTP VIEW (ACCESSIBLE FROM FORGOT PASSWORD LINKS) */}
          {showReset && (
            <Box component="form" onSubmit={!otpSent ? this.handleRequestOtp : this.handleResetPassword}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                  Reset Password with OTP
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  onClick={this.handleBackToLogin}
                  sx={{ textTransform: "none", fontSize: "0.82rem", color: "#0284c7", fontWeight: 600 }}
                >
                  ← Back to Sign In
                </Button>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: "left" }}>
                {!otpSent
                  ? "Enter your email to receive a 6-digit verification code:"
                  : `Enter the 6-digit code sent to ${email} and your new password:`}
              </Typography>

              <TextField
                fullWidth
                label="Email Address"
                variant="outlined"
                type="email"
                value={email}
                onChange={this.handleChange("email")}
                placeholder="e.g. dad@paul.com"
                disabled={otpSent}
                required
                sx={{ mb: 2 }}
              />

              {otpSent && (
                <>
                  <TextField
                    fullWidth
                    label="6-Digit OTP Code"
                    variant="outlined"
                    value={otpCode}
                    onChange={this.handleChange("otpCode")}
                    placeholder="e.g. 724777"
                    required
                    inputProps={{ maxLength: 6, style: { letterSpacing: 4, fontWeight: "bold" } }}
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="New Password / PIN"
                    variant="outlined"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={this.handleChange("newPassword")}
                    placeholder="Min 4 characters or 6-digit PIN"
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={this.handleToggleShowNewPassword} edge="end" size="small">
                            {showNewPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    sx={{ mb: 2 }}
                  />
                </>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  py: 1.4,
                  fontWeight: "bold",
                  borderRadius: 2,
                  background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                  "&:hover": { background: "linear-gradient(135deg, #0369a1 0%, #075985 100%)" }
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : !otpSent ? (
                  "Send 6-Digit OTP Code"
                ) : (
                  "Verify OTP & Set New Password"
                )}
              </Button>

              <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                <Button
                  variant="text"
                  size="small"
                  onClick={this.handleBackToLogin}
                  sx={{ textTransform: "none", color: "text.secondary" }}
                >
                  ← Back to Sign In
                </Button>
                {otpSent && (
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => this.setState({ otpSent: false, otpCode: "", error: "", successMsg: "" })}
                    sx={{ textTransform: "none", color: "#0284c7" }}
                  >
                    Resend Code or Change Email
                  </Button>
                )}
              </Box>
            </Box>
          )}
        </Paper>

        {/* POST-AUTH MODAL: JOIN OR CREATE CIRCLE (FOR USERS WITH 0 CIRCLES) */}
        <Dialog
          open={showCircleModal}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              m: { xs: 1.5, sm: 4 },
              width: { xs: "calc(100% - 24px)", sm: "auto" },
              borderRadius: 3
            }
          }}
        >
          <DialogTitle sx={{ pb: 1, fontWeight: "bold", textAlign: "center" }}>
            Welcome to Expense Tracker! 🚀
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" textAlign="center" mb={2}>
              To start tracking expenses, join an existing circle or create a new one:
            </Typography>

            <Tabs
              value={circleModalTab}
              onChange={(e, val) => this.setState({ circleModalTab: val, error: "" })}
              variant="fullWidth"
              sx={{ mb: 2 }}
            >
              <Tab label="Join Circle" icon={<VpnKeyIcon fontSize="small" />} iconPosition="start" />
              <Tab label="Create Circle" icon={<GroupAddIcon fontSize="small" />} iconPosition="start" />
            </Tabs>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {circleModalTab === 0 ? (
              <Box>
                <TextField
                  fullWidth
                  label="Family / Invite Code"
                  placeholder="e.g. PAUL-101"
                  value={familyCodeToJoin}
                  onChange={this.handleChange("familyCodeToJoin")}
                  sx={{ mt: 1, mb: 2 }}
                />
                <Button
                  fullWidth
                  variant="contained"
                  onClick={this.handleModalJoinCircle}
                  disabled={loading}
                  sx={{ py: 1.2, fontWeight: "bold" }}
                >
                  {loading ? <CircularProgress size={20} color="inherit" /> : "Join Circle"}
                </Button>
              </Box>
            ) : (
              <Box>
                <TextField
                  fullWidth
                  label="Circle / Family Name"
                  placeholder="e.g. Flatmates or My Family"
                  value={circleNameToCreate}
                  onChange={this.handleChange("circleNameToCreate")}
                  sx={{ mt: 1, mb: 2 }}
                />
                <Button
                  fullWidth
                  variant="contained"
                  onClick={this.handleModalCreateCircle}
                  disabled={loading}
                  sx={{ py: 1.2, fontWeight: "bold" }}
                >
                  {loading ? <CircularProgress size={20} color="inherit" /> : "Create & Start"}
                </Button>
              </Box>
            )}
          </DialogContent>
        </Dialog>
      </Container>
    );
  }
}

export default LoginPage;