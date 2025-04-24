import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// Interface for User document (TypeScript typing)
export interface IUser extends Document {
  _id: any;
  firstName: string;
  slug: string;
  lastName: string;
  phone: string;
  email: string;
  emailVerified?: Date;
  image?: string;
  jobTitle?: string;
  phonecode?: string;
  password?: string;
  status: boolean;
  organisation: mongoose.Types.ObjectId;
  location?: mongoose.Types.ObjectId;
  isVerified: boolean;
  token?: string;
  tokenExpiresAt?: Date;
  role?: mongoose.Types.ObjectId;
  isInvited?: boolean; // NEW: Flag to track if user was invited
  invitedBy?: mongoose.Types.ObjectId; // NEW: Ref to inviter
  createdBy?: mongoose.Types.ObjectId; // NEW: Ref to who created user
  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Define the schema
const UserSchema: Schema<IUser> = new mongoose.Schema<IUser>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: false },
  slug: { type: String, required: false },
  phone: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  emailVerified: { type: Date },
  image: { type: String },
  jobTitle: { type: String },
  phonecode: { type: String },
  password: { type: String },
  status: { type: Boolean, default: true },
  organisation: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  location: { type: mongoose.Schema.Types.ObjectId, ref: "Location" },
  isVerified: { type: Boolean, default: false },
  token: { type: String },
  tokenExpiresAt: { type: Date },
  
  role: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },

  // NEW FIELDS FOR INVITE LOGIC
  isInvited: { type: Boolean, default: false }, // whether user was invited
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Password hashing
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password!, salt); // "!" because password is optional
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password!);
};

// Export the model
const User = mongoose.model<IUser>('User', UserSchema);
export default User;
