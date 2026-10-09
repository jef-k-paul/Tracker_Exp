# 🎨 Frontend Architecture & Flow Guide
*A comprehensive guide explaining the React application structure, state management, API communication, and core UI flows.*

---

## 📑 Table of Contents
1. [Overview & Architecture](#1-overview--architecture)
2. [The Application Bootstrap & Routing Flow](#2-the-application-bootstrap--routing-flow)
3. [The Centralized API Service Layer (`apiServices.js`)](#3-the-centralized-api-service-layer-apiservicesjs)
4. [State Management & Data Synchronization](#4-state-management--data-synchronization)
5. [Deep Dive: Key Real-World Flows](#5-deep-dive-key-real-world-flows)
   - [A. Login & Session Bootstrapping](#a-login--session-bootstrapping)
   - [B. Multi-Circle Switching](#b-multi-circle-switching)
   - [C. Expense Creation & Table Refresh](#c-expense-creation--table-refresh)
   - [D. Profile Avatar Customization & Persistence](#d-profile-avatar-customization--persistence)
6. [Step-by-Step: Adding a New Frontend Feature](#6-step-by-step-adding-a-new-frontend-feature)
7. [Essential Frontend Pitfalls & Best Practices](#7-essential-frontend-pitfalls--best-practices)

---

## 1. Overview & Architecture

The frontend is built with **React** (Create React App), styled with **Material-UI (MUI)**, and communicates with the backend via **Axios**.

### Core Architecture Structure:
```
frontend/src/
├── components/          # Reusable UI widgets
│   ├── Navbar/          # Navigation, Circle Switcher, Avatar & Profile modal
│   ├── expenseTable/    # Expense history list, filters & PDF/Excel export
│   └── SummaryCards/    # Overview analytics, balance cards & monthly charts
├── pages/               # Full-screen route views
│   ├── LoginPage/       # Authentication (Email+Password, Access ID, OTP Reset)
│   ├── DashboardPage/   # Main dashboard orchestrating summary, cards, and tables
│   └── AddExpensePage/  # Form for recording expenses & calculating split shares
├── services/
│   └── apiServices.js   # Centralized Axios client & API call functions
├── utils/
│   └── constants.js     # API base URL configuration
├── App.js               # Route definitions & top-level layout
└── index.js             # React DOM entry point
```

---

## 2. The Application Bootstrap & Routing Flow

When a user visits your app in a web browser, here is the execution order:

```
[ Browser URL: https://app.com/dashboard ]
                    │
                    ▼
1. public/index.html
   - HTML shell with <div id="root"></div>, favicon, and fonts.
                    │
                    ▼
2. src/index.js
   - Mounts React DOM to the 'root' element.
                    │
                    ▼
3. src/App.js
   - Sets up <BrowserRouter> and evaluates current URL pathname.
                    │
                    ▼
4. Route Guard Check (Is User Logged In?)
   - If token exists in localStorage ──► Render <DashboardPage />
   - If token is missing             ──► Redirect to "/" (<LoginPage />)
```

### Route Protection Pattern
In `src/App.js`, protected routes check for authentication before rendering:
```jsx
// Conceptual Guard Pattern
const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem("token");
    if (!token) {
        return <Navigate to="/" replace />;
    }
    return children;
};

// Route Definitions
<Routes>
    <Route path="/" element={<LoginPage />} />
    <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
    <Route path="/add-expense" element={<ProtectedRoute><AddExpensePage /></ProtectedRoute>} />
</Routes>
```

> [!NOTE]
> **Single-Page Application (SPA) Hosting**:
> Because React routes are virtual (handled in JavaScript, not on the server), refreshing `https://app.com/dashboard` on static hosts (like Vercel) returns a 404 unless a rewrite rule redirects all requests to `index.html`. That is why `frontend/vercel.json` contains:
> ```json
> {
>   "rewrites": [{ "source": "/(.*)", "destination": "/" }]
> }
> ```

---

## 3. The Centralized API Service Layer (`apiServices.js`)

### Why Centralize API Calls?
Instead of calling `fetch("http://localhost:5000/api/...")` randomly across 20 different components:
1. **Change URLs in one place**: Switching from `localhost` to production only changes `utils/constants.js`.
2. **Automatic Authentication**: You don't have to manually write `headers: { Authorization: ... }` for every single request.
3. **Automatic Session Expiration**: If a token expires (HTTP 401), the client automatically wipes the session and redirects to login.

### How Axios Interceptors Work:

```
Outgoing Request:
Component call ──► [ Request Interceptor ] ──► Sends to Backend API
                         │
                         └─► Grabs token from localStorage,
                             attaches `Authorization: Bearer <token>`

Incoming Response:
Backend Response ──► [ Response Interceptor ] ──► Component receives data
                          │
                          ├─► If 200/201: Passes data through cleanly.
                          └─► If 401/403: Removes token, clears user,
                              redirects browser to "/" (Login screen).
```

#### Code Implementation in `src/services/apiServices.js`:
```javascript
import axios from "axios";
import { API_BASE_URL } from "../utils/constants";

const api = axios.create({
    baseURL: API_BASE_URL
});

// 1. Request Interceptor: Attach JWT Token automatically
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// 2. Response Interceptor: Handle Expired Sessions
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            if (window.location.pathname !== "/") {
                window.location.href = "/";
            }
        }
        return Promise.reject(error);
    }
);
```

---

## 4. State Management & Data Synchronization

React follows a **Unidirectional Data Flow**: data flows **down** via props, and events flow **up** via callback functions.

```
                  ┌──────────────────────┐
                  │    DashboardPage     │ ◄── Fetches summary & expenses
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   ┌─────────────────┐               ┌─────────────────┐
   │  SummaryCards   │               │  ExpenseTable   │
   │ (Receives data) │               │ (Receives data, │
   └─────────────────┘               │  emits onUpdate)│
                                     └─────────────────┘
```

### Three Types of State Used:

1. **Local Component State (`useState`, `setState`)**:
   - Temporary values like text inputs, modal visibility (`open`, `setOpen`), dropdown anchors (`anchorEl`).
2. **Session Storage (`localStorage`)**:
   - Persistent client data that survives page refreshes:
     - `token`: The JWT authentication token string.
     - `user`: JSON object representing the logged-in member.
     - `user_avatar_<userKey>`: Fallback cache for selected avatar character.
3. **Prop Callbacks for Parent-Child Synchronization**:
   - When a child component mutates data (e.g. deleting an expense inside `ExpenseTable`), it notifies the parent via a prop callback:
     ```jsx
     // Parent: DashboardPage.js
     <ExpenseTable 
       expenses={expenses} 
       onExpenseDeleted={() => this.fetchDashboardData()} 
     />
     ```

---

## 5. Deep Dive: Key Real-World Flows

### A. Login & Session Bootstrapping
```
User Enters Credentials ──► LoginPage.js
                               │
                               ▼
            Calls loginWithCredentials({ email, password })
                               │
                               ▼
               Backend validates & returns:
               {
                 token: "eyJhbG...",
                 user: { userId: 1, name: "Paul", role: "ADMIN", circleId: 5, avatarIndex: 3 }
               }
                               │
                               ▼
         1. localStorage.setItem("token", data.token);
         2. localStorage.setItem("user", JSON.stringify(data.user));
         3. window.location.href = "/dashboard";
```

---

### B. Multi-Circle Switching
Users in this application can belong to multiple family circles (e.g. "Paul Family", "College Friends"):

1. Inside [`Navbar.js`](file:///J:/Expense%20Tracker%20home/frontend/src/components/Navbar/Navbar.js), `getMyCircles()` fetches all circles the user is enrolled in.
2. The user clicks a different circle from the dropdown.
3. `switchCircle(circleId)` is dispatched to the backend.
4. The backend updates the user's active session and returns the new circle details.
5. The frontend updates `localStorage.setItem("user", ...)` and reloads or notifies parent components so all expense tables and charts refresh for the newly selected circle.

---

### C. Expense Creation & Table Refresh
```
1. AddExpensePage.js Form:
   - User inputs: Amount ($120), Category ("Groceries"), Split Type ("EQUAL").
   - Automatically computes split per member preview ($30 each for 4 members).
         │
         ▼
2. Form Submission:
   - Calls addExpense(payload).
   - Shows loading spinner (CircularProgress) to prevent double-clicks.
         │
         ▼
3. On Success (HTTP 201):
   - Shows green success Alert.
   - Clears form inputs.
   - Navigates user back to /dashboard.
```

---

### D. Profile Avatar Customization & Persistence
```
1. User clicks "Roll Avatar" in Navbar Profile Popover
         │
         ▼
2. Instant UI Update (Zero Latency):
   - Advances currentCharIndex to next funny character (🦊 ──► 🐼).
   - Character title & background color update immediately.
         │
         ▼
3. Local Cache Persistence:
   - Stores new index in localStorage (`user_avatar_${userKey}`).
   - Updates cached `user` object in localStorage.
   - Survives browser refreshes and offline reloads.
         │
         ▼
4. Backend Database Persistence:
   - Asynchronously sends: POST /api/auth/update-avatar { avatarIndex: 4 }
   - Backend writes `avatar_index = 4` to MySQL `users` table.
         │
         ▼
5. Cross-Device Restoration:
   - When user logs in on a new phone/browser, backend's login/me endpoints
     return `avatarIndex: 4`, automatically restoring their favorite character!
```

---

## 6. Step-by-Step: Adding a New Frontend Feature

Suppose you want to add a **"Monthly Budget Goal"** badge on the dashboard:

### Step 1: Add API Function in `src/services/apiServices.js`
```javascript
export const getBudgetGoal = (circleId) => {
    return api.get(`/budget-goal?circleId=${circleId}`);
};

export const setBudgetGoal = (circleId, targetAmount) => {
    return api.post(`/budget-goal`, { circleId, targetAmount });
};
```

### Step 2: Create UI Component (`src/components/BudgetBadge.js`)
```jsx
import React, { useState, useEffect } from "react";
import { Card, CardContent, Typography, LinearProgress, Box } from "@mui/material";
import { getBudgetGoal } from "../services/apiServices";

const BudgetBadge = ({ circleId, currentTotal }) => {
    const [goal, setGoal] = useState(1000); // Default $1000
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (circleId) {
            getBudgetGoal(circleId)
                .then((res) => setGoal(res.data.targetAmount || 1000))
                .catch(() => {})
                .finally(() => setLoading(false));
        }
    }, [circleId]);

    const percentage = Math.min(Math.round((currentTotal / goal) * 100), 100);

    return (
        <Card sx={{ borderRadius: 3, boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }}>
            <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                    Monthly Budget Goal: ${goal}
                </Typography>
                <Box mt={1}>
                    <LinearProgress 
                        variant="determinate" 
                        value={percentage} 
                        color={percentage > 85 ? "error" : "primary"} 
                    />
                </Box>
                <Typography variant="caption" mt={0.5} display="block">
                    ${currentTotal} spent ({percentage}%)
                </Typography>
            </CardContent>
        </Card>
    );
};

export default BudgetBadge;
```

### Step 3: Embed in Parent Page (`src/pages/DashboardPage.js`)
```jsx
import BudgetBadge from "../components/BudgetBadge";

// Inside render / return:
<BudgetBadge 
    circleId={activeCircle?.circle_id} 
    currentTotal={summaryData?.totalExpense || 0} 
/>
```

---

## 7. Essential Frontend Pitfalls & Best Practices

1. **Avoid Double-Click Form Submissions**:
   - Always disable the submit button while `loading === true`:
     ```jsx
     <Button type="submit" disabled={loading}>
       {loading ? <CircularProgress size={20} /> : "Save Expense"}
     </Button>
     ```
2. **Never Store Passwords in Client State or LocalStorage**:
   - Only store non-sensitive profile identifiers (`name`, `email`, `role`, `token`).
3. **Always Check for Unmounted Components in Async Calls**:
   - If a user navigates away before an API response returns, setting state can cause memory leaks. Use an `isMounted` flag or abort controller in `useEffect`.
4. **Always Provide User Feedback on Errors**:
   - Never fail silently! Use Material-UI `Alert` banners or `Snackbar` toast notifications so the user knows why an action failed (e.g. "Network error", "Invalid Access ID").
