import { Response, NextFunction } from "express"
import asyncHandler from "../asyncHandler"
import jwt from "jsonwebtoken"
import { AppDataSource } from "../../config/data-source"
import { User } from "../../Entities/User"
import { UserRequest } from "../../utils/types/Usertype"

// user repo
const userInfo = AppDataSource.getRepository(User)

// proetect middlware
export const protect = asyncHandler(async (req: UserRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "⚠ Access denied: No token provided" });
    return
  }

  const token = authHeader.split(" ")[1]; // Extract token from "Bearer <token>"

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    const userResult = await userInfo.findOne({
      where: { user_id: Number(decoded.userId) },
      relations: ["role"]
    });

    if (!userResult) {
      res.status(401).json({ message: "⚠ Denied: User not Found" });
      return
    }

    req.user = {
      user_id: userResult.user_id,
      name: userResult.name,
      email: userResult.email,
      role: userResult.role.role_id,
      avatar: userResult.avatar,
      createdAt: userResult.createdAt,
      updatedAt: userResult.updatedAt,
    };

    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
});


