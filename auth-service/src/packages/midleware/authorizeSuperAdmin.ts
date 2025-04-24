import { Request, Response, NextFunction } from 'express';

export const authorizeSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  const userCookie = req.cookies?.user;
  // console.log("userCookie",userCookie);
  

  if (!userCookie) {
    return res.status(401).json({ message: 'Unauthorized: No user info found in cookies' });
  }

  let user;
  try {
    user = typeof userCookie === 'string' ? JSON.parse(userCookie) : userCookie;
  } catch (err) {
    return res.status(400).json({ message: 'Invalid user cookie format' });
  }
  console.log("user.role",user.role);
  

  // ✅ Check if role is superAdmin
  if (user.role !== 'superAdmin') {
    return res.status(403).json({ message: 'Access denied. SuperAdmin only.' });
  }

  // ✅ SuperAdmin verified, proceed
  next();
};
