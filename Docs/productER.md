### Entities - For ER design
- Members
- Categories
- Expenses
- Expense_Splits
- Months

### Relationship Overview :

Members
   |
   | 1
   |
   | N
Expenses
   |
   | 1
   |
   | N
Expense_Splits
   |
   | N
   |
Members

# Meaning:

- One expense
- Can be split across many members

# Conceptual view: ER diagrams


Members
-------
member_id (PK)
name
role
access_key
is_active
created_at

Categories
---------
category_id (PK)
name
created_at

Expenses
--------
expense_id (PK)
amount
category_id (FK)
paid_by (FK -> Members)
expense_date
description
split_type  (EQUAL | CUSTOM)
created_at

Expense_Splits
--------------
split_id (PK)
expense_id (FK)
member_id (FK)
share_amount

Months
------
month_id (PK)
month
year
is_locked


# Why We Need Expense_Splits

If we only stored expense amount, we cannot support custom split.
Example : Dinner Bill = 2000
Equal splits : A = 500
B = 500
C = 500
D = 500

Custom splits : 
A = 1000
B = 500
C = 300
D = 200

So we store :
Expense
   |
Expense_Splits

and expense => 
 expense_id = 10
 amount = 2000
 split_type = CUSTOM


### Physical ER Diagram (Simplified)

Members
   |
   | (paid_by)
   |
Expenses
   |
   | (expense_id)
   |
Expense_Splits
   |
   | (member_id)
   |
Members


Expenses
   |
   | (category_id)
   |
Categories


### Database Indexes (Enterprise Detail)
INDEX idx_paid_by (paid_by)
INDEX idx_expense_date (expense_date)
INDEX idx_category (category_id)

Why?
Because queries like:

GET expenses by month
GET expenses by user

Need to be fast.

