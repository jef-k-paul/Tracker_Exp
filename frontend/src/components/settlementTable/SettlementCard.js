import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Paper,
  Typography,
  Card,
  CardContent,
  Box,
  Chip,
  Avatar,
  Stack,
  Button,
  CircularProgress,
  IconButton,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import SavingsIcon from "@mui/icons-material/Savings";
import HandshakeIcon from "@mui/icons-material/Handshake";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CancelScheduleSendIcon from "@mui/icons-material/CancelScheduleSend";
import {
  initiateSettlement,
  confirmSettlement,
  rejectSettlement,
  cancelSettlement
} from "../../services/apiServices";
import SettlementBreakdownModal from "./SettlementBreakdownModal";

const REJECTION_REASONS = [
  "Payment not credited to bank / UPI account",
  "Amount received was incorrect",
  "Sent to wrong account / person",
  "Duplicate payment claim"
];

const SettlementCard = ({
  settlements = [],
  expenses = [],
  summary = {},
  currentUser,
  selectedMonth = 1,
  selectedYear = new Date().getFullYear(),
  onSettlementUpdated
}) => {
  const [loadingActionId, setLoadingActionId] = useState(null);
  const [breakdownItem, setBreakdownItem] = useState(null);

  // Reject Reason Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetItem, setRejectTargetItem] = useState(null);
  const [selectedReason, setSelectedReason] = useState(REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState("");

  // Dismissed Rejections for this session
  const [dismissedRejections, setDismissedRejections] = useState([]);

  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const loggedInName = currentUser?.name?.toLowerCase();

  // Separate rejected alerts from active settlement cards
  const rejectedSettlements = settlements.filter(
    (s) => s.status === "REJECTED" && !dismissedRejections.includes(s.settlement_id)
  );
  const visibleCards = settlements.filter((s) => s.status !== "REJECTED");

  const confirmedCount = visibleCards.filter((s) => s.status === "CONFIRMED").length;
  const activeCount = visibleCards.filter((s) => s.status !== "CONFIRMED").length;

  const checkScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    checkScrollState();
    const handleResize = () => checkScrollState();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [visibleCards, checkScrollState]);

  const handleScroll = (direction) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild ? el.firstElementChild.offsetWidth + 20 : 340;
    const scrollAmount = direction === "left" ? -cardWidth : cardWidth;
    el.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  const handleInitiate = async (item, index) => {
    const actionKey = `initiate-${index}`;
    setLoadingActionId(actionKey);

    try {
      await initiateSettlement({
        receiverId: item.to_id,
        amount: item.amount,
        month: selectedMonth,
        year: selectedYear,
        notes: `Settlement between ${item.from} and ${item.to}`
      });

      if (onSettlementUpdated) {
        onSettlementUpdated();
      }
    } catch (err) {
      console.error("Error initiating settlement:", err);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleConfirm = async (settlementId) => {
    setLoadingActionId(`confirm-${settlementId}`);
    try {
      await confirmSettlement(settlementId);
      if (onSettlementUpdated) {
        onSettlementUpdated();
      }
    } catch (err) {
      console.error("Error confirming settlement:", err);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleOpenRejectModal = (item) => {
    setRejectTargetItem(item);
    setSelectedReason(REJECTION_REASONS[0]);
    setCustomReason("");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectTargetItem) return;
    const finalReason = customReason.trim() || selectedReason;
    setLoadingActionId(`reject-${rejectTargetItem.settlement_id}`);
    setRejectModalOpen(false);

    try {
      await rejectSettlement(rejectTargetItem.settlement_id, finalReason);
      if (onSettlementUpdated) {
        onSettlementUpdated();
      }
    } catch (err) {
      console.error("Error rejecting settlement:", err);
    } finally {
      setLoadingActionId(null);
      setRejectTargetItem(null);
    }
  };

  const handleCancelPending = async (settlementId) => {
    if (!window.confirm("Are you sure you want to cancel this pending payment request?")) {
      return;
    }
    setLoadingActionId(`cancel-${settlementId}`);
    try {
      await cancelSettlement(settlementId);
      if (onSettlementUpdated) {
        onSettlementUpdated();
      }
    } catch (err) {
      console.error("Error cancelling settlement:", err);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleDismissRejection = (settlementId) => {
    setDismissedRejections((prev) => [...prev, settlementId]);
  };

  return (
    <Paper elevation={3} sx={{ p: { xs: 1.5, sm: 3 }, mb: { xs: 2.5, sm: 4 }, borderRadius: 3 }}>
      {/* Rejection Alert Banners for Payer or Receiver */}
      {rejectedSettlements.map((rej, idx) => {
        const isPayerOfRejection = rej.from.toLowerCase() === loggedInName;
        const isReceiverOfRejection = rej.to.toLowerCase() === loggedInName;
        if (!isPayerOfRejection && !isReceiverOfRejection) return null;

        return (
          <Alert
            key={idx}
            severity="warning"
            sx={{ mb: 2.5, borderRadius: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => handleDismissRejection(rej.settlement_id)}>
                Dismiss
              </Button>
            }
          >
            <Typography variant="subtitle2" fontWeight="bold">
              {isPayerOfRejection
                ? `Your payment of ₹${rej.amount} to ${rej.to} was marked as Not Received`
                : `You marked payment of ₹${rej.amount} from ${rej.from} as Not Received`}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: "0.85rem", mt: 0.3 }}>
              Reason: "{rej.rejection_reason || "Payment not credited to account"}". {isPayerOfRejection ? "Please verify your bank / UPI statement and discuss with " + rej.to + "." : ""}
            </Typography>
          </Alert>
        );
      })}

      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
        <Box display="flex" alignItems="center">
          <HandshakeIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
          <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}>
            Settlement Recommendations & Handshake
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label="Two-Party Verification"
            size="small"
            variant="outlined"
            color="primary"
            sx={{ fontSize: "0.7rem", fontWeight: 600 }}
          />
          {visibleCards.length > 0 && (
            <Chip
              label={`${visibleCards.length} settlement${visibleCards.length > 1 ? "s" : ""}${
                confirmedCount > 0 ? ` (${confirmedCount} settled)` : ""
              }`}
              size="small"
              sx={{ fontSize: "0.7rem", fontWeight: 600, backgroundColor: "#f1f5f9" }}
            />
          )}
          {activeCount === 0 && confirmedCount > 0 && (
            <Chip
              label="All Debts Settled 🎉"
              size="small"
              color="success"
              sx={{ fontSize: "0.7rem", fontWeight: 600 }}
            />
          )}
          {visibleCards.length > 0 && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Tooltip title="Scroll left">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => handleScroll("left")}
                    disabled={!canScrollLeft}
                    sx={{
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#ffffff",
                      p: 0.5,
                      "&:hover": { backgroundColor: "#f1f5f9" },
                      "&.Mui-disabled": { opacity: 0.35 }
                    }}
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Scroll right">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => handleScroll("right")}
                    disabled={!canScrollRight}
                    sx={{
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#ffffff",
                      p: 0.5,
                      "&:hover": { backgroundColor: "#f8fafc" },
                      "&.Mui-disabled": { opacity: 0.35 }
                    }}
                  >
                    <ChevronRightIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          )}
        </Stack>
      </Box>

      {visibleCards.length === 0 ? (
        <Card
          elevation={0}
          sx={{
            p: 3,
            textAlign: "center",
            backgroundColor: "#f0fdf4",
            border: "1px dashed #22c55e",
            borderRadius: 3
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 48, color: "#16a34a", mb: 1 }} />
          <Typography variant="h6" color="success.main" fontWeight="bold">
            All Settled Up! 🎉
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No pending settlements recorded for this month.
          </Typography>
        </Card>
      ) : (
        <Box
          ref={scrollContainerRef}
          onScroll={checkScrollState}
          sx={{
            display: "flex",
            gap: 2.5,
            overflowX: "auto",
            scrollBehavior: "smooth",
            scrollSnapType: "x mandatory",
            py: 1,
            px: 0.5,
            scrollbarWidth: "thin",
            "&::-webkit-scrollbar": {
              height: "6px"
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "#cbd5e1",
              borderRadius: "10px"
            },
            "&::-webkit-scrollbar-thumb:hover": {
              backgroundColor: "#94a3b8"
            }
          }}
        >
          {visibleCards.map((item, index) => {
            const isPayer = item.from.toLowerCase() === loggedInName;
            const isReceiver = item.to.toLowerCase() === loggedInName;
            const isPending = item.status === "PENDING";
            const isConfirmed = item.status === "CONFIRMED";

            // Color grading & styling
            let cardBg = "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)";
            let borderColor = "#cbd5e1";
            let icon = <ArrowForwardIcon color="action" />;
            let badgeText = "Neutral Settlement";
            let badgeColor = "default";

            if (isConfirmed) {
              cardBg = "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)";
              borderColor = "#86efac";
              icon = <CheckCircleIcon sx={{ color: "#16a34a" }} />;
              badgeText = "Settled & Acknowledged ✅";
              badgeColor = "success";
            } else if (isPayer) {
              cardBg = isPending
                ? "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)"
                : "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)";
              borderColor = isPending ? "#fcd34d" : "#fca5a5";
              icon = isPending ? <HourglassEmptyIcon color="warning" /> : <WarningAmberIcon color="error" />;
              badgeText = isPending ? "Verification Pending ⏳" : "You Need To Pay";
              badgeColor = isPending ? "warning" : "error";
            } else if (isReceiver) {
              cardBg = isPending
                ? "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)"
                : "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)";
              borderColor = isPending ? "#34d399" : "#86efac";
              icon = isPending ? <HandshakeIcon color="success" /> : <SavingsIcon color="success" />;
              badgeText = isPending ? "Payment To Confirm! 🔔" : "You Will Receive";
              badgeColor = "success";
            }

            return (
              <Box
                key={index}
                sx={{
                  flex: {
                    xs: "0 0 85%",
                    sm: "0 0 calc(50% - 10px)",
                    md: "0 0 calc((100% - 40px) / 3)"
                  },
                  width: {
                    xs: "85%",
                    sm: "calc(50% - 10px)",
                    md: "calc((100% - 40px) / 3)"
                  },
                  maxWidth: {
                    sm: "calc(50% - 10px)",
                    md: "calc((100% - 40px) / 3)"
                  },
                  minWidth: { xs: "240px", sm: "280px", md: "310px" },
                  flexShrink: 0,
                  scrollSnapAlign: "start"
                }}
              >
                <Card
                  elevation={2}
                  sx={{
                    borderRadius: 3,
                    background: cardBg,
                    border: `1.5px solid ${borderColor}`,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "transform 0.2s ease-in-out",
                    "&:hover": {
                      transform: "translateY(-3px)",
                      boxShadow: 4
                    }
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 2.5 }, "&:last-child": { pb: { xs: 2, sm: 2.5 } } }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                      <Chip
                        label={badgeText}
                        color={badgeColor}
                        size="small"
                        sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
                      />
                      {icon}
                    </Box>

                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                      <Box display="flex" alignItems="center">
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            fontSize: "0.85rem",
                            bgcolor: isPayer ? "#dc2626" : "#475569",
                            mr: 1
                          }}
                        >
                          {item.from.charAt(0)}
                        </Avatar>
                        <Typography variant="body1" fontWeight={isPayer ? "bold" : "normal"}>
                          {isPayer ? "You" : item.from}
                        </Typography>
                      </Box>

                      <ArrowForwardIcon sx={{ fontSize: 18, color: "text.secondary" }} />

                      <Box display="flex" alignItems="center">
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            fontSize: "0.85rem",
                            bgcolor: isReceiver ? "#16a34a" : "#475569",
                            mr: 1
                          }}
                        >
                          {item.to.charAt(0)}
                        </Avatar>
                        <Typography variant="body1" fontWeight={isReceiver ? "bold" : "normal"}>
                          {isReceiver ? "You" : item.to}
                        </Typography>
                      </Box>
                    </Stack>

                    <Box mt={2} pt={1} borderTop="1px dashed #cbd5e1" textAlign="center">
                      <Typography variant="caption" color="text.secondary">
                        Settlement Amount
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight="bold"
                        sx={{
                          color: isConfirmed
                            ? "success.main"
                            : isPayer
                            ? "error.main"
                            : isReceiver
                            ? "success.main"
                            : "primary.main"
                        }}
                      >
                        ₹{Number(item.amount).toLocaleString("en-IN")}
                      </Typography>

                      {/* How Was This Calculated Button */}
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<HelpOutlineIcon sx={{ fontSize: 14 }} />}
                        onClick={() => setBreakdownItem(item)}
                        sx={{
                          textTransform: "none",
                          fontSize: "0.72rem",
                          color: "text.secondary",
                          py: 0.2,
                          mt: 0.5,
                          "&:hover": { color: "primary.main", backgroundColor: "rgba(2, 132, 199, 0.08)" }
                        }}
                      >
                        How was this calculated? 🔍
                      </Button>
                    </Box>

                    {/* TWO-PARTY HANDSHAKE INTERACTIVE ACTIONS OR ACKNOWLEDGEMENT */}
                    <Box
                      mt={1.5}
                      pt={1.5}
                      borderTop={
                        isConfirmed
                          ? "1px solid rgba(22, 163, 74, 0.2)"
                          : "1px solid rgba(0, 0, 0, 0.06)"
                      }
                    >
                      {isConfirmed && (
                        <Box textAlign="center" py={0.5}>
                          <Stack direction="row" spacing={0.8} justifyContent="center" alignItems="center">
                            <CheckCircleIcon sx={{ fontSize: 18, color: "#16a34a" }} />
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: "bold", color: "#15803d", fontSize: "0.8rem" }}
                            >
                              {isPayer
                                ? `Paid by You • Confirmed by ${item.to}`
                                : isReceiver
                                ? `Received from ${item.from} • Confirmed by You`
                                : `Settled: ${item.from} → ${item.to}`}
                            </Typography>
                          </Stack>
                          {item.confirmed_at && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: "#16a34a",
                                opacity: 0.85,
                                fontSize: "0.68rem",
                                display: "block",
                                mt: 0.3
                              }}
                            >
                              Acknowledged on{" "}
                              {new Date(item.confirmed_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </Typography>
                          )}
                        </Box>
                      )}

                      {!isConfirmed && isPayer && (
                        <>
                          {isPending ? (
                            <Box textAlign="center">
                              <Chip
                                icon={<HourglassEmptyIcon sx={{ fontSize: "15px !important" }} />}
                                label={`Waiting for ${item.to} to confirm`}
                                size="small"
                                color="warning"
                                sx={{ fontWeight: 600, fontSize: "0.72rem", mb: 1 }}
                              />
                              <Button
                                fullWidth
                                variant="outlined"
                                color="inherit"
                                size="small"
                                startIcon={<CancelScheduleSendIcon sx={{ fontSize: 15 }} />}
                                disabled={loadingActionId !== null}
                                onClick={() => handleCancelPending(item.settlement_id)}
                                sx={{
                                  textTransform: "none",
                                  fontSize: "0.72rem",
                                  color: "text.secondary",
                                  borderColor: "#cbd5e1",
                                  borderRadius: 2
                                }}
                              >
                                Cancel Payment Request
                              </Button>
                            </Box>
                          ) : (
                            <Button
                              fullWidth
                              variant="contained"
                              color="error"
                              size="small"
                              startIcon={
                                loadingActionId === `initiate-${index}` ? (
                                  <CircularProgress size={16} color="inherit" />
                                ) : (
                                  <HandshakeIcon />
                                )
                              }
                              disabled={loadingActionId !== null}
                              onClick={() => handleInitiate(item, index)}
                              sx={{
                                textTransform: "none",
                                fontWeight: "bold",
                                borderRadius: 2,
                                py: 0.8
                              }}
                            >
                              I Have Paid ₹{Number(item.amount).toLocaleString("en-IN")}
                            </Button>
                          )}
                        </>
                      )}

                      {!isConfirmed && isReceiver && (
                        <>
                          {isPending && item.settlement_id ? (
                            <Stack direction="row" spacing={1}>
                              <Button
                                fullWidth
                                variant="outlined"
                                color="error"
                                size="small"
                                startIcon={<CloseIcon />}
                                disabled={loadingActionId !== null}
                                onClick={() => handleOpenRejectModal(item)}
                                sx={{ textTransform: "none", fontSize: "0.75rem", borderRadius: 2 }}
                              >
                                Not Received
                              </Button>
                              <Button
                                fullWidth
                                variant="contained"
                                color="success"
                                size="small"
                                startIcon={
                                  loadingActionId === `confirm-${item.settlement_id}` ? (
                                    <CircularProgress size={16} color="inherit" />
                                  ) : (
                                    <CheckIcon />
                                  )
                                }
                                disabled={loadingActionId !== null}
                                onClick={() => handleConfirm(item.settlement_id)}
                                sx={{ textTransform: "none", fontSize: "0.75rem", fontWeight: "bold", borderRadius: 2 }}
                              >
                                Confirm
                              </Button>
                            </Stack>
                          ) : (
                            <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
                              Waiting for {item.from} to initiate payment
                            </Typography>
                          )}
                        </>
                      )}

                      {!isConfirmed && !isPayer && !isReceiver && (
                        <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
                          {isPending ? "Payment verification in progress" : "Pending member settlement"}
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            );
          })}
        </Box>
      )}

      {/* How Was This Calculated Breakdown Modal */}
      <SettlementBreakdownModal
        open={Boolean(breakdownItem)}
        onClose={() => setBreakdownItem(null)}
        settlementItem={breakdownItem}
        expenses={expenses}
        summary={summary}
        currentUser={currentUser}
      />

      {/* Rejection Feedback Dialog */}
      <Dialog
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: "bold", pb: 1 }}>
          Confirm Payment Not Received
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Please select a reason so <strong>{rejectTargetItem?.from}</strong> understands why this payment was not verified:
          </Typography>

          <Stack spacing={1} mb={2}>
            {REJECTION_REASONS.map((r, i) => (
              <Chip
                key={i}
                label={r}
                clickable
                color={selectedReason === r ? "error" : "default"}
                variant={selectedReason === r ? "filled" : "outlined"}
                onClick={() => setSelectedReason(r)}
                sx={{
                  justifyContent: "flex-start",
                  height: "auto",
                  py: 0.8,
                  px: 1,
                  fontSize: "0.8rem",
                  fontWeight: selectedReason === r ? 600 : "normal"
                }}
              />
            ))}
          </Stack>

          <TextField
            fullWidth
            size="small"
            label="Optional custom explanation"
            placeholder="e.g. Received ₹300 instead of ₹500"
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
          <Button onClick={() => setRejectModalOpen(false)} color="inherit" sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmReject}
            variant="contained"
            color="error"
            sx={{ textTransform: "none", fontWeight: "bold", borderRadius: 2 }}
          >
            Mark as Not Received
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default SettlementCard;
