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
  Tooltip
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import HandshakeIcon from "@mui/icons-material/Handshake";
import {
  getPendingSettlements,
  confirmSettlement,
  rejectSettlement
} from "../../services/apiServices";

const NotificationBell = ({ currentUser, onSettlementUpdated }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [pendingList, setPendingList] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  const fetchPending = useCallback(() => {
    if (!currentUser) return;
    getPendingSettlements()
      .then((res) => {
        if (Array.isArray(res.data)) {
          setPendingList(res.data);
        }
      })
      .catch((err) => {
        console.error("Error fetching pending settlements:", err);
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
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleConfirm = async (settlementId) => {
    setLoadingId(settlementId);
    try {
      await confirmSettlement(settlementId);
      // Remove from local list immediately
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

  const open = Boolean(anchorEl);
  const count = pendingList.length;

  return (
    <>
      <Tooltip title={count > 0 ? `${count} pending settlement approval${count > 1 ? "s" : ""}` : "No new notifications"}>
        <IconButton
          color="inherit"
          onClick={handleOpen}
          sx={{
            p: 1,
            backgroundColor: count > 0 ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.08)",
            borderRadius: 2,
            transition: "all 0.2s ease",
            "&:hover": {
              backgroundColor: count > 0 ? "rgba(239, 68, 68, 0.3)" : "rgba(255, 255, 255, 0.18)"
            }
          }}
        >
          <Badge badgeContent={count} color="error">
            <NotificationsIcon sx={{ color: count > 0 ? "#fca5a5" : "#ffffff" }} />
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
            width: { xs: 300, sm: 360 },
            borderRadius: 3,
            overflow: "hidden",
            mt: 1.5,
            border: "1px solid #e2e8f0"
          }
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, backgroundColor: "#0f172a", color: "#ffffff", display: "flex", alignItems: "center", gap: 1 }}>
          <HandshakeIcon sx={{ color: "#38bdf8" }} />
          <div>
            <Typography variant="subtitle2" fontWeight="bold">
              Settlement Verifications
            </Typography>
            <Typography variant="caption" sx={{ color: "#94a3b8" }}>
              {count > 0 ? `${count} request${count > 1 ? "s" : ""} waiting for your confirmation` : "All settled up!"}
            </Typography>
          </div>
        </Box>

        <Divider />

        {/* Content */}
        {count === 0 ? (
          <Box p={3} textAlign="center">
            <Typography variant="body2" color="text.secondary">
              No pending settlement requests.
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
              When someone pays you, their confirmation request will show up here.
            </Typography>
          </Box>
        ) : (
          <List disablePadding sx={{ maxHeight: 380, overflowY: "auto" }}>
            {pendingList.map((item, idx) => {
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
            })}
          </List>
        )}
      </Popover>
    </>
  );
};

export default NotificationBell;
