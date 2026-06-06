const expenseRepository = require("../repositories/expenseRepository");
const memberRepository = require("../repositories/memberRepository");

exports.addExpense = async (data) => {
const {amount,categoryId,paidBy,date,description,splitType,splits} = data;

  // 1️ Insert expense
const expenseId = await expenseRepository.insertExpense({amount,categoryId,paidBy,date,description,splitType});

  // 2️ Handle splits
if (splitType === "EQUAL") {
    const members = await memberRepository.getAllActiveMembers();

    const share = amount / members.length;

    for (let member of members) {
    await expenseRepository.insertSplit({
        expenseId,
        memberId: member.member_id,
        shareAmount: share
    });
    }

} else if (splitType === "CUSTOM") {

    const totalShare = splits.reduce((sum, item) => sum + Number(item.share), 0);

    if(totalShare != Number(amount)){
        throw new Error(
            `Split total (${totalShare}) must match with the amount (${amount})`
        );
    }

    for (let s of splits) {
    await expenseRepository.insertSplit({
        expenseId,
        memberId: s.memberId,
        shareAmount: s.share
    });
    }
}

return expenseId;
};