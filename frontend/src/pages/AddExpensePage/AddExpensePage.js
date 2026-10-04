import React, { Component } from "react";
import { getMembers, getCategories, addExpense, checkDuplicateExpense } from "../../services/apiServices";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  Snackbar,
  Grid,
  Chip,
  InputAdornment,
  FormControlLabel,
  Checkbox
} from "@mui/material";
import AddCardIcon from "@mui/icons-material/AddCard";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Navbar from "../../components/Navbar/Navbar";

class AddExpensePage extends Component {
  constructor(props) {
    super(props);

    let user = null;
    try {
      user = JSON.parse(localStorage.getItem("user"));
    } catch (e) {
      user = null;
    }

    this.state = {
      user: user,
      amount: "",
      categoryId: "",
      paidBy: user?.member_id || user?.memberId || "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      splitType: "EQUAL",
      members: [],
      categories: [],
      splits: [],
      loading: false,
      duplicateWarning: null,
      confirmDuplicate: false,
      snackbarOpen: false,
      snackbarMessage: "",
      snackbarSeverity: "success"
    };
  }

  componentDidMount() {
    if (!this.state.user) {
      window.location.href = "/";
      return;
    }

    const circleId = this.state.user?.circle_id || this.state.user?.circleId;

    getMembers(circleId)
      .then((response) => {
        this.setState({ members: response.data || [] });
      })
      .catch((error) => {
        console.error(error);
        this.showSnackbar("Failed to load circle members", "error");
      });

    getCategories()
      .then((response) => {
        this.setState({ categories: response.data || [] });
      })
      .catch((error) => {
        console.error(error);
        this.showSnackbar("Failed to load categories", "error");
      });
  }

  handleChange = (event) => {
    const { name, value } = event.target;

    this.setState({ [name]: value, duplicateWarning: null }, () => {
      if (name === "amount" || name === "categoryId" || name === "date") {
        this.checkForDuplicateLive();
      }
    });
  };

  checkForDuplicateLive = () => {
    const { amount, categoryId, date, user } = this.state;
    const circleId = user?.circle_id || user?.circleId;
    if (amount > 0 && categoryId && date) {
      checkDuplicateExpense(amount, categoryId, date, circleId)
        .then((res) => {
          if (res.data?.isDuplicate) {
            const dup = res.data.duplicateInfo;
            this.setState({
              duplicateWarning: `⚠️ Potential Duplicate Found: An expense of ₹${dup.amount} for '${dup.category_name}' on ${dup.expense_date} (Paid by ${dup.paid_by_name}) is already recorded.`
            });
          } else {
            this.setState({ duplicateWarning: null });
          }
        })
        .catch((err) => console.error(err));
    }
  };

  handleSplitTypeChange = (event) => {
    const splitType = event.target.value;

    if (splitType === "CUSTOM") {
      const splits = this.state.members.map((member) => ({
        memberId: member.member_id,
        memberName: member.name,
        share: ""
      }));

      this.setState({
        splitType,
        splits
      });
    } else {
      this.setState({ splitType, splits: [] });
    }
  };

  handleSplitAmountChange = (index, value) => {
    const splits = [...this.state.splits];
    splits[index].share = value;
    this.setState({ splits });
  };

  showSnackbar = (message, severity = "success") => {
    this.setState({
      snackbarOpen: true,
      snackbarMessage: message,
      snackbarSeverity: severity
    });
  };

  handleCloseSnackbar = () => {
    this.setState({ snackbarOpen: false });
  };

  handleSubmit = () => {
    const amountNum = Number(this.state.amount);

    if (!amountNum || amountNum <= 0) {
      this.showSnackbar("Please enter a valid positive expense amount.", "error");
      return;
    }
    if (!this.state.categoryId) {
      this.showSnackbar("Please select a category.", "error");
      return;
    }
    if (!this.state.paidBy) {
      this.showSnackbar("Please select who paid.", "error");
      return;
    }
    if (!this.state.date) {
      this.showSnackbar("Please select a valid date.", "error");
      return;
    }

    const circleId = this.state.user?.circle_id || this.state.user?.circleId;
    if (!circleId) {
      this.showSnackbar("Active circle is required to add an expense.", "error");
      return;
    }

    const expense = {
      circleId,
      amount: amountNum,
      categoryId: Number(this.state.categoryId),
      paidBy: Number(this.state.paidBy),
      date: this.state.date,
      description: this.state.description,
      splitType: this.state.splitType,
      confirmDuplicate: this.state.confirmDuplicate
    };

    if (this.state.splitType === "CUSTOM") {
      const customSum = this.state.splits.reduce(
        (sum, item) => sum + (parseFloat(item.share) || 0),
        0
      );

      if (Math.abs(customSum - amountNum) > 0.01) {
        this.showSnackbar(
          `Custom splits sum (₹${customSum}) does not match expense amount (₹${amountNum}).`,
          "error"
        );
        return;
      }

      expense.splits = this.state.splits.map((split) => ({
        memberId: split.memberId,
        share: Number(split.share || 0)
      }));
    }

    this.setState({ loading: true });

    addExpense(expense)
      .then((response) => {
        this.showSnackbar("Expense Added Successfully! 🎉", "success");

        this.setState({
          amount: "",
          categoryId: "",
          paidBy: "",
          date: new Date().toISOString().split("T")[0],
          description: "",
          splitType: "EQUAL",
          splits: [],
          duplicateWarning: null,
          confirmDuplicate: false,
          loading: false
        });
      })
      .catch((error) => {
        console.error(error);
        if (error.response?.status === 409 && error.response?.data?.isDuplicate) {
          const dupMsg = error.response.data.message;
          this.setState({
            duplicateWarning: `⚠️ ${dupMsg}`,
            loading: false
          });
          this.showSnackbar(
            `Duplicate Transaction Warning! Please review before saving.`,
            "warning"
          );
        } else {
          const errMsg =
            error.response?.data?.message || "Failed to add expense. Please check input values.";
          this.showSnackbar(errMsg, "error");
          this.setState({ loading: false });
        }
      });
  };

  render() {
    if (!this.state.user) {
      return null;
    }

    const {
      user,
      amount,
      categoryId,
      paidBy,
      date,
      description,
      splitType,
      members,
      categories,
      splits,
      loading,
      duplicateWarning,
      confirmDuplicate,
      snackbarOpen,
      snackbarMessage,
      snackbarSeverity
    } = this.state;

    // Calculate Custom Split validation
    const targetAmount = parseFloat(amount) || 0;
    const customSum = splits.reduce(
      (sum, item) => sum + (parseFloat(item.share) || 0),
      0
    );
    const customDiff = Math.abs(targetAmount - customSum);
    const isCustomValid = splitType !== "CUSTOM" || (targetAmount > 0 && customDiff <= 0.01);

    // Disable Save button if form is invalid or duplicate requires confirmation
    const isFormDisabled =
      !amount ||
      targetAmount <= 0 ||
      !categoryId ||
      !paidBy ||
      !date ||
      !isCustomValid ||
      (duplicateWarning && !confirmDuplicate) ||
      loading;

    return (
      <>
        <Navbar />

        <Container maxWidth="md" sx={{ mt: { xs: 2, sm: 4 }, mb: { xs: 4, sm: 6 }, px: { xs: 1.5, sm: 3 } }}>
          {/* Header Banner */}
          <Paper
            elevation={3}
            sx={{
              p: { xs: 2, sm: 3 },
              mb: 2,
              borderRadius: { xs: 2.5, sm: 3 },
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              color: "#ffffff"
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Box display="flex" alignItems="center">
                <AddCardIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: "#38bdf8", mr: 1.5 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: "1.3rem", sm: "1.75rem", md: "2.125rem" } }}>
                    Add New Expense
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8, fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>
                    Log a transaction and automatically partition shares across members.
                  </Typography>
                </Box>
              </Box>

              {user?.circle_name && (
                <Box
                  sx={{
                    bgcolor: "rgba(255,255,255,0.08)",
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    border: "1px solid rgba(255,255,255,0.18)",
                    width: { xs: "100%", sm: "auto" }
                  }}
                >
                  <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5 }}>
                    Target Circle
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" sx={{ color: "#38bdf8" }}>
                    {user.circle_name}
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>

          {/* Active Circle Context & Isolation Signal */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 1.5, sm: 2 },
              mb: { xs: 2, sm: 3 },
              borderRadius: 2.5,
              border: "1px solid #bae6fd",
              bgcolor: "#f0f9ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1.5
            }}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  bgcolor: "#10b981",
                  boxShadow: "0 0 0 3px rgba(16, 185, 129, 0.25)",
                  flexShrink: 0
                }}
              />
              <Box>
                <Typography variant="subtitle2" fontWeight="bold" color="#0c4a6e">
                  Posting to: {user?.circle_name || "Paul Family"}
                </Typography>
                <Typography variant="caption" color="#0369a1" sx={{ display: "block", lineHeight: 1.3 }}>
                  This transaction is completely isolated and will only be visible and split among members of this circle.
                </Typography>
              </Box>
            </Box>

            {user?.family_code && (
              <Chip
                label={`Invite Code: ${user.family_code}`}
                size="small"
                sx={{
                  bgcolor: "#ffffff",
                  fontWeight: "bold",
                  fontSize: "0.75rem",
                  color: "#0284c7",
                  border: "1px solid #7dd3fc"
                }}
              />
            )}
          </Paper>

          {/* Form Card */}
          <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: { xs: 2.5, sm: 3 } }}>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              {/* Amount Input */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Expense Amount"
                  name="amount"
                  type="number"
                  value={amount}
                  onChange={this.handleChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>
                  }}
                  required
                />
              </Grid>

              {/* Category Dropdown */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select name="categoryId" value={categoryId} label="Category" onChange={this.handleChange}>
                    {categories.map((category) => (
                      <MenuItem key={category.category_id} value={category.category_id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Paid By Dropdown */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Paid By</InputLabel>
                  <Select name="paidBy" value={paidBy} label="Paid By" onChange={this.handleChange}>
                    {members.map((member) => (
                      <MenuItem key={member.member_id} value={member.member_id}>
                        {member.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Date Input */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Expense Date"
                  name="date"
                  value={date}
                  onChange={this.handleChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              {/* Description Input */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description / Notes"
                  name="description"
                  value={description}
                  onChange={this.handleChange}
                  placeholder="e.g. Grocery shopping at supermarket"
                />
              </Grid>

              {/* Split Type Selector */}
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Split Type</InputLabel>
                  <Select
                    name="splitType"
                    value={splitType}
                    label="Split Type"
                    onChange={this.handleSplitTypeChange}
                  >
                    <MenuItem value="EQUAL">Equal Split (Divided equally across active members)</MenuItem>
                    <MenuItem value="CUSTOM">Custom Split (Specify custom shares per member)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Duplicate Transaction Warning Banner */}
            {duplicateWarning && (
              <Box mt={3}>
                <Alert
                  severity="warning"
                  icon={<WarningAmberIcon fontSize="inherit" />}
                  sx={{ borderRadius: 2, fontWeight: "bold" }}
                >
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    {duplicateWarning}
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={confirmDuplicate}
                        onChange={(e) => this.setState({ confirmDuplicate: e.target.checked })}
                        color="warning"
                      />
                    }
                    label="I confirm this is a separate transaction and want to log it anyway."
                  />
                </Alert>
              </Box>
            )}

            {/* Custom Split Inputs & Live Calculation Feedback */}
            {splitType === "CUSTOM" && (
              <Box
                sx={{
                  mt: 2.5,
                  p: { xs: 1.5, sm: 3 },
                  border: "1px dashed #cbd5e1",
                  borderRadius: 2,
                  backgroundColor: "#f8fafc"
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
                  <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: "0.95rem", sm: "1.1rem" } }}>
                    Custom Member Shares
                  </Typography>
                  <Chip
                    label={`Entered: ₹${customSum.toFixed(2)} / ₹${targetAmount.toFixed(2)}`}
                    color={isCustomValid ? "success" : "error"}
                    size="small"
                    sx={{ fontWeight: "bold" }}
                  />
                </Box>

                {!isCustomValid && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {targetAmount <= 0
                      ? "Please enter a valid expense total amount first."
                      : `Custom splits total (₹${customSum.toFixed(
                          2
                        )}) does not match expense amount (₹${targetAmount.toFixed(
                          2
                        )}). Difference: ₹${(targetAmount - customSum).toFixed(2)}`}
                  </Alert>
                )}

                {isCustomValid && targetAmount > 0 && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    ✓ Custom splits total matches total expense amount (₹{targetAmount.toFixed(2)})!
                  </Alert>
                )}

                <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                  {members.map((member, index) => (
                    <Grid item xs={12} sm={6} key={member.member_id}>
                      <TextField
                        fullWidth
                        type="number"
                        label={`${member.name}'s Share`}
                        value={splits[index]?.share || ""}
                        onChange={(e) => this.handleSplitAmountChange(index, e.target.value)}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">₹</InputAdornment>
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Submit Button */}
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={this.handleSubmit}
              disabled={isFormDisabled}
              sx={{
                mt: { xs: 3, sm: 4 },
                py: { xs: 1.3, sm: 1.5 },
                fontWeight: "bold",
                fontSize: { xs: "0.95rem", sm: "1rem" },
                borderRadius: 2
              }}
            >
              {loading ? "Saving Expense..." : "Save Expense"}
            </Button>
          </Paper>
        </Container>

        {/* UI Snackbar Notifications */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={this.handleCloseSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert onClose={this.handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: "100%", fontWeight: "bold" }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </>
    );
  }
}

export default AddExpensePage;