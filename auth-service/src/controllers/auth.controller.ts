import { Request, Response, NextFunction } from 'express';
import User, { IUser } from '../models/User';
import Role from '../models/Role';
import jwt from 'jsonwebtoken';
import { setAuthCookies } from '../../packages/midleware/cookieMiddleware';
import { AppError } from '../../packages/error-handler/index'; 
import { checkSubscriptionStatus,updateLastLoginTime } from '../lib/helper';
import otpGenerator from 'otp-generator';
import { sendOtpToEmail } from '../../packages/email-sender/emailSender';



const createSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existingSuperAdmin = await User.findOne({ email: 'superAdmin@gmail.com' });

    if (existingSuperAdmin) {
      return next(new AppError('SuperAdmin already exists', 400));
    }

    let superAdminRole = await Role.findOne({ name: 'superAdmin' });

    if (!superAdminRole) {
      superAdminRole = new Role({
        name: 'superAdmin',
        displayName: 'Super Administrator',
        organization: null,
        description: 'It is a Super Administrator role',
        permissions: [
          'organization.read',
          'organization.write',
          'organization.update',
          'organization.delete',
        ],
      });

      await superAdminRole.save();
    }

    const email = 'superAdmin@gmail.com';
    const password = 'Admin@123';

    const superAdminUser = new User({
      firstName: 'Prince',
      lastName: 'Tyagi',
      phone: '9149391653',
      email,
      password,
      role: superAdminRole._id,
    });

    await superAdminUser.save();

    res.status(201).json({
      message: 'SuperAdmin created successfully',
      user: {
        username: superAdminUser.firstName,
        email: superAdminUser.email,
      },
    });
  } catch (error) {
    next(error);
  }
};
const loginUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Ensure email and password are provided
    if (!email || !password) {
      return res.send({
        success: false,
        message: "Email and password are required!"
      });
    }

    // Find the user by email and populate the organization details
    const user = await User.findOne({ email }).populate("organisation") as IUser;

    // Check if the user exists
    if (!user) {
      return res.send({
        success: false,
        message: "User doesn't exist!"
      });
    }

    // Compare the entered password with the stored password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.send({
        success: false,
        message: "Invalid email or password!"
      });
    }

    
    if (email === "superAdmin@gmail.com") {
      const role = await Role.findById(user.role);
      if (!role) {
        return res.send({
          success: false,
          message: "SuperAdmin role not found"
        });
      }

      const accessToken = jwt.sign(
        {
          userId: user._id,
          roleId: role._id,
          role: role.name,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: "1d" }
      );

      const refreshToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET as string,
        { expiresIn: "7d" }
      );

      const userData = {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roleId: role._id,
        isVerified: user.isVerified,
        permissions: role.permissions,
        role: "superAdmin",
        displayName: "Super Administrator",
      };

      // Set the authentication cookies
      setAuthCookies({ accessToken, refreshToken, user: userData }, res);

      return res.send({
        success: true,
        message: "SuperAdmin login successful",
        data: { accessToken, refreshToken, user: userData }
      });
    }


    // Check if the user's organization has an active subscription
    if (!user.organisation) {
      return res.send({
        success: false,
        message: "User is not assigned to an organization"
      });
    }

    const org: any = user.organisation;
     // Check if the organization's status is active
     if (org.orgStatus !== "verified") {
      const otp = otpGenerator.generate(6, { digits: true, upperCaseAlphabets: false, lowerCaseAlphabets: false, specialChars: false });
      
      // Send OTP if organization is not verified
      await sendOtpToEmail({
        email: org.email,
        otp,
        subject: 'Organization Email Verification OTP',
        text: `Your OTP for email verification is: ${otp}. This OTP is valid for 10 minutes.`
      });

      return res.send({
        success: false,
        message: "Organization is not active or verified. An OTP has been sent to your email for verification.",
        redirectUrl: `http://localhost:3000/verify/${org._id}?emailId=${org?.email}`,
        otp // Optionally, you can send the OTP for debugging purposes, or use it internally for verification.
      });
    }

    // Check the subscription status of the organization (whether expired or active)
    const isSubscriptionActive = checkSubscriptionStatus(org);
    if (!isSubscriptionActive) {
      return res.send({
        success: false,
        message: "Organization's subscription is expired or inactive"
      });
    }

   

    // Check if the user's role is in the organization's roles
    const userRole = user.role
      ? org.roles.find((roleObj: any) => roleObj._id.toString() === user.role!.toString())
      : null;

    if (!userRole) {
      return res.send({
        success: false,
        message: "User's role not found in the organization's roles array"
      });
    }

    // Generate the access and refresh tokens
    const accessToken = jwt.sign(
      {
        userId: user._id,
        orgId: org._id,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    // Prepare the user data to be sent in the response
    const userData = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: userRole._id,
      role: userRole.roleName,
      isVerified: user.isVerified,
      permissions: userRole.permissions,
      displayName: userRole.roleName,
      organisation: org.orgName,
      organisationId: org._id,
      orgStatus: org.orgStatus,
      isActive: org.isActive,
    };

    // Set the authentication cookies
    setAuthCookies({ accessToken, refreshToken, user: userData }, res);

    // Update the last login time for the user
    await updateLastLoginTime(user);

    // Return the success response
    return res.send({
      success: true,
      message: "Login successful",
      data: { accessToken, refreshToken, user: userData }
    });
  } catch (error) {
    return next(error);
  }
};


const refreshToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(403).json({ message: 'Refresh token not found, please log in' });
    }

    jwt.verify(refreshToken, process.env.JWT_SECRET as string, (err: Error | null, decoded: any) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid refresh token' });
      }

      const { userId } = decoded;
      const newAccessToken = jwt.sign(
        { userId },
        process.env.JWT_SECRET as string,
        { expiresIn: '1d' }
      );

      res.status(200).json({
        accessToken: newAccessToken,
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export { createSuperAdmin, loginUser, refreshToken };
