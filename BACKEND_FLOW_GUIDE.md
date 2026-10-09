# 📘 Backend Architecture & Flow Guide
*A beginner-to-intermediate guide explaining how the Node.js/Express backend works, from basic routing to full database interactions.*

---

## 📑 Table of Contents
1. [Overview & Architectural Philosophy](#1-overview--architectural-philosophy)
2. [The Complete Request-Response Lifecycle](#2-the-complete-request-response-lifecycle)
3. [Deep Dive: What is a Router?](#3-deep-dive-what-is-a-router)
4. [Layer-by-Layer Breakdown](#4-layer-by-layer-breakdown)
   - [A. Entry Points (`server.js` & `app.js`)](#a-entry-points-serverjs--appjs)
   - [B. Middlewares](#b-middlewares)
   - [C. Routers (`routes/`)](#c-routers-routes)
   - [D. Controllers (`controllers/`)](#d-controllers-controllers)
   - [E. Services (`services/`)](#e-services-services)
   - [F. Repositories (`repositories/`)](#f-repositories-repositories)
   - [G. Database Pool (`db/connections.js`)](#g-database-pool-dbconnectionsjs)
5. [Step-by-Step: Adding a New Feature (Example)](#5-step-by-step-adding-a-new-feature-example)
6. [Key Security & Production Best Practices](#6-key-security--production-best-practices)

---

## 1. Overview & Architectural Philosophy

When building a production-grade backend, putting all your code inside one giant file creates bugs, makes testing impossible, and confuses anyone trying to maintain it.

This project follows the **Layered Architecture (Separation of Concerns)** pattern:

```
[ Client / Frontend ]
         │ (HTTP Request: JSON / Headers)
         ▼
[ Express Router ] ───► "Where does this request go?" (Traffic Policeman)
         │
[ Middleware ]     ───► "Is the user logged in? Is this request safe?" (Security Guard)
         │
[ Controller ]     ───► "Extract parameters, validate inputs, send HTTP response" (Receptionist)
         │
[ Service ]        ───► "Calculate splits, hash passwords, business logic" (Brain)
         │
[ Repository ]     ───► "Run raw SQL queries against MySQL" (Librarian)
         │
[ Database Pool ]  ───► "Manage open MySQL connections safely" (Vault)
```

Each layer has **exactly one job**. If you need to change your database, you only touch Repositories. If you need to change business rules, you only touch Services.

---

## 2. The Complete Request-Response Lifecycle

Let's trace what happens when someone clicks **"Add Expense"** on the frontend:

```
1. Frontend makes HTTP POST to:
   https://your-api.com/api/expenses
   Headers: { Authorization: "Bearer eyJhbGci..." }
   Body:    { amount: 50.00, category_id: 1, description: "Groceries" }
         │
         ▼
2. server.js
   - Receives TCP connection on PORT 5000 and hands it to app.js.
         │
         ▼
3. app.js
   - Parses incoming JSON body (express.json()).
   - Checks CORS policy (cors()).
   - Finds prefix match: '/api/expenses' -> routes to expenseRoutes.js.
         │
         ▼
4. authMiddleware.js
   - Extracts "Bearer eyJhbGci...".
   - Verifies JWT secret key.
   - Attaches decoded user info (req.user = { userId: 4, circleId: 1 }) to the request.
   - Calls next() to proceed.
         │
         ▼
5. expenseRoutes.js
   - Matches method POST and path "/".
   - Dispatches to expenseController.createExpense.
         │
         ▼
6. expenseController.js
   - Validates required inputs (amount, category_id).
   - Calls expenseService.createExpense(...) with parsed data.
         │
         ▼
7. expenseService.js
   - Calculates equal or custom member splits for that circle.
   - Coordinates writing to both 'expenses' table and 'expense_splits' table.
         │
         ▼
8. expenseRepository.js
   - Executes parameterized SQL:
     INSERT INTO expenses (circle_id, amount, ...) VALUES (?, ?, ?)
         │
         ▼
9. db/connections.js
   - Borrows an available connection from the 10-connection pool.
   - Executes query on MySQL / TiDB Cloud.
   - Releases connection back to pool.
         │
         ▼
10. Controller sends HTTP Response:
    res.status(201).json({ message: "Expense created successfully!", expenseId: 42 });
         │
         ▼
11. Frontend receives 201 Created and refreshes table!
```

---

## 3. Deep Dive: What is a Router?

### What is `express.Router()`?
Think of an Express Router as a **traffic controller** or **directory map**. 

Without a router, you would write everything in `app.js`:
```javascript
// ❌ BAD: Messy and unmaintainable!
app.get("/api/expenses", ...)
app.post("/api/expenses", ...)
app.delete("/api/expenses/:id", ...)
app.get("/api/auth/login", ...)
app.post("/api/auth/register", ...)
// ...hundreds of lines in one file!
```

With `express.Router()`, you break your application into modular mini-apps:
- `authRoutes.js` handles all authentication (`/api/auth/*`)
- `expenseRoutes.js` handles all expenses (`/api/expenses/*`)
- `categoryRoutes.js` handles all categories (`/api/categories/*`)
- `healthRoutes.js` handles keep-alive pinging (`/health`, `/api/health`)

### How Routing Works (Prefix Chaining)
When you mount a router in `app.js`:
```javascript
// In app.js
const expenseRoutes = require("./routes/expenseRoutes");

app.use("/api/expenses", expenseRoutes);
```
And inside `routes/expenseRoutes.js`:
```javascript
const express = require("express");
const router = express.Router();

// This path is RELATIVE to the prefix above!
router.get("/", expenseController.getExpenses);           // Matches: GET /api/expenses
router.post("/", expenseController.createExpense);        // Matches: POST /api/expenses
router.get("/summary", expenseController.getSummary);     // Matches: GET /api/expenses/summary
router.delete("/:id", expenseController.deleteExpense);   // Matches: DELETE /api/expenses/:id

module.exports = router;
```

> [!IMPORTANT]
> Express combines the **mount path** in `app.js` with the **route path** in `router.js`:
> `app.use("/api/expenses")` + `router.get("/summary")` = **`/api/expenses/summary`**

---

## 4. Layer-by-Layer Breakdown

### A. Entry Points (`server.js` & `app.js`)

- **`server.js`**: Its only responsibility is binding the network port and starting the listener.
  ```javascript
  require("dotenv").config();
  const app = require("./app");
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
      console.log(`Server is running on ${PORT}`);
  });
  ```
- **`app.js`**: Initializes Express, registers global middlewares, and mounts domain routers.
  ```javascript
  const express = require("express");
  const cors = require("cors");
  const healthRoutes = require("./routes/healthRoutes");
  const authRoutes = require("./routes/authRoutes");

  const app = express();

  app.use(cors());              // Allow cross-origin requests from frontend
  app.use(express.json());      // Automatically parse JSON bodies

  app.use("/health", healthRoutes);
  app.use("/api/auth", authRoutes);

  module.exports = app;
  ```

---

### B. Middlewares (`middlewares/`)

A middleware is a function that sits between the incoming request and the final route handler:
`Request ──► [ Middleware ] ──► [ Controller ]`

Middlewares have access to `req`, `res`, and `next`. They can either:
1. **Pass the request forward** by calling `next()`.
2. **Halt the request** by returning an error response (e.g. `res.status(401).json(...)`).

#### Example: `authMiddleware.js`
```javascript
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

const authenticateToken = (req, res, next) => {
    // 1. Read token from Authorization header
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
        return res.status(401).json({ message: "Access denied. Token missing." });
    }

    try {
        // 2. Verify token signature
        const decoded = jwt.verify(token, JWT_SECRET);
        // 3. Attach user info to req object for downstream controllers
        req.user = decoded;
        next(); // Proceed to controller!
    } catch (err) {
        return res.status(403).json({ message: "Invalid or expired token." });
    }
};
```

---

### C. Routers (`routes/`)

Routers define:
1. The HTTP method (`GET`, `POST`, `PUT`, `DELETE`).
2. The endpoint path.
3. Which middlewares protect this route.
4. Which controller function handles the request.

#### Example: `routes/expenseRoutes.js`
```javascript
const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/expenseController");
const { authenticateToken } = require("../middlewares/authMiddleware");

// All routes below require a valid login token
router.use(authenticateToken);

router.get("/", expenseController.getExpenses);
router.post("/", expenseController.createExpense);
router.delete("/:id", expenseController.deleteExpense);

module.exports = router;
```

---

### D. Controllers (`controllers/`)

The controller handles **HTTP semantics**:
- It reads data from `req.body`, `req.params`, or `req.query`.
- It performs lightweight input validation (e.g., checking if required fields are provided).
- It calls the Service layer to execute business logic.
- It returns appropriate HTTP status codes:
  - `200 OK` (Standard success)
  - `201 Created` (Resource created)
  - `400 Bad Request` (Missing/invalid input)
  - `401 Unauthorized` (Not logged in)
  - `403 Forbidden` (Logged in, but lack permissions)
  - `404 Not Found` (Resource does not exist)
  - `500 Internal Server Error` (Unexpected server crash)

```javascript
exports.createExpense = async (req, res) => {
    try {
        const { amount, category_id, description } = req.body;
        const circleId = req.user.circleId;
        const paidBy = req.user.memberId;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "A positive amount is required." });
        }

        const newExpense = await expenseService.addExpense({
            circleId,
            paidBy,
            amount,
            category_id,
            description
        });

        res.status(201).json({
            message: "Expense recorded successfully!",
            expense: newExpense
        });
    } catch (err) {
        console.error("Error in createExpense:", err);
        res.status(500).json({ message: "Failed to create expense." });
    }
};
```

---

### E. Services (`services/`)

The service contains the **business logic**. It is independent of Express:
- Calculating split shares (equal vs custom).
- Password hashing via bcrypt (`bcrypt.hash(password, 10)`).
- Sending confirmation emails or OTPs.
- Coordinating multiple repositories inside transactions.

```javascript
exports.addExpense = async ({ circleId, paidBy, amount, category_id, description }) => {
    // 1. Fetch active circle members to calculate split
    const members = await memberRepository.getActiveMembersByCircle(circleId);
    const splitAmount = (amount / members.length).toFixed(2);

    // 2. Save parent expense record
    const expenseId = await expenseRepository.insertExpense({
        circleId,
        paidBy,
        amount,
        categoryId: category_id,
        description
    });

    // 3. Save split share for each member
    for (const member of members) {
        await expenseRepository.insertSplit({
            expenseId,
            memberId: member.member_id,
            shareAmount: splitAmount
        });
    }

    return { expenseId, splitAmount };
};
```

---

### F. Repositories (`repositories/`)

The repository handles direct **database queries**:
- It uses raw SQL queries wrapped in JavaScript Promises.
- It protects against SQL Injection by using parameterized queries (`?`).

```javascript
const db = require("../db/connections");

exports.insertExpense = ({ circleId, paidBy, amount, categoryId, description }) => {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO expenses (circle_id, paid_by, amount, category_id, description, expense_date)
            VALUES (?, ?, ?, ?, ?, CURDATE())
        `;
        // ALWAYS pass values in the array, NEVER concatenate strings into SQL!
        db.query(sql, [circleId, paidBy, amount, categoryId, description], (err, result) => {
            if (err) return reject(err);
            resolve(result.insertId);
        });
    });
};
```

---

### G. Database Pool (`db/connections.js`)

Instead of opening a new MySQL connection on every request (which would crash MySQL under load), we create a **Connection Pool**:

```javascript
const mysql = require("mysql2");

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,       // Max 10 simultaneous connections
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

module.exports = pool;
```

---

## 5. Step-by-Step: Adding a New Feature (Example)

Let's say you want to add a new feature: **"User Notes"** where users can save personal notes. Here is the exact order to build it:

### Step 1: Database Table
```sql
CREATE TABLE IF NOT EXISTS user_notes (
    note_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Step 2: Repository (`Backend/repositories/noteRepository.js`)
```javascript
const db = require("../db/connections");

exports.getUserNotes = (userId) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM user_notes WHERE user_id = ?", [userId], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
};

exports.addNote = (userId, content) => {
    return new Promise((resolve, reject) => {
        db.query("INSERT INTO user_notes (user_id, content) VALUES (?, ?)", [userId, content], (err, result) => {
            if (err) return reject(err);
            resolve(result.insertId);
        });
    });
};
```

### Step 3: Controller (`Backend/controllers/noteController.js`)
```javascript
const noteRepository = require("../repositories/noteRepository");

exports.getNotes = async (req, res) => {
    try {
        const userId = req.user.userId;
        const notes = await noteRepository.getUserNotes(userId);
        res.json({ notes });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch notes." });
    }
};

exports.createNote = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { content } = req.body;
        if (!content) return res.status(400).json({ message: "Content is required." });

        const noteId = await noteRepository.addNote(userId, content);
        res.status(201).json({ message: "Note saved!", noteId });
    } catch (err) {
        res.status(500).json({ message: "Failed to save note." });
    }
};
```

### Step 4: Router (`Backend/routes/noteRoutes.js`)
```javascript
const express = require("express");
const router = express.Router();
const noteController = require("../controllers/noteController");
const { authenticateToken } = require("../middlewares/authMiddleware");

router.use(authenticateToken); // Protect all note routes
router.get("/", noteController.getNotes);
router.post("/", noteController.createNote);

module.exports = router;
```

### Step 5: Mount in `Backend/app.js`
```javascript
const noteRoutes = require("./routes/noteRoutes");

// ...
app.use("/api/notes", noteRoutes);
```

You are done! You can now call `GET /api/notes` and `POST /api/notes` from the frontend.

---

## 6. Key Security & Production Best Practices

1. **Never concatenate SQL queries**:
   - ❌ `db.query("SELECT * FROM users WHERE email = '" + email + "'")` (SQL Injection Vulnerability!)
   - ✅ `db.query("SELECT * FROM users WHERE email = ?", [email])` (Parameterized & Safe)
2. **Never store plain text passwords**:
   - Always hash with bcrypt (`bcrypt.hash(password, 10)`).
3. **Keep health check endpoints lightweight**:
   - As implemented in `healthRoutes.js`, keep-alive pings for free hosting (like Render) should respond in-memory without querying MySQL on every ping.
4. **Use Environment Variables**:
   - Never commit database passwords or JWT secret keys to GitHub. Use `process.env.DB_PASSWORD` loaded via `dotenv`.
