import { Response } from 'express';

interface IUserCookies {
  accessToken: string;
  refreshToken: string;
  user: object;
}

const setAuthCookies = ({ accessToken, refreshToken, user }: IUserCookies, res: Response) => {
  const cookieOptions = {
    //  httpOnly: false,
    // secure: process.env.NODE_ENV === "production", // Set to true in production
    // sameSite: "strict" as const,
        httpOnly: true,
    secure: true, // required for SameSite: 'none'
    sameSite: "none" as const, // allows cross-origin cookies
    path: "/", // optional, defaults to '/'
  };

  // Set cookies for accessToken, refreshToken, and user data
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
