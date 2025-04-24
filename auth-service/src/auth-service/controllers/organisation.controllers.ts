import { Request, Response } from "express";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import otpGenerator from "otp-generator";
import Organization from "../models/organisation"; // Import Organization model
import User from "../models/User";
import cron from "node-cron";
// Email configuration using Nodemailer
const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  auth: {
    user: "merle.ondricka@ethereal.email",
    pass: "EfxDBKrCqZP8gzUGq6",
  },
});

// Generate and send OTP to email
export const sendOtpToEmail = async (email: string, otp: string) => {
  const mailOptions = {
    from: "vikranttyagia@gmail.com", // Sender's email
    to: email, // Recipient's email
    subject: "Organization Email Verification OTP",
    text: `Your OTP for email verification is: ${otp}. This OTP is valid for 10 minutes.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("OTP sent successfully to", email);
  } catch (error) {
    console.error("Error sending OTP", error);
    throw new Error("Failed to send OTP.");
  }
};
// Step 1: Create Organization (Basic Details) with OTP
const createOrganization = async (req: Request, res: Response) => {
  const {
    orgName,
    email,
    password,
    adminName,
    billingPlan = "free",
    state,
    country,
    contactNumber,
  } = req.body;

  try {
    const existingOrg = await Organization.findOne({ email });
    if (existingOrg) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Organization already exists with this email.",
        });
    }

    const otp = otpGenerator.generate(6, {
      digits: true,
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false, // 💡 This is important!
      specialChars: false,
    });

    const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const newOrganization = new Organization({
      orgName,
      email,
      adminName,
      billingPlan,
      state,
      country,
      otp,
      registrationDate: new Date(),
      subscriptionEndsAt: billingPlan === "free" ? tenDaysFromNow : null,
      orgStatus: "pending",
    });

    await newOrganization.save();

    const roleId = new mongoose.Types.ObjectId();
    const adminRole = {
      _id: roleId,
      roleName: "Admin",
      description: "Full system access",
      permissions: [
        "dashboard.create",
        "profile.update",
        "users.manage",
        "settings.manage",
      ],
      createdBy: newOrganization._id,
    };

    newOrganization.roles.push(adminRole);

    const [firstName, ...rest] = adminName.trim().split(" ");
    const newUser = new User({
      firstName,
      lastName: rest.join(" ") || "",
      slug: (firstName + rest.join(" ")).toLowerCase().replace(/\s+/g, ""),
      phone: contactNumber,
      email,
      password,
      organisation: newOrganization._id,
      role: roleId,
    });

    const savedUser = await newUser.save();

    newOrganization.users.push({
      userId: savedUser._id,
      roleId: roleId,
    });

    await newOrganization.save();

    await sendOtpToEmail(email, otp);

    return res.status(201).json({
      success: true,
      message:
        "Organization created successfully. OTP sent to email for verification.",
      data: {
        organization: newOrganization,
        user: savedUser,
        orgId: newOrganization._id,
        email: newOrganization.email,
      },
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Error creating organization.", error });
  }
};
// Step 2: Verify OTP and Update Organization with Admin Info
const verifyOtpOrganization = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  try {
    // Find the organization by email
    const organization = await Organization.findOne({ email });

    if (!organization) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found." });
    }

    // Check if OTP matches
    if (organization.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP." });
    }

    // Mark organization as verified
    organization.orgStatus = "verified";
    organization.otp = undefined; // remove OTP after verification
    await organization.save();

    // Set isVerified: true for the admin user
    const adminUser = await User.findOne({
      email: organization.email,
      organisation: organization._id,
    });

    if (adminUser) {
      adminUser.isVerified = true;
      await adminUser.save();
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully. Organization is now active.",
      data: {
        organizationId: organization._id,
        email: organization.email,
        status: organization.orgStatus,
        userVerified: adminUser?.isVerified ?? false,
      },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error verifying OTP.", error });
  }
};
// step 3 // Function to check and update organization trial subscription status
const checkTrialSubscriptions = async () => {
  try {
    // Get the current date
    const currentDate = new Date();

    // Find all organizations with a 'free' billing plan and subscription end date
    const organizations = await Organization.find({
      billingPlan: "free",
      subscriptionEndsAt: { $lte: currentDate },
    });

    // Iterate over the organizations and update their status
    for (const organization of organizations) {
      if (
        organization.subscriptionEndsAt &&
        organization.subscriptionEndsAt <= currentDate
      ) {
        // If trial has expired, mark the organization as inactive
        organization.orgStatus = "inactive" as any; // Or 'expired' based on your logic
        await organization.save();
        console.log(
          `Organization ${organization._id} has been marked as inactive due to expired trial.`
        );
      }
    }
  } catch (error) {
    console.error("Error checking trial subscriptions:", error);
  }
};
// Schedule the cron job to run daily (you can adjust the interval as needed)
cron.schedule("0 0 * * *", checkTrialSubscriptions); // This runs every day at midnight
// Step 4 // get trialStatus by id information
const getTrialStatusById = async (req: Request, res: Response) => {
  const { orgId } = req.params; // Get the orgId from the URL parameters

  try {
    // Fetch the organization by its ID
    const organization = await Organization.findById(orgId) as any;

    // If organization is not found, return 404
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    // Calculate the remaining days using the getRemainingDays method
    const remainingDays = organization.getRemainingDays();
    let trialStatusMessage = "";

    // Check the status based on the remaining days
    if (remainingDays <= 0) {
      trialStatusMessage = "Your trial has expired.";
    } else if (remainingDays <= 7) {
      trialStatusMessage = `Your trial is expiring in ${remainingDays} day${
        remainingDays > 1 ? "s" : ""
      }.`;
    } else {
      trialStatusMessage = `Your trial is active with ${remainingDays} day${
        remainingDays > 1 ? "s" : ""
      } remaining.`;
    }

    // Return the organization status along with trial details
    return res.status(200).json({
      success: true,
      message: "Organization trial status fetched successfully.",
      data: {
        orgName: organization.orgName,
        billingPlan: organization.billingPlan,
        trialStatus: trialStatusMessage,
        remainingDays: remainingDays,
        subscriptionEndsAt: organization.subscriptionEndsAt,
      },
    });
  } catch (error) {
    // Log the error and send a 500 response in case of any issues
    console.error("Error fetching trial status by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching trial status by ID.",
      error,
    });
  }
};
// Step 5 Get All Organizations with pagination and search filter
const getAllOrganizations = async (req: Request, res: Response) => {
  const { search = "", page = "1", limit = "10" } = req.query;

  const parsedPage = Math.max(1, parseInt(page as string, 10) || 1);
  const parsedLimit = Math.max(1, parseInt(limit as string, 10) || 10);

  const skip = (parsedPage - 1) * parsedLimit;

  let query: Record<string, any> = {};

  if (search) {
    const cleanSearch = search.toString().trim().toLowerCase();
    query = {
      $or: [
        {
          slug: {
            $regex: cleanSearch.split(/\s+/).join(".*"),
            $options: "i",
          },
        },
      ],
    };
  }

  try {
    const [totalOrganizations, organizations] = await Promise.all([
      Organization.countDocuments(query),
      Organization.find(query)
        .skip(skip)
        .limit(parsedLimit)
        .sort({ createdAt: -1 }) // Optional: Sort by created date or any other field
        .lean(), // Optional: Improves performance if no Mongoose methods are needed
    ]);

    return res.status(200).json({
      success: true,
      message: "Organizations fetched successfully.",
      data: organizations,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(totalOrganizations / parsedLimit),
        totalResults: totalOrganizations,
      },
    });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching organizations.",
      error: error instanceof Error ? error.message : error,
    });
  }
};
//Step 6 Get organization by ID
const getOrganizationById = async (req: Request, res: Response) => {
  const { orgId } = req.params;

  try {
    const isValidObjectId = mongoose.Types.ObjectId.isValid(orgId);

    const organization = await Organization.findOne(
      isValidObjectId ? { _id: orgId } : { slug: orgId }
    );

    if (!organization) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Organization fetched successfully",
      data: organization,
    });
  } catch (error) {
    console.error("Error fetching organization:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching organization.",
      error: (error as Error).message,
    });
  }
};
// Step 7 Delete organization or user by orgId
const deleteOrganizationAndUsers = async (req: Request, res: Response) => {
  const { orgId } = req.params;

  try {
    // 1. Check if the organization exists
    const org = await Organization.findById(orgId);
    if (!org) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });
    }

    // 2. Delete all users belonging to the organization
    await User.deleteMany({ organisation: orgId });

    // 3. Delete the organization itself
    await Organization.findByIdAndDelete(orgId);

    return res.status(200).json({
      success: true,
      message: "Organization and its users deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting organization and users:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};
// superAdmin
// Step 8 Get All Role by Organization
const getRolesByOrgId = async (req: Request, res: Response) => {
  const orgId = req.headers['orgid'] as string;
  // console.log("orgid",orgId);
  try {
    if (!orgId || typeof orgId !== 'string') {
      return res.status(400).json({
        success: false,
        message: "orgId is required in headers and must be a string.",
      });
    }
    const { page = 1, limit = 10, search = '' } = req.query;
    const organization = await Organization.findById(orgId);
    // console.log("organization",organization);
    

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found sss.",
      });
    }

    const searchString = typeof search === 'string' ? search.toLowerCase() : '';

    const allRoles = organization.roles || [];
    const filteredRoles = allRoles.filter(role =>
      role.roleName.toLowerCase().includes(searchString)
    );

    const totalRoles = filteredRoles.length;
    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const totalPages = Math.ceil(totalRoles / limitNumber);
    const startIndex = (pageNumber - 1) * limitNumber;
    const paginatedRoles = filteredRoles.slice(startIndex, startIndex + limitNumber);

    return res.status(200).json({
      success: true,
      message: "Roles fetched successfully.",
      roles: paginatedRoles,
      page: pageNumber,
      totalRoles,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching roles.",
    });
  }
};
// Step 9 create Role for Organization
const createRoleForOrganization = async (req: Request, res: Response) => {
  const orgId = req.headers['orgid'] as string;  // Get orgId from headers
  const { roleName, description, permissions } = req.body;
  const createdBy = req.user?.userId;  // Assuming that user ID is available after verifying the token

  // Validate createdBy and orgId
  if (!createdBy || typeof createdBy !== 'string') {
    return res.status(400).json({ success: false, message: 'CreatedBy is required' });
  }
  
  if (!orgId || typeof orgId !== 'string') {
    return res.status(400).json({ success: false, message: 'Organization ID is required in headers' });
  }

  // Validate roleName
  if (!roleName) {
    return res.status(400).json({ success: false, message: 'Role name is required' });
  }

  try {
    // Find the organization by orgId
    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    // Check if role already exists within the organization's roles array
    const roleExists = organization.roles.some(role => role.roleName.toLowerCase() === roleName.toLowerCase());
    if (roleExists) {
      return res.status(400).json({ success: false, message: 'Role name already exists in this organization' });
    }

    // Create new role
    const newRole = {
      roleName,
      description,
      permissions,
      createdBy,
      createdAt: new Date(),
    };

    // Add the new role to the organization's roles array
    organization.roles.push(newRole);
    
    // Save the organization with the new role
    await organization.save();

    return res.status(201).json({
      success: true,
      message: 'Role created successfully',
      role: newRole,
    });
  } catch (error) {
    console.error('Error creating role:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
//Step 10 get Role by Id and Org ID 
const getRoleByOrgAndRoleId = async (req: Request, res: Response) => {
  const orgId = req.headers['orgid'];
  const { roleId } = req.params;

  if (!orgId || typeof orgId !== 'string') {
    return res.status(400).json({ success: false, message: 'orgId is required in headers' });
  }

  if (!roleId || !mongoose.Types.ObjectId.isValid(roleId)) {
    return res.status(400).json({ success: false, message: 'Invalid or missing roleId' });
  }

  try {
    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found sss' });
    }

    const role = organization.roles.id(roleId); // Mongoose subdocument access

    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Role fetched successfully',
      role,
    });
  } catch (error) {
    console.error('Error fetching role:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
//Step 11 Update Role by ORG Id and Role Id
const updateRoleByOrgAndRoleId = async (req: Request, res: Response) => {
  const orgId = req.headers['orgid'];
  
  const { roleName, description, permissions ,roleId} = req.body;

  if (!orgId || typeof orgId !== 'string') {
    return res.status(400).json({ success: false, message: 'orgId is required in headers' });
  }

  if (!roleId || !mongoose.Types.ObjectId.isValid(roleId)) {
    return res.status(400).json({ success: false, message: 'Invalid or missing roleId' });
  }

  try {
    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const role = organization.roles.id(roleId);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    // Update fields if provided
    if (roleName) role.roleName = roleName;
    if (description !== undefined) role.description = description;
    if (Array.isArray(permissions)) role.permissions = permissions;

    await organization.save();

    return res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      role,
    });
  } catch (error) {
    console.error('Error updating role:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
//Step 12 Delete Role by ORG Id and Role Id
const deleteRoleByOrgAndRoleId = async (req: Request, res: Response) => {
  const orgId = req.headers['orgid'];
  const { roleId } = req.params;

  if (!orgId || typeof orgId !== 'string') {
    return res.status(400).json({ success: false, message: 'orgId is required in headers' });
  }

  if (!roleId || !mongoose.Types.ObjectId.isValid(roleId)) {
    return res.status(400).json({ success: false, message: 'Invalid or missing roleId' });
  }

  try {
    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const roleIndex = organization.roles.findIndex((role: any) => role._id.toString() === roleId);
    if (roleIndex === -1) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    organization.roles.splice(roleIndex, 1); // remove role from array
    await organization.save();

    return res.status(200).json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
// Step 13
// export const createDummyLocationsForOrg = async (orgId) => {
//   try {
//     if (!orgId || !mongoose.Types.ObjectId.isValid(orgId)) {
//       throw new Error('Invalid orgId');
//     }

//     const organization = await Organization.findById(orgId);
//     if (!organization) {
//       throw new Error('Organization not found');
//     }

//     // Define the dummy locations
//     const dummyLocations = [
//       {
//         name: 'Central Warehouse',
//         type: 'warehouse',
//         address: 'Plot 42, Industrial Area, City',
//         phone: '9999990001',
//         email: 'warehouse@example.com',
//         isActive: true,
//       },
//       {
//         name: 'Main Retail Shop',
//         type: 'retail-shop',
//         address: '1st Floor, Mall, Downtown',
//         phone: '9999990002',
//         email: 'retail@example.com',
//         isActive: true,
//       },
//       {
//         name: 'Franchise Outlet',
//         type: 'franchise-store',
//         address: 'Sector 10, Nearby Park',
//         phone: '9999990003',
//         email: 'franchise@example.com',
//         isActive: true,
//       },
//       {
//         name: 'Online Fulfillment Center',
//         type: 'online-store',
//         address: 'eComm Zone, Building B',
//         phone: '9999990004',
//         email: 'online@example.com',
//         isActive: true,
//       },
//     ];

//     // Add dummy locations directly to the locations array
//     organization.locations.push(...dummyLocations);

//     // Save the organization with the updated locations array
//     await organization.save();

//     console.log('Dummy locations created and added to organization');
//     return { message: 'Dummy locations created and added to organization', locations: dummyLocations };
//   } catch (error) {
//     console.error('Error creating locations:', error);
//     throw new Error('Server error: ' + error.message);
//   }
// };
// const orgId = '6803722c3fd1f3f09ef6039b'; // Replace with actual organization ID

// // Call the function and handle the response
// createDummyLocationsForOrg(orgId)
//   .then((response) => {
//     console.log('Locations created:', response);
//   })
//   .catch((error) => {
//     console.error('Error:', error.message);
//   });



export {
  createOrganization,
  verifyOtpOrganization,
  getTrialStatusById,
  getAllOrganizations,
  getOrganizationById,
  deleteOrganizationAndUsers,
  getRolesByOrgId,
  createRoleForOrganization,
  getRoleByOrgAndRoleId,
  updateRoleByOrgAndRoleId,
  deleteRoleByOrgAndRoleId
};