const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "family_Expense_tracker_jwt_secret_<,key.>_2026";

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
        return res.status(401).json({ message: "Access denied. Authentication token is missing." });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ message: "Invalid or expired session token. Please log in again." });
    }
};

module.exports = {
    authenticateToken,
    JWT_SECRET
};
