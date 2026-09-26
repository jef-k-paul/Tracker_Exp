import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Sanitizes input to prevent CSV / Spreadsheet Formula Injection (CWE-1236).
 * Prepends a single quote if the field begins with =, +, -, @, \t, or \r.
 */
const sanitizeForCSV = (val) => {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
};

/**
 * Generates a unified, executive-grade Monthly Family Expense Statement PDF.
 * Uses named exports from jsPDF & autoTable, and fixes post-render pagination.
 */
export const exportMonthlyStatementPDF = async ({
  summary = {},
  expenses = [],
  settlements = [],
  currentUser = {},
  selectedMonth = 1,
  selectedYear = new Date().getFullYear()
}) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const monthName = MONTH_NAMES[selectedMonth - 1] || `Month ${selectedMonth}`;
  const totalExpense = Number(summary?.totalExpense || 0);
  const perPerson = summary?.perPerson || [];

  // Logged-in user stats
  const loggedInName = currentUser?.name?.trim().toLowerCase();
  const currentId = currentUser?.member_id || currentUser?.memberId;

  const userStat = perPerson.find((p) => {
    const isIdMatch = currentId && p.member_id && Number(p.member_id) === Number(currentId);
    const isNameMatch = loggedInName && p.member && p.member.trim().toLowerCase() === loggedInName;
    return Boolean(isIdMatch || isNameMatch);
  }) || { paid: 0, share: 0, balance: 0 };

  const userPaid = Number(userStat.paid || 0);
  const userShare = Number(userStat.share || 0);
  const userBalance = Number(userStat.balance || 0);

  // 1. BRANDED HEADER BANNER
  doc.setFillColor(15, 23, 42); // Navy slate (#0f172a)
  doc.rect(0, 0, 210, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("FAMILY EXPENSE TRACKER", 14, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(56, 189, 248); // Sky blue
  doc.text(`MONTHLY STATEMENT: ${monthName.toUpperCase()} ${selectedYear}`, 14, 20);

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  const genDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  doc.text(`Generated for: ${currentUser?.name || "Member"} | Exported on: ${genDate}`, 14, 27);

  let currentY = 38;

  // 2. EXECUTIVE KPI SUMMARY
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("1. EXECUTIVE SUMMARY & YOUR POSITION", 14, currentY);
  currentY += 4;

  const balanceText =
    userBalance > 0
      ? `+Rs. ${userBalance.toLocaleString("en-IN")} (To Receive)`
      : userBalance < 0
      ? `-Rs. ${Math.abs(userBalance).toLocaleString("en-IN")} (You Owe)`
      : "Rs. 0 (Settled)";

  autoTable(doc, {
    startY: currentY,
    head: [["Total Family Spend", "You Paid Out-of-Pocket", "Your Fair Share", "Your Net Balance"]],
    body: [
      [
        `Rs. ${totalExpense.toLocaleString("en-IN")}`,
        `Rs. ${userPaid.toLocaleString("en-IN")}`,
        `Rs. ${userShare.toLocaleString("en-IN")}`,
        balanceText
      ]
    ],
    theme: "grid",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      fontSize: 9
    },
    bodyStyles: {
      halign: "center",
      fontStyle: "bold",
      fontSize: 10,
      textColor: [15, 23, 42]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // 3. SETTLEMENT ACTIONS (Who Pays Whom)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("2. SETTLEMENT RECOMMENDATIONS (WHO PAYS WHOM)", 14, currentY);
  currentY += 4;

  if (settlements.length === 0) {
    autoTable(doc, {
      startY: currentY,
      body: [["All family members are fully settled up! No balance transfers needed."]],
      theme: "plain",
      bodyStyles: {
        fontSize: 9,
        textColor: [22, 163, 74],
        fontStyle: "bold"
      },
      margin: { left: 14, right: 14 }
    });
  } else {
    const settlementRows = settlements.map((s, idx) => [
      `#${idx + 1}`,
      s.from || "Member",
      s.status === "CONFIRMED" ? "SETTLED (ACKNOWLEDGED)" : "PAYS",
      s.to || "Member",
      `Rs. ${Number(s.amount).toLocaleString("en-IN")}`
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["No.", "Debtor (Payer)", "Action", "Creditor (Receiver)", "Settlement Amount"]],
      body: settlementRows,
      theme: "striped",
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontSize: 8,
        halign: "center"
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 15 },
        1: { fontStyle: "bold" },
        2: { halign: "center", textColor: [100, 116, 139] },
        3: { fontStyle: "bold" },
        4: { halign: "right", fontStyle: "bold", textColor: [15, 23, 42] }
      },
      styles: { fontSize: 8.5 },
      margin: { left: 14, right: 14 }
    });
  }

  currentY = doc.lastAutoTable.finalY + 8;

  // 4. CATEGORY BREAKDOWN
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("3. CATEGORY SPENDING BREAKDOWN", 14, currentY);
  currentY += 4;

  const categoryMap = {};
  expenses.forEach((item) => {
    const cat = item.category?.trim() || "Uncategorized";
    const amt = Number(item.amount || 0);
    if (!categoryMap[cat]) categoryMap[cat] = { total: 0, count: 0 };
    categoryMap[cat].total += amt;
    categoryMap[cat].count += 1;
  });

  const categoryRows = Object.entries(categoryMap)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([cat, data]) => {
      const pct = totalExpense > 0 ? ((data.total / totalExpense) * 100).toFixed(1) : "0.0";
      return [
        cat,
        `${data.count} transaction${data.count !== 1 ? "s" : ""}`,
        `Rs. ${data.total.toLocaleString("en-IN")}`,
        `${pct}%`
      ];
    });

  if (categoryRows.length === 0) {
    categoryRows.push(["No category expenses recorded", "0", "Rs. 0", "0%"]);
  }

  autoTable(doc, {
    startY: currentY,
    head: [["Category", "Transaction Count", "Total Spent", "% Share of Family Spend"]],
    body: categoryRows,
    theme: "striped",
    headStyles: {
      fillColor: [14, 165, 233],
      textColor: [255, 255, 255],
      fontSize: 8
    },
    columnStyles: {
      0: { fontStyle: "bold" },
      1: { halign: "center" },
      2: { halign: "right", fontStyle: "bold" },
      3: { halign: "right" }
    },
    styles: { fontSize: 8.5 },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // 5. ITEMIZED TRANSACTION LEDGER
  if (currentY > 230) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("4. ITEMIZED TRANSACTION LEDGER", 14, currentY);
  currentY += 4;

  const transactionRows = expenses.map((exp) => {
    const formattedDate = new Date(exp.expense_date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short"
    });

    const userSplit = (exp.splits || []).find(
      (s) =>
        s.member_name?.toLowerCase() === loggedInName ||
        s.member_id === currentId
    );
    const userShareAmount = userSplit ? Number(userSplit.share_amount) : 0;

    return [
      formattedDate,
      exp.category || "General",
      exp.description || "-",
      exp.paid_by || "Member",
      exp.split_type || "EQUAL",
      `Rs. ${Number(exp.amount).toLocaleString("en-IN")}`,
      `Rs. ${userShareAmount.toLocaleString("en-IN")}`
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [["Date", "Category", "Description", "Paid By", "Split", "Total Bill", "Your Share"]],
    body: transactionRows.length > 0 ? transactionRows : [["-", "-", "No transactions recorded", "-", "-", "Rs. 0", "Rs. 0"]],
    theme: "striped",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 24, fontStyle: "bold" },
      2: { cellWidth: 50 },
      3: { cellWidth: 24 },
      4: { cellWidth: 18, halign: "center" },
      5: { cellWidth: 24, halign: "right", fontStyle: "bold" },
      6: { cellWidth: 22, halign: "right", fontStyle: "bold", textColor: [79, 70, 229] }
    },
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 }
  });

  // POST-RENDER PAGINATION: Compute exact total pages across all pages and stamp footers accurately
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Family Expense Tracker • ${monthName} ${selectedYear} • Page ${i} of ${totalPages}`,
      14,
      290
    );
  }

  // Save PDF file
  const fileName = `Family_Expense_Statement_${monthName}_${selectedYear}.pdf`;
  doc.save(fileName);
};

/**
 * Generates and downloads a clean, formula-injection safe CSV spreadsheet with UTF-8 BOM.
 */
export const exportExpensesCSV = async ({
  expenses = [],
  currentUser = {},
  selectedMonth = 1,
  selectedYear = new Date().getFullYear()
}) => {
  const monthName = MONTH_NAMES[selectedMonth - 1] || `Month_${selectedMonth}`;
  const loggedInName = currentUser?.name?.trim().toLowerCase();
  const currentId = currentUser?.member_id || currentUser?.memberId;

  const headers = [
    "Expense ID",
    "Date",
    "Category",
    "Description",
    "Paid By",
    "Split Type",
    "Total Bill (INR)",
    "Your Share (INR)"
  ];

  const rows = expenses.map((exp) => {
    const userSplit = (exp.splits || []).find(
      (s) =>
        s.member_name?.toLowerCase() === loggedInName ||
        s.member_id === currentId
    );
    const userShareAmount = userSplit ? Number(userSplit.share_amount) : 0;
    const dateStr = new Date(exp.expense_date).toISOString().split("T")[0];

    return [
      sanitizeForCSV(exp.expense_id),
      sanitizeForCSV(dateStr),
      sanitizeForCSV(exp.category || ""),
      sanitizeForCSV(exp.description || ""),
      sanitizeForCSV(exp.paid_by || ""),
      sanitizeForCSV(exp.split_type || "EQUAL"),
      sanitizeForCSV(Number(exp.amount || 0).toFixed(2)),
      sanitizeForCSV(userShareAmount.toFixed(2))
    ].join(",");
  });

  // Include UTF-8 Byte Order Mark (BOM) \uFEFF so Excel correctly detects UTF-8
  const csvBlob = new Blob(["\uFEFF" + [headers.join(","), ...rows].join("\n")], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(csvBlob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Family_Expenses_${monthName}_${selectedYear}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
