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
  InputAdornment,
  DialogActions,
  List,
  ListItem,
  Avatar
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
import DashboardIcon from "@mui/icons-material/Dashboard";
import AddIcon from "@mui/icons-material/Add";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PeopleIcon from "@mui/icons-material/People";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CloseIcon from "@mui/icons-material/Close";
import { exportMonthlyStatementPDF, exportExpensesCSV } from "../../utils/exportUtils";
import {
  getMyCircles,
  switchCircle,
  joinCircle,
  createCircle,
  updateEmail,
  updateAvatar,
  getMyProfile,
  getCircleMembers,
  removeCircleMember,
  requestLeaveCircle,
  cancelLeaveCircle,
  approveLeaveRequest,
  rejectLeaveRequest
} from "../../services/apiServices";
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

// Compute initial or saved avatar index from user object or localStorage
const getInitialAvatarIndex = (userObj) => {
  if (userObj?.avatarIndex !== undefined && userObj?.avatarIndex !== null) {
    return Number(userObj.avatarIndex) % FUNNY_CHARACTERS.length;
  }
  if (userObj?.avatar_index !== undefined && userObj?.avatar_index !== null) {
    return Number(userObj.avatar_index) % FUNNY_CHARACTERS.length;
  }
  const userKey = userObj?.userId || userObj?.user_id || userObj?.access_key || userObj?.email;
  if (userKey) {
    const saved = localStorage.getItem(`user_avatar_${userKey}`);
    if (saved !== null && !isNaN(parseInt(saved, 10))) {
      return parseInt(saved, 10) % FUNNY_CHARACTERS.length;
    }
  }
  return getDeterministicIndex(userObj?.email || userObj?.name || "User");
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
  const [currentCharIndex, setCurrentCharIndex] = useState(() => getInitialAvatarIndex(initialUser));

  // Edit Email Modal states
  const [showEditEmailModal, setShowEditEmailModal] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState("");
  const [confirmEmailInput, setConfirmEmailInput] = useState("");
  const [verificationKeyInput, setVerificationKeyInput] = useState("");
  const [showVerificationKey, setShowVerificationKey] = useState(false);
  const [editEmailLoading, setEditEmailLoading] = useState(false);
  const [editEmailError, setEditEmailError] = useState("");
  const [editEmailSuccess, setEditEmailSuccess] = useState("");

  // Circle Member Management states (Admin & Member Leave Flow)
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [selectedCircle, setSelectedCircle] = useState(null);
  const [membersList, setMembersList] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersFeedback, setMembersFeedback] = useState({ error: "", success: "" });
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({ open: false, member: null });
  const [leaveConfirmDialog, setLeaveConfirmDialog] = useState({ open: false, circle: null });
  const [actionLoading, setActionLoading] = useState(false);

  const currentChar = FUNNY_CHARACTERS[currentCharIndex] || FUNNY_CHARACTERS[0];

  const handleOpenProfile = (event) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleCloseProfile = () => {
    setProfileAnchorEl(null);
  };

  const handleShuffleChar = async () => {
    const nextIndex = (currentCharIndex + 1) % FUNNY_CHARACTERS.length;
    setCurrentCharIndex(nextIndex);

    // 1. Update in-memory user state
    const updatedUser = {
      ...(user || {}),
      avatarIndex: nextIndex,
      avatar_index: nextIndex
    };
    setUser(updatedUser);

    // 2. Persist locally to survive reloads & logins on this client
    try {
      localStorage.setItem("user", JSON.stringify(updatedUser));
      const userKey = user?.userId || user?.user_id || user?.access_key || user?.email;
      if (userKey) {
        localStorage.setItem(`user_avatar_${userKey}`, nextIndex.toString());
      }
    } catch (e) {
      console.error("Failed to save avatar locally:", e);
    }

    // 3. Persist to database in background
    try {
      await updateAvatar(nextIndex);
    } catch (err) {
      console.log("Avatar saved locally, backend sync note:", err?.message);
    }
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
      setCurrentCharIndex(getInitialAvatarIndex(currentUser));
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
            if (res.data.user.avatarIndex != null || res.data.user.avatar_index != null) {
              const serverIdx = Number(res.data.user.avatarIndex ?? res.data.user.avatar_index) % FUNNY_CHARACTERS.length;
              setCurrentCharIndex(serverIdx);
            }
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

  // Open Manage Members dialog for an Admin circle
  const handleOpenManageMembers = async (circle) => {
    setProfileAnchorEl(null);
    setSelectedCircle(circle);
    setManageModalOpen(true);
    setMembersFeedback({ error: "", success: "" });
    setMembersLoading(true);
    try {
      const res = await getCircleMembers(circle.circle_id);
      setMembersList(res.data?.members || []);
    } catch (err) {
      setMembersFeedback({
        error: err.response?.data?.message || "Failed to load circle members.",
        success: ""
      });
    } finally {
      setMembersLoading(false);
    }
  };

  // Direct Admin Action: delete circle member
  const handleConfirmDeleteMember = async () => {
    if (!deleteConfirmDialog.member || !selectedCircle) return;
    setActionLoading(true);
    try {
      const res = await removeCircleMember(
        selectedCircle.circle_id,
        deleteConfirmDialog.member.member_id
      );
      setMembersList((prev) =>
        prev.filter((m) => m.member_id !== deleteConfirmDialog.member.member_id)
      );
      setMembersFeedback({
        success: res.data?.message || `${deleteConfirmDialog.member.first_name} has been removed.`,
        error: ""
      });
      setDeleteConfirmDialog({ open: false, member: null });
      if (onSettlementUpdated) onSettlementUpdated();
    } catch (err) {
      setMembersFeedback({
        error: err.response?.data?.message || "Failed to remove member.",
        success: ""
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Prompt Member to request leave
  const handlePromptLeaveCircle = (circle) => {
    setProfileAnchorEl(null);
    setLeaveConfirmDialog({ open: true, circle });
  };

  // Confirm request leave circle
  const handleConfirmLeaveCircle = async () => {
    if (!leaveConfirmDialog.circle) return;
    setActionLoading(true);
    try {
      const res = await requestLeaveCircle(leaveConfirmDialog.circle.circle_id);
      if (res.data?.removed) {
        // Immediate removal (e.g. admin leaving when another admin exists)
        setMyCircles((prev) =>
          prev.filter((c) => c.circle_id !== leaveConfirmDialog.circle.circle_id)
        );
        window.location.reload();
      } else {
        // Pending approval by admin
        setMyCircles((prev) =>
          prev.map((c) =>
            c.circle_id === leaveConfirmDialog.circle.circle_id
              ? { ...c, leave_request_status: "PENDING" }
              : c
          )
        );
      }
      setLeaveConfirmDialog({ open: false, circle: null });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit leave request.");
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel pending leave request
  const handleCancelLeave = async (circleId) => {
    setActionLoading(true);
    try {
      await cancelLeaveCircle(circleId);
      setMyCircles((prev) =>
        prev.map((c) =>
          c.circle_id === circleId ? { ...c, leave_request_status: null } : c
        )
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel leave request.");
    } finally {
      setActionLoading(false);
    }
  };

  // Admin approves a member's pending leave request
  const handleApproveLeaveMember = async (member) => {
    if (!member.leave_request_id) return;
    setActionLoading(true);
    try {
      const res = await approveLeaveRequest(member.leave_request_id);
      setMembersList((prev) =>
        prev.filter((m) => m.member_id !== member.member_id)
      );
      setMembersFeedback({
        success: res.data?.message || `${member.first_name}'s exit approved.`,
        error: ""
      });
      if (onSettlementUpdated) onSettlementUpdated();
    } catch (err) {
      setMembersFeedback({
        error: err.response?.data?.message || "Failed to approve exit.",
        success: ""
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Admin rejects a member's pending leave request
  const handleRejectLeaveMember = async (member) => {
    if (!member.leave_request_id) return;
    setActionLoading(true);
    try {
      await rejectLeaveRequest(member.leave_request_id);
      setMembersList((prev) =>
        prev.map((m) =>
          m.member_id === member.member_id
            ? { ...m, leave_request_status: null, leave_request_id: null }
            : m
        )
      );
      setMembersFeedback({
        success: `Leave request for ${member.first_name} rejected.`,
        error: ""
      });
    } catch (err) {
      setMembersFeedback({
        error: err.response?.data?.message || "Failed to reject leave request.",
        success: ""
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AppBar position="static" sx={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
      <Toolbar sx={{ px: { xs: 1, sm: 2 }, minHeight: { xs: 56, sm: 64 }, display: "flex", justifyContent: "space-between" }}>
        {/* Left: Circle Name + Switcher Dropdown */}
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1.5 }, minWidth: 0 }}>
          <Box
            onClick={(e) => setCircleAnchorEl(e.currentTarget)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              cursor: "pointer",
              px: { xs: 0.8, sm: 1 },
              py: 0.5,
              borderRadius: 2,
              minWidth: 0,
              "&:hover": { bgcolor: "rgba(255,255,255,0.08)" }
            }}
          >
            <Typography
              variant="h6"
              fontWeight="bold"
              noWrap
              sx={{
                letterSpacing: "-0.5px",
                fontSize: { xs: "0.95rem", sm: "1.2rem" },
                maxWidth: { xs: 120, sm: 220, md: 340 }
              }}
            >
              {user?.circle_name ? `${user.circle_name}` : "Expense Tracker"}
            </Typography>
            <KeyboardArrowDownIcon fontSize="small" sx={{ opacity: 0.8, flexShrink: 0 }} />
          </Box>

          {user?.family_code && (
            <Tooltip title={copiedCode ? "Copied to clipboard!" : "Click to copy Invite Code"}>
              <Chip
                label={`Code: ${user.family_code}`}
                size="small"
                onClick={handleCopyFamilyCode}
                sx={{
                  backgroundColor: "rgba(56, 189, 248, 0.15)",
                  color: "#38bdf8",
                  fontWeight: "bold",
                  fontSize: "0.72rem",
                  cursor: "pointer",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  display: { xs: "none", md: "inline-flex" }
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
              sx: { borderRadius: 2.5, minWidth: 230, maxWidth: "calc(100vw - 32px)", mt: 1, p: 0.5 }
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
        <Box display="flex" alignItems="center" gap={{ xs: 0.5, sm: 1 }}>
          {/* Dashboard: Full text button on Desktop, Icon on Mobile */}
          <Button
            color="inherit"
            component={RouterLink}
            to="/dashboard"
            sx={{ display: { xs: "none", md: "inline-flex" }, textTransform: "none", fontWeight: 600 }}
          >
            Dashboard
          </Button>
          <Tooltip title="Dashboard">
            <IconButton
              color="inherit"
              component={RouterLink}
              to="/dashboard"
              sx={{
                display: { xs: "inline-flex", md: "none" },
                p: { xs: 0.8, sm: 1 },
                borderRadius: 2,
                "&:hover": { bgcolor: "rgba(255,255,255,0.08)" }
              }}
            >
              <DashboardIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Add Expense: Full button on Desktop, Prominent Icon button on Mobile */}
          <Button
            color="inherit"
            component={RouterLink}
            to="/add-expense"
            startIcon={<AddIcon />}
            sx={{
              display: { xs: "none", md: "inline-flex" },
              textTransform: "none",
              fontWeight: 600,
              bgcolor: "rgba(56, 189, 248, 0.12)",
              color: "#38bdf8",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              borderRadius: 2,
              px: 1.5,
              "&:hover": { bgcolor: "rgba(56, 189, 248, 0.22)" }
            }}
          >
            Add Expense
          </Button>
          <Tooltip title="Add Expense">
            <IconButton
              component={RouterLink}
              to="/add-expense"
              sx={{
                display: { xs: "inline-flex", md: "none" },
                bgcolor: "#38bdf8",
                color: "#0f172a",
                p: { xs: 0.8, sm: 0.9 },
                borderRadius: 2,
                "&:hover": { bgcolor: "#7dd3fc" }
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Export Statement Dropdown Button: Full on Desktop/Tablet, Compact Icon on Mobile */}
          {exportData && (
            <>
              <Tooltip title="Download monthly report as PDF or CSV">
                <span>
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
                      display: { xs: "none", sm: "inline-flex" },
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      borderRadius: 2,
                      px: 1.5,
                      textTransform: "none",
                      fontWeight: 600,
                      "&:hover": {
                        backgroundColor: "rgba(255, 255, 255, 0.2)"
                      }
                    }}
                  >
                    {isExporting ? "Exporting..." : "Export"}
                  </Button>

                  <IconButton
                    color="inherit"
                    onClick={handleOpenExport}
                    disabled={isExporting}
                    sx={{
                      display: { xs: "inline-flex", sm: "none" },
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      borderRadius: 2,
                      p: 0.8,
                      "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" }
                    }}
                  >
                    {isExporting ? <CircularProgress size={16} color="inherit" /> : <FileDownloadIcon fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>

              <Menu
                anchorEl={anchorEl}
                open={openMenu}
                onClose={handleCloseExport}
                PaperProps={{
                  elevation: 6,
                  sx: { borderRadius: 2.5, minWidth: 220, maxWidth: "calc(100vw - 32px)", mt: 1, p: 0.5 }
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
                    p: { xs: 2, sm: 2.5 },
                    width: { xs: "calc(100vw - 32px)", sm: 330 },
                    maxWidth: 350,
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
                          sx={{ maxWidth: { xs: 125, sm: 165 }, cursor: "pointer", color: "text.primary" }}
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

                {/* Enrolled Circles Information */}
                <Box mb={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                      Your Circles
                    </Typography>
                    <Typography variant="caption" color="primary" fontWeight={700}>
                      {myCircles.length > 0 ? `${myCircles.length} circle${myCircles.length > 1 ? "s" : ""}` : "1 circle"}
                    </Typography>
                  </Box>

                  <Box sx={{ maxHeight: 220, overflowY: "auto", pr: 0.5, display: "flex", flexDirection: "column", gap: 1 }}>
                    {(myCircles.length > 0 ? myCircles : (user?.circle_name ? [{
                      circle_id: user.circle_id || user.circleId,
                      circle_name: user.circle_name,
                      family_code: user.family_code,
                      role: user.role || "MEMBER"
                    }] : [])).map((c) => {
                      const isActive = Number(c.circle_id) === Number(user?.circle_id || user?.circleId);
                      const isAdmin = c.role === "ADMIN";
                      const isPendingLeave = c.leave_request_status === "PENDING";

                      return (
                        <Box
                          key={c.circle_id}
                          sx={{
                            p: 1.25,
                            borderRadius: 2,
                            bgcolor: isActive ? "rgba(56, 189, 248, 0.06)" : "#f8fafc",
                            border: isActive ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid #e2e8f0"
                          }}
                        >
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                            <Box display="flex" alignItems="center" gap={0.8} minWidth={0}>
                              <Typography variant="body2" fontWeight="bold" noWrap sx={{ maxWidth: 150 }}>
                                {c.circle_name}
                              </Typography>
                              {isActive && (
                                <Chip
                                  label="Active"
                                  size="small"
                                  sx={{
                                    height: 16,
                                    fontSize: "0.6rem",
                                    fontWeight: 700,
                                    bgcolor: "rgba(16, 185, 129, 0.15)",
                                    color: "#059669"
                                  }}
                                />
                              )}
                            </Box>
                            <Chip
                              label={c.role}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: "0.62rem",
                                fontWeight: "bold",
                                bgcolor: isAdmin ? "rgba(124, 58, 237, 0.12)" : "rgba(2, 132, 199, 0.12)",
                                color: isAdmin ? "#7c3aed" : "#0284c7"
                              }}
                            />
                          </Box>

                          <Box display="flex" justifyContent="space-between" alignItems="center" py={0.2}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.72rem" }}>
                              Code: <strong style={{ color: "#0284c7" }}>{c.family_code}</strong>
                            </Typography>
                            <Tooltip title={copiedCode === c.family_code ? "Copied!" : "Copy Code"}>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  if (c.family_code) {
                                    navigator.clipboard.writeText(c.family_code);
                                    setCopiedCode(c.family_code);
                                    setTimeout(() => setCopiedCode(false), 2000);
                                  }
                                }}
                                sx={{ p: 0.3 }}
                              >
                                <ContentCopyIcon sx={{ fontSize: "0.8rem", color: copiedCode === c.family_code ? "#10b981" : "inherit" }} />
                              </IconButton>
                            </Tooltip>
                          </Box>

                          {/* Action Row */}
                          {isAdmin ? (
                            <Button
                              size="small"
                              variant="outlined"
                              fullWidth
                              startIcon={<PeopleIcon sx={{ fontSize: "0.95rem !important" }} />}
                              onClick={() => handleOpenManageMembers(c)}
                              sx={{
                                mt: 1,
                                py: 0.4,
                                textTransform: "none",
                                fontWeight: 600,
                                fontSize: "0.74rem",
                                borderRadius: 1.5,
                                borderColor: "#7c3aed",
                                color: "#7c3aed",
                                bgcolor: "rgba(124, 58, 237, 0.04)",
                                "&:hover": {
                                  bgcolor: "rgba(124, 58, 237, 0.1)",
                                  borderColor: "#6d28d9"
                                }
                              }}
                            >
                              Manage Members
                            </Button>
                          ) : isPendingLeave ? (
                            <Box
                              sx={{
                                mt: 1,
                                p: 0.6,
                                px: 1,
                                borderRadius: 1.5,
                                bgcolor: "#fef3c7",
                                border: "1px solid #fde68a",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between"
                              }}
                            >
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <AccessTimeIcon sx={{ fontSize: "0.85rem", color: "#d97706" }} />
                                <Typography variant="caption" sx={{ color: "#b45309", fontWeight: 700, fontSize: "0.68rem" }}>
                                  Exit Pending Approval
                                </Typography>
                              </Box>
                              <Button
                                size="small"
                                onClick={() => handleCancelLeave(c.circle_id)}
                                disabled={actionLoading}
                                sx={{
                                  textTransform: "none",
                                  fontSize: "0.68rem",
                                  minWidth: 0,
                                  p: "1px 6px",
                                  color: "#dc2626",
                                  fontWeight: 600
                                }}
                              >
                                Cancel
                              </Button>
                            </Box>
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              fullWidth
                              startIcon={<ExitToAppIcon sx={{ fontSize: "0.95rem !important" }} />}
                              onClick={() => handlePromptLeaveCircle(c)}
                              disabled={actionLoading}
                              sx={{
                                mt: 1,
                                py: 0.35,
                                textTransform: "none",
                                fontWeight: 600,
                                fontSize: "0.72rem",
                                borderRadius: 1.5,
                                borderColor: "rgba(239, 68, 68, 0.4)",
                                "&:hover": {
                                  borderColor: "#ef4444",
                                  bgcolor: "rgba(239, 68, 68, 0.05)"
                                }
                              }}
                            >
                              Leave Circle
                            </Button>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
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

          <Button
            color="inherit"
            onClick={handleLogout}
            sx={{ display: { xs: "none", md: "inline-flex" }, textTransform: "none", fontWeight: 600 }}
          >
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
        PaperProps={{
          sx: {
            m: { xs: 1.5, sm: 3 },
            width: { xs: "calc(100% - 24px)", sm: "auto" },
            borderRadius: 3
          }
        }}
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
      <Dialog
        open={showCircleModal}
        onClose={() => setShowCircleModal(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            m: { xs: 1.5, sm: 3 },
            width: { xs: "calc(100% - 24px)", sm: "auto" },
            borderRadius: 3
          }
        }}
      >
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

      {/* DIALOG FOR MANAGING CIRCLE MEMBERS (ADMIN VIEW) */}
      <Dialog
        open={manageModalOpen}
        onClose={() => !actionLoading && setManageModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            m: { xs: 1.5, sm: 3 },
            width: { xs: "calc(100% - 24px)", sm: 540 },
            borderRadius: 3.5,
            p: { xs: 0.5, sm: 1 }
          }
        }}
      >
        <DialogTitle sx={{ pb: 1, pt: 2, px: { xs: 2, sm: 3 }, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            <Box display="flex" alignItems="center" gap={1}>
              <PeopleIcon sx={{ color: "#7c3aed" }} />
              <Typography variant="h6" fontWeight="bold">
                {selectedCircle?.circle_name} Members
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Invite Code: <strong style={{ color: "#0284c7" }}>{selectedCircle?.family_code}</strong> • {membersList.length} {membersList.length === 1 ? "member" : "members"}
            </Typography>
          </Box>
          <IconButton onClick={() => setManageModalOpen(false)} size="small" sx={{ color: "text.secondary" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: { xs: 2, sm: 3 }, pb: 3 }}>
          {membersFeedback.error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setMembersFeedback({ ...membersFeedback, error: "" })}
            >
              {membersFeedback.error}
            </Alert>
          )}
          {membersFeedback.success && (
            <Alert
              severity="success"
              sx={{ mb: 2 }}
              onClose={() => setMembersFeedback({ ...membersFeedback, success: "" })}
            >
              {membersFeedback.success}
            </Alert>
          )}

          {/* Pending Exit Requests Notification Banner */}
          {membersList.some((m) => m.leave_request_status === "PENDING") && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: "#fffbeb", border: "1px solid #fef3c7", borderRadius: 2 }}>
              <Typography variant="caption" fontWeight="bold" color="#b45309" display="block" mb={0.8}>
                ⏳ PENDING EXIT APPROVALS
              </Typography>
              {membersList
                .filter((m) => m.leave_request_status === "PENDING")
                .map((pendingM) => (
                  <Box
                    key={pendingM.member_id}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    py={0.5}
                    flexWrap="wrap"
                    gap={1}
                  >
                    <Typography variant="body2" fontWeight={600} color="#78350f">
                      {pendingM.first_name} ({pendingM.name}) requested to leave
                    </Typography>
                    <Box display="flex" gap={1}>
                      <Button
                        size="small"
                        variant="contained"
                        color="error"
                        disabled={actionLoading}
                        onClick={() => handleApproveLeaveMember(pendingM)}
                        sx={{ textTransform: "none", fontSize: "0.72rem", py: 0.3, px: 1.2, borderRadius: 1.5, fontWeight: "bold" }}
                      >
                        Approve Exit
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={actionLoading}
                        onClick={() => handleRejectLeaveMember(pendingM)}
                        sx={{ textTransform: "none", fontSize: "0.72rem", py: 0.3, px: 1.2, borderRadius: 1.5 }}
                      >
                        Reject
                      </Button>
                    </Box>
                  </Box>
                ))}
            </Box>
          )}

          {membersLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={32} />
            </Box>
          ) : membersList.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
              No active members found in this circle.
            </Typography>
          ) : (
            <List disablePadding>
              {membersList.map((member, index) => {
                const isCurrentUser =
                  member.is_current_user || Number(member.user_id) === Number(user?.user_id);
                const isAdmin = member.role === "ADMIN";

                return (
                  <React.Fragment key={member.member_id}>
                    {index > 0 && <Divider sx={{ my: 0.8 }} />}
                    <ListItem
                      disableGutters
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        py: 1,
                        px: { xs: 0.5, sm: 1 },
                        borderRadius: 2,
                        "&:hover": { bgcolor: "#f8fafc" }
                      }}
                    >
                      {/* Left: Avatar + Names */}
                      <Box display="flex" alignItems="center" gap={1.5} minWidth={0} sx={{ flex: 1 }}>
                        <Avatar
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: isAdmin ? "#7c3aed" : "#0284c7",
                            fontWeight: "bold",
                            fontSize: "1rem",
                            boxShadow: "0 2px 5px rgba(0,0,0,0.12)"
                          }}
                        >
                          {member.first_name ? member.first_name[0].toUpperCase() : "M"}
                        </Avatar>
                        <Box minWidth={0}>
                          <Box display="flex" alignItems="center" gap={0.8} flexWrap="wrap">
                            {/* Prominent First Name as user specified */}
                            <Typography
                              variant="subtitle2"
                              fontWeight="bold"
                              color="text.primary"
                              sx={{ fontSize: "0.95rem" }}
                            >
                              {member.first_name}
                            </Typography>

                            <Chip
                              label={member.role}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: "0.62rem",
                                fontWeight: "bold",
                                bgcolor: isAdmin ? "rgba(124, 58, 237, 0.12)" : "rgba(2, 132, 199, 0.12)",
                                color: isAdmin ? "#7c3aed" : "#0284c7"
                              }}
                            />

                            {isCurrentUser && (
                              <Chip
                                label="You"
                                size="small"
                                variant="outlined"
                                sx={{ height: 18, fontSize: "0.62rem", color: "text.secondary" }}
                              />
                            )}

                            {member.leave_request_status === "PENDING" && (
                              <Chip
                                label="Exit Requested"
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: "0.62rem",
                                  fontWeight: 700,
                                  bgcolor: "#fef3c7",
                                  color: "#b45309"
                                }}
                              />
                            )}
                          </Box>

                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", mt: 0.2 }}>
                            {member.name} {member.email ? `• ${member.email}` : ""} • ID #{member.member_id}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Right: Delete button in front of member */}
                      <Box ml={1} flexShrink={0}>
                        {isCurrentUser ? (
                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic", pr: 1 }}>
                            Admin
                          </Typography>
                        ) : (
                          <Tooltip title={`Remove ${member.first_name} from this circle`}>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              startIcon={<DeleteOutlineIcon fontSize="small" />}
                              onClick={() => setDeleteConfirmDialog({ open: true, member })}
                              disabled={actionLoading}
                              sx={{
                                textTransform: "none",
                                fontWeight: 600,
                                fontSize: "0.75rem",
                                borderRadius: 2,
                                px: { xs: 1, sm: 1.5 },
                                borderColor: "rgba(239, 68, 68, 0.4)",
                                "&:hover": {
                                  borderColor: "#ef4444",
                                  bgcolor: "rgba(239, 68, 68, 0.08)"
                                }
                              }}
                            >
                              Delete
                            </Button>
                          </Tooltip>
                        )}
                      </Box>
                    </ListItem>
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG FOR CONFIRMING MEMBER REMOVAL */}
      <Dialog
        open={deleteConfirmDialog.open}
        onClose={() => !actionLoading && setDeleteConfirmDialog({ open: false, member: null })}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: "bold", pb: 1, color: "#dc2626" }}>
          Remove Circle Member?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.primary" mb={1.5}>
            Are you sure you want to remove <strong>{deleteConfirmDialog.member?.first_name}</strong> ({deleteConfirmDialog.member?.name}) from <strong>{selectedCircle?.circle_name}</strong>?
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Note: Past expense and settlement history will be retained for accounting balance integrity, but they will no longer have access to this circle.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteConfirmDialog({ open: false, member: null })}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDeleteMember}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <DeleteOutlineIcon />}
            sx={{ fontWeight: "bold" }}
          >
            {actionLoading ? "Removing..." : "Remove Member"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG FOR CONFIRMING LEAVE CIRCLE REQUEST */}
      <Dialog
        open={leaveConfirmDialog.open}
        onClose={() => !actionLoading && setLeaveConfirmDialog({ open: false, circle: null })}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: "bold", pb: 1, color: "#ea580c" }}>
          Request to Leave Circle?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.primary" mb={1.5}>
            Are you sure you want to request to leave <strong>{leaveConfirmDialog.circle?.circle_name}</strong>?
          </Typography>
          <Typography variant="caption" color="text.secondary">
            A leave request will be sent to the Circle Admin for review. You will be removed from this circle once the Admin approves your request.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setLeaveConfirmDialog({ open: false, circle: null })}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmLeaveCircle}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <ExitToAppIcon />}
            sx={{
              fontWeight: "bold",
              bgcolor: "#ea580c",
              color: "#fff",
              "&:hover": { bgcolor: "#c2410c" }
            }}
          >
            {actionLoading ? "Submitting..." : "Send Leave Request"}
          </Button>
        </DialogActions>
      </Dialog>
    </AppBar>
  );
};

export default Navbar;