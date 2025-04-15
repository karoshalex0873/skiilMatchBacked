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
      res.status(400).json({ message: "You have applied for this job" })
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

// fuction to get apllications for specifi user
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



// fuction to generate the leaning path
export const createLearningPath = asyncHandler(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      const { skills, goal, studyHours } = req.body;
      const userId = req.user?.user_id;

      const prompt = `
        You are a JSON generator bot. Your ONLY job is to return valid JSON that can be parsed with JSON.parse().

        Create a detailed 2-Months learning path for someone aiming to become a ${goal}.
        Current skills: ${skills.join(', ')}.
        Weekly study time: ${studyHours} hours.

        Strict format:
        {
          "milestones": [
            {
              "week": number,
              "title": string,
              "description": string,
              "resources": {
                "articles": string[],
                "videos": string[],
                "projects": string[]
              }
            }
          ]
        }

        Guidelines:
        - DO NOT include \`\`\`json or \`\`\` in the output.
        - DO NOT include any explanation or introductory text.
        - Just output valid, parsable JSON.
        - All URLs must be real  and Valid (MDN, YouTube, freeCodeCamp, docs, etc.).
        - video URls must be latest from 2018-Present
        - All fields must be filled properly.
        - Do not use placeholders. Use real resources.
        - All links in the "videos" array must be direct links to **actual, publicly available video pages** that can be watched (not deleted or private).
        - Avoid videos that say “This video isn't available anymore.”
        - Prefer videos from reputable YouTube channels known for consistent availability (e.g., freeCodeCamp, Traversy Media, The Net Ninja, Fireship, JS Mastery etc.).
      `


      // 1. Call model
      const result = await model.generateContent([prompt]);
      const rawText = await result.response.text();

      // 2. Clean output
      const cleanedText = rawText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      // 3. Safe parse with fallback
      let data;
      try {
        data = JSON.parse(cleanedText);
      } catch (err) {
        console.error("Invalid JSON:", cleanedText);
        return res.status(400).json({ error: "Model returned invalid JSON format" });
      }

      // 4. Schema check (strict structure)
      interface LearningPathResource {
        articles: string[];
        videos: string[];
        projects: string[];
      }

      interface LearningPathMilestone {
        week: number;
        title: string;
        description: string;
        resources: LearningPathResource;
      }

      interface LearningPath {
        milestones: LearningPathMilestone[];
      }

      if (
        !data.milestones ||
        !Array.isArray(data.milestones) ||
        !data.milestones.every((m: LearningPathMilestone) =>
          typeof m.week === 'number' &&
          typeof m.title === 'string' &&
          typeof m.description === 'string' &&
          m.resources &&
          Array.isArray(m.resources.articles) &&
          Array.isArray(m.resources.videos) &&
          Array.isArray(m.resources.projects)
        )
      ) {
        return res.status(400).json({ error: 'Invalid data structure in response' });
      }

      // 5. Save to DB
      const user = await userDef.findOneBy({ user_id: userId });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      user.path = data;
      await user.save();

      res.json(data);

    } catch (error) {
      console.error('Error generating path:', error);
      res.status(500).json({ error: 'Failed to generate learning path' });
    }
  }
);


export const getLearningPath = asyncHandler(async (req: UserRequest, res: Response) => {
  const user = await userDef.findOneBy({ user_id: req.user?.user_id });
  if (!user?.path) return res.status(404).json({ error: 'No learning path found' });
  res.json(user.path);
});

export const deleteLearningPath = asyncHandler(async (req: UserRequest, res: Response) => {
  const user = await userDef.findOneBy({ user_id: req.user?.user_id });
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  user.path = null;
  await user.save();
  res.json({ message: 'Learning path deleted' });
});
