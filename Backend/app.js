const express = require("express");
const cors = require("cors");
const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const summaryRoutes = require("./routes/summaryRoutes");
const settlementRoutes = require("./routes/settlementRoutes");
const memberRoutes = require("./routes/memberRoutes");
const categoryRoutes = require("./routes/categoryRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Public health & keep-alive routes (Render & cron-job.org)
app.use("/health", healthRoutes);
app.use("/api/health", healthRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/summary", summaryRoutes);
app.use("/api/settlements", settlementRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/categories", categoryRoutes);

module.exports = app;