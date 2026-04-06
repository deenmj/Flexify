import Settings from '../models/Settings.js';

// @desc    Get website contact details
// @route   GET /api/settings/contact
// @access  Public
export const getContactDetails = async (req, res) => {
  try {
    let settings = await Settings.findOne({ key: 'contact_info' });
    
    // Provide defaults if not setup yet
    if (!settings) {
      settings = {
        value: {
          email: 'support@flexify.com',
          phone: '+94 11 234 5678',
          address: '123 Business Avenue, Colombo 03, Sri Lanka',
          workingHours: 'Mon-Sat: 9:00 AM - 6:00 PM',
        }
      };
    }

    res.json(settings.value);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update website contact details
// @route   PUT /api/settings/contact
// @access  Private/SuperAdmin
export const updateContactDetails = async (req, res) => {
  try {
    const { email, phone, address, workingHours } = req.body;
    
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only superadmin can update contact details' });
    }

    let settings = await Settings.findOne({ key: 'contact_info' });
    
    const newValues = {
      email,
      phone,
      address,
      workingHours
    };

    if (settings) {
      settings.value = newValues;
      await settings.save();
    } else {
      settings = await Settings.create({
        key: 'contact_info',
        value: newValues
      });
    }

    res.json(settings.value);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
