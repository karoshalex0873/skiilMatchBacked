import { Request, Response, NextFunction } from "express";
import asyncHandler from "../midllewares/asyncHandler";
import { AppDataSource } from "../config/data-source";
import { User } from "../Entities/User";
import bcrypt from "bcryptjs";
import { UserRequest } from "../utils/types/Usertype";
import { generateToken } from "../utils/helpers/generateToken";
import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
import crypto from 'crypto';
import { SecurityLog } from "../Entities/SecurityLog";
import { v4 as uuidv4 } from 'uuid';
import { sendOTPEmail } from "../utils/otp/sendOtpEmail";
import { OtpService } from "../utils/otp/otpUtils";


dotenv.config();



// User repository
const userDef = AppDataSource.getRepository(User);

// Updated Registration Controller
export const registerUser = asyncHandler(async (req: UserRequest, res: Response) => {
  // 1. destructure request body
  const { name, email, password, role } = req.body;
  // 2 validate user existence
  if (await userDef.findOne({ where: { email } })) {
    return res.status(409).json({ message: "User already exists" });
  }
  // 3. hash password
  const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));

  let newUser;
  try {
    // 4. create user
    newUser = await userDef.save(userDef.create({
      name,
      email,
      password: hashedPassword,
      role,
      isVerified: false
    }));

    // 5 generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const otpId = uuidv4();

    // 6 save OTP to database using the generated code
    await OtpService.createOtp(newUser, otpCode); // ✅ pass it in

    // 7 send OTP email
    await sendOTPEmail(email, otpCode, otpId); // Added otpId for tracking

    // 8. Prepare response
    return res.status(201).json({
      message: "Registration successful. Check your email for OTP.",
      otpId,
      user: {
        id: newUser.user_id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isVerified: newUser.isVerified
      }
    });
  } catch (error) {
    console.error("Error during registration:", error);
    // 9. Attempt to delete user if OTP generation fails
    if (newUser) {
      await userDef.delete(newUser.user_id).catch(() => { });

      return res.status(500).json({
        message: "Registration failed",
        error: "Failed to send OTP. User account deleted."
      })
    }

  }

});


// login fuction
export const loginUser = asyncHandler(
  async (req: UserRequest, res: Response) => {
    const { email, password } = req.body;

    // Find user by email
    const user = await userDef.createQueryBuilder("user")
      .leftJoinAndSelect("user.role", "role")
      .where("user.email = :email", { email })
      .getOne();
      

    // Log failed attempts for non-existent users
    if (!user) {
      await SecurityLog.save(
        SecurityLog.create({
          type: 'login_attempt',
          severity: 'medium',
          description: `Failed login attempt for non-existent email: ${email}`
        })
      );
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({ message: "Account not verified" });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await SecurityLog.save(
        SecurityLog.create({
          type: 'login_attempt',
          severity: 'high',
          description: `Failed login attempt for user ${user.email} (ID: ${user.user_id})`,
          user: user // Associate with user account
        })
      );
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // set user as active
    user.isActive = true;
    await userDef.save(user);

    // Log successful login
    await SecurityLog.save(
      SecurityLog.create({
        type: 'login',
        severity: 'low',
        description: `Successful login for ${user.email}`,
        user: user
      })
    );

    // Generate and set tokens
    // generateToken(res, user.user_id.toString());

    const tokens = generateToken(res, user.user_id.toString());

    if (!tokens) {
      return res.status(500).json({ message: "Token generation failed" });
    }
    const { accessToken, refreshToken } = tokens;

    // Send response
    res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email,
        Role: user.role.role_id
      }
    });
  }
);
//  logout function
export const logoutUser = asyncHandler(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    res.cookie("access_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "strict",
      expires: new Date(0)
    });

    res.cookie("refreshToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "strict",
      expires: new Date(0)
    });
    res.status(200).json({ message: "User logged out successfully" });
  }
)

// PATCH /api/verify/:userId
export const verifyOtp = asyncHandler(async (req:UserRequest, res:Response) => {
  const { userId } = req.params;
  const { otpCode } = req.body;

  if (!userId || !otpCode) {
    return res.status(400).json({ message: "User ID and OTP code are required" });
  }

  const isVerified = await OtpService.verifyOtp(Number(userId), otpCode);
  if (!isVerified) {
    return res.status(401).json({ message: "Invalid or expired OTP" });
  }

  await userDef.update({ user_id: Number(userId) }, { isVerified: true });

  res.json({ message: "Account verified successfully" });
});


export const resendOtp = asyncHandler(async (req:UserRequest, res:Response) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  // 1. Find the user
  const user = await userDef.findOne({ where: { user_id: Number(userId) } });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.isVerified) {
    return res.status(400).json({ message: "User is already verified" });
  }

  try {
    // 2. Create and save new OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
    await OtpService.createOtp(user, otpCode);

    // 3. Send OTP email
    await sendOTPEmail(user.email, otpCode, "N/A"); // You can generate a new otpId if needed

    res.json({ message: "A new OTP has been sent to your email." });
  } catch (error) {
    console.error("Failed to resend OTP:", error);
    res.status(500).json({ message: "Failed to resend OTP" });
  }
});

