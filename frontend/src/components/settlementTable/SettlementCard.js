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
  Tooltip
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
import {
  initiateSettlement,
  confirmSettlement,
  rejectSettlement
} from "../../services/apiServices";

const SettlementCard = ({
  settlements = [],
  currentUser,
  selectedMonth = 1,
  selectedYear = new Date().getFullYear(),
  onSettlementUpdated
}) => {
  const [loadingActionId, setLoadingActionId] = useState(null);
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const loggedInName = currentUser?.name?.toLowerCase();
  const confirmedCount = settlements.filter((s) => s.status === "CONFIRMED").length;
  const activeCount = settlements.filter((s) => s.status !== "CONFIRMED").length;

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
  }, [settlements, checkScrollState]);

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

  const handleReject = async (settlementId) => {
    setLoadingActionId(`reject-${settlementId}`);
    try {
      await rejectSettlement(settlementId);
      if (onSettlementUpdated) {
        onSettlementUpdated();
      }
    } catch (err) {
      console.error("Error rejecting settlement:", err);
    } finally {
      setLoadingActionId(null);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
        <Box display="flex" alignItems="center">
          <HandshakeIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
          <Typography variant="h6" fontWeight="bold">
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
          {settlements.length > 0 && (
            <Chip
              label={`${settlements.length} settlement${settlements.length > 1 ? "s" : ""}${
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
          {settlements.length > 0 && (
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

      {settlements.length === 0 ? (
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
            No settlements recorded for this month.
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
          {settlements.map((item, index) => {
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
                  minWidth: { xs: "280px", sm: "300px", md: "310px" },
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
                  <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
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
                    </Box>

                    {/* TWO-PARTY HANDSHAKE INTERACTIVE ACTIONS OR ACKNOWLEDGEMENT */}
                    <Box
                      mt={2}
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
                                sx={{ fontWeight: 600, fontSize: "0.72rem" }}
                              />
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
                                onClick={() => handleReject(item.settlement_id)}
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
    </Paper>
  );
};

export default SettlementCard;
