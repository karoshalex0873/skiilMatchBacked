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
exports.getUserManagementData = exports.recruiterAnalytics = exports.updateUser = exports.userInfo = void 0;
const typeorm_1 = require("typeorm");
const data_source_1 = require("../config/data-source");
const User_1 = require("../Entities/User");
const asyncHandler_1 = __importDefault(require("../midllewares/asyncHandler"));
const Application_1 = require("../Entities/Application");
const Interview_1 = require("../Entities/Interview");
const Jobs_1 = require("../Entities/Jobs");
const Role_1 = require("../Entities/Role");
const nestjs_typeorm_paginate_1 = require("nestjs-typeorm-paginate");
// User respository
const userDef = data_source_1.AppDataSource.getRepository(User_1.User);
const applyDef = data_source_1.AppDataSource.getRepository(Application_1.Application);
const InterDef = data_source_1.AppDataSource.getRepository(Interview_1.Interview);
const jobDef = data_source_1.AppDataSource.getRepository(Jobs_1.Jobs);
const roleDef = data_source_1.AppDataSource.getRepository(Role_1.Role);
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
exports.recruiterAnalytics = (0, asyncHandler_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        return res.status(400).json({ message: "Not authenticated" });
    }
    const recruiterId = req.user.user_id;
    // 1. Get basic metrics
    const totalHires = yield applyDef.count({
        where: {
            job: { user: { user_id: recruiterId } },
            status: "accepted"
        }
    });
    const openPositions = yield jobDef.count({
        where: {
            user: { user_id: recruiterId },
            applications: { status: (0, typeorm_1.In)(["pending", "reviewed"]) }
        }
    });
    const totalApplications = yield applyDef.count({
        where: { job: { user: { user_id: recruiterId } } }
    });
    // 2. Calculate average time to hire (in days)
    const acceptedApplications = yield applyDef.find({
        where: {
            job: { user: { user_id: recruiterId } },
            status: "accepted"
        },
        select: ["appliedAt"]
    });
    const avgTimeToHire = acceptedApplications.length > 0
        ? acceptedApplications.reduce((acc, app) => {
            const diff = new Date().getTime() - app.appliedAt.getTime();
            return acc + (diff / (1000 * 3600 * 24));
        }, 0) / acceptedApplications.length
        : 0;
    // 3. Hiring trends data (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const hiringTrends = yield applyDef.createQueryBuilder("application")
        .leftJoin("application.job", "job")
        .select("DATE_TRUNC('month', application.appliedAt)", "month")
        .addSelect("COUNT(*)", "count")
        .where("job.user.user_id = :recruiterId", { recruiterId })
        .andWhere("application.appliedAt >= :sixMonthsAgo", { sixMonthsAgo })
        .groupBy("month")
        .orderBy("month", "ASC")
        .getRawMany();
    // 4. Recent applications (last 5)
    const recentApplications = yield applyDef.find({
        where: { job: { user: { user_id: recruiterId } } },
        relations: ["user", "job"],
        order: { appliedAt: "DESC" },
        take: 5
    });
    // 5. Upcoming interviews (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingInterviews = yield InterDef.createQueryBuilder("interview")
        .leftJoinAndSelect("interview.application", "application")
        .leftJoinAndSelect("application.job", "job")
        .leftJoinAndSelect("application.user", "user")
        .where("job.user.user_id = :recruiterId", { recruiterId })
        .andWhere("interview.status = 'scheduled'")
        .andWhere("interview.scheduledAt BETWEEN NOW() AND :nextWeek", { nextWeek })
        .orderBy("interview.scheduledAt", "ASC")
        .getMany();
    // Format response
    res.status(200).json({
        metrics: {
            totalHires,
            openPositions,
            avgTimeToHire: Math.round(avgTimeToHire),
            totalApplications
        },
        hiringTrends: hiringTrends.map(t => ({
            month: t.month.toISOString().slice(0, 7),
            count: parseInt(t.count)
        })),
        recentApplications: recentApplications.map(app => ({
            name: app.user.name,
            position: app.job.title,
            status: app.status.charAt(0).toUpperCase() + app.status.slice(1)
        })),
        upcomingInterviews: upcomingInterviews.map(int => ({
            candidate: int.application.user.name,
            position: int.application.job.title,
            date: int.scheduledAt.toISOString().split('T')[0],
            time: int.scheduledAt.toLocaleTimeString([], {
                hour: '2-digit', minute: '2-digit'
            })
        }))
    });
}));
exports.getUserManagementData = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const [totalUsers, activeUsers, newSignups, adminUsers] = yield Promise.all([
        userDef.count(),
        userDef.count({ where: { isActive: true } }),
        userDef.count({
            where: {
                createdAt: (0, typeorm_1.Between)(new Date(new Date().setDate(new Date().getDate() - 30)), new Date())
            }
        }),
        userDef.count({ where: { role: { role_name: 'Admin' } } })
    ]);
    // 2. User Growth Chart Data (Last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const userGrowth = yield userDef.createQueryBuilder('user')
        .select("DATE_TRUNC('month', user.createdAt)", "month")
        .addSelect("COUNT(*)", "count")
        .where("user.createdAt >= :sixMonthsAgo", { sixMonthsAgo })
        .groupBy("month")
        .orderBy("month", "ASC")
        .getRawMany();
    // 3. Role Distribution
    const rolesDistribution = yield roleDef.createQueryBuilder('role')
        .leftJoinAndSelect('role.users', 'users')
        .select(['role.role_name as role_name', 'COUNT(users.user_id) as count'])
        .groupBy('role.role_id')
        .getRawMany();
    // 4. User List Pagination
    const { page = 1, limit = 10, search = '', role = '' } = req.query;
    const query = userDef.createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role')
        .orderBy('user.createdAt', 'DESC');
    if (search) {
        query.where('(user.name ILIKE :search OR user.email ILIKE :search)', {
            search: `%${search}%`
        });
    }
    if (role) {
        query.andWhere('role.name = :role', { role });
    }
    const { items: users, meta } = yield (0, nestjs_typeorm_paginate_1.paginate)(query, {
        page: Number(page),
        limit: Number(limit),
        route: '/api/users/manage'
    });
    res.status(200).json({
        stats: {
            totalUsers,
            activeUsers,
            newSignups,
            adminUsers
        },
        charts: {
            userGrowth: userGrowth.map(g => ({
                month: g.month.toISOString().slice(0, 7),
                count: parseInt(g.count)
            })),
            rolesDistribution: rolesDistribution.map(r => ({
                role: r.role_name,
                count: parseInt(r.count)
            }))
        },
        users: users.map(u => ({
            id: u.user_id,
            name: u.name,
            email: u.email,
            role: u.role.role_name,
            active: u.isActive,
            createdAt: u.createdAt
        })),
        pagination: meta
    });
}));
