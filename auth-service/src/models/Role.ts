import mongoose from 'mongoose';

// Define the Role schema
const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,  // This could be a short identifier like 'superadmin', 'admin', etc.
    unique: true,  // Ensure that each role name is unique across the system
  },
  displayName: {
    type: String,
    required: true,  // Display name of the role (e.g., 'Admin', 'SuperAdmin', etc.)
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',  // Reference to the Organization model
    required: false,  // Each role should be associated with an organization
  },
  description: {
    type: String,
    required: true,  // A description of what the role is for
  },
  permissions: {
    type: [String],  // Array of permissions assigned to the role
    required: true,  // This field is required, since roles need specific permissions
  },
}, { timestamps: true });

// Create the Role model
const Role = mongoose.model('Role', roleSchema);

export default Role;
