"use strict";
// importing dotenv form dotenve
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
dotenv_1.default.config();
const generateToken = (res, userId) => {
    const jwt_secret = process.env.JWT_SECRET;
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
    if (!jwt_secret || !refreshSecret) {
        throw new Error('JWT_SECRET or REFRESH_TOKEN_SECRET not found in environment variables');
    }
    try {
        const accessToken = jsonwebtoken_1.default.sign({ userId }, jwt_secret, { expiresIn: '30m' });
        const refreshToken = jsonwebtoken_1.default.sign({ userId }, refreshSecret, { expiresIn: '30d' });
        // access token as HTTPonly secure and samSite=strict
        res.cookie("access_token", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: "strict",
            maxAge: 90 * 60 * 1000,
        });
        // Set refresh token as HTTPOnly
        res.cookie("refresh_token", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== "development",
            sameSite: "strict",
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });
        return { accessToken, refreshToken };
    }
    catch (error) {
        console.error('Error generating JWT:', error);
        res.status(500).json({ error: 'Error generating JWT' });
        return;
    }
};
exports.generateToken = generateToken;
