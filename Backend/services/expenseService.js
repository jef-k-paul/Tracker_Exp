const expenseRepository = require("../repositories/expenseRepository");
const memberRepository = require("../repositories/memberRepository");

const db = require("../db/connections");

exports.addExpense = async (data) => {
  const { amount, categoryId, paidBy, date, description, splitType, splits } = data;

  const numAmount = Number(amount);

  // 1️ Validate input parameters FIRST before touching the database
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

  // 2️ Pre-validate Custom Split calculations BEFORE touching database
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

  // 3️ Check for potential duplicate expense in DB
  if (!data.confirmDuplicate) {
    const existingDuplicate = await expenseRepository.findDuplicateExpense({
      amount: numAmount,
      categoryId,
      date
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

  // 3️ Use a MySQL Transaction so both expense and splits insert atomically
  return new Promise((resolve, reject) => {
    db.beginTransaction(async (transactionErr) => {
      if (transactionErr) return reject(transactionErr);

      try {
        // A. Insert parent expense record
        const expenseId = await expenseRepository.insertExpense({
          amount: numAmount,
          categoryId,
          paidBy,
          date,
          description,
          splitType
        });

        // B. Insert child split records
        if (splitType === "EQUAL") {
          const members = await memberRepository.getAllActiveMembers();
          if (!members || members.length === 0) {
            throw new Error("No active family members found for equal split.");
          }
          const share = Number((numAmount / members.length).toFixed(2));

          for (let member of members) {
            await expenseRepository.insertSplit({
              expenseId,
              memberId: member.member_id,
              shareAmount: share
            });
          }
        } else if (splitType === "CUSTOM") {
          for (let s of splits) {
            await expenseRepository.insertSplit({
              expenseId,
              memberId: s.memberId,
              shareAmount: Number(s.share)
            });
          }
        }

        // C. Commit transaction
        db.commit((commitErr) => {
          if (commitErr) {
            return db.rollback(() => reject(commitErr));
          }
          resolve(expenseId);
        });
      } catch (err) {
        // Rollback transaction on ANY failure to prevent orphan rows
        db.rollback(() => {
          reject(err);
        });
      }
    });
  });
};


exports.expenses = async (month, year) => {
    const expenseList = await expenseRepository.expenses(month, year);
    const allSplits = await expenseRepository.getSplitsForMonth(month, year);

    return expenseList.map(exp => {
        const expSplits = allSplits.filter(s => s.expense_id === exp.expense_id);
        return {
            ...exp,
            splits: expSplits
        };
    });
};

exports.checkDuplicate = async (amount, categoryId, date) => {
    if (!amount || !categoryId || !date) return null;
    return await expenseRepository.findDuplicateExpense({ amount, categoryId, date });
};