import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
  Tooltip
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import TableChartIcon from "@mui/icons-material/TableChart";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { exportMonthlyStatementPDF, exportExpensesCSV } from "../../utils/exportUtils";

const Navbar = ({ exportData }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const handleOpenExport = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseExport = () => {
    setAnchorEl(null);
  };

  const handleDownloadPDF = () => {
    handleCloseExport();
    if (exportData) {
      exportMonthlyStatementPDF(exportData);
    }
  };

  const handleDownloadCSV = () => {
    handleCloseExport();
    if (exportData) {
      exportExpensesCSV(exportData);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  return (
    <AppBar position="static" sx={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
      <Toolbar>
        <Typography
          variant="h6"
          fontWeight="bold"
          sx={{ flexGrow: 1, letterSpacing: "-0.5px" }}
        >
          Family Expense Tracker
        </Typography>

        <Box display="flex" alignItems="center" gap={1}>
          <Button color="inherit" component={RouterLink} to="/dashboard">
            Dashboard
          </Button>

          <Button color="inherit" component={RouterLink} to="/add-expense">
            Add Expense
          </Button>

          {/* Export Statement Dropdown Button */}
          {exportData && (
            <>
              <Tooltip title="Download monthly report as PDF or CSV">
                <Button
                  color="inherit"
                  onClick={handleOpenExport}
                  endIcon={<KeyboardArrowDownIcon />}
                  startIcon={<FileDownloadIcon />}
                  sx={{
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 2,
                    px: 1.5,
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.2)"
                    }
                  }}
                >
                  Export
                </Button>
              </Tooltip>

              <Menu
                anchorEl={anchorEl}
                open={openMenu}
                onClose={handleCloseExport}
                PaperProps={{
                  elevation: 6,
                  sx: {
                    borderRadius: 2.5,
                    minWidth: 220,
                    mt: 1,
                    p: 0.5
                  }
                }}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              >
                <MenuItem onClick={handleDownloadPDF} sx={{ py: 1, borderRadius: 1.5 }}>
                  <ListItemIcon sx={{ color: "#ef4444" }}>
                    <PictureAsPdfIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Monthly Statement (PDF)"
                    primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                    secondary="All-in-one executive report"
                    secondaryTypographyProps={{ variant: "caption", fontSize: "0.7rem" }}
                  />
                </MenuItem>

                <MenuItem onClick={handleDownloadCSV} sx={{ py: 1, borderRadius: 1.5 }}>
                  <ListItemIcon sx={{ color: "#10b981" }}>
                    <TableChartIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Export to CSV / Excel"
                    primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                    secondary="Raw transactions spreadsheet"
                    secondaryTypographyProps={{ variant: "caption", fontSize: "0.7rem" }}
                  />
                </MenuItem>
              </Menu>
            </>
          )}

          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;