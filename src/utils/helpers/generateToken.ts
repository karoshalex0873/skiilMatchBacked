// importing dotenv form dotenve

import dotenv from 'dotenv';
import jwt from 'jsonwebtoken'
import { Response } from 'express';

dotenv.config();

export const generateToken = (res: Response, userId: string) => {
  const jwt_secret = process.env.JWT_SECRET;
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET

  if (!jwt_secret || !refreshSecret) {
    throw new Error('JWT_SECRET or REFRESH_TOKEN_SECRET not found in environment variables');
  }

  try {
    const accessToken = jwt.sign({ userId }, jwt_secret, { expiresIn: '30m' })

    const refreshToken = jwt.sign({ userId }, refreshSecret, { expiresIn: '30d' })

    const isProduction = process.env.NODE_ENV !== 'production' // evaluates to true

    // Send access token cookie (non-httpOnly in dev/test)
    res.cookie("access_token", accessToken, {
      httpOnly: isProduction, // only httpOnly if in production
      secure: isProduction,   // only secure in production
      sameSite: "lax",         // "lax" works better for dev, "strict" blocks cross-origin
      maxAge: 90 * 60 * 1000,
    });

    // Send refresh token cookie
    res.cookie("refresh_token", refreshToken, {
      httpOnly: isProduction,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });


    return { accessToken, refreshToken };
  } catch (error) {
    console.error('Error generating JWT:', error);
    res.status(500).json({ error: 'Error generating JWT' });
    return;
  }

}
