import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Tooltip
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import BarChartIcon from "@mui/icons-material/BarChart";
import FlipPaidCard from "./FlipPaidCard";
import FlipShareCard from "./FlipShareCard";
import CategoryBreakdownModal from "./CategoryBreakdownModal";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" }
];

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

const SummaryCard = ({
  summary,
  expenses = [],
  currentUser,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange
}) => {
  const [openCategoryModal, setOpenCategoryModal] = useState(false);
  const totalExpense = summary?.totalExpense || 0;
  const perPerson = summary?.perPerson || [];

  // Extract normalized user identifier
  const loggedInName = currentUser?.name?.trim().toLowerCase();
  const currentId = currentUser?.member_id || currentUser?.memberId;

  // Find logged-in user's stats
  const userStat = perPerson.find((p) => {
    const isIdMatch = currentId && p.member_id && Number(p.member_id) === Number(currentId);
    const isNameMatch = loggedInName && p.member && p.member.trim().toLowerCase() === loggedInName;
    return Boolean(isIdMatch || isNameMatch);
  }) || { paid: 0, share: 0, balance: 0 };

  const userPaid = Number(userStat.paid || 0);
  const userShare = Number(userStat.share || 0);
  const userBalance = Number(userStat.balance || 0);

  return (
    <Box sx={{ mb: 4 }}>
      {/* Month & Year Filter Bar */}
      <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2 }, mb: 3, borderRadius: 2, backgroundColor: "#f8fafc" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
        >
          <Typography variant="h6" fontWeight="bold" color="primary" sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}>
            Monthly Summary & Filter
          </Typography>

          <Stack direction="row" spacing={1.5} sx={{ width: { xs: "100%", sm: "auto" } }}>
            <FormControl size="small" sx={{ flex: 1, minWidth: { xs: 120, sm: 140 } }}>
              <InputLabel id="month-select-label">Month</InputLabel>
              <Select
                labelId="month-select-label"
                value={selectedMonth}
                label="Month"
                onChange={(e) => onMonthChange(Number(e.target.value))}
              >
                {MONTHS.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ flex: { xs: 0.8, sm: "unset" }, minWidth: { xs: 85, sm: 100 } }}>
              <InputLabel id="year-select-label">Year</InputLabel>
              <Select
                labelId="year-select-label"
                value={selectedYear}
                label="Year"
                onChange={(e) => onYearChange(Number(e.target.value))}
              >
                {YEARS.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Stack>
      </Paper>

      {/* Metric Cards: 4-Column Grid on Desktop, Smooth Horizontal Snap Carousel on Mobile */}
      <Box
        sx={{
          mb: 3,
          display: { xs: "flex", md: "grid" },
          gridTemplateColumns: { md: "repeat(4, 1fr)" },
          gap: { xs: 2, md: 3 },
          overflowX: { xs: "auto", md: "visible" },
          scrollSnapType: { xs: "x mandatory", md: "none" },
          pb: { xs: 1.5, md: 0 },
          pt: 0.5,
          px: 0.5,
          scrollbarWidth: "thin",
          "&::-webkit-scrollbar": {
            height: "5px"
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#cbd5e1",
            borderRadius: "10px"
          }
        }}
      >
        {/* Total Family Expense (Clickable - Opens Category Breakdown Modal) */}
        <Box
          sx={{
            flex: { xs: "0 0 84%", sm: "0 0 45%", md: "unset" },
            minWidth: { xs: "240px", sm: "270px", md: "unset" },
            scrollSnapAlign: "start"
          }}
        >
          <Card
            elevation={3}
            onClick={() => setOpenCategoryModal(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpenCategoryModal(true);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Click to view category breakdown modal"
            sx={{
              borderRadius: 3,
              background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
              color: "#ffffff",
              cursor: "pointer",
              height: "100%",
              minHeight: "165px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxSizing: "border-box",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              transition: "transform 0.25s ease, box-shadow 0.25s ease",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 12px 24px -6px rgba(15, 23, 42, 0.6)"
              },
              "&:focus-visible": {
                boxShadow: "0 0 0 3px #38bdf8",
                outline: "none"
              }
            }}
          >
            <CardContent sx={{ pb: "16px !important", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Typography variant="subtitle2" sx={{ opacity: 0.85, fontWeight: 600 }}>
                    Total Family Spend
                  </Typography>
                  <AccountBalanceWalletIcon sx={{ color: "#38bdf8" }} />
                </Box>
                <Typography variant="h4" fontWeight="bold" sx={{ letterSpacing: "-0.5px" }}>
                  ₹{totalExpense.toLocaleString("en-IN")}
                </Typography>
              </div>

              <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
                <Typography variant="caption" sx={{ opacity: 0.75, fontSize: "0.75rem" }}>
                  For {MONTHS.find((m) => m.value === selectedMonth)?.label} {selectedYear}
                </Typography>
                <Chip
                  icon={<BarChartIcon sx={{ fontSize: "14px !important", color: "#38bdf8 !important" }} />}
                  label="Breakdown 🔍"
                  size="small"
                  sx={{
                    height: "22px",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
                    backdropFilter: "blur(4px)",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.25)"
                    }
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Logged-in User Paid (Interactive 3D Flip Card) */}
        <Box
          sx={{
            flex: { xs: "0 0 84%", sm: "0 0 45%", md: "unset" },
            minWidth: { xs: "240px", sm: "270px", md: "unset" },
            scrollSnapAlign: "start"
          }}
        >
          <FlipPaidCard
            userPaid={userPaid}
            currentUser={currentUser}
            selectedMonthLabel={MONTHS.find((m) => m.value === selectedMonth)?.label}
            selectedYear={selectedYear}
          />
        </Box>

        {/* Logged-in User Share (Interactive 3D Flip Card - Total Share Expense) */}
        <Box
          sx={{
            flex: { xs: "0 0 84%", sm: "0 0 45%", md: "unset" },
            minWidth: { xs: "240px", sm: "270px", md: "unset" },
            scrollSnapAlign: "start"
          }}
        >
          <FlipShareCard
            userShare={userShare}
            currentUser={currentUser}
            selectedMonthLabel={MONTHS.find((m) => m.value === selectedMonth)?.label}
            selectedYear={selectedYear}
          />
        </Box>

        {/* Logged-in User Net Expense Position */}
        <Box
          sx={{
            flex: { xs: "0 0 84%", sm: "0 0 45%", md: "unset" },
            minWidth: { xs: "240px", sm: "270px", md: "unset" },
            scrollSnapAlign: "start"
          }}
        >
          <Card
            elevation={3}
            sx={{
              borderRadius: 3,
              background:
                userBalance > 0
                  ? "linear-gradient(135deg, #059669 0%, #047857 100%)"
                  : userBalance < 0
                  ? "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"
                  : "linear-gradient(135deg, #475569 0%, #334155 100%)",
              color: "#ffffff",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                  Net Balance Position
                </Typography>
                <AccountBalanceIcon sx={{ color: "#fef08a" }} />
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {userBalance > 0 ? `+₹${userBalance}` : userBalance < 0 ? `-₹${Math.abs(userBalance)}` : "₹0"}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: "bold" }}>
                {userBalance > 0
                  ? "You are owed money 🎉"
                  : userBalance < 0
                  ? "You owe money ⚠️"
                  : "You are fully settled up 👍"}
              </Typography>
              {Boolean(userStat.settled_paid || userStat.settled_received) && (
                <Typography variant="caption" display="block" sx={{ opacity: 0.8, fontSize: "0.7rem", mt: 0.5 }}>
                  Reconciled: {userStat.settled_paid > 0 ? `+₹${userStat.settled_paid} repaid` : ""}{" "}
                  {userStat.settled_received > 0 ? `-₹${userStat.settled_received} received` : ""}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Per Person Breakdown Table */}
      <Paper elevation={3} sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, fontSize: { xs: "1rem", sm: "1.25rem" } }}>
          Family Members Breakdown
        </Typography>
        <TableContainer sx={{ overflowX: "auto", maxWidth: "100%", WebkitOverflowScrolling: "touch" }}>
          <Table size="small" sx={{ minWidth: 460 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f1f5f9" }}>
                <TableCell sx={{ fontWeight: "bold" }}>Member Name</TableCell>
                <TableCell align="right" sx={{ fontWeight: "bold" }}>
                  Total Paid
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: "bold" }}>
                  Fair Share
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: "bold" }}>
                  Net Balance
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>
                  Status
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {perPerson.map((p, idx) => {
                const isYou = Boolean(
                  (currentId && p.member_id && Number(p.member_id) === Number(currentId)) ||
                  (loggedInName && p.member && p.member.trim().toLowerCase() === loggedInName)
                );
                const bal = Number(p.balance);
                const hasSettlements = Boolean(p.settled_paid || p.settled_received);

                return (
                  <TableRow
                    key={idx}
                    sx={{
                      backgroundColor: isYou ? "#eff6ff" : "inherit",
                      "&:hover": { backgroundColor: "#f8fafc" }
                    }}
                  >
                    <TableCell sx={{ fontWeight: isYou ? "bold" : "normal" }}>
                      {p.member} {isYou && <Chip label="You" size="small" color="primary" sx={{ ml: 1, height: 20, fontSize: "0.7rem" }} />}
                    </TableCell>
                    <TableCell align="right">₹{Number(p.paid).toLocaleString("en-IN")}</TableCell>
                    <TableCell align="right">₹{Number(p.share).toLocaleString("en-IN")}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: "bold",
                        color: bal > 0 ? "success.main" : bal < 0 ? "error.main" : "text.secondary"
                      }}
                    >
                      {hasSettlements ? (
                        <Tooltip
                          title={`Raw expense balance: ₹${p.raw_balance > 0 ? "+" : ""}${p.raw_balance} | Repaid: ₹${p.settled_paid || 0} | Received: ₹${p.settled_received || 0}`}
                          arrow
                        >
                          <span style={{ borderBottom: "1px dotted #94a3b8", cursor: "help" }}>
                            {bal > 0 ? `+₹${bal}` : bal < 0 ? `-₹${Math.abs(bal)}` : "₹0"}
                          </span>
                        </Tooltip>
                      ) : (
                        bal > 0 ? `+₹${bal}` : bal < 0 ? `-₹${Math.abs(bal)}` : "₹0"
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {bal > 0 ? (
                        <Chip label="Receiving" size="small" color="success" variant="outlined" />
                      ) : bal < 0 ? (
                        <Chip label="Paying" size="small" color="error" variant="outlined" />
                      ) : (
                        <Chip label="Settled" size="small" color="default" variant="outlined" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Category Breakdown Popup Modal */}
      <CategoryBreakdownModal
        open={openCategoryModal}
        onClose={() => setOpenCategoryModal(false)}
        expenses={expenses}
        totalExpense={totalExpense}
        selectedMonthLabel={MONTHS.find((m) => m.value === selectedMonth)?.label}
        selectedYear={selectedYear}
      />
    </Box>
  );
};

export default SummaryCard;
