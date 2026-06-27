import mongoose from 'mongoose';

mongoose.connect('mongodb://127.0.0.1:27017/flexify').then(async () => {
  const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  
  const user = await User.findOne({ email: 'deen@flexify.lk' }) || await User.findOne({});
  console.log('User ID:', user._id);
  
  const bookings = await Booking.find({ $or: [{ user: user._id }, { owner: user._id }] }).sort({createdAt: -1});
  console.log('Bookings:', JSON.stringify(bookings.map(b => ({ id: b._id, user: b.user, owner: b.owner, status: b.status, startDate: b.startDate, endDate: b.endDate })), null, 2));
  
  mongoose.disconnect();
}).catch(console.error);
