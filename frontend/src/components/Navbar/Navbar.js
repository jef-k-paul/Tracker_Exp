import React, { Component } from "react";
import { AppBar, Toolbar, Typography, Button } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

class Navbar extends Component {
    handleLogout = () => {
        // Remove authentication items from storage
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        // Redirect to login page
        window.location.href = "/";
    };

    render() {
        return (
        <AppBar position="static">
            <Toolbar>
            <Typography
                variant="h6"
                sx={{ flexGrow: 1 }}
            >
                Family Expense Tracker
            </Typography>
            
            <Button
                color="inherit"
                component={RouterLink}
                to="/dashboard"
            >
                Dashboard
            </Button>

            <Button
                color="inherit"
                component={RouterLink}
                to="/add-expense"
            >
                Add Expense
            </Button>

            <Button
                color="inherit"
                onClick={this.handleLogout}
            >
                Logout
            </Button>

            </Toolbar>

        </AppBar>
        );
    }
}

export default Navbar;