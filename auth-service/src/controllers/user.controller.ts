import { Request, Response } from 'express';
import Organization from "../models/organisation";
import User from "../models/User";
import { sendOtpToEmail } from '../packages/email-sender/emailSender';
import path from 'path';
import ejs from 'ejs';
import CryptoJS from "crypto-js";
import { redis } from '../db/redis';

const templatePath = path.join(__dirname, '../lib/templates/invite-email.ejs');
// Step 1 Get All User in SuperAdmin only/-
const getAllUsers = async (req:Request, res:Response) => {
  try {
   

      const { page = '1', limit = '10', search = '' }: { page?: string, limit?: string, search?: string } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Prepare the search query if search term exists
    let query = {};

    if (search) {
      const cleanSearch = search.toString().trim().toLowerCase();
      const searchWords = cleanSearch.split(/\s+/);

      // Build an advanced search query for both firstName and lastName
      query = {
        $or: [
          {
            slug: { $regex: searchWords.join('.*'), $options: 'i' }
          },
          
        ]
      };
    }

    // Fetch users from the database with pagination and search
    const users = await User.find(query)
      .skip(skip)
      .limit(limitNumber);

    // Get total count of users for pagination info
    const totalUsers = await User.countDocuments(query);

    // Return users with pagination info
    res.json({
      users,
      page: pageNumber,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limitNumber),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
// Step2 Get All User By Organization 
// const getAllUsersByOrganization = async (req: Request, res: Response) => {
//   try {
//     const orgId = req.headers['orgid'];
//     console.log("req.headers",req.headers);
    

//     if (!orgId) {
//       return res.status(400).json({success: false, message: 'orgId is required in headers' });
//     }

//     const { page = '1', limit = '10', search = '' }: { page?: string, limit?: string, search?: string } = req.query;

//     const pageNumber = parseInt(page as string, 10);
//     const limitNumber = parseInt(limit as string, 10);
//     const skip = (pageNumber - 1) * limitNumber;

//     // Find the organization
//     const organization = await Organization.findById(orgId).lean();

//     if (!organization) {
//       return res.status(404).json({success: false, message: 'Organization not found' });
//     }

//     const userIds = organization.users.map((u: any) => u.userId);

//     if (userIds.length === 0) {
//       return res.json({
//         users: [],
//         page: pageNumber,
//         totalUsers: 0,
//         totalPages: 0,
//       });
//     }

//     // Build search query
//     let query: any = { _id: { $in: userIds } };

//     if (search) {
//       const cleanSearch = search.toString().trim().toLowerCase();
//       const searchRegex = new RegExp(cleanSearch.split(/\s+/).join('.*'), 'i');

//       query = {
//         ...query,
//         $or: [
//           { firstName: { $regex: searchRegex } },
//           { lastName: { $regex: searchRegex } },
//           { email: { $regex: searchRegex } }, // Add more fields if needed
//         ],
//       };
//     }

//     const [users, totalUsers] = await Promise.all([
//       User.find(query).skip(skip).limit(limitNumber),
//       User.countDocuments(query),
//     ]);

//     return res.json({
//       success: true,
//       message:"User Successfully fetch by orgId",
//       users,
//       page: pageNumber,
//       totalUsers,
//       totalPages: Math.ceil(totalUsers / limitNumber),
//     });
//   } catch (error) {
//     console.error('Error fetching users by organization:', error);
//     return res.status(500).json({ success: false, message: 'Server error' });
//   }
// };
const getAllUsersByOrganization = async (req: Request, res: Response) => {
  try {
    const orgId = req.headers['orgid'];

    if (!orgId) {
      return res.status(400).json({ success: false, message: 'orgId is required in headers' });
    }

    const {
      page = '1',
      limit = '10',
      search = '',
      roleId = '',
      invite,
    }: { page?: string, limit?: string, search?: string, roleId?: string, invite?: string } = req.query;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const organization = await Organization.findById(orgId).lean();

    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const userIds = organization.users.map((u: any) => u.userId);

    if (userIds.length === 0) {
      return res.json({
        users: [],
        page: pageNumber,
        totalUsers: 0,
        totalPages: 0,
      });
    }

    let query: any = { _id: { $in: userIds } };

    if (invite === 'true') {
      query.isInvited = true;
    }

    if (roleId && roleId !== 'all') {
      query.role = roleId;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim().split(/\s+/).join('.*'), 'i');
      query = {
        ...query,
        $or: [
          { firstName: { $regex: searchRegex } },
          { lastName: { $regex: searchRegex } },
          { email: { $regex: searchRegex } },
        ],
      };
    }

    const [users, totalUsers] = await Promise.all([
      User.find(query).lean().skip(skip).limit(limitNumber),
      User.countDocuments(query),
    ]);

    // 🔁 Map each user's roleId to the role name from organization.roles
    const roleMap: Record<string, string> = {};
    organization.roles.forEach((role: any) => {
      roleMap[role._id.toString()] = role.roleName;
    });

    const enrichedUsers = users.map((user: any) => ({
      ...user,
      roleName: roleMap[user.role?.toString()] || 'Unknown',
    }));

    return res.json({
      success: true,
      message: "Users fetched successfully",
      users: enrichedUsers,
      page: pageNumber,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limitNumber),
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};




const sendInviteLink = async (req: Request, res: Response) => {
  try {
    const { email, location, role, orgName } = req.body;
    const orgId = req.headers["orgid"] as string;

    if (!email || !location || !role || !orgId || !orgName) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Generate a unique token for the invitation link
    const inviteToken = generateInvitationToken();
    console.log("inviteToken",inviteToken);
    
    const inviteLink = `http://localhost:3000/invite-user?token=${inviteToken}&email=${email}&orgId=${orgId}&location=${location}&role=${role}`;

    // Store the invite token in Redis with an expiration time (e.g., 24 hours)
    const redisKey = `invite:${inviteToken}`;
    const inviteData = JSON.stringify({
     email:email,
      used: 0,  // Track if the link is used
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,  // 24 hours expiration
    });

    // Set the invite data in Redis with expiration time
    await redis.set(redisKey, inviteData, 'EX', 24 * 60 * 60);  // Set expiry in Redis (24 hours)
   

    // Send the invitation email with the invite link
    const html = await ejs.renderFile(templatePath, { orgName, inviteLink });
    await sendOtpToEmail({
      email,
      subject: `You're invited to join ${orgName}`,
      html,
    });

    return res.status(200).json({ message: "Invite link sent successfully" });
  } catch (error) {
    console.error("Invite send error:", error);
    return res.status(500).json({ message: "Failed to send invite link" });
  }
};  
const handleInvitationLink = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, slug, phone, email, password, organisation, token, location, role } = req.body;

    // Validate required fields
    if (!token || !organisation || !location || !role) {
      return res.status(400).json({ success: false, message: "Missing required query parameters" });
    }

    // Define the Redis key for the invitation
    const redisKey = `invite:${token}`;
    const inviteData = await redis.get(redisKey);

    // If the invitation is invalid or expired
    if (!inviteData) {
      return res.status(400).json({ success: false, message: "Invalid or expired invitation link." });
    }

    // Parse the invite data stored in Redis
    const invite = JSON.parse(inviteData);

    // If the invitation has expired
    if (Date.now() > invite.expiresAt) {
      await redis.del(redisKey);
      return res.status(400).json({ success: false, message: "Invitation link has expired." });
    }

    // If the invite has already been used
    if (invite.used >= 1) {
      return res.status(400).json({ success: false, message: "Invitation link has already been used.", });
    }

    // Hash the password before saving the user
 

    // Create the new user
    const newUser = new User({
      firstName,
      lastName,
      slug,
      phone,
      email,
      password,
      status: true,
      organisation,  // The organization ID the user will belong to
      isVerified: true,  // Since the user is invited
      role,
      location,
      isInvited: true,
    });

    // Save the new user to the database
    await newUser.save();

    // Now, find the organization and push the new user to the users array
    const org = await Organization.findById(organisation); // Fetch organization by ID
    if (!org) {
      return res.status(400).json({ success: false, message: "Organization not found." });
    }

    // Push the new user into the organization's users array
    org.users.push({
      userId: newUser._id,    // Add the user's ID
      roleId: role,           // Add the user's role ID
    });

    // Save the updated organization
    await org.save();

    // Mark the invite as used in Redis
    invite.used = 1;
    await redis.set(redisKey, JSON.stringify(invite)); // Update invite data

    // Optionally, delete the invite key after use
    await redis.del(redisKey);

    // Send success response
    res.status(200).json({ success: true, message: "User registered successfully and added to the organization!", data: { email: newUser.email }  });
  } catch (err) {
    console.error('[Invite Error]', err);
    res.status(500).json({ success: false, message: "Something went wrong while accepting the invite." });
  }
};



// Function to generate a unique token (e.g., using random bytes or crypto)
const generateInvitationToken = () => {
  const timestamp = new Date().getTime();
  const randomStr = Math.random().toString(36).substring(2);
  return CryptoJS.SHA256(`${timestamp}-${randomStr}`).toString(CryptoJS.enc.Hex);
};
// export const sendOtp = async(name:string, email:string, template) => {

// }

export { getAllUsers,getAllUsersByOrganization,sendInviteLink,handleInvitationLink};
