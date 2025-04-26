import { Response, CookieOptions } from 'express';

interface IUserCookies {
  accessToken: string;
  refreshToken: string;
  user: object;
}

const setAuthCookies = ({ accessToken, refreshToken, user }: IUserCookies, res: Response) => {
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: true, // because backend is https (render.com)
    sameSite: "none", // cross-site cookies need SameSite none
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
