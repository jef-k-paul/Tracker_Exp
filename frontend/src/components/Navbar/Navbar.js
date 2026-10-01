import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
  Tooltip,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  TextField,
  Divider,
  Alert,
  IconButton,
  Popover,
  InputAdornment
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import TableChartIcon from "@mui/icons-material/TableChart";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CheckIcon from "@mui/icons-material/Check";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import LogoutIcon from "@mui/icons-material/Logout";
import EditIcon from "@mui/icons-material/Edit";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { exportMonthlyStatementPDF, exportExpensesCSV } from "../../utils/exportUtils";
import { getMyCircles, switchCircle, joinCircle, createCircle, updateEmail, getMyProfile } from "../../services/apiServices";
import NotificationBell from "./NotificationBell";

// Funny random character profiles
const FUNNY_CHARACTERS = [
  { emoji: "🦊", title: "Cunning Budgeteer", bg: "#ea580c" },
  { emoji: "🐼", title: "Chill Spender", bg: "#0284c7" },
  { emoji: "🦝", title: "Receipt Bandit", bg: "#7c3aed" },
  { emoji: "🐸", title: "Calculated Hopper", bg: "#059669" },
  { emoji: "🐙", title: "Multi-Split Wizard", bg: "#db2777" },
  { emoji: "🤖", title: "Expense Automator", bg: "#2563eb" },
  { emoji: "🦁", title: "Circle Boss", bg: "#d97706" },
  { emoji: "🦄", title: "Budget Sorcerer", bg: "#c026d3" },
  { emoji: "🐨", title: "Zen Saver", bg: "#475569" },
  { emoji: "🐵", title: "Cheeky Auditor", bg: "#e11d48" }
];

const getDeterministicIndex = (identifier) => {
  if (!identifier) return 0;
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = (hash << 5) - hash + identifier.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % FUNNY_CHARACTERS.length;
};

const Navbar = ({ exportData, currentUser, onSettlementUpdated }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const openMenu = Boolean(anchorEl);

  // Circle switcher states
  const [circleAnchorEl, setCircleAnchorEl] = useState(null);
  const [myCircles, setMyCircles] = useState([]);
  const [showCircleModal, setShowCircleModal] = useState(false);
  const [circleModalTab, setCircleModalTab] = useState(0);
  const [modalInput, setModalInput] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const openCircleMenu = Boolean(circleAnchorEl);

  // Fallback to localStorage if currentUser not passed directly
  let initialUser = currentUser;
  if (!initialUser) {
    try {
      initialUser = JSON.parse(localStorage.getItem("user") || "null");
    } catch (e) {
      initialUser = null;
    }
  }
  const [user, setUser] = useState(initialUser);

  // Profile popover & funny character state
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAccessKey, setCopiedAccessKey] = useState(false);
  const [funnyCharOffset, setFunnyCharOffset] = useState(0);

  // Edit Email Modal states
  const [showEditEmailModal, setShowEditEmailModal] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState("");
  const [confirmEmailInput, setConfirmEmailInput] = useState("");
  const [verificationKeyInput, setVerificationKeyInput] = useState("");
  const [showVerificationKey, setShowVerificationKey] = useState(false);
  const [editEmailLoading, setEditEmailLoading] = useState(false);
  const [editEmailError, setEditEmailError] = useState("");
  const [editEmailSuccess, setEditEmailSuccess] = useState("");

  const baseCharIndex = getDeterministicIndex(user?.email || user?.name || "User");
  const currentCharIndex = (baseCharIndex + funnyCharOffset) % FUNNY_CHARACTERS.length;
  const currentChar = FUNNY_CHARACTERS[currentCharIndex];

  const handleOpenProfile = (event) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleCloseProfile = () => {
    setProfileAnchorEl(null);
  };

  const handleShuffleChar = () => {
    setFunnyCharOffset((prev) => prev + 1);
  };

  const handleCopyFamilyCode = () => {
    if (user?.family_code) {
      navigator.clipboard.writeText(user.family_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleOpenEditEmail = () => {
    setProfileAnchorEl(null); // Close popover
    setNewEmailInput("");
    setConfirmEmailInput("");
    setVerificationKeyInput("");
    setEditEmailError("");
    setEditEmailSuccess("");
    setShowEditEmailModal(true);
  };

  const handleUpdateEmailSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanNew = newEmailInput.trim();
    const cleanConfirm = confirmEmailInput.trim();
    const cleanKey = verificationKeyInput.trim();

    if (!cleanNew || !cleanNew.includes("@")) {
      setEditEmailError("Please enter a valid new email address.");
      return;
    }
    if (cleanNew.toLowerCase() !== cleanConfirm.toLowerCase()) {
      setEditEmailError("New email and confirmation email do not match.");
      return;
    }
    if (cleanNew.toLowerCase() === (user?.email || "").toLowerCase()) {
      setEditEmailError("New email must be different from your current email.");
      return;
    }
    if (!cleanKey) {
      setEditEmailError("Please enter your current password or Access ID for verification.");
      return;
    }

    setEditEmailLoading(true);
    setEditEmailError("");
    setEditEmailSuccess("");

    try {
      const res = await updateEmail({
        newEmail: cleanNew,
        confirmEmail: cleanConfirm,
        verificationKey: cleanKey
      });

      const updatedUser = res.data.user;
      localStorage.setItem("user", JSON.stringify(updatedUser));
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
      }
      setUser(updatedUser);

      setEditEmailSuccess("Email address updated successfully!");
      setEditEmailLoading(false);

      setTimeout(() => {
        setShowEditEmailModal(false);
        window.location.reload();
      }, 1000);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update email. Please check your credentials.";
      setEditEmailError(msg);
      setEditEmailLoading(false);
    }
  };

  // Sync state if currentUser prop changes from parent
  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    // Always fetch fresh profile and circles from DB if token exists
    const token = localStorage.getItem("token");
    if (token) {
      getMyProfile()
        .then((res) => {
          if (res.data?.user) {
            localStorage.setItem("user", JSON.stringify(res.data.user));
            if (res.data.token) {
              localStorage.setItem("token", res.data.token);
            }
            setUser(res.data.user);
          }
          if (res.data?.circles) {
            setMyCircles(res.data.circles);
          }
        })
        .catch(() => {
          getMyCircles()
            .then((res) => {
              if (res.data?.circles) {
                setMyCircles(res.data.circles);
              }
            })
            .catch(() => {});
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenExport = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseExport = () => {
    setAnchorEl(null);
  };

  const handleDownloadPDF = async () => {
    handleCloseExport();
    if (!exportData || isExporting) return;
    try {
      setIsExporting(true);
      await exportMonthlyStatementPDF(exportData);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadCSV = async () => {
    handleCloseExport();
    if (!exportData || isExporting) return;
    try {
      setIsExporting(true);
      await exportExpensesCSV(exportData);
    } catch (err) {
      console.error("CSV generation failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSwitchCircle = async (circleId) => {
    setCircleAnchorEl(null);
    try {
      const res = await switchCircle(circleId);
      const data = res.data;
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      window.location.reload();
    } catch (err) {
      console.error("Failed to switch circle:", err);
    }
  };

  const handleModalSubmit = async () => {
    if (!modalInput.trim()) {
      setModalError(circleModalTab === 0 ? "Please enter an Invite Code." : "Please enter a Circle name.");
      return;
    }

    setModalLoading(true);
    setModalError("");

    try {
      let res;
      if (circleModalTab === 0) {
        res = await joinCircle({ familyCode: modalInput.trim() });
      } else {
        res = await createCircle({ circleName: modalInput.trim() });
      }

      const data = res.data;
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      setShowCircleModal(false);
      window.location.reload();
    } catch (err) {
      const msg = err.response?.data?.message || "Action failed. Please try again.";
      setModalError(msg);
      setModalLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  return (
    <AppBar position="static" sx={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
      <Toolbar>
        {/* Left: Circle Name + Switcher Dropdown */}
        <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Box
            onClick={(e) => setCircleAnchorEl(e.currentTarget)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              cursor: "pointer",
              px: 1,
              py: 0.5,
              borderRadius: 2,
              "&:hover": { bgcolor: "rgba(255,255,255,0.08)" }
            }}
          >
            <Typography variant="h6" fontWeight="bold" sx={{ letterSpacing: "-0.5px" }}>
              {user?.circle_name ? `${user.circle_name}` : "Expense Tracker"}
            </Typography>
            <KeyboardArrowDownIcon fontSize="small" sx={{ opacity: 0.8 }} />
          </Box>

          {user?.family_code && (
            <Tooltip title="Your Circle / Family Invite Code (Share with others to join)">
              <Chip
                label={`Code: ${user.family_code}`}
                size="small"
                sx={{
                  backgroundColor: "rgba(56, 189, 248, 0.15)",
                  color: "#38bdf8",
                  fontWeight: "bold",
                  fontSize: "0.72rem",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  display: { xs: "none", sm: "inline-flex" }
                }}
              />
            </Tooltip>
          )}

          {/* Circle Switcher Menu */}
          <Menu
            anchorEl={circleAnchorEl}
            open={openCircleMenu}
            onClose={() => setCircleAnchorEl(null)}
            PaperProps={{
              elevation: 6,
              sx: { borderRadius: 2.5, minWidth: 230, mt: 1, p: 0.5 }
            }}
          >
            <Typography variant="caption" sx={{ px: 2, py: 0.5, color: "text.secondary", fontWeight: 700, display: "block" }}>
              YOUR CIRCLES
            </Typography>
            {myCircles.map((c) => {
              const isActive = Number(c.circle_id) === Number(user?.circle_id || user?.circleId);
              return (
                <MenuItem
                  key={c.circle_id}
                  onClick={() => handleSwitchCircle(c.circle_id)}
                  selected={isActive}
                  sx={{ py: 1, borderRadius: 1.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {isActive ? <CheckIcon fontSize="small" color="primary" /> : <Box width={20} />}
                  </ListItemIcon>
                  <ListItemText
                    primary={c.circle_name}
                    secondary={`Code: ${c.family_code} • ${c.role}`}
                    primaryTypographyProps={{ variant: "body2", fontWeight: isActive ? 700 : 500 }}
                    secondaryTypographyProps={{ variant: "caption", fontSize: "0.7rem" }}
                  />
                </MenuItem>
              );
            })}

            <Divider sx={{ my: 1 }} />

            <MenuItem
              onClick={() => {
                setCircleAnchorEl(null);
                setCircleModalTab(0);
                setModalInput("");
                setModalError("");
                setShowCircleModal(true);
              }}
              sx={{ py: 1, borderRadius: 1.5 }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: "#0284c7" }}>
                <VpnKeyIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Join Another Circle"
                secondary="Enter an invite code"
                primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                secondaryTypographyProps={{ variant: "caption", fontSize: "0.7rem" }}
              />
            </MenuItem>

            <MenuItem
              onClick={() => {
                setCircleAnchorEl(null);
                setCircleModalTab(1);
                setModalInput("");
                setModalError("");
                setShowCircleModal(true);
              }}
              sx={{ py: 1, borderRadius: 1.5 }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: "#10b981" }}>
                <AddCircleOutlineIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Create New Circle"
                secondary="Start a flatmates or trip circle"
                primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                secondaryTypographyProps={{ variant: "caption", fontSize: "0.7rem" }}
              />
            </MenuItem>
          </Menu>
        </Box>

        {/* Right Nav actions */}
        <Box display="flex" alignItems="center" gap={1}>
          <Button color="inherit" component={RouterLink} to="/dashboard">
            Dashboard
          </Button>

          <Button color="inherit" component={RouterLink} to="/add-expense">
            Add Expense
          </Button>

          {/* Export Statement Dropdown Button */}
          {exportData && (
            <>
              <Tooltip title="Download monthly report as PDF or CSV">
                <Button
                  color="inherit"
                  onClick={handleOpenExport}
                  disabled={isExporting}
                  endIcon={
                    isExporting ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <KeyboardArrowDownIcon />
                    )
                  }
                  startIcon={<FileDownloadIcon />}
                  sx={{
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 2,
                    px: 1.5,
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.2)"
                    }
                  }}
                >
                  {isExporting ? "Exporting..." : "Export"}
                </Button>
              </Tooltip>

              <Menu
                anchorEl={anchorEl}
                open={openMenu}
                onClose={handleCloseExport}
                PaperProps={{
                  elevation: 6,
                  sx: { borderRadius: 2.5, minWidth: 220, mt: 1, p: 0.5 }
                }}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              >
                <MenuItem onClick={handleDownloadPDF} sx={{ py: 1, borderRadius: 1.5 }}>
                  <ListItemIcon sx={{ color: "#ef4444" }}>
                    <PictureAsPdfIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Monthly Statement (PDF)"
                    primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                    secondary="All-in-one executive report"
                    secondaryTypographyProps={{ variant: "caption", fontSize: "0.7rem" }}
                  />
                </MenuItem>

                <MenuItem onClick={handleDownloadCSV} sx={{ py: 1, borderRadius: 1.5 }}>
                  <ListItemIcon sx={{ color: "#10b981" }}>
                    <TableChartIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Export to CSV / Excel"
                    primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                    secondary="Raw transactions spreadsheet"
                    secondaryTypographyProps={{ variant: "caption", fontSize: "0.7rem" }}
                  />
                </MenuItem>
              </Menu>
            </>
          )}

          {/* Handshake Settlement Notifications */}
          {user && (
            <NotificationBell
              currentUser={user}
              onSettlementUpdated={onSettlementUpdated}
            />
          )}

          {/* Small Funny Random Character Profile Circle */}
          {user && (
            <>
              <Tooltip title={`Profile: ${user?.name || "User"} (${currentChar.title})`}>
                <IconButton
                  onClick={handleOpenProfile}
                  sx={{
                    width: 36,
                    height: 36,
                    p: 0,
                    bgcolor: currentChar.bg,
                    border: "2px solid rgba(255, 255, 255, 0.5)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                    transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    "&:hover": {
                      transform: "scale(1.15)",
                      bgcolor: currentChar.bg
                    }
                  }}
                >
                  <Typography sx={{ fontSize: "1.25rem", lineHeight: 1, userSelect: "none" }}>
                    {currentChar.emoji}
                  </Typography>
                </IconButton>
              </Tooltip>

              {/* Small Window of Profile & Circle Data */}
              <Popover
                open={Boolean(profileAnchorEl)}
                anchorEl={profileAnchorEl}
                onClose={handleCloseProfile}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                PaperProps={{
                  elevation: 8,
                  sx: {
                    mt: 1.5,
                    p: 2.5,
                    width: 300,
                    borderRadius: 3.5,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
                  }
                }}
              >
                {/* Character Avatar & Identity Header */}
                <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                  <Tooltip title="Click to roll another funny character!">
                    <Box
                      onClick={handleShuffleChar}
                      sx={{
                        width: 50,
                        height: 50,
                        borderRadius: "50%",
                        bgcolor: currentChar.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.8rem",
                        boxShadow: "0 3px 10px rgba(0,0,0,0.18)",
                        cursor: "pointer",
                        transition: "transform 0.15s ease",
                        "&:hover": { transform: "scale(1.1) rotate(6deg)" }
                      }}
                    >
                      {currentChar.emoji}
                    </Box>
                  </Tooltip>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight="bold" noWrap>
                      {user?.name || "Member"}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: currentChar.bg, fontWeight: 700, display: "block", lineHeight: 1.2 }}
                    >
                      {currentChar.title}
                    </Typography>
                    <Chip
                      label={user?.role || "MEMBER"}
                      size="small"
                      sx={{
                        mt: 0.5,
                        height: 18,
                        fontSize: "0.65rem",
                        fontWeight: "bold",
                        bgcolor: user?.role === "ADMIN" ? "rgba(124, 58, 237, 0.15)" : "rgba(2, 132, 199, 0.15)",
                        color: user?.role === "ADMIN" ? "#7c3aed" : "#0284c7"
                      }}
                    />
                  </Box>
                </Box>

                <Divider sx={{ my: 1.5 }} />

                {/* Personal Information with Edit Email Pen Button */}
                <Box mb={1.5}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" py={0.3}>
                    <Typography variant="caption" color="text.secondary">
                      Email Address:
                    </Typography>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Tooltip title={user?.email || "No email"}>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          noWrap
                          sx={{ maxWidth: 165, cursor: "pointer", color: "text.primary" }}
                        >
                          {user?.email || "No email"}
                        </Typography>
                      </Tooltip>
                      <Tooltip title="Edit email address">
                        <IconButton
                          size="small"
                          onClick={handleOpenEditEmail}
                          sx={{
                            p: 0.4,
                            color: "#0284c7",
                            "&:hover": { bgcolor: "rgba(2, 132, 199, 0.1)" }
                          }}
                        >
                          <EditIcon sx={{ fontSize: "0.92rem" }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" py={0.3}>
                    <Typography variant="caption" color="text.secondary">
                      Member ID:
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      #{user?.member_id || user?.memberId || "1"}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" py={0.3}>
                    <Typography variant="caption" color="text.secondary">
                      Access ID:
                    </Typography>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Typography variant="body2" fontWeight={700} sx={{ color: "#0284c7" }}>
                        {user?.accessKey || user?.access_key || "N/A"}
                      </Typography>
                      {(user?.accessKey || user?.access_key) && (
                        <Tooltip title={copiedAccessKey ? "Copied Access ID!" : "Copy Access ID"}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              navigator.clipboard.writeText(user.accessKey || user.access_key);
                              setCopiedAccessKey(true);
                              setTimeout(() => setCopiedAccessKey(false), 2000);
                            }}
                            sx={{ p: 0.3 }}
                          >
                            <ContentCopyIcon sx={{ fontSize: "0.85rem", color: copiedAccessKey ? "#10b981" : "inherit" }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                </Box>

                <Divider sx={{ my: 1.5 }} />

                {/* Active Circle Information */}
                <Box mb={2} p={1.5} sx={{ bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #e2e8f0" }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                      Active Circle
                    </Typography>
                    <Typography variant="caption" color="primary" fontWeight={700}>
                      {myCircles.length > 1 ? `${myCircles.length} circles` : "1 circle"}
                    </Typography>
                  </Box>

                  <Typography variant="body2" fontWeight="bold" color="text.primary">
                    {user?.circle_name || "Paul Family"}
                  </Typography>

                  {user?.family_code && (
                    <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.8}>
                      <Typography variant="caption" color="text.secondary">
                        Invite Code: <strong style={{ color: "#0284c7" }}>{user.family_code}</strong>
                      </Typography>
                      <Tooltip title={copiedCode ? "Copied!" : "Copy Code"}>
                        <IconButton size="small" onClick={handleCopyFamilyCode} sx={{ p: 0.5 }}>
                          <ContentCopyIcon
                            fontSize="small"
                            sx={{ fontSize: "0.85rem", color: copiedCode ? "#10b981" : "inherit" }}
                          />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </Box>

                {/* Bottom Footer Actions */}
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Button
                    size="small"
                    startIcon={<ShuffleIcon fontSize="small" />}
                    onClick={handleShuffleChar}
                    sx={{ textTransform: "none", fontSize: "0.74rem", color: "text.secondary" }}
                  >
                    Roll Avatar
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<LogoutIcon fontSize="small" />}
                    onClick={handleLogout}
                    sx={{ textTransform: "none", fontWeight: "bold", fontSize: "0.78rem" }}
                  >
                    Logout
                  </Button>
                </Box>
              </Popover>
            </>
          )}

          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Box>
      </Toolbar>

      {/* DIALOG FOR EDITING EMAIL ADDRESS */}
      <Dialog
        open={showEditEmailModal}
        onClose={() => !editEmailLoading && setShowEditEmailModal(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1, fontWeight: "bold", textAlign: "center" }}>
          Update Email Address ✏️
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2} textAlign="center">
            Enter your new email address and confirm your identity with your current password or Access ID.
          </Typography>

          {editEmailError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {editEmailError}
            </Alert>
          )}

          {editEmailSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {editEmailSuccess}
            </Alert>
          )}

          <Box component="form" onSubmit={handleUpdateEmailSubmit}>
            <TextField
              fullWidth
              label="New Email Address"
              type="email"
              value={newEmailInput}
              onChange={(e) => setNewEmailInput(e.target.value)}
              placeholder="e.g. new_email@example.com"
              required
              disabled={editEmailLoading}
              sx={{ mb: 2, mt: 1 }}
            />

            <TextField
              fullWidth
              label="Confirm New Email Address"
              type="email"
              value={confirmEmailInput}
              onChange={(e) => setConfirmEmailInput(e.target.value)}
              placeholder="Re-enter new email address"
              required
              disabled={editEmailLoading}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Current Password / Access ID"
              type={showVerificationKey ? "text" : "password"}
              value={verificationKeyInput}
              onChange={(e) => setVerificationKeyInput(e.target.value)}
              placeholder="Password, PIN, or Access ID"
              required
              disabled={editEmailLoading}
              helperText="Required to verify account ownership"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowVerificationKey(!showVerificationKey)}
                      edge="end"
                      size="small"
                    >
                      {showVerificationKey ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ mb: 2.5 }}
            />

            <Box display="flex" gap={1.5} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() => setShowEditEmailModal(false)}
                disabled={editEmailLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={editEmailLoading}
                sx={{
                  fontWeight: "bold",
                  background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)"
                }}
              >
                {editEmailLoading ? <CircularProgress size={20} color="inherit" /> : "Save Email"}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* DIALOG FOR JOINING OR CREATING A CIRCLE */}
      <Dialog open={showCircleModal} onClose={() => setShowCircleModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1, fontWeight: "bold", textAlign: "center" }}>
          {circleModalTab === 0 ? "Join a Circle" : "Create a New Circle"}
        </DialogTitle>
        <DialogContent>
          <Tabs
            value={circleModalTab}
            onChange={(e, val) => {
              setCircleModalTab(val);
              setModalError("");
              setModalInput("");
            }}
            variant="fullWidth"
            sx={{ mb: 2 }}
          >
            <Tab label="Join Circle" icon={<VpnKeyIcon fontSize="small" />} iconPosition="start" />
            <Tab label="Create Circle" icon={<GroupAddIcon fontSize="small" />} iconPosition="start" />
          </Tabs>

          {modalError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {modalError}
            </Alert>
          )}

          {circleModalTab === 0 ? (
            <Box>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Enter the Invite Code shared by your family admin or flatmate:
              </Typography>
              <TextField
                fullWidth
                label="Invite Code (e.g. PAUL-101)"
                value={modalInput}
                onChange={(e) => setModalInput(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button
                fullWidth
                variant="contained"
                onClick={handleModalSubmit}
                disabled={modalLoading}
                sx={{ py: 1.2, fontWeight: "bold" }}
              >
                {modalLoading ? <CircularProgress size={20} color="inherit" /> : "Join Circle"}
              </Button>
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Enter a name for your new group or household:
              </Typography>
              <TextField
                fullWidth
                label="Circle Name (e.g. Flatmates, Vacation Trip)"
                value={modalInput}
                onChange={(e) => setModalInput(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button
                fullWidth
                variant="contained"
                onClick={handleModalSubmit}
                disabled={modalLoading}
                sx={{ py: 1.2, fontWeight: "bold" }}
              >
                {modalLoading ? <CircularProgress size={20} color="inherit" /> : "Create Circle"}
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </AppBar>
  );
};

export default Navbar;