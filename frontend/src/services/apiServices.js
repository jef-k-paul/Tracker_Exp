import axios from "axios";
import { API_BASE_URL } from "../utils/constants";

//Create the api base and use it from here to get access to based url everywhere as api
const api = axios.create({
    baseURL : API_BASE_URL
});

// Request interceptor: attach Bearer token to all outgoing API calls
api.interceptors.request.use(
    (config) => {
        let token = localStorage.getItem("token");
        if (!token) {
            try {
                const user = JSON.parse(localStorage.getItem("user") || "{}");
                token = user.token;
            } catch (e) {
                token = null;
            }
        }
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor: handle 401/403 unauthorized token expiration
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Token missing or expired, clear local storage and redirect to login
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            if (window.location.pathname !== "/") {
                window.location.href = "/";
            }
        }
        return Promise.reject(error);
    }
);


// Credentials login (email + password / PIN)
export const loginWithCredentials = ({ email, password, circleId }) => {
    return api.post("/auth/login", { email, password, circleId });
};

// Legacy accessKey login
export const login = (accessKey) => {
    return api.post("/auth/login", { accessKey });
};

// Register individual user account
export const registerUser = ({ email, password, name }) => {
    return api.post("/auth/register", { email, password, name });
};

// Request 6-digit OTP for password reset
export const forgotPassword = (email) => {
    return api.post("/auth/forgot-password", { email });
};

// Reset password with 6-digit OTP
export const resetPassword = ({ email, otp, newPassword }) => {
    return api.post("/auth/reset-password", { email, otp, newPassword });
};

// Join a circle using family / invite code
export const joinCircle = ({ familyCode, memberName }) => {
    return api.post("/auth/join-circle", { familyCode, memberName });
};

// Create a new family / circle
export const createCircle = ({ circleName, memberName, adminName }) => {
    return api.post("/auth/create-circle", { circleName, memberName: memberName || adminName });
};

// Switch active circle
export const switchCircle = (circleId) => {
    return api.post("/auth/switch-circle", { circleId });
};

// Get all circles the current user belongs to
export const getMyCircles = () => {
    return api.get("/auth/my-circles");
};

//Get sumary 
export const getSummary = (month, year) =>{
    return api.get(`/summary?month=${month}&year=${year}`);

};

export const getExpenses = (month, year) => {
    return api.get(`/expenses?month=${month}&year=${year}`);
};

export const getSettlements = (month, year) => {
    return api.get(`/settlements?month=${month}&year=${year}`);
};

export const initiateSettlement = (payload) => {
    return api.post("/settlements/initiate", payload);
};

export const confirmSettlement = (settlementId) => {
    return api.put(`/settlements/${settlementId}/confirm`);
};

export const rejectSettlement = (settlementId) => {
    return api.put(`/settlements/${settlementId}/reject`);
};

export const getPendingSettlements = () => {
    return api.get("/settlements/pending");
};

export const getPendingSettlementsCount = () => {
    return api.get("/settlements/pending-count");
};

export const getMembers = () => {
    return api.get("/members");
};

export const getCategories = () => {
    return api.get("/categories");
};

export const addExpense = (expense) => {
    return api.post("/expenses", expense);
};

export const checkDuplicateExpense = (amount, categoryId, date) => {
    return api.get(`/expenses/check-duplicate?amount=${amount}&categoryId=${categoryId}&date=${date}`);
};

export const getAllTimePaid = (memberId) => {
    const url = memberId ? `/expenses/all-time-paid?memberId=${memberId}` : `/expenses/all-time-paid`;
    return api.get(url);
};

export const getAllTimeShare = (memberId) => {
    const url = memberId ? `/expenses/all-time-share?memberId=${memberId}` : `/expenses/all-time-share`;
    return api.get(url);
};

export default api;