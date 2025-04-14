import { AppDataSource } from "../config/data-source";
import { User } from "../Entities/User";
import asyncHandler from "../midllewares/asyncHandler";
import { UserRequest } from "../utils/types/Usertype";
import { NextFunction, Response, response } from "express";


// User respository
const userDef = AppDataSource.getRepository(User)
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
      if (experience) existingUser.experience=experience


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
