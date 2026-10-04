import React, { useState } from "react";
import {
  Paper,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Box,
  Tooltip,
  IconButton,
  Button,
  Stack,
  CircularProgress
} from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import TableChartIcon from "@mui/icons-material/TableChart";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { exportMonthlyStatementPDF, exportExpensesCSV } from "../../utils/exportUtils";

const ExpenseTable = ({ expenses = [], currentUser, loading = false, exportData }) => {
  const [exportingType, setExportingType] = useState(null); // 'pdf' | 'csv' | null
  const loggedInName = currentUser?.name?.toLowerCase();

  const handleDownloadCSV = async () => {
    if (!exportData || exportingType) return;
    try {
      setExportingType("csv");
      await exportExpensesCSV(exportData);
    } catch (err) {
      console.error("CSV export failed:", err);
    } finally {
      setExportingType(null);
    }
  };

  const handleDownloadPDF = async () => {
    if (!exportData || exportingType) return;
    try {
      setExportingType("pdf");
      await exportMonthlyStatementPDF(exportData);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExportingType(null);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: { xs: 1.5, sm: 3 }, borderRadius: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1.5}>
        <Box display="flex" alignItems="center">
          <ReceiptLongIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
          <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}>
            Expense Transactions History
          </Typography>
        </Box>

        {exportData && expenses.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              disabled={Boolean(exportingType)}
              startIcon={
                exportingType === "csv" ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <TableChartIcon />
                )
              }
              onClick={handleDownloadCSV}
              sx={{ flex: { xs: 1, sm: "unset" }, borderRadius: 2, textTransform: "none", fontSize: { xs: "0.75rem", sm: "0.8rem" }, fontWeight: 600 }}
            >
              {exportingType === "csv" ? "Exporting..." : "Export CSV"}
            </Button>
            <Button
              size="small"
              variant="contained"
              color="primary"
              disabled={Boolean(exportingType)}
              startIcon={
                exportingType === "pdf" ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <PictureAsPdfIcon />
                )
              }
              onClick={handleDownloadPDF}
              sx={{ flex: { xs: 1, sm: "unset" }, borderRadius: 2, textTransform: "none", fontSize: { xs: "0.75rem", sm: "0.8rem" }, fontWeight: 600 }}
            >
              {exportingType === "pdf" ? "Generating..." : "Statement (PDF)"}
            </Button>
          </Stack>
        )}
      </Box>

      {expenses.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography variant="body1" color="text.secondary">
            No expense records found for the selected period.
          </Typography>
        </Box>
      ) : (
        <TableContainer sx={{ overflowX: "auto", maxWidth: "100%", WebkitOverflowScrolling: "touch" }}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Category</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Description</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Paid By</TableCell>
                <TableCell align="right" sx={{ fontWeight: "bold" }}>
                  Total Amount
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>
                  Split Type
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>
                  Your Share & Status
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((expense) => {
                const isYouPaid =
                  expense.paid_by.toLowerCase() === loggedInName ||
                  expense.paid_by_id === currentUser?.memberId;

                // Find logged in user's split share
                const userSplit = (expense.splits || []).find(
                  (s) =>
                    s.member_name.toLowerCase() === loggedInName ||
                    s.member_id === currentUser?.memberId
                );

                const userShare = userSplit ? Number(userSplit.share_amount) : 0;

                // Format split details string for tooltip
                const splitDetails = (expense.splits || [])
                  .map((s) => `${s.member_name}: ₹${Number(s.share_amount).toLocaleString("en-IN")}`)
                  .join(" | ");

                return (
                  <TableRow
                    key={expense.expense_id}
                    hover
                    sx={{
                      backgroundColor: isYouPaid ? "#faf5ff" : "inherit"
                    }}
                  >
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {new Date(expense.expense_date).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      })}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={expense.category}
                        size="small"
                        color="secondary"
                        variant="outlined"
                        sx={{ fontWeight: "medium" }}
                      />
                    </TableCell>

                    <TableCell>{expense.description || "N/A"}</TableCell>

                    <TableCell>
                      <Typography variant="body2" fontWeight={isYouPaid ? "bold" : "normal"}>
                        {isYouPaid ? "You" : expense.paid_by}
                      </Typography>
                    </TableCell>

                    <TableCell align="right" sx={{ fontWeight: "bold" }}>
                      ₹{Number(expense.amount).toLocaleString("en-IN")}
                    </TableCell>

                    <TableCell align="center">
                      <Chip
                        label={expense.split_type}
                        size="small"
                        color={expense.split_type === "CUSTOM" ? "warning" : "info"}
                        sx={{ fontSize: "0.7rem", height: 22 }}
                      />
                    </TableCell>

                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center">
                        {isYouPaid ? (
                          <Chip
                            label={`You Paid (Your share: ₹${userShare})`}
                            size="small"
                            color="success"
                            sx={{ fontWeight: "medium" }}
                          />
                        ) : (
                          <Chip
                            label={`Your Share: ₹${userShare}`}
                            size="small"
                            color="error"
                            variant="outlined"
                            sx={{ fontWeight: "medium" }}
                          />
                        )}

                        {splitDetails && (
                          <Tooltip title={`Splits: ${splitDetails}`} arrow placement="top">
                            <IconButton size="small" sx={{ ml: 0.5 }}>
                              <InfoOutlinedIcon fontSize="small" color="action" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default ExpenseTable;
