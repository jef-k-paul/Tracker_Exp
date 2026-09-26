import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  IconButton,
  LinearProgress,
  Stack,
  Chip,
  Divider,
  Paper
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import BoltIcon from "@mui/icons-material/Bolt";
import LocalGroceryStoreIcon from "@mui/icons-material/LocalGroceryStore";
import TheaterComedyIcon from "@mui/icons-material/TheaterComedy";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import CategoryIcon from "@mui/icons-material/Category";
import PieChartIcon from "@mui/icons-material/PieChart";
import { getCategories } from "../../services/apiServices";

// Exact categories matching the database records with unique visual styling
const DB_FALLBACK_CATEGORIES = [
  { category_id: 1, name: "Food" },
  { category_id: 2, name: "Travel" },
  { category_id: 3, name: "Utilities" },
  { category_id: 4, name: "Grocery" },
  { category_id: 5, name: "Lifestyle and Entertainment" },
  { category_id: 6, name: "Health and Wellness" }
];

const CATEGORY_STYLE_MAP = {
  "food": { color: "#10b981", icon: <RestaurantIcon fontSize="small" /> },
  "travel": { color: "#f59e0b", icon: <DirectionsCarIcon fontSize="small" /> },
  "utilities": { color: "#0ea5e9", icon: <BoltIcon fontSize="small" /> },
  "grocery": { color: "#14b8a6", icon: <LocalGroceryStoreIcon fontSize="small" /> },
  "lifestyle and entertainment": { color: "#8b5cf6", icon: <TheaterComedyIcon fontSize="small" /> },
  "health and wellness": { color: "#ec4899", icon: <HealthAndSafetyIcon fontSize="small" /> },
  "default": { color: "#64748b", icon: <CategoryIcon fontSize="small" /> }
};

const getCategoryMeta = (categoryName) => {
  const normalized = categoryName?.trim().toLowerCase();
  return CATEGORY_STYLE_MAP[normalized] || CATEGORY_STYLE_MAP.default;
};

/**
 * CategoryBreakdownModal:
 * - Uses existing categories from the DB (Food, Travel, Utilities, Grocery, Lifestyle and Entertainment, Health and Wellness)
 * - If at least ONE transaction exists in any category: shows ALL DB categories and calculates % of total spend
 * - If there are NO transactions across all categories: displays nothing / empty state
 * - Darkens dashboard background with frosted blur, dismissible by 'X' or backdrop click
 */
const CategoryBreakdownModal = ({
  open,
  onClose,
  expenses = [],
  totalExpense = 0,
  selectedMonthLabel = "",
  selectedYear = ""
}) => {
  const [dbCategories, setDbCategories] = useState(DB_FALLBACK_CATEGORIES);

  // Fetch all existing categories directly from the database
  useEffect(() => {
    getCategories()
      .then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) {
          setDbCategories(res.data);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch DB categories, using local DB definitions", err);
      });
  }, []);

  // Compute stats across all DB categories
  const categoryStats = useMemo(() => {
    // If no transactions exist for the month, return empty list (shows nothing)
    const validExpenseCount = expenses?.length || 0;
    const numTotal = Number(totalExpense) || 0;
    if (validExpenseCount === 0 || numTotal <= 0) {
      return [];
    }

    // Build map of actual spending from transactions
    const spentMap = {};
    expenses.forEach((item) => {
      const rawName = item.category?.trim() || "Uncategorized";
      const key = rawName.toLowerCase();
      const amount = Number(item.amount || 0);

      if (!spentMap[key]) {
        spentMap[key] = { name: rawName, total: 0, count: 0 };
      }
      spentMap[key].total += amount;
      spentMap[key].count += 1;
    });

    // Populate all categories from DB (including ones with 0 spend)
    const list = dbCategories.map((cat) => {
      const key = cat.name.trim().toLowerCase();
      const match = spentMap[key];
      const total = match ? match.total : 0;
      const count = match ? match.count : 0;
      const pct = numTotal > 0 ? ((total / numTotal) * 100).toFixed(1) : 0;

      // Remove accounted entry
      delete spentMap[key];

      return {
        name: cat.name,
        total,
        count,
        percentage: Number(pct)
      };
    });

    // Append any extra category recorded in expenses not currently in dbCategories
    Object.values(spentMap).forEach((rem) => {
      const pct = numTotal > 0 ? ((rem.total / numTotal) * 100).toFixed(1) : 0;
      list.push({
        name: rem.name,
        total: rem.total,
        count: rem.count,
        percentage: Number(pct)
      });
    });

    // Sort descending: categories with spending first (highest to lowest), followed by 0 spend
    list.sort((a, b) => b.total - a.total);

    return list;
  }, [expenses, totalExpense, dbCategories]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="category-breakdown-title"
      PaperProps={{
        elevation: 12,
        sx: {
          borderRadius: 3,
          p: { xs: 1, sm: 2 },
          overflow: "hidden",
          maxHeight: "85vh",
          backgroundColor: "#ffffff"
        }
      }}
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(15, 23, 42, 0.72)", // Darkens the dashboard background
          backdropFilter: "blur(4px)" // Frosted blur
        }
      }}
    >
      {/* Modal Header */}
      <DialogTitle sx={{ m: 0, p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: "50%",
              backgroundColor: "rgba(14, 165, 233, 0.12)",
              color: "#0284c7"
            }}
          >
            <PieChartIcon />
          </Box>
          <div>
            <Typography id="category-breakdown-title" variant="h6" fontWeight="bold" sx={{ color: "#0f172a" }}>
              Category Spend Breakdown
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500 }}>
              {selectedMonthLabel} {selectedYear} • {expenses.length} transaction{expenses.length !== 1 ? "s" : ""}
            </Typography>
          </div>
        </Box>

        {/* 'X' Close Button */}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: "#64748b",
            "&:hover": {
              backgroundColor: "#f1f5f9",
              color: "#0f172a"
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      {/* Modal Body */}
      <DialogContent sx={{ p: 2, pt: 2.5 }}>
        {/* If no transactions for any categories, show nothing / clean empty state */}
        {categoryStats.length === 0 ? (
          <Box py={6} textAlign="center">
            <Typography variant="body1" color="text.secondary" fontWeight={500} gutterBottom>
              No transactions recorded for {selectedMonthLabel} {selectedYear}.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Category breakdowns will appear once an expense is added for this month.
            </Typography>
          </Box>
        ) : (
          <>
            {/* Total Spend Summary Bar */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 3,
                borderRadius: 2,
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div>
                <Typography variant="caption" sx={{ opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Total Family Expenditure
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  ₹{Number(totalExpense).toLocaleString("en-IN")}
                </Typography>
              </div>
              <Chip
                label={`${categoryStats.length} Categories`}
                size="small"
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  fontWeight: 600
                }}
              />
            </Paper>

            {/* List of All Existing DB Categories */}
            <Stack spacing={2}>
              {categoryStats.map((cat, idx) => {
                const meta = getCategoryMeta(cat.name);
                const hasSpend = cat.total > 0;

                return (
                  <Box
                    key={cat.name || idx}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: hasSpend ? "#f8fafc" : "#fafafa",
                      border: "1px solid",
                      borderColor: hasSpend ? "#e2e8f0" : "#f1f5f9",
                      opacity: hasSpend ? 1 : 0.65,
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: "#f1f5f9",
                        borderColor: "#cbd5e1",
                        opacity: 1
                      }
                    }}
                  >
                    {/* Top row: Category name, badge, and amount */}
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Box display="flex" alignItems="center" gap={1.2}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 32,
                            height: 32,
                            borderRadius: "8px",
                            backgroundColor: hasSpend ? `${meta.color}20` : "#e2e8f0",
                            color: hasSpend ? meta.color : "#94a3b8"
                          }}
                        >
                          {meta.icon}
                        </Box>
                        <div>
                          <Typography
                            variant="subtitle2"
                            fontWeight={hasSpend ? "bold" : "600"}
                            sx={{ color: hasSpend ? "#1e293b" : "#64748b" }}
                          >
                            {cat.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {cat.count} transaction{cat.count !== 1 ? "s" : ""}
                          </Typography>
                        </div>
                      </Box>

                      <Box textAlign="right">
                        <Typography
                          variant="subtitle1"
                          fontWeight={hasSpend ? "bold" : "500"}
                          sx={{ color: hasSpend ? "#0f172a" : "#94a3b8" }}
                        >
                          ₹{Number(cat.total).toLocaleString("en-IN")}
                        </Typography>
                        <Chip
                          label={`${cat.percentage}% of spend`}
                          size="small"
                          sx={{
                            height: "20px",
                            fontSize: "0.68rem",
                            fontWeight: 600,
                            backgroundColor: hasSpend ? `${meta.color}15` : "#f1f5f9",
                            color: hasSpend ? meta.color : "#94a3b8"
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Progress Bar */}
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(cat.percentage, 100)}
                      sx={{
                        height: 7,
                        borderRadius: 4,
                        backgroundColor: "#e2e8f0",
                        "& .MuiLinearProgress-bar": {
                          backgroundColor: hasSpend ? meta.color : "#cbd5e1",
                          borderRadius: 4
                        }
                      }}
                    />
                  </Box>
                );
              })}
            </Stack>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CategoryBreakdownModal;
