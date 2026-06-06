const summaryRepository = require("../repositories/summaryRepository");

exports.getSummary = async (month, year) => {
  // 1 total expense
const totalExpense = await summaryRepository.getTotalExpense(month, year);

  // 2 paid per member
const paidData = await summaryRepository.getPaidPerMember(month, year);

  // 3 share per member
const shareData = await summaryRepository.getSharePerMember(month, year);

  // 4 merge + calculate
const result = [];

for (let p of paidData) {
    const shareObj = shareData.find(s => s.member_id === p.member_id);

    const share = shareObj ? shareObj.total_share : 0;

    result.push({
    member: p.name,
    paid: p.total_paid,
    share: share,
    balance: Number((p.total_paid - share).toFixed(2))
    });
}

return {
    totalExpense,
    perPerson: result
};
};