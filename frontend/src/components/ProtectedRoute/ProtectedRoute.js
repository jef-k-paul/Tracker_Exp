import React from "react";
import { Navigate } from "react-router-dom";

/**
 * Route guard component that verifies the user is authenticated before rendering children.
 * If unauthenticated, it immediately redirects to the login route ("/") without mounting
 * or rendering any part of the protected page, preventing any split-second flashing.
 */
const ProtectedRoute = ({ children }) => {
    const userStr = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    let isAuthenticated = false;

    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user && (token || user.token || user.member_id || user.memberId)) {
                isAuthenticated = true;
            }
        } catch (e) {
            isAuthenticated = false;
        }
    }

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
