const summaryService = require("./summaryService");
const settlementRepository = require("../repositories/settlementRepository");
const memberRepository = require("../repositories/memberRepository");

exports.calculateSettlements = async (month, year, circleId = null) => {
  try {
    const summary = await summaryService.getSummary(month, year, circleId);
    const existingSettlements = await settlementRepository.getSettlementsForMonth(month, year, circleId);

    // Map member names to member_ids
    const allMembers = await memberRepository.getAllActiveMembers(circleId);
    const memberMap = {};
    allMembers.forEach((m) => {
      memberMap[m.name.trim().toLowerCase()] = m.member_id;
    });

    // Balances in summary.perPerson are already neutralized with CONFIRMED settlements
    const adjustedBalances = {};
    summary.perPerson.forEach((p) => {
      adjustedBalances[p.member] = Number(p.balance || 0);
    });

    // Divide into remaining creditors and debtors
    const creditors = [];
    const debitors = [];

    Object.entries(adjustedBalances).forEach(([name, bal]) => {
      const rounded = Number(bal.toFixed(2));
      if (rounded > 0.01) {
        creditors.push({ name, amount: rounded });
      } else if (rounded < -0.01) {
        debitors.push({ name, amount: Math.abs(rounded) });
      }
    });

    // Run greedy settlement algorithm on remaining balances
    const recommendations = [];
    let i = 0;
    let j = 0;

    while (i < debitors.length && j < creditors.length) {
      const debtor = debitors[i];
      const creditor = creditors[j];

      const amount = Math.min(debtor.amount, creditor.amount);

      // Check if there is already a PENDING settlement between this debtor and creditor
      const debtorId = memberMap[debtor.name.trim().toLowerCase()];
      const creditorId = memberMap[creditor.name.trim().toLowerCase()];

      const pendingMatch = existingSettlements.find(
        (s) =>
          s.status === "PENDING" &&
          s.payer_id === debtorId &&
          s.receiver_id === creditorId
      );

      recommendations.push({
        from: debtor.name,
        to: creditor.name,
        from_id: debtorId,
        to_id: creditorId,
        amount: Number(amount.toFixed(2)),
        status: pendingMatch ? "PENDING" : "UNINITIATED",
        settlement_id: pendingMatch ? pendingMatch.settlement_id : null,
        created_at: pendingMatch ? pendingMatch.created_at : null
      });

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount <= 0.01) i++;
      if (creditor.amount <= 0.01) j++;
    }

    // Include CONFIRMED settlements so completed handshakes remain visible as acknowledged
    const confirmedSettlements = (existingSettlements || []).filter((s) => s.status === "CONFIRMED");
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

    return [...recommendations, ...confirmedList];
  } catch (err) {
    console.error("Error in calculateSettlements:", err);
    throw err;
  }
};

exports.initiateSettlement = async ({ payerId, receiverId, amount, month, year, notes, circleId = 1 }) => {
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

  // Check if a PENDING settlement already exists for this pair
  const pending = await settlementRepository.getPendingSettlementsForReceiver(receiverId);
  const existingPending = pending.find(
    (p) =>
      Number(p.payer_id) === Number(payerId) &&
      Number(p.month) === Number(month) &&
      Number(p.year) === Number(year)
  );

  if (existingPending) {
    throw new Error("A settlement request is already pending verification for this member.");
  }

  const settlementId = await settlementRepository.createSettlement({
    circleId: Number(circleId) || 1,
    payerId: Number(payerId),
    receiverId: Number(receiverId),
    amount: numAmount,
    month: Number(month),
    year: Number(year),
    notes
  });

  return await settlementRepository.getSettlementById(settlementId);
};

exports.confirmSettlement = async (settlementId, receiverId) => {
  const settlement = await settlementRepository.getSettlementById(settlementId);
  if (!settlement) {
    throw new Error("Settlement transaction not found.");
  }

  // Security check: Only the designated receiver can confirm the payment
  if (Number(settlement.receiver_id) !== Number(receiverId)) {
    throw new Error("Unauthorized: Only the payment recipient can confirm receipt.");
  }

  if (settlement.status !== "PENDING") {
    throw new Error(`Cannot confirm settlement that is already ${settlement.status}.`);
  }

  await settlementRepository.updateSettlementStatus(settlementId, "CONFIRMED", new Date());
  return await settlementRepository.getSettlementById(settlementId);
};

exports.rejectSettlement = async (settlementId, receiverId) => {
  const settlement = await settlementRepository.getSettlementById(settlementId);
  if (!settlement) {
    throw new Error("Settlement transaction not found.");
  }

  if (Number(settlement.receiver_id) !== Number(receiverId)) {
    throw new Error("Unauthorized: Only the payment recipient can reject receipt.");
  }

  if (settlement.status !== "PENDING") {
    throw new Error(`Cannot reject settlement that is already ${settlement.status}.`);
  }

  await settlementRepository.updateSettlementStatus(settlementId, "REJECTED", new Date());
  return await settlementRepository.getSettlementById(settlementId);
};

exports.getPendingSettlements = async (receiverId) => {
  return await settlementRepository.getPendingSettlementsForReceiver(receiverId);
};

exports.getPendingCount = async (receiverId) => {
  return await settlementRepository.getPendingCount(receiverId);
};