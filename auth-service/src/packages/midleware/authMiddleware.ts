import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// JWT Secret (you should use environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Optional: define your token payload type
interface JwtPayload {
  userId: string;
  role: string;
  _id:string;
  // add more fields if needed
}

// Extend Express Request to hold user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const verifyAccessToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let token = req.cookies?.accessToken;

  // Or get from Authorization header
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Access token is required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded as JwtPayload;  // Attach decoded user data to req.user

    // Optionally, you can directly log or access user ID here
    
    console.log('User ID from token:', req.user.userId);  // _id from token

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    }
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
//  export default verifyAccessToken