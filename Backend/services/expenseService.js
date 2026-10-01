const expenseRepository = require("../repositories/expenseRepository");
const memberRepository = require("../repositories/memberRepository");
const db = require("../db/connections");

exports.addExpense = async (data) => {
  const { amount, categoryId, paidBy, date, description, splitType, splits, circleId } = data;
  const numAmount = Number(amount);

  // 1. Validate input parameters
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
      circleId: circleId || null
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

  // 4. Use MySQL Transaction for atomic insertion
  return new Promise((resolve, reject) => {
    db.beginTransaction(async (transactionErr) => {
      if (transactionErr) return reject(transactionErr);

      try {
        // A. Insert parent expense record with circle_id
        const expenseId = await expenseRepository.insertExpense({
          circleId: circleId || 1,
          amount: numAmount,
          categoryId,
          paidBy,
          date,
          description,
          splitType
        });

        // B. Insert child split records for this circle's active members
        if (splitType === "EQUAL") {
          const members = await memberRepository.getAllActiveMembers(circleId || null);
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
            await expenseRepository.insertSplit({
              expenseId,
              memberId: members[i].member_id,
              shareAmount: memberShare
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
        db.rollback(() => {
          reject(err);
        });
      }
    });
  });
};

exports.expenses = async (month, year, circleId = null) => {
  const expenseList = await expenseRepository.expenses(month, year, circleId);
  const allSplits = await expenseRepository.getSplitsForMonth(month, year);

  return expenseList.map((exp) => {
    const expSplits = allSplits.filter((s) => s.expense_id === exp.expense_id);
    return {
      ...exp,
      splits: expSplits
    };
  });
};

exports.checkDuplicate = async (amount, categoryId, date, circleId = null) => {
  if (!amount || !categoryId || !date) return null;
  return await expenseRepository.findDuplicateExpense({ amount, categoryId, date, circleId });
};

exports.getAllTimePaid = async (memberId) => {
  return await expenseRepository.getAllTimePaid(memberId);
};

exports.getAllTimeShare = async (memberId) => {
  return await expenseRepository.getAllTimeShare(memberId);
};