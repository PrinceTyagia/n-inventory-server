const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: ['free', 'starter', 'professional', 'enterprise'],
    required: true,
    unique: true,
  },
  price: Number,
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly',
  },
  features: {
    teamMembers: Number,
    salesOrdersPerYear: Number,
    integrations: Number,
    inventoryLocations: Number,
    hasSublocations: {
      type: Boolean,
      default: false,
    },
    userAccessRights: Boolean,
    apiAccess: Boolean,
    showroom: Boolean,
    serialNumberSupport: Boolean,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Plan = mongoose.model('Plan', planSchema);
export default Plan;
