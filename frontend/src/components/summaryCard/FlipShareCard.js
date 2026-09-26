import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  CircularProgress
} from "@mui/material";
import PieChartIcon from "@mui/icons-material/PieChart";
import SyncIcon from "@mui/icons-material/Sync";
import PriceCheckIcon from "@mui/icons-material/PriceCheck";
import { getAllTimeShare } from "../../services/apiServices";

/**
 * FlipShareCard: 3D hardware-accelerated flipping card for user's fair share.
 * Front: Shows current month's "Your Fair Share"
 * Back: Shows all-time "Total Share Expense" (cumulative lifetime shared obligation across all split expenses)
 * Caches all-time share in memory for optimal zero-network subsequent flips.
 */
const FlipShareCard = ({
  userShare = 0,
  currentUser,
  selectedMonthLabel = "",
  selectedYear = ""
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [allTimeShare, setAllTimeShare] = useState(null);
  const [loadingAllTime, setLoadingAllTime] = useState(false);
  const [errorAllTime, setErrorAllTime] = useState(false);

  const memberId = currentUser?.member_id || currentUser?.memberId;

  // Memoized fetch function for all-time share
  const fetchAllTimeShare = useCallback(() => {
    if (!memberId || allTimeShare !== null || loadingAllTime) return;

    setLoadingAllTime(true);
    setErrorAllTime(false);

    getAllTimeShare(memberId)
      .then((res) => {
        const share = Number(res?.data?.allTimeShare || 0);
        setAllTimeShare(share);
        setLoadingAllTime(false);
      })
      .catch((err) => {
        console.error("Failed to load all-time share expense:", err);
        setErrorAllTime(true);
        setLoadingAllTime(false);
      });
  }, [memberId, allTimeShare, loadingAllTime]);

  // Pre-fetch in background on mount so the back side is instantly ready without waiting
  useEffect(() => {
    if (memberId && allTimeShare === null) {
      fetchAllTimeShare();
    }
  }, [memberId, allTimeShare, fetchAllTimeShare]);

  const handleFlip = () => {
    if (allTimeShare === null && !loadingAllTime) {
      fetchAllTimeShare();
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
        aria-label="Click to toggle between monthly fair share and total share expense till now"
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
            boxShadow: "0 0 0 3px #818cf8"
          }
        }}
      >
        {/* ==================== FRONT FACE (Monthly Fair Share) ==================== */}
        <Card
          elevation={4}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            borderRadius: 3,
            background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
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
                  Your Fair Share
                </Typography>
                <PieChartIcon sx={{ color: "#a5b4fc" }} />
              </Box>

              <Typography variant="h4" fontWeight="bold" sx={{ letterSpacing: "-0.5px" }}>
                ₹{Number(userShare).toLocaleString("en-IN")}
              </Typography>
            </div>

            <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
              <Typography variant="caption" sx={{ opacity: 0.85, fontSize: "0.75rem" }}>
                {selectedMonthLabel ? `For ${selectedMonthLabel} ${selectedYear}` : "Current month"}
              </Typography>

              <Chip
                icon={<SyncIcon sx={{ fontSize: "14px !important", color: "#e0e7ff !important" }} />}
                label="Total Share ↻"
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

        {/* ==================== BACK FACE (Total Share Expense All-Time) ==================== */}
        <Card
          elevation={4}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            borderRadius: 3,
            background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
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
            border: "1px solid rgba(196, 181, 253, 0.3)"
          }}
        >
          <CardContent sx={{ pb: "16px !important", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="subtitle2" sx={{ opacity: 0.95, fontWeight: 600 }}>
                    Total Share Expense
                  </Typography>
                  <Chip
                    label="All-Time"
                    size="small"
                    sx={{
                      height: "18px",
                      fontSize: "0.65rem",
                      fontWeight: "bold",
                      backgroundColor: "#9333ea",
                      color: "#ffffff"
                    }}
                  />
                </Box>
                <PriceCheckIcon sx={{ color: "#d8b4fe" }} />
              </Box>

              {loadingAllTime ? (
                <Box display="flex" alignItems="center" height="40px">
                  <CircularProgress size={24} sx={{ color: "#d8b4fe" }} />
                </Box>
              ) : errorAllTime ? (
                <Typography variant="body2" sx={{ color: "#fecaca" }}>
                  Unable to load share
                </Typography>
              ) : (
                <Typography variant="h4" fontWeight="bold" sx={{ color: "#faf5ff", letterSpacing: "-0.5px" }}>
                  ₹{Number(allTimeShare ?? userShare).toLocaleString("en-IN")}
                </Typography>
              )}
            </div>

            <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
              <Typography variant="caption" sx={{ opacity: 0.9, fontSize: "0.75rem", color: "#e9d5ff" }}>
                Lifetime shared obligation
              </Typography>

              <Chip
                icon={<SyncIcon sx={{ fontSize: "14px !important", color: "#f3e8ff !important" }} />}
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

export default FlipShareCard;
