const expenseRepository = require("../repositories/expenseRepository");
const memberRepository = require("../repositories/memberRepository");
const db = require("../db/connections");

exports.addExpense = async (data) => {
  const { amount, categoryId, paidBy, date, description, splitType, splits, circleId } = data;
  const numAmount = Number(amount);

  // 1. Validate input parameters
  if (!circleId) {
    throw new Error("Active circle is required to add an expense.");
  }
  if (!amount || isNaN(numAmount) || numAmount <= 0) {
    throw new Error("Expense amount must be a positive number.");
  }
  if (!categoryId) {
    throw new Error("Please select a valid expense category.");
  }
  if (!paidBy) {
    throw new Error("Please select who paid for the expense.");
  }
  if (!date) {
    throw new Error("Expense date is required.");
  }

  // 2. Pre-validate Custom Split calculations
  if (splitType === "CUSTOM") {
    if (!splits || !Array.isArray(splits) || splits.length === 0) {
      throw new Error("Custom split details are missing.");
    }

    const totalShare = splits.reduce((sum, item) => sum + Number(item.share || 0), 0);

    if (Math.abs(totalShare - numAmount) > 0.01) {
      throw new Error(
        `Custom splits total (₹${totalShare}) must match total expense amount (₹${numAmount})`
      );
    }
  }

  // 3. Check for potential duplicate expense in DB
  if (!data.confirmDuplicate) {
    const existingDuplicate = await expenseRepository.findDuplicateExpense({
      amount: numAmount,
      categoryId,
      date,
      circleId
    });

    if (existingDuplicate) {
      const error = new Error(
        `DUPLICATE_WARNING: An expense of ₹${numAmount} for '${existingDuplicate.category_name}' on ${date} (Paid by ${existingDuplicate.paid_by_name}) already exists.`
      );
      error.isDuplicate = true;
      error.duplicateInfo = existingDuplicate;
      throw error;
    }
  }

  // 4. Use dedicated Connection from Pool for atomic, isolated transaction
  return new Promise((resolve, reject) => {
    db.getConnection((connErr, conn) => {
      if (connErr) return reject(connErr);

      conn.beginTransaction(async (transactionErr) => {
        if (transactionErr) {
          conn.release();
          return reject(transactionErr);
        }

        try {
          // A. Insert parent expense record with circle_id on this connection
          const expenseId = await expenseRepository.insertExpense(
            {
              circleId,
              amount: numAmount,
              categoryId,
              paidBy,
              date,
              description,
              splitType
            },
            conn
          );

          // B. Insert child split records for this circle's active members
          if (splitType === "EQUAL") {
            const members = await memberRepository.getAllActiveMembers(circleId);
            if (!members || members.length === 0) {
              throw new Error("No active circle members found for equal split.");
            }
            const baseShare = Math.floor((numAmount / members.length) * 100) / 100;
            let remainderCents = Math.round((numAmount - baseShare * members.length) * 100);

            for (let i = 0; i < members.length; i++) {
              let memberShare = baseShare;
              if (remainderCents > 0) {
                memberShare = Number((memberShare + 0.01).toFixed(2));
                remainderCents--;
              }
              await expenseRepository.insertSplit(
                {
                  expenseId,
                  memberId: members[i].member_id,
                  shareAmount: memberShare
                },
                conn
              );
            }
          } else if (splitType === "CUSTOM") {
            for (let s of splits) {
              await expenseRepository.insertSplit(
                {
                  expenseId,
                  memberId: s.memberId,
                  shareAmount: Number(s.share)
                },
                conn
              );
            }
          }

          // C. Commit transaction and release connection back to pool
          conn.commit((commitErr) => {
            if (commitErr) {
              return conn.rollback(() => {
                conn.release();
                reject(commitErr);
              });
            }
            conn.release();
            resolve(expenseId);
          });
        } catch (err) {
          conn.rollback(() => {
            conn.release();
            reject(err);
          });
        }
      });
    });
  });
};

exports.expenses = async (month, year, circleId) => {
  if (!circleId) {
    throw new Error("Active circle is required to view expenses.");
  }
  const expenseList = await expenseRepository.expenses(month, year, circleId);
  const allSplits = await expenseRepository.getSplitsForMonth(month, year, circleId);

  return expenseList.map((exp) => {
    const expSplits = allSplits.filter((s) => s.expense_id === exp.expense_id);
    return {
      ...exp,
      splits: expSplits
    };
  });
};

exports.checkDuplicate = async (amount, categoryId, date, circleId) => {
  if (!amount || !categoryId || !date || !circleId) return null;
  return await expenseRepository.findDuplicateExpense({ amount, categoryId, date, circleId });
};

exports.getAllTimePaid = async (memberId, circleId) => {
  if (!circleId) {
    throw new Error("Active circle is required to fetch all-time paid total.");
  }
  return await expenseRepository.getAllTimePaid(memberId, circleId);
};

exports.getAllTimeShare = async (memberId, circleId) => {
  if (!circleId) {
    throw new Error("Active circle is required to fetch all-time share total.");
  }
  return await expenseRepository.getAllTimeShare(memberId, circleId);
};