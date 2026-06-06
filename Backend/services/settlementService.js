const summaryService = require("./summaryService");


exports.calculateSettlements = async (month, year) => {
    try {
    const summary = await summaryService.getSummary( month, year );

    const creditors = summary.perPerson.filter( x => x.balance > 0 ).map( x => ({
        name : x.member,
        amount : x.balance
    }));

    const debitors = summary.perPerson.filter(x => x.balance < 0).map(x => ({
        name: x.member,
        amount: Math.abs(x.balance)
    }));

    const settlements = [];

    let i = 0;
    let j = 0;

    while( i<debitors.length && j<creditors.length) {

        const debtor = debitors[i];
        const creditor = creditors[j];

        const amount =
        Math.min(
            debtor.amount,
            creditor.amount
        );

        settlements.push({
            from: debtor.name,
            to: creditor.name,
            amount: Number(amount.toFixed(2))
        });

        debtor.amount -= amount;
        creditor.amount -= amount;

        if (debtor.amount === 0)
            i++;

        if (creditor.amount === 0)
            j++;
    }

    return settlements;
} catch (err) {
    console.error(err);
} 
    
}