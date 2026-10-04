import React, { Component } from "react";
import Navbar from "../../components/Navbar/Navbar";
import SummaryCard from "../../components/summaryCard/SummaryCard";
import SettlementCard from "../../components/settlementTable/SettlementCard";
import ExpenseTable from "../../components/expenseTable/ExpenseTable";
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Divider,
  Paper
} from "@mui/material";
import { getSummary, getSettlements, getExpenses, getMyProfile } from "../../services/apiServices";

class DashboardPage extends Component {
  constructor(props) {
    super(props);

    let user = null;
    try {
      user = JSON.parse(localStorage.getItem("user"));
    } catch (e) {
      user = null;
    }
    const now = new Date();

    this.state = {
      user: user,
      selectedMonth: now.getMonth() + 1, // 1-12
      selectedYear: now.getFullYear(),
      summary: { totalExpense: 0, perPerson: [] },
      settlements: [],
      expenses: [],
      loading: true,
      error: ""
    };
  }

  componentDidMount() {
    if (!this.state.user) {
      window.location.href = "/";
      return;
    }

    // Refresh user profile directly from DB to sync any edited email/credentials
    getMyProfile()
      .then((res) => {
        if (res.data?.user) {
          localStorage.setItem("user", JSON.stringify(res.data.user));
          if (res.data.token) {
            localStorage.setItem("token", res.data.token);
          }
          this.setState({ user: res.data.user });
        }
      })
      .catch(() => {});

    this.fetchDashboardData(this.state.selectedMonth, this.state.selectedYear);
  }

  fetchDashboardData = (month, year) => {
    this.setState({ loading: true, error: "" });

    Promise.all([
      getSummary(month, year),
      getSettlements(month, year),
      getExpenses(month, year)
    ])
      .then(([summaryRes, settlementsRes, expensesRes]) => {
        this.setState({
          summary: summaryRes.data || { totalExpense: 0, perPerson: [] },
          settlements: settlementsRes.data || [],
          expenses: expensesRes.data || [],
          loading: false
        });
      })
      .catch((err) => {
        console.error("Dashboard data load error:", err);
        this.setState({
          error: "Failed to load dashboard data. Please check backend connection.",
          loading: false
        });
      });
  };

  handleMonthChange = (month) => {
    this.setState({ selectedMonth: month }, () => {
      this.fetchDashboardData(this.state.selectedMonth, this.state.selectedYear);
    });
  };

  handleYearChange = (year) => {
    this.setState({ selectedYear: year }, () => {
      this.fetchDashboardData(this.state.selectedMonth, this.state.selectedYear);
    });
  };

  render() {
    const { user, selectedMonth, selectedYear, summary, settlements, expenses, loading, error } =
      this.state;

    if (!user) {
      return null;
    }

    const exportData = {
      summary,
      expenses,
      settlements,
      currentUser: user,
      selectedMonth,
      selectedYear
    };

    return (
      <>
        <Navbar
          exportData={exportData}
          currentUser={user}
          onSettlementUpdated={() => this.fetchDashboardData(selectedMonth, selectedYear)}
        />

        <Container maxWidth="xl" sx={{ mt: { xs: 2, sm: 4 }, mb: { xs: 4, sm: 6 }, px: { xs: 1.5, sm: 3 } }}>
          {/* Header Banner */}
          <Paper
            elevation={2}
            sx={{
              p: { xs: 2, sm: 3 },
              mb: { xs: 2.5, sm: 4 },
              borderRadius: { xs: 2.5, sm: 3 },
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              color: "#ffffff"
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Box>
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  sx={{ fontSize: { xs: "1.3rem", sm: "1.75rem", md: "2.125rem" } }}
                  gutterBottom
                >
                  Welcome back, {user?.name || "User"} 👋
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.8, fontSize: { xs: "0.85rem", sm: "1rem" } }}>
                  Here is your {user?.circle_name ? `${user.circle_name}` : "family"} expense breakdown, settlement balances, and transaction history.
                </Typography>
              </Box>
              {user?.circle_name && (
                <Box
                  sx={{
                    bgcolor: "rgba(255,255,255,0.08)",
                    px: { xs: 2, sm: 2.5 },
                    py: { xs: 1, sm: 1.2 },
                    borderRadius: 2,
                    border: "1px solid rgba(255,255,255,0.15)",
                    width: { xs: "100%", sm: "auto" }
                  }}
                >
                  <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
                    Circle: {user.circle_name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#38bdf8", fontWeight: "bold" }}>
                    Family Code: {user.family_code || "N/A"}
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
              <CircularProgress size={48} />
            </Box>
          ) : (
            <>
              {/* Summary Cards & Filters */}
              <SummaryCard
                summary={summary}
                expenses={expenses}
                currentUser={user}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onMonthChange={this.handleMonthChange}
                onYearChange={this.handleYearChange}
              />

              <Divider sx={{ my: { xs: 2.5, sm: 4 } }} />

              {/* Settlements Component */}
              <SettlementCard
                settlements={settlements}
                currentUser={user}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onSettlementUpdated={() => this.fetchDashboardData(selectedMonth, selectedYear)}
              />

              <Divider sx={{ my: { xs: 2.5, sm: 4 } }} />

              {/* Recent Expenses Table */}
              <ExpenseTable
                expenses={expenses}
                currentUser={user}
                loading={loading}
                exportData={exportData}
              />
            </>
          )}
        </Container>
      </>
    );
  }
}

export default DashboardPage;