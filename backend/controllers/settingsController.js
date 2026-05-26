import Settings from '../models/Settings.js';
import cloudinary from '../utils/cloudinary.js';

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
          email: 'support@rentify.lk',
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

// =================== FOUNDERS ===================

// @desc    Get founders list
// @route   GET /api/settings/founders
// @access  Public
export const getFounders = async (req, res) => {
  try {
    const settings = await Settings.findOne({ key: 'founders' });
    res.json(settings ? settings.value : []);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update founders (add/edit all founders at once)
// @route   PUT /api/settings/founders
// @access  Private/SuperAdmin
export const updateFounders = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only superadmin can update founders' });
    }

    // Parse founders data from request body
    let foundersData;
    try {
      foundersData = JSON.parse(req.body.founders || '[]');
    } catch {
      return res.status(400).json({ message: 'Invalid founders data' });
    }

    // Map uploaded files to their respective founder entries
    const files = req.files || [];
    const founders = foundersData.map((founder, index) => {
      // Check if a new file was uploaded for this founder
      // Cloudinary multer sets file.path = the full Cloudinary URL
      const file = files.find(f => f.fieldname === `image_${index}`);
      return {
        name: founder.name || '',
        role: founder.role || '',
        description: founder.description || '',
        // Store the full Cloudinary URL directly; fall back to existing value
        image: file ? file.path : (founder.image || ''),
      };
    });

    let settings = await Settings.findOne({ key: 'founders' });

    if (settings) {
      settings.value = founders;
      settings.markModified('value');
      await settings.save();
    } else {
      settings = await Settings.create({
        key: 'founders',
        value: founders,
      });
    }

    res.json(settings.value);
  } catch (error) {
    console.error('Update founders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete a specific founder by index
// @route   DELETE /api/settings/founders/:index
// @access  Private/SuperAdmin
export const deleteFounder = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only superadmin can delete founders' });
    }

    const founderIndex = parseInt(req.params.index, 10);
    const settings = await Settings.findOne({ key: 'founders' });

    if (!settings || !Array.isArray(settings.value)) {
      return res.status(404).json({ message: 'No founders found' });
    }

    if (founderIndex < 0 || founderIndex >= settings.value.length) {
      return res.status(400).json({ message: 'Invalid founder index' });
    }

    // Delete image from Cloudinary if it's a Cloudinary URL
    const removed = settings.value[founderIndex];
    if (removed?.image && removed.image.includes('cloudinary.com')) {
      try {
        // Extract the public_id from the Cloudinary URL
        // URL format: https://res.cloudinary.com/<cloud>/image/upload/<transforms>/flexify/founders/<id>
        const urlParts = removed.image.split('/');
        const publicIdWithExt = urlParts.slice(urlParts.indexOf('upload') + 1).join('/');
        const publicId = publicIdWithExt.replace(/\.[^/.]+$/, ''); // strip file extension
        await cloudinary.uploader.destroy(publicId);
      } catch (cleanupErr) {
        console.warn('Cloudinary cleanup warning:', cleanupErr.message);
      }
    }

    settings.value.splice(founderIndex, 1);
    settings.markModified('value');
    await settings.save();

    res.json(settings.value);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
