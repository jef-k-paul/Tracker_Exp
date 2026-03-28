### Key Login
POST /api/auth/login

- Request
{
  "accessKey": "Mom#12321"
}

### Response
{
  "memberId": 2,
  "name": "Mom",
  "role": "MEMBER"
}


### Add Expense (Equal Split)
POST /api/expenses


### Request
{
  "amount": 2000,
  "categoryId": 1,
  "date": "2026-03-13",
  "description": "Groceries",
  "splitType": "EQUAL"
}
Backend automatically splits.


### Add Expense (Custom Split)
Same endpoint.
POST /api/expenses

- Request
{
  "amount": 2000,
  "categoryId": 1,
  "date": "2026-03-13",
  "description": "Dinner",
  "splitType": "CUSTOM",
  "splits": [
    { "memberId": 1, "share": 1000 },
    { "memberId": 2, "share": 500 },
    { "memberId": 3, "share": 300 },
    { "memberId": 4, "share": 200 }
  ]
}


### Get Expenses
GET /api/expenses?month=3&year=2026


### Monthly Summary
GET /api/summary?month=3&year=2026

Returns:
{
 totalExpense: 40000,
 perPerson: [
   { member:"Dad", paid:15000, share:10000, balance:+5000 }
 ]
}


### Settlement Suggestions
GET /api/settlements?month=3&year=2026

Example:

B pays A 3000
C pays A 2000