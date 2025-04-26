import { Response, CookieOptions } from 'express';

// interface IUserCookies {
//   accessToken: string;
//   refreshToken: string;
//   user: object;
// }

// const setAuthCookies = ({ accessToken, refreshToken, user }: IUserCookies, res: Response) => {
//  const cookieOptions: CookieOptions = {
//   httpOnly: true,
//   secure: process.env.NODE_ENV === "production", // secure only in production
//   sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // lax for localhost
// };

//   // Set cookies for accessToken, refreshToken, and user data
//   res.cookie("accessToken", accessToken, {
//     ...cookieOptions,
//     maxAge: 24 * 60 * 60 * 1000, // 1 day
//   });

//   res.cookie("refreshToken", refreshToken, {
//     ...cookieOptions,
//     maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
//   });

//   res.cookie("user", JSON.stringify(user), {
//     ...cookieOptions,
//     maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
//   });
// };

// export { setAuthCookies };
const isLocalhost = (origin: string | undefined) => {
  if (!origin) return false;
  return origin.includes('localhost');
};

const setAuthCookies = ({ accessToken, refreshToken, user }: IUserCookies, res: Response) => {
  const origin = res.req.headers.origin; // get frontend origin
  const localhost = isLocalhost(origin);

  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: !localhost, // localhost => false, else true
    sameSite: localhost ? "lax" : "none", // localhost => lax, else none
  };

  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.cookie("user", JSON.stringify(user), {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export { setAuthCookies };
