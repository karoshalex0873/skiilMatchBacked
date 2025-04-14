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
exports.updateUser = exports.userInfo = void 0;
const data_source_1 = require("../config/data-source");
const User_1 = require("../Entities/User");
const asyncHandler_1 = __importDefault(require("../midllewares/asyncHandler"));
// User respository
const userDef = data_source_1.AppDataSource.getRepository(User_1.User);
exports.userInfo = (0, asyncHandler_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // try catch block
    try {
        const USER = req.user;
        // not loggedin
        if (!USER) {
            res.status(400).json({ message: "not authenticated" });
            return;
        }
        // Fetch the user  based on email
        const userId = USER.user_id;
        const userInformation = yield userDef.findOne({
            where: { user_id: userId }, // search by "user_id"
            relations: ['role', 'jobs']
        });
        // if no user found
        if (!userInformation) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const profileCompletion = calculateProfileCompletion(userInformation);
        // return user infomation 
        res.status(200).json({
            success: true,
            data: userInformation,
            completed: profileCompletion
        });
    }
    catch (error) {
        console.error("Error fetching user information:", error);
        res.status(500).json({ message: "Server error while fetching user information." });
    }
}));
// Profile Completion Utility
const calculateProfileCompletion = (user) => {
    const fields = [
        'user_id',
        'name',
        'email',
        'password',
        'avatar',
        'phone',
        'bio',
        'location',
        'skills',
        'dob',
        'gender',
        'summary',
        'experience'
    ];
    let filled = 0;
    fields.forEach(field => {
        const value = user[field];
        if (field === 'skills') {
            if (value && value.length > 0)
                filled++;
        }
        else {
            if (value)
                filled++;
        }
    });
    return Math.round((filled / fields.length) * 100);
};
exports.updateUser = (0, asyncHandler_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const USER = req.user;
        // Check authentication
        if (!USER) {
            return res.status(400).json({ message: "Not authenticated" });
        }
        const userId = USER.user_id;
        // Find the user
        const existingUser = yield userDef.findOne({
            where: { user_id: userId },
            relations: ['role', 'jobs']
        });
        if (!existingUser) {
            return res.status(404).json({ message: "User not found" });
        }
        // Destructure request body
        const { name, avatar, phone, bio, location, skills, dob, gender, summary, experience } = req.body;
        // Update fields if provided
        if (name)
            existingUser.name = name;
        if (avatar)
            existingUser.avatar = avatar;
        if (phone)
            existingUser.phone = phone;
        if (bio)
            existingUser.bio = bio;
        if (location)
            existingUser.location = location;
        if (skills)
            existingUser.skills = skills;
        if (dob)
            existingUser.dob = dob;
        if (summary)
            existingUser.summary = summary;
        if (gender)
            existingUser.gender = gender;
        if (experience)
            existingUser.experience = experience;
        // Save updated user
        const updatedUser = yield userDef.save(existingUser);
        // Calculate profile completion
        const profileCompletion = calculateProfileCompletion(updatedUser);
        // Response
        res.status(200).json({
            success: true,
            message: "User updated successfully",
            profileCompletion,
            data: updatedUser
        });
    }
    catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Server error while updating user." });
    }
}));
