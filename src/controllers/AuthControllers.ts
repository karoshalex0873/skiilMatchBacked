import { Request, Response, NextFunction } from "express";
import asyncHandler from "../midllewares/asyncHandler";
import { AppDataSource } from "../config/data-source";
import { User } from "../Entities/User";
import bcrypt from "bcryptjs";
import { UserRequest } from "../utils/types/Usertype";
import { generateToken } from "../utils/helpers/generateToken";
import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
import { SecurityLog } from "../Entities/SecurityLog";

dotenv.config();



// User repository
const userDef = AppDataSource.getRepository(User);

export const registerUser = asyncHandler(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    // Destructure request body

    const { name, email, password, role } = req.body;

    // Check if user exists
    const userExists = await userDef.findOne({ where: { email } });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash user's password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = userDef.create({
      name,
      email,
      password: hashedPassword,
      role
    });

    // Save user in the database
    await userDef.save(newUser);


    // generate token
    generateToken(res, newUser.user_id.toString())

    // Send response
    return res.status(201).json({
      message: "User created successfully",
      user: newUser,
    });
    next()
  }
);


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

