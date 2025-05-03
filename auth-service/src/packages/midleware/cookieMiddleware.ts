import { Response, CookieOptions } from 'express';

interface IUserCookies {
  accessToken: string;
  refreshToken: string;
  user: object;
}

// Function to determine if the request is from localhost
const isLocalhost = (origin: string | undefined) => {
  if (!origin) return false;
  return origin.includes('localhost');
};

const setAuthCookies = ({ accessToken, refreshToken, user }: IUserCookies, res: Response) => {
  const origin = res.req.headers.origin; // Get frontend origin
  const localhost = isLocalhost(origin);

  // Set cookie options
  const cookieOptions: CookieOptions = {
    httpOnly: true, 
    secure: process.env.NODE_ENV === "production", 
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", 
  };

  // Set cookies with maxAge for expiration
  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.cookie("user", JSON.stringify(user), {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  
};

export { setAuthCookies };
