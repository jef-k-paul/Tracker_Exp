import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Stack,
  Alert,
  Divider,
  IconButton
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import HubIcon from "@mui/icons-material/Hub";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

const SettlementBreakdownModal = ({
  open,
  onClose,
  settlementItem,
  expenses = [],
  summary = {},
  currentUser
}) => {
  const [tabValue, setTabValue] = useState(0);

  if (!settlementItem) return null;

  const payerName = settlementItem.from || "Payer";
  const receiverName = settlementItem.to || "Receiver";
  const payerId = settlementItem.from_id;
  const receiverId = settlementItem.to_id;
  const settlementAmount = Number(settlementItem.amount || 0);

  // 1. Direct Pairwise Shared Expenses Analysis
  // Filter expenses where either payer paid and receiver has share, OR receiver paid and payer has share
  const directExpenses = expenses.filter((exp) => {
    const paidById = Number(exp.paid_by_id);
    const splits = exp.splits || [];

    const isReceiverPayerOfExp = receiverId && paidById === Number(receiverId);
    const isPayerPayerOfExp = payerId && paidById === Number(payerId);

    const payerHasShare = splits.some(
      (s) => (payerId && Number(s.member_id) === Number(payerId)) ||
             (s.member_name && s.member_name.toLowerCase() === payerName.toLowerCase())
    );

    const receiverHasShare = splits.some(
      (s) => (receiverId && Number(s.member_id) === Number(receiverId)) ||
             (s.member_name && s.member_name.toLowerCase() === receiverName.toLowerCase())
    );

    return (isReceiverPayerOfExp && payerHasShare) || (isPayerPayerOfExp && receiverHasShare);
  });

  // Calculate direct pairwise net balance
  let receiverPaidForPayerTotal = 0;
  let payerPaidForReceiverTotal = 0;

  const detailedDirectList = directExpenses.map((exp) => {
    const paidById = Number(exp.paid_by_id);
    const splits = exp.splits || [];

    const payerSplit = splits.find(
      (s) => (payerId && Number(s.member_id) === Number(payerId)) ||
             (s.member_name && s.member_name.toLowerCase() === payerName.toLowerCase())
    );
    const receiverSplit = splits.find(
      (s) => (receiverId && Number(s.member_id) === Number(receiverId)) ||
             (s.member_name && s.member_name.toLowerCase() === receiverName.toLowerCase())
    );

    const payerShareAmt = Number(payerSplit?.share_amount || 0);
    const receiverShareAmt = Number(receiverSplit?.share_amount || 0);

    const isReceiverPaid = receiverId && paidById === Number(receiverId);
    const isPayerPaid = payerId && paidById === Number(payerId);

    if (isReceiverPaid) {
      receiverPaidForPayerTotal += payerShareAmt;
    }
    if (isPayerPaid) {
      payerPaidForReceiverTotal += receiverShareAmt;
    }

    return {
      ...exp,
      payerShareAmt,
      receiverShareAmt,
      paidByName: exp.paid_by || (isReceiverPaid ? receiverName : payerName)
    };
  });

  const directNetDifference = Number((receiverPaidForPayerTotal - payerPaidForReceiverTotal).toFixed(2));

  // 2. Circle Net Position Analysis (from summary.perPerson)
  const perPerson = summary.perPerson || [];
  const payerStat = perPerson.find(
    (p) => (payerId && Number(p.member_id) === Number(payerId)) ||
           (p.member && p.member.toLowerCase() === payerName.toLowerCase())
  ) || { paid: 0, share: 0, balance: 0 };

  const receiverStat = perPerson.find(
    (p) => (receiverId && Number(p.member_id) === Number(receiverId)) ||
           (p.member && p.member.toLowerCase() === receiverName.toLowerCase())
  ) || { paid: 0, share: 0, balance: 0 };

  const isRelayTransfer = directExpenses.length === 0 || Math.abs(directNetDifference - settlementAmount) > 1.0;

  // 3. Detect circle's highest creditor and other members whose dues were collapsed into this payment
  const isPayerYou = currentUser?.name && payerName.toLowerCase() === currentUser.name.toLowerCase();
  const allCreditors = (summary.perPerson || [])
    .filter((p) => Number(p.balance || 0) > 0.01)
    .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0));
  const isReceiverTopCreditor =
    allCreditors.length > 0 &&
    allCreditors[0].member?.toLowerCase() === receiverName.toLowerCase();

  const otherMembersWithDues = [];
  const otherMembers = (summary.perPerson || []).filter(
    (p) =>
      p.member &&
      p.member.toLowerCase() !== payerName.toLowerCase() &&
      p.member.toLowerCase() !== receiverName.toLowerCase()
  );

  otherMembers.forEach((other) => {
    let otherPaidForPayer = 0;
    let payerPaidForOther = 0;

    expenses.forEach((exp) => {
      const paidById = Number(exp.paid_by_id);
      const splits = exp.splits || [];

      const isOtherPayer =
        (other.member_id && paidById === Number(other.member_id)) ||
        (exp.paid_by && exp.paid_by.toLowerCase() === other.member.toLowerCase());
      const isPayerPayer =
        (payerId && paidById === Number(payerId)) ||
        (exp.paid_by && exp.paid_by.toLowerCase() === payerName.toLowerCase());

      const payerSplit = splits.find(
        (s) =>
          (payerId && Number(s.member_id) === Number(payerId)) ||
          (s.member_name && s.member_name.toLowerCase() === payerName.toLowerCase())
      );
      const otherSplit = splits.find(
        (s) =>
          (other.member_id && Number(s.member_id) === Number(other.member_id)) ||
          (s.member_name && s.member_name.toLowerCase() === other.member.toLowerCase())
      );

      if (isOtherPayer && payerSplit) {
        otherPaidForPayer += Number(payerSplit.share_amount || 0);
      }
      if (isPayerPayer && otherSplit) {
        payerPaidForOther += Number(otherSplit.share_amount || 0);
      }
    });

    const netOwedToOther = Number((otherPaidForPayer - payerPaidForOther).toFixed(2));
    if (netOwedToOther > 0.01) {
      otherMembersWithDues.push({
        name: other.member,
        amount: netOwedToOther
      });
    }
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ m: 0, p: 2.5, backgroundColor: "#0f172a", color: "#ffffff" }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Settlement Calculation Audit
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                {payerName}
              </Typography>
              <ArrowForwardIcon sx={{ fontSize: 16, color: "#38bdf8" }} />
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                {receiverName}
              </Typography>
              <Chip
                label={`₹${settlementAmount.toLocaleString("en-IN")}`}
                size="small"
                sx={{
                  backgroundColor: "rgba(56, 189, 248, 0.2)",
                  color: "#38bdf8",
                  fontWeight: "bold",
                  ml: 1
                }}
              />
            </Stack>
          </Box>
          <IconButton onClick={onClose} sx={{ color: "#94a3b8", "&:hover": { color: "#ffffff" } }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: "divider", backgroundColor: "#f8fafc", px: 2 }}>
        <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)}>
          <Tab
            icon={<ReceiptLongIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Direct Shared Expenses (${directExpenses.length})`}
            sx={{ textTransform: "none", fontWeight: 600 }}
          />
          <Tab
            icon={<HubIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Circle Debt Simplification Route"
            sx={{ textTransform: "none", fontWeight: 600 }}
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        {tabValue === 0 && (
          <Box>
            {isRelayTransfer && directExpenses.length === 0 ? (
              <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Circle Debt Simplification Transfer
                </Typography>
                <Typography variant="body2" sx={{ fontSize: "0.85rem", mt: 0.5 }}>
                  {payerName} and {receiverName} did not share any direct pairwise expenses this month.
                  This settlement of <strong>₹{settlementAmount.toLocaleString("en-IN")}</strong> was calculated by the circle's debt minimization algorithm so {payerName} can clear their circle dues directly to {receiverName}, saving extra intermediate transfers for the family!
                  Switch to the <strong>"Circle Debt Simplification Route"</strong> tab to see the full math breakdown.
                </Typography>
              </Alert>
            ) : (
              <>
                <Box display="flex" justifyContent="space-between" flexWrap="wrap" gap={2} mb={2.5}>
                  <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 200, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      {receiverName} paid for {payerName}
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="error.main">
                      +₹{receiverPaidForPayerTotal.toLocaleString("en-IN")}
                    </Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 200, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      {payerName} paid for {receiverName}
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="success.main">
                      -₹{payerPaidForReceiverTotal.toLocaleString("en-IN")}
                    </Typography>
                  </Paper>
                  <Paper
                    variant="outlined"
                    sx={{ p: 1.5, flex: 1, minWidth: 200, borderRadius: 2, backgroundColor: "#f0fdf4" }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Direct Pairwise Net
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="primary.main">
                      ₹{directNetDifference.toLocaleString("en-IN")}
                    </Typography>
                  </Paper>
                </Box>

                <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                  Itemized Direct Transactions ({detailedDirectList.length}):
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: "#f1f5f9" }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Description</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Paid By</TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold" }}>
                          Total Bill
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold" }}>
                          {payerName}'s Share
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold" }}>
                          {receiverName}'s Share
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detailedDirectList.map((exp, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                            {exp.expense_date ? new Date(exp.expense_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "N/A"}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{exp.description || exp.category || "Expense"}</TableCell>
                          <TableCell>
                            <Chip label={exp.paidByName} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
                          </TableCell>
                          <TableCell align="right">₹{Number(exp.amount).toLocaleString("en-IN")}</TableCell>
                          <TableCell align="right" sx={{ color: "error.main", fontWeight: 600 }}>
                            ₹{exp.payerShareAmt.toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell align="right" sx={{ color: "success.main", fontWeight: 600 }}>
                            ₹{exp.receiverShareAmt.toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {Math.abs(directNetDifference - settlementAmount) > 1.0 && (
                  <Alert severity="warning" sx={{ borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ fontSize: "0.82rem" }}>
                      <strong>Notice:</strong> Direct shared expenses total ₹{directNetDifference.toLocaleString("en-IN")}, but this settlement amount is ₹{settlementAmount.toLocaleString("en-IN")}. The difference (₹{Math.abs(settlementAmount - directNetDifference).toLocaleString("en-IN")}) comes from other circle expenses simplified by the group algorithm. Check the "Circle Debt Simplification Route" tab for details.
                    </Typography>
                  </Alert>
                )}
              </>
            )}
          </Box>
        )}

        {tabValue === 1 && (
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              How Group Debt Minimization Works
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Instead of forcing every pair of members to do multiple separate bank transfers for every small bill, the tracker calculates each member's net circle standing and consolidates dues into the minimum number of direct transactions.
            </Typography>

            <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }} gap={2} mb={3}>
              {/* Payer Summary */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderLeft: "4px solid #ef4444" }}>
                <Typography variant="subtitle2" fontWeight="bold" color="error.main">
                  {payerName}'s Circle Position
                </Typography>
                <Stack spacing={1} mt={1.5}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Total Consumption Share:</Typography>
                    <Typography variant="body2" fontWeight="bold">₹{Number(payerStat.share || 0).toLocaleString("en-IN")}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Total Paid Out-of-Pocket:</Typography>
                    <Typography variant="body2" fontWeight="bold">₹{Number(payerStat.paid || 0).toLocaleString("en-IN")}</Typography>
                  </Box>
                  <Divider />
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" fontWeight="bold">Net Circle Obligation:</Typography>
                    <Typography variant="body2" fontWeight="bold" color="error.main">
                      -₹{Math.abs(Number(payerStat.balance || 0)).toLocaleString("en-IN")}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              {/* Receiver Summary */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderLeft: "4px solid #10b981" }}>
                <Typography variant="subtitle2" fontWeight="bold" color="success.main">
                  {receiverName}'s Circle Position
                </Typography>
                <Stack spacing={1} mt={1.5}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Total Paid Out-of-Pocket:</Typography>
                    <Typography variant="body2" fontWeight="bold">₹{Number(receiverStat.paid || 0).toLocaleString("en-IN")}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Total Consumption Share:</Typography>
                    <Typography variant="body2" fontWeight="bold">₹{Number(receiverStat.share || 0).toLocaleString("en-IN")}</Typography>
                  </Box>
                  <Divider />
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" fontWeight="bold">Net Circle Credit Owed:</Typography>
                    <Typography variant="body2" fontWeight="bold" color="success.main">
                      +₹{Number(receiverStat.balance || 0).toLocaleString("en-IN")}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Box>

            <Paper sx={{ p: 2, borderRadius: 2, backgroundColor: "#f0fdf4", border: "1px dashed #22c55e" }}>
              <Box display="flex" alignItems="flex-start" gap={1.5}>
                <CheckCircleOutlineIcon color="success" sx={{ fontSize: 26, mt: 0.3 }} />
                <Box sx={{ width: "100%" }}>
                  <Typography variant="subtitle2" fontWeight="bold" color="success.dark">
                    Resulting Settlement Equation
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem", mt: 0.5 }}>
                    Paying <strong>₹{settlementAmount.toLocaleString("en-IN")}</strong> from <strong>{payerName}</strong> to <strong>{receiverName}</strong> simultaneously settles {isPayerYou ? "your" : `${payerName}'s`} circle dues and fulfills {receiverName}'s reimbursement, maintaining zero-sum balance across the entire circle.
                  </Typography>

                  {otherMembersWithDues.length > 0 && (
                    <Box
                      sx={{
                        mt: 1.5,
                        p: 1.5,
                        backgroundColor: "#ffffff",
                        borderRadius: 2,
                        border: "1px solid #bbf7d0"
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center" mb={0.8} flexWrap="wrap">
                        <Chip
                          label="Smart Consolidation"
                          size="small"
                          color="success"
                          sx={{ height: 20, fontSize: "0.68rem", fontWeight: "bold" }}
                        />
                        <Typography variant="caption" sx={{ color: "#15803d", fontWeight: 700 }}>
                          Bypassed Intermediate Transfers ({otherMembersWithDues.length}):
                        </Typography>
                      </Stack>

                      {otherMembersWithDues.length > 1 && (
                        <Stack direction="row" spacing={1} flexWrap="wrap" mb={1}>
                          {otherMembersWithDues.map((m, idx) => (
                            <Chip
                              key={idx}
                              size="small"
                              variant="outlined"
                              color="success"
                              label={`${m.name}: ~₹${m.amount.toLocaleString("en-IN")}`}
                              sx={{ fontSize: "0.75rem", height: 22, backgroundColor: "#f0fdf4" }}
                            />
                          ))}
                        </Stack>
                      )}

                      <Typography variant="body2" sx={{ fontSize: "0.82rem", color: "#166534", lineHeight: 1.5 }}>
                        {otherMembersWithDues.length === 1 ? (
                          <>
                            {isPayerYou ? "Your" : `${payerName}'s`} dues to <strong>{otherMembersWithDues[0].name}</strong> (~₹{otherMembersWithDues[0].amount.toLocaleString("en-IN")}) have been simplified into this single payment. {isPayerYou ? "You don't" : `${payerName} doesn't`} need to pay {otherMembersWithDues[0].name} separately—that amount is routed directly to <strong>{receiverName}</strong>{isReceiverTopCreditor ? " (the group's highest creditor)" : ""}, eliminating an extra transfer.
                          </>
                        ) : (
                          <>
                            {isPayerYou ? "Your" : `${payerName}'s`} indirect dues to <strong>{otherMembersWithDues.map((m) => m.name).join(" & ")}</strong> (totaling ~₹{otherMembersWithDues.reduce((sum, m) => sum + Number(m.amount || 0), 0).toLocaleString("en-IN")}) have been consolidated into this single payment. {isPayerYou ? "You don't" : `${payerName} doesn't`} need to pay them separately—those dues are deducted and routed straight to <strong>{receiverName}</strong>{isReceiverTopCreditor ? " (the group's highest creditor)" : ""}, eliminating {otherMembersWithDues.length} separate transfers for the circle.
                          </>
                        )}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <Button onClick={onClose} variant="contained" color="primary" sx={{ textTransform: "none", borderRadius: 2 }}>
          Close Audit
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettlementBreakdownModal;
