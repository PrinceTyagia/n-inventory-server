import { Request, Response } from "express";
import mongoose from "mongoose";

import Organization from "../models/organisation"; // Import Organization model
import User from "../models/User";
import cron from "node-cron";
import { otp, tenDaysFromNow } from "../utils/helperfunctions";
import { sendOtpToEmail } from "../packages/email-sender/emailSender";
import { SuperAdminPreArray } from "../utils/constant";
import { redis } from "../db/redis";

// Step 1: Create Organization (Basic Details) with OTP
const createOrganization = async (req: Request, res: Response) => {
  const {
    adminName,
    billingPlan = "free",
    contactNumber,
    email,
    orgName,
    password,
  } = req.body;
  try {
    // check organizations parameter is exist or not ?
    const matches = await Organization.find(
      {
        $or: [
          { email: email },
          { orgName: orgName },
          { contactNumber: contactNumber },
        ],
      },
      { email: 1, orgName: 1, contactNumber: 1, _id: 0 } // projection for performance
    ).lean();

    if (matches.length > 0) {
      const conflicts = new Set();
      matches.forEach((doc) => {
        if (doc.email === email) conflicts.add("email");
        if (doc.orgName === orgName) conflicts.add("Organisation");
        if (doc.contactNumber === contactNumber) conflicts.add("Phone no");
      });
      return res.status(400).json({
        success: false,
        message: `Organization already exists with the same: ${[
          ...conflicts,
        ].join(", ")}.`,
      });
    }

    const newOrganization = new Organization({
      orgName,
      email,
      adminName,
      billingPlan,
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
      permissions: SuperAdminPreArray,
      createdBy: newOrganization._id,
    };

    newOrganization.roles.push(adminRole);
    const newUser = new User({
      firstName: adminName,
      lastName: "",
      slug: adminName.toLowerCase().replace(/\s+/g, ""),
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
    await redis.set(`org:otp:${email}`, otp, "EX", 120);
    // 600 in 10 second validation
    await sendOtpToEmail({
      email,
      otp,
      subject: "Organization Email Verification OTP",
      text: `Your OTP for email verification is: ${otp}. This OTP is valid for 2 minutes.`,
    });

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

    // Retrieve the OTP from Redis using the organization email as the key
    const redisKey = `org:otp:${email}`;
    const storedOtp = await redis.get(redisKey);

    // Check if the OTP exists in Redis and matches the one sent by the user
    if (!storedOtp) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired or doesn't exist. Please request a new OTP.",
      });
    }

    if (storedOtp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP provided. Please check and try again.",
      });
    }

    // Mark the organization as verified
    organization.orgStatus = "verified";
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

    // Delete OTP from Redis to prevent reuse
    await redis.del(redisKey);

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
//Step 3 : Resend Otp in Email
const resendOtpOrganization = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    // Find the organization by email
    const organization = await Organization.findOne({ email });

    if (!organization) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found." });
    }

    // Check if OTP exists and is still valid in Redis
    const redisKey = `org:otp:${email}`;
    const storedOtp = await redis.get(redisKey);

    // If OTP exists and is still valid (not expired), return an error to avoid resending too soon
    if (storedOtp) {
      return res.status(400).json({
        success: false,
        message:
          "OTP already sent. Please wait for it to expire before requesting a new one.",
      });
    }
    // Store the new OTP in Redis with an expiration time of 2 minutes
    await redis.set(`org:otp:${email}`, otp, "EX", 120);
    // 600 in 10 second validation
    await sendOtpToEmail({
      email,
      otp,
      subject: "Organization Email Verification OTP",
      text: `Your OTP for email verification is: ${otp}. This OTP is valid for 2 minutes.`,
    });

    // Return success response
    return res.status(200).json({
      success: true,
      message: "OTP has been resent successfully. Please check your email.",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error resending OTP.", error });
  }
};
// Step 4 Get All Organizations with pagination and search filter
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
  const orgId = req.headers["orgid"];

  if (!orgId) {
    return res
      .status(400)
      .json({ success: false, message: "orgId is required in headers" });
  }
  try {
    const organization = await Organization.findById(orgId).lean();
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
    // console.error("Error fetching organization:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching organization.",
      error: (error as Error).message,
    });
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
    const organization = (await Organization.findById(orgId)) as any;

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

export {
  createOrganization,
  verifyOtpOrganization,
  resendOtpOrganization,
  getAllOrganizations,
  getOrganizationById,
  deleteOrganizationAndUsers,
  getTrialStatusById,
};
