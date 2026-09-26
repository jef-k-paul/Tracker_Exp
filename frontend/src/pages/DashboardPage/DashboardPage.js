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
import { getSummary, getSettlements, getExpenses } from "../../services/apiServices";

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

    return (
      <>
        <Navbar />

        <Container maxWidth="xl" sx={{ mt: 4, mb: 6 }}>
          {/* Header Banner */}
          <Paper
            elevation={2}
            sx={{
              p: 3,
              mb: 4,
              borderRadius: 3,
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              color: "#ffffff"
            }}
          >
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Welcome back, {user?.name || "User"} 👋
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.8 }}>
              Here is your family expense breakdown, settlement balances, and transaction history.
            </Typography>
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
                currentUser={user}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onMonthChange={this.handleMonthChange}
                onYearChange={this.handleYearChange}
              />

              <Divider sx={{ my: 4 }} />

              {/* Settlements Component */}
              <SettlementCard settlements={settlements} currentUser={user} />

              <Divider sx={{ my: 4 }} />

              {/* Recent Expenses Table */}
              <ExpenseTable expenses={expenses} currentUser={user} loading={loading} />
            </>
          )}
        </Container>
      </>
    );
  }
}

export default DashboardPage;