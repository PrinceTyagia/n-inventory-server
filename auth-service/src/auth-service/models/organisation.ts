import mongoose from "mongoose";



const locationSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(),
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: [
      'warehouse',
      'retail-shop',
      'franchise-store',
      'online-store',
      'cold-storage',
      'returns-zone',
      'distribution-hub',
      'clinic-attached',
      'sample-room',
    ],
    required: true,
  },
  address: {
    type: String,
  },
  phone: {
    type: String,
  },
  email: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const organizationSchema = new mongoose.Schema({
    // Step 1: Basic Organization Info
    orgName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    orgStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    otp: String, // For verification
    adminName: {
      type: String,
      required: true,
    },
    roles: [
        {
          roleName: {
            type: String,
            required: true,
          },
          description:String,
          permissions: [
            {
              type: String, // e.g., 'dashboard.create', 'profile.update'
            },
          ],
          createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
    ],
    users: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        roleId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Role',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    locations: [locationSchema],

    industry: String,
    orgType: String,
    alternateEmail: String,
    contactNumber: String,
    supportPhone: String,
    supportEmail: String,
    website: String,
    address: String,
    city: String,
    zipcode: String,
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },

    // Tax & Billing Info
    gstin: { type: String, unique: true },
    panNumber: { type: String, unique: true, sparse: true },
    licenseNumber: String,
    taxRate: Number,
    currency: { type: String, default: 'INR' },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'expired'],
      default: 'pending',
    },
    // Compliance & System Fields
    kycDocs: [String],
    isPaymentVerified: { type: Boolean, default: false },
    ipAddress: String,
    registrationDate: Date,
    // SaaS & Optional Settings
    pharmacyType: String,
    preferredLanguage: { type: String, default: 'en' },
    logoUrl: String,
    orgNotes: String,
    // Feature Flags
    enableMultiLocation: { type: Boolean, default: false },
    enableInventoryAlerts: { type: Boolean, default: true },

    // Creator Info
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Billing & Plan Details
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
    },
    billingPlan: {
      type: String,
      enum: ['free', 'starter', 'professional', 'enterprise'],
      default: 'free',
    },
    price: {
      type: Number,
      default: 0,
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly',
    },
    nextBillingDate: Date,
    subscriptionEndsAt: Date, // For free plan trial
    paymentMode: {
      type: String,
      enum: ['Razorpay', 'Stripe', 'Manual'],
      default: 'Manual',
    },
    invoiceHistory: [
      {
        invoiceId: String,
        amount: Number,
        status: {
          type: String,
          enum: ['paid', 'unpaid', 'failed'],
          default: 'unpaid',
        },
        date: Date,
        paymentMethod: String,
      },
    ],
  },
  { timestamps: true }
);

// Slug generator
organizationSchema.pre('save', function (next:mongoose.CallbackWithoutResultAndOptionalError) {
  if (this.isModified('orgName')) {
    let slug = this.orgName.trim().toLowerCase();
    slug = slug.replace(/[\s&]+/g, '').toLowerCase(); // Remove spaces and '&' characters
    slug = slug.replace(/[^\w-]+/g, ''); // Remove any non-alphanumeric characters except for hyphens

    // Remove leading or trailing hyphens if any
    slug = slug.replace(/^-+|-+$/g, '');

    this.slug = slug;
  }
  next();
});

organizationSchema.methods.getRemainingDays = function ():number {
  if (this.billingPlan === 'free' && this.subscriptionEndsAt) {
    const currentDate = new Date();
    const timeDiff = this.subscriptionEndsAt.getTime() - currentDate.getTime();
    const remainingDays = Math.ceil(timeDiff / (1000 * 3600 * 24)); // Convert milliseconds to days
    return remainingDays;
  }
  return 0; // Return 0 if there is no expiration or not a trial
};

// Export the Organization model
const Organization = mongoose.model('Organization', organizationSchema);

export default Organization;