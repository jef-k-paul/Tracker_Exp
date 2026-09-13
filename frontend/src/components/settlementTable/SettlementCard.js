import React from "react";
import {
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Chip,
  Avatar,
  Stack
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import SavingsIcon from "@mui/icons-material/Savings";
import HandshakeIcon from "@mui/icons-material/Handshake";

const SettlementCard = ({ settlements = [], currentUser }) => {
  const loggedInName = currentUser?.name?.toLowerCase();

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 3 }}>
      <Box display="flex" alignItems="center" mb={2}>
        <HandshakeIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
        <Typography variant="h6" fontWeight="bold">
          Settlement Recommendations
        </Typography>
      </Box>

      {settlements.length === 0 ? (
        <Card
          elevation={0}
          sx={{
            p: 3,
            textAlign: "center",
            backgroundColor: "#f0fdf4",
            border: "1px dashed #22c55e",
            borderRadius: 3
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 48, color: "#16a34a", mb: 1 }} />
          <Typography variant="h6" color="success.main" fontWeight="bold">
            All Settled Up!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No pending settlements required for the selected month.
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {settlements.map((item, index) => {
            const isPayer = item.from.toLowerCase() === loggedInName;
            const isReceiver = item.to.toLowerCase() === loggedInName;

            // Color grading & styling
            let cardBg = "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)";
            let borderColor = "#cbd5e1";
            let icon = <ArrowForwardIcon color="action" />;
            let badgeText = "Neutral Settlement";
            let badgeColor = "default";

            if (isPayer) {
              cardBg = "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)";
              borderColor = "#fca5a5";
              icon = <WarningAmberIcon color="error" />;
              badgeText = "You Need To Pay";
              badgeColor = "error";
            } else if (isReceiver) {
              cardBg = "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)";
              borderColor = "#86efac";
              icon = <SavingsIcon color="success" />;
              badgeText = "You Will Receive";
              badgeColor = "success";
            }

            return (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card
                  elevation={2}
                  sx={{
                    borderRadius: 3,
                    background: cardBg,
                    border: `1.5px solid ${borderColor}`,
                    transition: "transform 0.2s ease-in-out",
                    "&:hover": {
                      transform: "translateY(-3px)",
                      boxShadow: 4
                    }
                  }}
                >
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                      <Chip
                        label={badgeText}
                        color={badgeColor}
                        size="small"
                        sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
                      />
                      {icon}
                    </Box>

                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                      <Box display="flex" alignItems="center" spacing={1}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            fontSize: "0.85rem",
                            bgcolor: isPayer ? "#dc2626" : "#475569",
                            mr: 1
                          }}
                        >
                          {item.from.charAt(0)}
                        </Avatar>
                        <Typography variant="body1" fontWeight={isPayer ? "bold" : "normal"}>
                          {isPayer ? "You" : item.from}
                        </Typography>
                      </Box>

                      <ArrowForwardIcon sx={{ fontSize: 18, color: "text.secondary" }} />

                      <Box display="flex" alignItems="center">
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            fontSize: "0.85rem",
                            bgcolor: isReceiver ? "#16a34a" : "#475569",
                            mr: 1
                          }}
                        >
                          {item.to.charAt(0)}
                        </Avatar>
                        <Typography variant="body1" fontWeight={isReceiver ? "bold" : "normal"}>
                          {isReceiver ? "You" : item.to}
                        </Typography>
                      </Box>
                    </Stack>

                    <Box mt={2} pt={1} borderTop="1px dashed #cbd5e1" textAlign="center">
                      <Typography variant="subtitle2" color="text.secondary">
                        Amount Owed
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight="bold"
                        sx={{
                          color: isPayer ? "error.main" : isReceiver ? "success.main" : "primary.main"
                        }}
                      >
                        ₹{Number(item.amount).toLocaleString("en-IN")}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Paper>
  );
};

export default SettlementCard;
