const summaryRepository = require("../repositories/summaryRepository");
const memberRepository = require("../repositories/memberRepository");
const settlementRepository = require("../repositories/settlementRepository");

exports.getSummary = async (month, year) => {
  try {
    // 1. Total family expense for the month
    const totalExpense = await summaryRepository.getTotalExpense(month, year);

    // 2. Paid out of pocket per member
    const paidData = await summaryRepository.getPaidPerMember(month, year);

    // 3. Share per member
    const shareData = await summaryRepository.getSharePerMember(month, year);

    // 4. Confirmed two-party handshake settlements for this month
    let confirmedSettlements = [];
    try {
      const allSettlements = await settlementRepository.getSettlementsForMonth(month, year);
      confirmedSettlements = (allSettlements || []).filter((s) => s.status === "CONFIRMED");
    } catch (settleErr) {
      console.warn("Settlement lookup warning in getSummary:", settleErr.message);
    }

    const members = await memberRepository.getAllActiveMembers();
    const result = [];

    for (let member of members) {
      const paidObj = paidData.find((p) => p.member_id === member.member_id);
      const shareObj = shareData.find((s) => s.member_id === member.member_id);

      const paid = paidObj ? Number(paidObj.total_paid) : 0;
      const share = shareObj ? Number(shareObj.total_share) : 0;
      const rawBalance = Number((paid - share).toFixed(2));

      // Calculate confirmed repayments:
      // When a member pays a settlement (payer), their debt decreases -> +settledPaid
      // When a member receives a settlement (receiver), their receivable decreases -> -settledReceived
      const settledPaid = confirmedSettlements
        .filter((s) => Number(s.payer_id) === Number(member.member_id))
        .reduce((sum, s) => sum + Number(s.amount || 0), 0);

      const settledReceived = confirmedSettlements
        .filter((s) => Number(s.receiver_id) === Number(member.member_id))
        .reduce((sum, s) => sum + Number(s.amount || 0), 0);

      let netBalance = Number((rawBalance + settledPaid - settledReceived).toFixed(2));
      if (Math.abs(netBalance) < 0.01 || Object.is(netBalance, -0)) {
        netBalance = 0;
      }

      result.push({
        member_id: member.member_id,
        member: member.name,
        paid,
        share,
        raw_balance: rawBalance,
        settled_paid: Number(settledPaid.toFixed(2)),
        settled_received: Number(settledReceived.toFixed(2)),
        balance: netBalance
      });
    }

    return {
      totalExpense,
      perPerson: result
    };
  } catch (err) {
    console.error("Error in getSummary:", err);
    throw err;
  }
};