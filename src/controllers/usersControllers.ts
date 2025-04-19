import { Between, getRepository, In, SelectQueryBuilder } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { User } from "../Entities/User";
import asyncHandler from "../midllewares/asyncHandler";
import { UserRequest } from "../utils/types/Usertype";
import { NextFunction, Response, response } from "express";
import { Application } from "../Entities/Application";
import { Interview } from "../Entities/Interview";
import { Jobs } from "../Entities/Jobs";
import { Role } from "../Entities/Role";
import { paginate } from 'nestjs-typeorm-paginate';



// User respository
const userDef = AppDataSource.getRepository(User)
const applyDef = AppDataSource.getRepository(Application)
const InterDef = AppDataSource.getRepository(Interview)
const jobDef = AppDataSource.getRepository(Jobs)
const roleDef = AppDataSource.getRepository(Role)


export const userInfo = asyncHandler(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    // try catch block
    try {
      const USER = req.user

      // not loggedin
      if (!USER) {
        res.status(400).json({ message: "not authenticated" })
        return
      }
      // Fetch the user  based on email
      const userId = USER.user_id;

      const userInformation = await userDef.findOne({
        where: { user_id: userId },  // search by "user_id"
        relations: ['role', 'jobs']
      })

      // if no user found
      if (!userInformation) {
        res.status(404).json({ message: 'User not found' })
        return
      }

      const profileCompletion = calculateProfileCompletion(userInformation);

      // return user infomation 
      res.status(200).json({
        success: true,
        data: userInformation,
        completed: profileCompletion


      })
    } catch (error) {
      console.error("Error fetching user information:", error);
      res.status(500).json({ message: "Server error while fetching user information." });
    }
  }
)



// Profile Completion Utility
const calculateProfileCompletion = (user: Partial<User>): number => {
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
    const value = user[field as keyof User];
    if (field === 'skills') {
      if (value && (value as string[]).length > 0) filled++;
    } else {
      if (value) filled++;
    }
  });

  return Math.round((filled / fields.length) * 100);
};


export const updateUser = asyncHandler(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      const USER = req.user;

      // Check authentication
      if (!USER) {
        return res.status(400).json({ message: "Not authenticated" });
      }

      const userId = USER.user_id;

      // Find the user
      const existingUser = await userDef.findOne({
        where: { user_id: userId },
        relations: ['role', 'jobs']
      });

      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Destructure request body
      const {
        name,
        avatar,
        phone,
        bio,
        location,
        skills,
        dob,
        gender,
        summary,
        experience
      } = req.body;

      // Update fields if provided
      if (name) existingUser.name = name;
      if (avatar) existingUser.avatar = avatar;
      if (phone) existingUser.phone = phone;
      if (bio) existingUser.bio = bio;
      if (location) existingUser.location = location;
      if (skills) existingUser.skills = skills;
      if (dob) existingUser.dob = dob;
      if (summary) existingUser.summary = summary
      if (gender) existingUser.gender = gender;
      if (experience) existingUser.experience = experience


      // Save updated user
      const updatedUser = await userDef.save(existingUser);

      // Calculate profile completion
      const profileCompletion = calculateProfileCompletion(updatedUser);

      // Response
      res.status(200).json({
        success: true,
        message: "User updated successfully",
        profileCompletion,
        data: updatedUser
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Server error while updating user." });
    }
  }
);


export const recruiterAnalytics = asyncHandler(
  async (req: UserRequest, res: Response, next: NextFunction) => {

    if (!req.user) {
      return res.status(400).json({ message: "Not authenticated" });
    }
    const recruiterId = req.user.user_id;

    // 1. Get basic metrics
    const totalHires = await applyDef.count({
      where: {
        job: { user: { user_id: recruiterId } },
        status: "accepted"
      }
    });

    const openPositions = await jobDef.count({
      where: {
        user: { user_id: recruiterId },
        applications: { status: In(["pending", "reviewed"]) }
      }
    });

    const totalApplications = await applyDef.count({
      where: { job: { user: { user_id: recruiterId } } }
    });

    // 2. Calculate average time to hire (in days)
    const acceptedApplications = await applyDef.find({
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

    const hiringTrends = await applyDef.createQueryBuilder("application")
      .leftJoin("application.job", "job")
      .select("DATE_TRUNC('month', application.appliedAt)", "month")
      .addSelect("COUNT(*)", "count")
      .where("job.user.user_id = :recruiterId", { recruiterId })
      .andWhere("application.appliedAt >= :sixMonthsAgo", { sixMonthsAgo })
      .groupBy("month")
      .orderBy("month", "ASC")
      .getRawMany();


    // 4. Recent applications (last 5)
    const recentApplications = await applyDef.find({
      where: { job: { user: { user_id: recruiterId } } },
      relations: ["user", "job"],
      order: { appliedAt: "DESC" },
      take: 5
    });

    // 5. Upcoming interviews (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingInterviews = await InterDef.createQueryBuilder("interview")
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
  }
);


export const getUserManagementData = asyncHandler(
  async (req: UserRequest, res: Response) => {

    const [totalUsers, activeUsers, newSignups, adminUsers] = await Promise.all([
      userDef.count(),
      userDef.count({ where: { isActive: true } }),
      userDef.count({
        where: {
          createdAt: Between(
            new Date(new Date().setDate(new Date().getDate() - 30)),
            new Date()
          )
        }
      }),
      userDef.count({ where: { role: { role_name: 'Admin' } } })
    ]);

    // 2. User Growth Chart Data (Last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const userGrowth = await userDef.createQueryBuilder('user')
      .select("DATE_TRUNC('month', user.createdAt)", "month")
      .addSelect("COUNT(*)", "count")
      .where("user.createdAt >= :sixMonthsAgo", { sixMonthsAgo })
      .groupBy("month")
      .orderBy("month", "ASC")
      .getRawMany();

    // 3. Role Distribution
    const rolesDistribution = await roleDef.createQueryBuilder('role')
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

    const { items: users, meta } = await paginate(query, {
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
  }
);
