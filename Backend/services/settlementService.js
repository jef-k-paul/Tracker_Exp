const summaryService = require("./summaryService");
const settlementRepository = require("../repositories/settlementRepository");
const memberRepository = require("../repositories/memberRepository");

exports.calculateSettlements = async (month, year, circleId) => {
  try {
    if (!circleId) {
      throw new Error("Active circle is required to calculate settlements.");
    }
    const summary = await summaryService.getSummary(month, year, circleId);
    const existingSettlements = await settlementRepository.getSettlementsForMonth(month, year, circleId);

    // Map member names to member_ids and vice versa
    const allMembers = await memberRepository.getAllActiveMembers(circleId);
    const memberMap = {};
    const memberIdToName = {};
    allMembers.forEach((m) => {
      memberMap[m.name.trim().toLowerCase()] = m.member_id;
      memberIdToName[m.member_id] = m.name;
    });

    // 1. Separate existing recorded settlements by status
    const pendingSettlements = (existingSettlements || []).filter((s) => s.status === "PENDING");
    const confirmedSettlements = (existingSettlements || []).filter((s) => s.status === "CONFIRMED");
    const rejectedSettlements = (existingSettlements || []).filter((s) => s.status === "REJECTED");

    // 2. Prepare immutable PENDING cards (actual transfers initiated by payers awaiting verification)
    const pendingList = pendingSettlements.map((s) => ({
      from: s.payer_name,
      to: s.receiver_name,
      from_id: s.payer_id,
      to_id: s.receiver_id,
      amount: Number(s.amount),
      status: "PENDING",
      settlement_id: s.settlement_id,
      created_at: s.created_at,
      notes: s.notes,
      is_pending_transfer: true
    }));

    // 3. Compute remaining unsettled net balances:
    // Balances in summary.perPerson are already adjusted with CONFIRMED settlements.
    // For pending in-flight transfers:
    // - Payer initiated money -> their unsettled debt is reduced by +amount
    // - Receiver has money in-flight -> their unsettled receivable is reduced by -amount
    const effectiveBalances = {};
    summary.perPerson.forEach((p) => {
      const memId = p.member_id;
      const rawNet = Number(p.balance || 0);

      const pendingOutgoing = pendingSettlements
        .filter((s) => Number(s.payer_id) === Number(memId))
        .reduce((sum, s) => sum + Number(s.amount || 0), 0);

      const pendingIncoming = pendingSettlements
        .filter((s) => Number(s.receiver_id) === Number(memId))
        .reduce((sum, s) => sum + Number(s.amount || 0), 0);

      const remaining = Number((rawNet + pendingOutgoing - pendingIncoming).toFixed(2));
      effectiveBalances[p.member] = Math.abs(remaining) < 0.01 ? 0 : remaining;
    });

    // 4. Divide into remaining creditors and debtors for UNINITIATED dues
    const creditors = [];
    const debitors = [];

    Object.entries(effectiveBalances).forEach(([name, bal]) => {
      const rounded = Number(bal.toFixed(2));
      if (rounded > 0.01) {
        creditors.push({ name, amount: rounded });
      } else if (rounded < -0.01) {
        debitors.push({ name, amount: Math.abs(rounded) });
      }
    });

    // 5. Run greedy settlement algorithm strictly on remaining uninitiated balances
    const recommendations = [];
    let i = 0;
    let j = 0;

    while (i < debitors.length && j < creditors.length) {
      const debtor = debitors[i];
      const creditor = creditors[j];
      const amount = Math.min(debtor.amount, creditor.amount);

      const debtorId = memberMap[debtor.name.trim().toLowerCase()];
      const creditorId = memberMap[creditor.name.trim().toLowerCase()];

      recommendations.push({
        from: debtor.name,
        to: creditor.name,
        from_id: debtorId,
        to_id: creditorId,
        amount: Number(amount.toFixed(2)),
        status: "UNINITIATED",
        settlement_id: null,
        created_at: null
      });

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount <= 0.01) i++;
      if (creditor.amount <= 0.01) j++;
    }

    // 6. Include CONFIRMED settlements so completed handshakes remain visible
    const confirmedList = confirmedSettlements.map((s) => ({
      from: s.payer_name,
      to: s.receiver_name,
      from_id: s.payer_id,
      to_id: s.receiver_id,
      amount: Number(s.amount),
      status: "CONFIRMED",
      settlement_id: s.settlement_id,
      created_at: s.created_at,
      confirmed_at: s.confirmed_at,
      notes: s.notes
    }));

    // 7. Include recent REJECTED settlements with reasons for payer audit and feedback
    const rejectedList = rejectedSettlements.map((s) => {
      let reason = s.rejection_reason || "";
      if (!reason && s.notes && s.notes.includes("[REJECTED:")) {
        const match = s.notes.match(/\[REJECTED:\s*([^\]]+)\]/);
        if (match) reason = match[1];
      }
      return {
        from: s.payer_name,
        to: s.receiver_name,
        from_id: s.payer_id,
        to_id: s.receiver_id,
        amount: Number(s.amount),
        status: "REJECTED",
        settlement_id: s.settlement_id,
        created_at: s.created_at,
        rejected_at: s.confirmed_at || s.created_at,
        rejection_reason: reason || "Payment not credited to account",
        notes: s.notes
      };
    });

    return [...pendingList, ...recommendations, ...confirmedList, ...rejectedList];
  } catch (err) {
    console.error("Error in calculateSettlements:", err);
    throw err;
  }
};

exports.initiateSettlement = async ({ payerId, receiverId, amount, month, year, notes, circleId }) => {
  if (!circleId) {
    throw new Error("Active circle is required to initiate settlement.");
  }
  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    throw new Error("Settlement amount must be a positive number.");
  }
  if (!payerId || !receiverId) {
    throw new Error("Payer and receiver IDs are required.");
  }
  if (Number(payerId) === Number(receiverId)) {
    throw new Error("Payer and receiver cannot be the same member.");
  }

  // Prevent accidental rapid duplicate submissions (within 30 seconds for same pair and amount)
  const pending = await settlementRepository.getPendingSettlementsForReceiver(receiverId);
  const duplicate = pending.find(
    (p) =>
      Number(p.payer_id) === Number(payerId) &&
      Number(p.month) === Number(month) &&
      Number(p.year) === Number(year) &&
      Math.abs(Number(p.amount) - numAmount) < 0.01 &&
      p.created_at &&
      Date.now() - new Date(p.created_at).getTime() < 30000
  );

  if (duplicate) {
    throw new Error("A duplicate settlement request was just submitted. Please wait.");
  }

  const settlementId = await settlementRepository.createSettlement({
    circleId: Number(circleId),
    payerId: Number(payerId),
    receiverId: Number(receiverId),
    amount: numAmount,
    month: Number(month),
    year: Number(year),
    notes
  });

  return await settlementRepository.getSettlementById(settlementId);
};

exports.confirmSettlement = async (settlementId, receiverId, userId = null) => {
  const settlement = await settlementRepository.getSettlementById(settlementId);
  if (!settlement) {
    throw new Error("Settlement transaction not found.");
  }

  // Security check: Only designated receiver (or authenticated user matching receiver_user_id) can confirm payment
  const isAuthorized =
    Number(settlement.receiver_id) === Number(receiverId) ||
    (userId && Number(settlement.receiver_user_id) === Number(userId));

  if (!isAuthorized) {
    throw new Error("Unauthorized: Only the payment recipient can confirm receipt.");
  }

  if (settlement.status !== "PENDING") {
    throw new Error(`Cannot confirm settlement that is already ${settlement.status}.`);
  }

  await settlementRepository.updateSettlementStatus(settlementId, "CONFIRMED", new Date());
  return await settlementRepository.getSettlementById(settlementId);
};

exports.rejectSettlement = async (settlementId, receiverId, userId = null, reason = "") => {
  const settlement = await settlementRepository.getSettlementById(settlementId);
  if (!settlement) {
    throw new Error("Settlement transaction not found.");
  }

  // Security check: Only designated receiver (or authenticated user matching receiver_user_id) can reject payment
  const isAuthorized =
    Number(settlement.receiver_id) === Number(receiverId) ||
    (userId && Number(settlement.receiver_user_id) === Number(userId));

  if (!isAuthorized) {
    throw new Error("Unauthorized: Only the payment recipient can reject receipt.");
  }

  if (settlement.status !== "PENDING") {
    throw new Error(`Cannot reject settlement that is already ${settlement.status}.`);
  }

  const cleanReason = reason?.trim() || "Payment not credited to account";
  await settlementRepository.updateSettlementStatus(settlementId, "REJECTED", new Date(), cleanReason);
  return await settlementRepository.getSettlementById(settlementId);
};

exports.cancelSettlement = async (settlementId, payerId, userId = null) => {
  const settlement = await settlementRepository.getSettlementById(settlementId);
  if (!settlement) {
    throw new Error("Settlement transaction not found.");
  }

  // Security check: Only the payer can cancel their own unconfirmed pending request
  const isAuthorized =
    Number(settlement.payer_id) === Number(payerId) ||
    (userId && Number(settlement.payer_user_id) === Number(userId));

  if (!isAuthorized) {
    throw new Error("Unauthorized: Only the payment initiator can cancel this pending request.");
  }

  if (settlement.status !== "PENDING") {
    throw new Error(`Cannot cancel settlement that is already ${settlement.status}.`);
  }

  await settlementRepository.cancelSettlement(settlementId);
  return await settlementRepository.getSettlementById(settlementId);
};

exports.getPendingSettlements = async (receiverId, userId = null) => {
  return await settlementRepository.getPendingSettlementsForReceiver(receiverId, userId);
};

exports.getPendingCount = async (receiverId, userId = null) => {
  return await settlementRepository.getPendingCount(receiverId, userId);
};