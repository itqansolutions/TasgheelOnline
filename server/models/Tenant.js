const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  trialEndsAt: { type: Date, required: true },
  isSubscribed: { type: Boolean, default: false },
  subscriptionPlan: { type: String, default: 'free_trial' }, // free_trial, monthly, yearly
  createdAt: { type: Date, default: Date.now },
  settings: {
    shopName: String,
    shopAddress: String,
    shopLogo: String,
    footerMessage: String
  }
});

module.exports = mongoose.model('Tenant', tenantSchema);
