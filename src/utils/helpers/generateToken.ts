// importing dotenv form dotenve

import dotenv from 'dotenv';
import jwt from 'jsonwebtoken'
import { Response } from 'express';
import { strict } from 'assert';

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

    return { accessToken, refreshToken };
  } catch (error) {
    console.error('Error generating JWT:', error);
    res.status(500).json({ error: 'Error generating JWT' });
    return;
  }
}
