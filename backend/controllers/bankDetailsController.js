import BankDetails from "../models/BankDetails.js";

// @desc    Get current bank details
// @route   GET /api/bank-details
// @access  Public or Authenticated
export const getBankDetails = async (req, res) => {
  try {
    let details = await BankDetails.findOne();
    if (!details) {
      // Create defaults if not found
      details = await BankDetails.create({
        bankName: "Commercial Bank",
        accountName: "Flexify Pvt Ltd",
        accountNumber: "8010045622",
        referenceEmail: "luxury@flexify.com",
      });
    }
    res.json(details);
  } catch (error) {
    res.status(500).json({ message: "Server error fetching bank details" });
  }
};

// @desc    Update bank details
// @route   PATCH /api/bank-details
// @access  Private/SuperAdmin
export const updateBankDetails = async (req, res) => {
  try {
    const { bankName, accountName, accountNumber, referenceEmail, notes } = req.body;

    let details = await BankDetails.findOne();
    
    if (details) {
      details.bankName = bankName || details.bankName;
      details.accountName = accountName || details.accountName;
      details.accountNumber = accountNumber || details.accountNumber;
      details.referenceEmail = referenceEmail || details.referenceEmail;
      details.notes = notes !== undefined ? notes : details.notes;
      details.updatedBy = req.user._id;

      const updatedDetails = await details.save();
      res.json(updatedDetails);
    } else {
      details = await BankDetails.create({
        bankName,
        accountName,
        accountNumber,
        referenceEmail,
        notes,
        updatedBy: req.user._id,
      });
      res.status(201).json(details);
    }
  } catch (error) {
    res.status(500).json({ message: "Server error updating bank details" });
  }
};
