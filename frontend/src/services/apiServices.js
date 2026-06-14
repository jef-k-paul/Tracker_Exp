import axios from "axios";
import { API_BASE_URL } from "../utils/constants";

//Create the api base and use it from here to get acces to based url everywhere as api
const api = axios.create({
    baseURL : API_BASE_URL
});



// login post call and sending accessKey in payload
export const login = (accessKey) => {
    return api.post("/auth/login", { accessKey });
};

export default api;