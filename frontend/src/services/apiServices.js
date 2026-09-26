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


// login post call and sending accessKey in payload
export const login = (accessKey) => {
    return api.post("/auth/login", { accessKey });
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