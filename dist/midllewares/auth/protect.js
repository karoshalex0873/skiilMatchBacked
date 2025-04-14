"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const asyncHandler_1 = __importDefault(require("../asyncHandler"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const data_source_1 = require("../../config/data-source");
const User_1 = require("../../Entities/User");
// user repo
const userInfo = data_source_1.AppDataSource.getRepository(User_1.User);
// proetect middlware
exports.protect = (0, asyncHandler_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    let token = req.cookies["access_token"]; //only token from cookies
    if (!process.env.JWT_SECRET) {
        throw new Error("No JWT secret provided");
    }
    if (!token) {
        res.status(401).json({ message: "⚠ Access denied:To token Provided" });
        return;
    }
    try {
        // decoding the jwt
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // fetch user from db usig typorm
        const userResult = yield userInfo.findOne({
            where: { user_id: Number(decoded.userId) },
            relations: ["role"],
        });
        //check if user is found 
        if (!userResult) {
            res.status(401).json({ message: "⚠ Denied: User not  Found" });
            return;
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
    }
    catch (error) {
        console.error("Token verification error:", error);
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
}));
