import React, { useState, useEffect, useCallback } from "react";
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Button,
  Stack,
  CircularProgress,
  Tooltip,
  Tabs,
  Tab
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import {
  getPendingSettlements,
  confirmSettlement,
  rejectSettlement,
  getPendingLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest
} from "../../services/apiServices";

const NotificationBell = ({ currentUser, onSettlementUpdated }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [pendingList, setPendingList] = useState([]);
  const [pendingLeaveList, setPendingLeaveList] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  const fetchPending = useCallback(() => {
    if (!currentUser) return;

    // 1. Fetch pending settlements
    getPendingSettlements()
      .then((res) => {
        if (Array.isArray(res.data)) {
          setPendingList(res.data);
        }
      })
      .catch((err) => {
        console.error("Error fetching pending settlements:", err);
      });

    // 2. Fetch pending circle leave requests (for admins)
    getPendingLeaveRequests()
      .then((res) => {
        if (Array.isArray(res.data?.requests)) {
          setPendingLeaveList(res.data.requests);
        }
      })
      .catch((err) => {
        console.error("Error fetching pending leave requests:", err);
      });
  }, [currentUser]);

  // Initial fetch and smart focus-based polling
  useEffect(() => {
    fetchPending();

    const handleFocus = () => fetchPending();
    window.addEventListener("focus", handleFocus);

    // Lightweight 30s background poll
    const interval = setInterval(fetchPending, 30000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [fetchPending]);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
    fetchPending();
    // Default to whichever tab has items
    if (pendingList.length === 0 && pendingLeaveList.length > 0) {
      setActiveTab(1);
    } else {
      setActiveTab(0);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleConfirm = async (settlementId) => {
    setLoadingId(settlementId);
    try {
      await confirmSettlement(settlementId);
      setPendingList((prev) => prev.filter((s) => s.settlement_id !== settlementId));
      if (onSettlementUpdated) onSettlementUpdated();
    } catch (err) {
      console.error("Error confirming settlement:", err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (settlementId) => {
    setLoadingId(settlementId);
    try {
      await rejectSettlement(settlementId);
      setPendingList((prev) => prev.filter((s) => s.settlement_id !== settlementId));
      if (onSettlementUpdated) onSettlementUpdated();
    } catch (err) {
      console.error("Error rejecting settlement:", err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleApproveLeave = async (requestId) => {
    setLoadingId(`leave-${requestId}`);
    try {
      await approveLeaveRequest(requestId);
      setPendingLeaveList((prev) => prev.filter((r) => r.request_id !== requestId));
      if (onSettlementUpdated) onSettlementUpdated();
    } catch (err) {
      console.error("Error approving leave request:", err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleRejectLeave = async (requestId) => {
    setLoadingId(`leave-${requestId}`);
    try {
      await rejectLeaveRequest(requestId);
      setPendingLeaveList((prev) => prev.filter((r) => r.request_id !== requestId));
      if (onSettlementUpdated) onSettlementUpdated();
    } catch (err) {
      console.error("Error rejecting leave request:", err);
    } finally {
      setLoadingId(null);
    }
  };

  const open = Boolean(anchorEl);
  const settlementCount = pendingList.length;
  const leaveCount = pendingLeaveList.length;
  const totalCount = settlementCount + leaveCount;

  return (
    <>
      <Tooltip title={totalCount > 0 ? `${totalCount} pending notification${totalCount > 1 ? "s" : ""}` : "No new notifications"}>
        <IconButton
          color="inherit"
          onClick={handleOpen}
          sx={{
            p: 1,
            backgroundColor: totalCount > 0 ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.08)",
            borderRadius: 2,
            transition: "all 0.2s ease",
            "&:hover": {
              backgroundColor: totalCount > 0 ? "rgba(239, 68, 68, 0.3)" : "rgba(255, 255, 255, 0.18)"
            }
          }}
        >
          <Badge badgeContent={totalCount} color="error">
            <NotificationsIcon sx={{ color: totalCount > 0 ? "#fca5a5" : "#ffffff" }} />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right"
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right"
        }}
        PaperProps={{
          elevation: 10,
          sx: {
            width: { xs: "calc(100vw - 32px)", sm: 360 },
            maxWidth: 360,
            borderRadius: 3,
            overflow: "hidden",
            mt: 1.5,
            border: "1px solid #e2e8f0"
          }
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, backgroundColor: "#0f172a", color: "#ffffff", display: "flex", alignItems: "center", gap: 1 }}>
          <NotificationsIcon sx={{ color: "#38bdf8" }} />
          <div>
            <Typography variant="subtitle2" fontWeight="bold">
              Notifications & Approvals
            </Typography>
            <Typography variant="caption" sx={{ color: "#94a3b8" }}>
              {totalCount > 0 ? `${totalCount} pending request${totalCount > 1 ? "s" : ""} waiting for your action` : "All caught up!"}
            </Typography>
          </div>
        </Box>

        {/* Multi-Tab Switcher if both types exist */}
        {settlementCount > 0 && leaveCount > 0 && (
          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
            sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "#f8fafc" }}
          >
            <Tab
              label={`Settlements (${settlementCount})`}
              sx={{ textTransform: "none", fontSize: "0.75rem", fontWeight: 700, minHeight: 40 }}
            />
            <Tab
              label={`Member Leaves (${leaveCount})`}
              sx={{ textTransform: "none", fontSize: "0.75rem", fontWeight: 700, minHeight: 40 }}
            />
          </Tabs>
        )}

        <Divider />

        {/* Content Body */}
        {totalCount === 0 ? (
          <Box p={3} textAlign="center">
            <Typography variant="body2" color="text.secondary">
              No pending notifications.
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
              Settlement verifications and circle leave approvals will appear here.
            </Typography>
          </Box>
        ) : (
          <List disablePadding sx={{ maxHeight: 380, overflowY: "auto" }}>
            {/* TAB 0: SETTLEMENTS */}
            {((settlementCount > 0 && leaveCount === 0) || (settlementCount > 0 && leaveCount > 0 && activeTab === 0)) && (
              pendingList.map((item, idx) => {
                const isProcessing = loadingId === item.settlement_id;
                return (
                  <ListItem
                    key={item.settlement_id || idx}
                    alignItems="flex-start"
                    sx={{
                      flexDirection: "column",
                      p: 2,
                      borderBottom: "1px solid #f1f5f9",
                      backgroundColor: "#ffffff",
                      "&:hover": { backgroundColor: "#f8fafc" }
                    }}
                  >
                    <Box display="flex" alignItems="center" width="100%" mb={1}>
                      <ListItemAvatar sx={{ minWidth: 42 }}>
                        <Avatar sx={{ bgcolor: "#0284c7", width: 34, height: 34, fontSize: "0.85rem" }}>
                          {item.payer_name ? item.payer_name.charAt(0) : "P"}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight="bold" sx={{ color: "#0f172a" }}>
                            {item.payer_name} sent you ₹{Number(item.amount).toLocaleString("en-IN")}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            Period: Month {item.month}/{item.year}
                          </Typography>
                        }
                      />
                    </Box>

                    {/* Actions for receiver */}
                    <Stack direction="row" spacing={1} width="100%" justifyContent="flex-end" mt={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        disabled={isProcessing}
                        startIcon={<CloseIcon />}
                        onClick={() => handleReject(item.settlement_id)}
                        sx={{ textTransform: "none", fontSize: "0.75rem", borderRadius: 1.5, py: 0.5 }}
                      >
                        Not Received
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        disabled={isProcessing}
                        startIcon={isProcessing ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
                        onClick={() => handleConfirm(item.settlement_id)}
                        sx={{ textTransform: "none", fontSize: "0.75rem", borderRadius: 1.5, py: 0.5 }}
                      >
                        Confirm Received
                      </Button>
                    </Stack>
                  </ListItem>
                );
              })
            )}

            {/* TAB 1: CIRCLE MEMBER LEAVE REQUESTS */}
            {((leaveCount > 0 && settlementCount === 0) || (leaveCount > 0 && settlementCount > 0 && activeTab === 1)) && (
              pendingLeaveList.map((item, idx) => {
                const isProcessing = loadingId === `leave-${item.request_id}`;
                return (
                  <ListItem
                    key={item.request_id || idx}
                    alignItems="flex-start"
                    sx={{
                      flexDirection: "column",
                      p: 2,
                      borderBottom: "1px solid #f1f5f9",
                      backgroundColor: "#ffffff",
                      "&:hover": { backgroundColor: "#f8fafc" }
                    }}
                  >
                    <Box display="flex" alignItems="center" width="100%" mb={1}>
                      <ListItemAvatar sx={{ minWidth: 42 }}>
                        <Avatar sx={{ bgcolor: "#ef4444", width: 34, height: 34, fontSize: "0.85rem" }}>
                          {item.first_name ? item.first_name.charAt(0) : "M"}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight="bold" sx={{ color: "#0f172a" }}>
                            {item.first_name || item.member_name} wants to leave {item.circle_name}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            Circle: {item.circle_name} • {item.member_email || "Member"}
                          </Typography>
                        }
                      />
                    </Box>

                    {/* Actions for admin */}
                    <Stack direction="row" spacing={1} width="100%" justifyContent="flex-end" mt={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        disabled={isProcessing}
                        startIcon={<CloseIcon />}
                        onClick={() => handleRejectLeave(item.request_id)}
                        sx={{ textTransform: "none", fontSize: "0.75rem", borderRadius: 1.5, py: 0.5 }}
                      >
                        Reject
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        color="error"
                        disabled={isProcessing}
                        startIcon={isProcessing ? <CircularProgress size={14} color="inherit" /> : <PersonRemoveIcon />}
                        onClick={() => handleApproveLeave(item.request_id)}
                        sx={{ textTransform: "none", fontSize: "0.75rem", borderRadius: 1.5, py: 0.5 }}
                      >
                        Approve Exit
                      </Button>
                    </Stack>
                  </ListItem>
                );
              })
            )}
          </List>
        )}
      </Popover>
    </>
  );
};

export default NotificationBell;

