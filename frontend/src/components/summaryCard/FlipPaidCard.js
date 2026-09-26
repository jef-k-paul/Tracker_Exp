import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  CircularProgress
} from "@mui/material";
import PaymentIcon from "@mui/icons-material/Payment";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import SyncIcon from "@mui/icons-material/Sync";
import { getAllTimePaid } from "../../services/apiServices";

/**
 * FlipPaidCard: 3D hardware-accelerated flipping card.
 * Front: Shows current month's "Paid Out of Pocket"
 * Back: Shows all-time total expenses paid by the person till now
 * Caches all-time total in memory for optimal zero-network subsequent flips.
 */
const FlipPaidCard = ({
  userPaid = 0,
  currentUser,
  selectedMonthLabel = "",
  selectedYear = ""
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [allTimeTotal, setAllTimeTotal] = useState(null);
  const [loadingAllTime, setLoadingAllTime] = useState(false);
  const [errorAllTime, setErrorAllTime] = useState(false);

  const memberId = currentUser?.member_id || currentUser?.memberId;

  // Memoized fetch function for all-time total
  const fetchAllTimeTotal = useCallback(() => {
    if (!memberId || allTimeTotal !== null || loadingAllTime) return;

    setLoadingAllTime(true);
    setErrorAllTime(false);

    getAllTimePaid(memberId)
      .then((res) => {
        const total = Number(res?.data?.allTimeTotal || 0);
        setAllTimeTotal(total);
        setLoadingAllTime(false);
      })
      .catch((err) => {
        console.error("Failed to load all-time paid expenses:", err);
        setErrorAllTime(true);
        setLoadingAllTime(false);
      });
  }, [memberId, allTimeTotal, loadingAllTime]);

  // Pre-fetch in background on mount so the back side is instantly ready without waiting
  useEffect(() => {
    if (memberId && allTimeTotal === null) {
      fetchAllTimeTotal();
    }
  }, [memberId, allTimeTotal, fetchAllTimeTotal]);

  const handleFlip = () => {
    if (allTimeTotal === null && !loadingAllTime) {
      fetchAllTimeTotal();
    }
    setIsFlipped((prev) => !prev);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleFlip();
    }
  };

  return (
    <Box
      sx={{
        perspective: "1000px",
        height: "100%",
        minHeight: "165px",
        transition: "transform 0.25s ease",
        "&:hover": {
          transform: "translateY(-4px)"
        }
      }}
    >
      <Box
        onClick={handleFlip}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isFlipped}
        aria-label="Click to toggle between monthly paid out of pocket and all-time total paid"
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          minHeight: "165px",
          transformStyle: "preserve-3d",
          WebkitTransformStyle: "preserve-3d",
          transition: "transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          cursor: "pointer",
          borderRadius: 3,
          outline: "none",
          "&:focus-visible": {
            boxShadow: "0 0 0 3px #38bdf8"
          }
        }}
      >
        {/* ==================== FRONT FACE (Monthly) ==================== */}
        <Card
          elevation={4}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            borderRadius: 3,
            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
            color: "#ffffff",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxSizing: "border-box",
            overflow: "hidden",
            border: "1px solid rgba(255, 255, 255, 0.15)"
          }}
        >
          <CardContent sx={{ pb: "16px !important", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle2" sx={{ opacity: 0.9, fontWeight: 600 }}>
                  You Paid Out of Pocket
                </Typography>
                <PaymentIcon sx={{ color: "#7dd3fc" }} />
              </Box>

              <Typography variant="h4" fontWeight="bold" sx={{ letterSpacing: "-0.5px" }}>
                ₹{Number(userPaid).toLocaleString("en-IN")}
              </Typography>
            </div>

            <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
              <Typography variant="caption" sx={{ opacity: 0.85, fontSize: "0.75rem" }}>
                {selectedMonthLabel ? `For ${selectedMonthLabel} ${selectedYear}` : "Current month"}
              </Typography>

              <Chip
                icon={<SyncIcon sx={{ fontSize: "14px !important", color: "#e0f2fe !important" }} />}
                label="All-Time ↻"
                size="small"
                sx={{
                  height: "22px",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  backdropFilter: "blur(4px)",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.3)"
                  }
                }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* ==================== BACK FACE (All-Time Lifetime) ==================== */}
        <Card
          elevation={4}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            borderRadius: 3,
            background: "linear-gradient(135deg, #0d9488 0%, #115e59 100%)",
            color: "#ffffff",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            WebkitTransform: "rotateY(180deg)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxSizing: "border-box",
            overflow: "hidden",
            border: "1px solid rgba(94, 234, 212, 0.3)"
          }}
        >
          <CardContent sx={{ pb: "16px !important", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="subtitle2" sx={{ opacity: 0.95, fontWeight: 600 }}>
                    Total Paid Till Now
                  </Typography>
                  <Chip
                    label="All-Time"
                    size="small"
                    sx={{
                      height: "18px",
                      fontSize: "0.65rem",
                      fontWeight: "bold",
                      backgroundColor: "#14b8a6",
                      color: "#ffffff"
                    }}
                  />
                </Box>
                <AccountBalanceWalletIcon sx={{ color: "#5eead4" }} />
              </Box>

              {loadingAllTime ? (
                <Box display="flex" alignItems="center" height="40px">
                  <CircularProgress size={24} sx={{ color: "#5eead4" }} />
                </Box>
              ) : errorAllTime ? (
                <Typography variant="body2" sx={{ color: "#fecaca" }}>
                  Unable to load total
                </Typography>
              ) : (
                <Typography variant="h4" fontWeight="bold" sx={{ color: "#f0fdfa", letterSpacing: "-0.5px" }}>
                  ₹{Number(allTimeTotal ?? userPaid).toLocaleString("en-IN")}
                </Typography>
              )}
            </div>

            <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
              <Typography variant="caption" sx={{ opacity: 0.9, fontSize: "0.75rem", color: "#ccfbf1" }}>
                Lifetime contributions
              </Typography>

              <Chip
                icon={<SyncIcon sx={{ fontSize: "14px !important", color: "#ccfbf1 !important" }} />}
                label="Monthly ↻"
                size="small"
                sx={{
                  height: "22px",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  backdropFilter: "blur(4px)",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.3)"
                  }
                }}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default FlipPaidCard;
