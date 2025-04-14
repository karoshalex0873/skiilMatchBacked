import { Response, NextFunction } from "express";
import asyncHandler from "../midllewares/asyncHandler";
import { UserRequest } from "../utils/types/Usertype";
import { AppDataSource } from "../config/data-source";
import { Jobs } from "../Entities/Jobs";
import { User } from "../Entities/User";
import { GoogleGenerativeAI, } from '@google/generative-ai'
import { JobRequest } from "../utils/types/JobsTypes";
import { Application } from "../Entities/Application ";
import { Between, Equal } from "typeorm";

// job repository defincation
const jobDef = AppDataSource.getRepository(Jobs)
// User repositoty
const userDef = AppDataSource.getRepository(User)
// apllication repository
const applyDef = AppDataSource.getRepository(Application)

// AI
if (!process.env.GOOGLE_GEMINI_API_KEY) {
  throw new Error("GOOGLE_GEMINI_API_KEY is not defined in the environment variables.");
}
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// function to get jobs
export const getJobs = asyncHandler(
  async (req: UserRequest, res: Response, next: NextFunction) => {

    // 1. Get user profile
    const user = await userDef.findOne({ where: { user_id: req.user?.user_id } })


    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' })
      return
    }

    const userProfile = {
      name: user.name,
      bio: user.bio,
      skills: user.skills,
      experience: user.experience,
      location: user.location
    }

    // 2. Get jobs from DB
    const allJobs = (await jobDef.find()).sort((a, b) => b.job_id - a.job_id)

    // 3. Format job sumuries for AI
    const jobSummaries = allJobs.map(job => ({
      job_id: job.job_id.toString(),
      title: job.title,
      company: job.company,
      location: job.location,
      skills: job.skills,
      experienceLevel: job.experienceLevel,
      salaryRange: job.salaryRange,
      type: job.type,
      postedDate: job.postedDate
    }));

    const prompt = `
    Act as an expert job matching AI. Analyze these jobs against the user profile and provide clean JSON output without markdown formatting.
    
    User Profile Analysis Factors:
    1. Skills match
    2. Experience level alignment
    3. Location compatibility
    4. Bio/keyword relevance
    5. Job summary/content matching
    
    Job Analysis Factors:
    - Required skills vs user skills
    - Experience requirements vs user experience
    - Location preferences
    - Job summary/content relevance to user bio
    - Role-specific keywords
    
    User Profile:
    ${JSON.stringify(userProfile, null, 2)}
    
    Jobs Data:
    ${JSON.stringify(jobSummaries.map(j => ({
      ...j,
    })), null, 2)}
    
    Response Requirements:
    - Strict JSON array format
    - No markdown or backticks
    - No escaped characters
    - Include job summary analysis
    
    Example Valid Response:
    [
      {
        "jobId": "abc123",
        "matchPercentage": 85,
        "reason": "Strong skills match (Python, React). 3+ years experience matches user's 4 years. Job summary emphasizes cloud experience which aligns with user's AWS projects.",
        "summaryAnalysis": "User's cloud experience matches 80% of job summary requirements"
      }
    ]
    
    Now analyze these jobs and respond with pure JSON:
    `;


    // 4 call gemni
    const results = await model.generateContent(prompt)
    const text = await results.response.text()

    let matches;
    try {
      matches = JSON.parse(text);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to parse Gemini response',
        raw: text
      });
    }

    // 5 build response
    const recommended = matches.map((match: any) => {
      const job = allJobs.find(j => j.job_id.toString() === match.jobId)

      if (!job) return null;

      return {
        job_id: job.job_id,
        title: job.title,
        company: job.company,
        location: job.location,
        matchPercentage: match.matchPercentage,
        skills: job.skills,
        experienceLevel: job.experienceLevel,
        salaryRange: job.salaryRange,
        type: job.type,
        postedDate: job.postedDate
      }
    }).filter(Boolean);


    // 6. Sort by best match
    const sortedRecommendations = recommended.sort(
      (a: any, b: any) => b.matchPercentage - a.matchPercentage
    );

    // 7. Return to client

    res.status(200).json({
      success: true,
      count: recommended.length,
      data: recommended
    });
  }
)


// function to post data
export const createJob = asyncHandler(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    // user info  
    const user = req.user;

    console.log(user?.role)

    // check if the user is a recruiter
    if (!user || user.role !== 2) {
      return res.status(403).json({
        message: "Access Denied"
      });
    }

    // destructure the body
    const { title, company, location, matchPercentage, skills, experienceLevel, salaryRange, type } = req.body;

    try {
      // create a new job instance
      const job = jobDef.create({
        title,
        company,
        location,
        matchPercentage,
        skills,
        experienceLevel,
        salaryRange,
        type,
        user: { user_id: user.role }
      });

      // saving the job
      await job.save();

      // response with job data
      res.status(201).json({
        success: true,
        message: "Job created successfully",
        data: job
      });
    } catch (error) {
      console.error('Error creating job:', error);
      next(error); // Pass the error to the error handling middleware
    }
  }
);


// function to Apply for a job
export const applyJob = asyncHandler(
  async (req: JobRequest, res: Response, next: NextFunction) => {
    const jobId = parseInt(req.params.job_id);
    const user = req.user;

    if (!jobId || isNaN(jobId) || !user) {
      res.status(400);
      throw new Error("Valid Job ID and user are required");
    }

    const job = await jobDef.findOne({ where: { job_id: jobId } });

    if (!job) {
      res.status(404);
      throw new Error("Job not found");
    }

    const existingApplication = await applyDef.findOne({
      where: {
        job: { job_id: jobId },
        user: { user_id: user.user_id },
      },
    });

    if (existingApplication) {
      res.status(400).json({message:"You have applied for this job"})
      return
    }

    const application = applyDef.create({
      user: { user_id: user.user_id },
      job,
      status: "pending",
    });

    await applyDef.save(application);

    res.status(201).json({
      message: "Application submitted successfully",
      application,
    });
  }
);

export const getUserApplications = asyncHandler(
  async (req: JobRequest, res: Response, next: NextFunction) => {
    const user = req.user

    // 1. Ensure that use is the one
    if (!user) {
      res.status(401);
      throw new Error("Not authorized");
    }
    const { status, fromDate, toDate } = req.query;

    let filters: any = {
      user: { user_id: user.user_id },
    };

    // Filter by status if provided
    if (status) {
      filters.status = Equal(status);
    }

        // Filter by date range if both are provided
        if (fromDate && toDate) {
          filters.appliedAt = Between(new Date(fromDate as string), new Date(toDate as string));
        }
    

    // 2. getting applications
    const applications = await applyDef.find({
      where: filters,
      relations: ["job"],
      order: {
        appliedAt: "DESC",
      },
    });

    // 3. The response 
    res.status(200).json({
      message: "User applications retrieved successfully",
      count: applications.length,
      applications,
    })
  }
)