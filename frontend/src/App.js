import React, { Component } from "react";
// import api from "./services/apiServices";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import LoginPage from "./pages/LoginPage/LoginPage";
import DashboardPage from "./pages/DashboardPage/DashboardPage";


class App extends Component {
    render() {

      return(
        <BrowserRouter>
          <Routes>
            
            <Route
            path="/"
            element={<LoginPage />}
            />

            <Route
            path="/dashboard"
            element={<DashboardPage />}
            />
          
          
          
          </Routes>
        </BrowserRouter>
      );
    } 
}


export default App;
