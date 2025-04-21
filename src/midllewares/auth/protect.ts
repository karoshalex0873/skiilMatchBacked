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

  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return res.status(401).json({ message: "⚠ Access denied: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    const userResult = await userInfo.findOne({
      where: { user_id: Number(decoded.userId) },
      relations: ["role"]
    });

    if (!userResult) {
      return res.status(401).json({ message: "⚠ Denied: User not Found" });
    }

    req.user = {
      user_id: userResult.user_id,
      name: userResult.name,
      email: userResult.email,
      role: userResult.role.role_id,
      avatar: userResult.avatar,
      createdAt: userResult.createdAt,
      updatedAt: userResult.updatedAt,
      cv: userResult.cv,
    };

    next();
  } catch (error: any) {
    console.error("Token verification error:", error.message);
    return res.status(401).json({ message: "Unauthorized: Invalid or malformed token" });
  }
});
