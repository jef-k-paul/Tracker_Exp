const summaryRepository = require("../repositories/summaryRepository");
const memberRepository = require("../repositories/memberRepository");

exports.getSummary = async (month, year) => {

  try {
     // 1 total expense
const totalExpense = await summaryRepository.getTotalExpense(month, year);

  // 2 paid per member
const paidData = await summaryRepository.getPaidPerMember(month, year);

  // 3 share per member
const shareData = await summaryRepository.getSharePerMember(month, year);

  // 4 merge + calculate
// const result = [];


// for (let p of paidData) {
//     const shareObj = shareData.find(s => s.member_id === p.member_id);

//     const share = shareObj ? shareObj.total_share : 0;

//     result.push({
//     member: p.name,
//     paid: p.total_paid,
//     share: share,
//     balance: Number((p.total_paid - share).toFixed(2))
//     });
// }

const members = await memberRepository.getAllActiveMembers();
const result = [];

for( let member of members) {
    const paidObj =paidData.find(p => p.member_id === member.member_id);

    const shareObj = shareData.find(s => s.member_id === member.member_id);

    const paid = paidObj ? Number(paidObj.total_paid) : 0;

    const share = shareObj ? Number(shareObj.total_share) : 0;

    result.push({
      member: member.name,
      paid,
      share,
      balance: Number((paid - share).toFixed(2))
    });
}

  return {
      totalExpense,
      perPerson: result
  };

  } catch (err) {
    console.error(err);
  }
};