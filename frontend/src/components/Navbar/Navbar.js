import React, { Component } from "react";
import { AppBar, Toolbar, Typography, Button } from "@mui/material";

    class Navbar extends Component {
    handleLogout = () => {
        // REMOVE existing logged in user 
        localStorage.removeItem("user");
        // after removing load home page.
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
                href="/dashboard"
            >
                Dashboard
            </Button>

            <Button
                color="inherit"
                href="/add-expense"
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