import axios from "axios";
import { API_BASE_URL } from "../utils/constants";

//Create the api base and use it from here to get acces to based url everywhere as api
const api = axios.create({
    baseURL : API_BASE_URL
});
console.log( "Axios Function create : ",axios.create());
console.log("Axios create baseURL",axios.create({baseURL : API_BASE_URL}));


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

export default api;