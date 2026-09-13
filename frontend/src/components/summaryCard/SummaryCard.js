import React from "react";
import {
  Grid,
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
  Stack
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PaymentIcon from "@mui/icons-material/Payment";
import PieChartIcon from "@mui/icons-material/PieChart";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";

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
  currentUser,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange
}) => {
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
      <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 2, backgroundColor: "#f8fafc" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="h6" fontWeight="bold" color="primary">
            Monthly Summary & Filter
          </Typography>

          <Stack direction="row" spacing={2}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
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

            <FormControl size="small" sx={{ minWidth: 100 }}>
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

      {/* Metric Cards Grid */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Total Family Expense */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={3}
            sx={{
              borderRadius: 3,
              background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
              color: "#ffffff"
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                  Total Family Spend
                </Typography>
                <AccountBalanceWalletIcon sx={{ color: "#38bdf8" }} />
              </Box>
              <Typography variant="h4" fontWeight="bold">
                ₹{totalExpense.toLocaleString("en-IN")}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                For {MONTHS.find((m) => m.value === selectedMonth)?.label} {selectedYear}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Logged-in User Paid */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={3}
            sx={{
              borderRadius: 3,
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              color: "#ffffff"
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                  You Paid Out of Pocket
                </Typography>
                <PaymentIcon sx={{ color: "#7dd3fc" }} />
              </Box>
              <Typography variant="h4" fontWeight="bold">
                ₹{userPaid.toLocaleString("en-IN")}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Total contributions made
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Logged-in User Share */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={3}
            sx={{
              borderRadius: 3,
              background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
              color: "#ffffff"
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                  Your Fair Share
                </Typography>
                <PieChartIcon sx={{ color: "#a5b4fc" }} />
              </Box>
              <Typography variant="h4" fontWeight="bold">
                ₹{userShare.toLocaleString("en-IN")}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Your calculated obligation
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Logged-in User Net Expense Position */}
        <Grid item xs={12} sm={6} md={3}>
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
              color: "#ffffff"
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
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Per Person Breakdown Table */}
      <Paper elevation={3} sx={{ p: 2, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
          Family Members Breakdown
        </Typography>
        <TableContainer>
          <Table size="small">
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
                      {bal > 0 ? `+₹${bal}` : bal < 0 ? `-₹${Math.abs(bal)}` : "₹0"}
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
    </Box>
  );
};

export default SummaryCard;
