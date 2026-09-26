import React, { Component } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage/LoginPage";
import DashboardPage from "./pages/DashboardPage/DashboardPage";
import AddExpensePage from "./pages/AddExpensePage/AddExpensePage";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";

class App extends Component {
    render() {
      return (
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={<LoginPage />}
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/add-expense"
              element={
                <ProtectedRoute>
                  <AddExpensePage />
                </ProtectedRoute>
              }
            />

            {/* Redirect any unknown route to home */}
            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />
          </Routes>
        </BrowserRouter>
      );
    } 
}

export default App;
