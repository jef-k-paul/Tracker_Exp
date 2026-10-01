const settlementService = require("../services/settlementService");

exports.getSettlements = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ message: "Month and Year query parameters are required." });
    }
    const circleId = req.user?.circleId || null;
    const result = await settlementService.calculateSettlements(Number(month), Number(year), circleId);
    res.json(result);
  } catch (err) {
    console.error("Error in getSettlements:", err);
    res.status(500).json({ message: "Server error calculating settlements." });
  }
};

exports.initiateSettlement = async (req, res) => {
  try {
    const { receiverId, amount, month, year, notes } = req.body;
    const payerId = req.user?.memberId;
    const circleId = req.user?.circleId || 1;

    if (!payerId) {
      return res.status(401).json({ message: "Authentication required to initiate settlement." });
    }

    const result = await settlementService.initiateSettlement({
      payerId,
      receiverId,
      amount,
      month,
      year,
      notes,
      circleId
    });

    res.status(201).json({
      message: "Settlement initiated successfully. Awaiting receiver confirmation.",
      settlement: result
    });
  } catch (err) {
    console.error("Error initiating settlement:", err.message);
    res.status(400).json({ message: err.message || "Failed to initiate settlement." });
  }
};

exports.confirmSettlement = async (req, res) => {
  try {
    const settlementId = req.params.id;
    const receiverId = req.user?.memberId;

    if (!receiverId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const result = await settlementService.confirmSettlement(settlementId, receiverId);
    res.json({
      message: "Settlement confirmed successfully. Balances have been settled.",
      settlement: result
    });
  } catch (err) {
    console.error("Error confirming settlement:", err.message);
    res.status(400).json({ message: err.message || "Failed to confirm settlement." });
  }
};

exports.rejectSettlement = async (req, res) => {
  try {
    const settlementId = req.params.id;
    const receiverId = req.user?.memberId;

    if (!receiverId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const result = await settlementService.rejectSettlement(settlementId, receiverId);
    res.json({
      message: "Settlement marked as not received.",
      settlement: result
    });
  } catch (err) {
    console.error("Error rejecting settlement:", err.message);
    res.status(400).json({ message: err.message || "Failed to reject settlement." });
  }
};

exports.getPendingSettlements = async (req, res) => {
  try {
    const receiverId = req.user?.memberId;
    if (!receiverId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const result = await settlementService.getPendingSettlements(receiverId);
    res.json(result);
  } catch (err) {
    console.error("Error fetching pending settlements:", err);
    res.status(500).json({ message: "Server error fetching pending settlements." });
  }
};

exports.getPendingCount = async (req, res) => {
  try {
    const receiverId = req.user?.memberId;
    if (!receiverId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const count = await settlementService.getPendingCount(receiverId);
    res.json({ pendingCount: count });
  } catch (err) {
    console.error("Error fetching pending count:", err);
    res.status(500).json({ message: "Server error fetching count." });
  }
};