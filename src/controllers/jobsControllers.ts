import { Response, NextFunction } from "express";
import asyncHandler from "../midllewares/asyncHandler";
import { UserRequest } from "../utils/types/Usertype";
import { AppDataSource } from "../config/data-source";
import { Jobs } from "../Entities/Jobs";
import { User } from "../Entities/User";
import { GoogleGenerativeAI, } from '@google/generative-ai'
import { JobRequest } from "../utils/types/JobsTypes";
import { Application } from "../Entities/Application";
import { Between, Equal, ILike, In, MoreThan, MoreThanOrEqual } from "typeorm";
import { Interview } from "../Entities/Interview";
import { fetchCVTextFromDrive } from "../utils/filesytem/cvtxt";

// job repository defincation
const jobDef = AppDataSource.getRepository(Jobs)
// User repositoty
const userDef = AppDataSource.getRepository(User)
// apllication repository
const applyDef = AppDataSource.getRepository(Application)
const InterDef = AppDataSource.getRepository(Interview)
// AI
if (!process.env.GOOGLE_GEMINI_API_KEY) {
  throw new Error("GOOGLE_GEMINI_API_KEY is not defined in the environment variables.");
}
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// JOBSEEKER

// function to get jobs 
export const getJobs = asyncHandler(
  async (req: UserRequest, res: Response, next: NextFunction) => {

    // 1. Get user profile
    const user = await userDef.findOne({ where: { user_id: req.user?.user_id } })


    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' })
      return
    }

    if (!user.cv) {
      res.status(400).json({ success: false, message: 'User CV is not available' });
      return;
    }

    const cvText = await fetchCVTextFromDrive(user.cv);

    const userProfile = {
      name: user.name,
      bio: user.bio,
      skills: user.skills,
      experience: user.experience,
      cvText
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
      postedDate: job.postedDate,
    }));

    const prompt = `
    Act as an expert job matching AI. Analyze these jobs against the user profile and provide clean JSON output without markdown formatting.
    
    User Profile Analysis Factors:
    1. Skills match
    2. Experience level alignment
    3. Job summary/content matching
    4. Cv relevance to job requirements

    
    Job Analysis Factors:
    - Required skills vs user skills
    - Experience requirements vs user experience
    - Job summary/content relevance to user bio
    - Role-specific keywords
    - Cv relevance to job requirements
    
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

    // prevent the user to apply for a job if the use doesn't have a cv
    if (!user.cv) {
      res.status(400).json({ message: "Please upload your CV before applying" })
      return
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


// fuction to get apllication have apllied for
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
        - Prefer videos from freeCodeCamp,JS Mastery strictly
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

// display leaning path
export const getLearningPath = asyncHandler(async (req: UserRequest, res: Response) => {
  const user = await userDef.findOneBy({ user_id: req.user?.user_id });
  if (!user?.path) return res.status(404).json({ error: 'No learning path found' });
  res.json(user.path);
});
// delelte leaning path
export const deleteLearningPath = asyncHandler(async (req: UserRequest, res: Response) => {
  const user = await userDef.findOneBy({ user_id: req.user?.user_id });
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.path = null;
  await user.save();
  res.json({ message: 'Learning path deleted' });
});


// RECRUITER || EMPLOYER
// function to post JOB
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
        user: { user_id: user.user_id }
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

//  function to display jobs for the recruiter
export const getRecruiterJobs = asyncHandler(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      const jobs = await jobDef.find({
        where: { user: { user_id: req.user?.user_id } }, // Assuming 'user' is a relation in the Jobs entity
        order: { job_id: 'DESC' }
      });

      res.status(200).json({
        success: true,
        count: jobs.length,
        data: jobs
      });
    } catch (error) {
      next(error);
    }
  }
);

// fuction to get job apllication sent
export const getAllApplicationsForMyJobs = asyncHandler(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.user_id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Find all jobs posted by the current user
    const jobs = await jobDef.find({
      where: { user: { user_id: userId } },
    });

    if (jobs.length === 0) {
      res.status(404).json({ message: "You have not posted any jobs" });
      return;
    }

    // Get job_ids
    const jobIds = jobs.map((job) => job.job_id);

    // Find all applications for those jobs
    const applications = await applyDef.find({
      where: {
        job: { job_id: In(jobIds) },
      },
      relations: ["user", "job"],
      order: { appliedAt: "DESC" },
    });

    const result = applications.map((app) => ({
      applicationId: app.id,
      status: app.status,
      appliedAt: app.appliedAt,
      job: {
        id: app.job.job_id,
        title: app.job.title,
      },
      user: {
        id: app.user.user_id,
        name: app.user.name,
        email: app.user.email,
        cv: app.user.cv,
        skills: app.user.skills,
      },
    }));

    res.status(200).json({
      total: result.length,
      message: "Applications retrieved successfully",
      applications: result,
    });
  }
);

// delete apllicatiosn
export const deleteApplication = asyncHandler(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const applicationId = parseInt(req.params.application_id);

    if (isNaN(applicationId)) {
      res.status(400).json({ message: "Invalid application ID" });
      return;
    }

    const application = await applyDef.findOne({
      where: { id: applicationId },
      relations: ["user", "job", "job.user"],
    });


    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    const currentUserId = req.user?.user_id;

    // ✅ Allow deletion if user is either:
    const isApplicant = application.user.user_id === currentUserId;
    const isJobOwner = application.job.user.user_id === currentUserId;

    if (!isApplicant && !isJobOwner) {
      res.status(403).json({ message: "You are not authorized to delete this application" });
      return;
    }

    await applyDef.remove(application);

    res.status(200).json({ message: "Application deleted successfully" });
  }
);

// get apllication by Id
export const getApplicantsByJobId = asyncHandler(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const jobId = parseInt(req.params.job_id);

    if (isNaN(jobId)) {
      res.status(400).json({ message: "Invalid job ID" })
      return
    }

    // ✅ Get the job and ensure it belongs to the user
    const job = await jobDef.findOne({
      where: {
        job_id: jobId,
        user: { user_id: req.user?.user_id },
      },
      relations: ["user"],
    });

    if (!job) {
      res.status(403).json({ message: "Job not found" })
      return
    }

    const applications = await applyDef.find({
      where: { job: { job_id: jobId } },
      relations: ["user", "job"],
    });

    if (applications.length === 0) {
      res.status(404).json({ message: "No applications found for this job" })
      return
    }

    const result = applications.map((app) => ({
      applicationId: app.id,
      status: app.status,
      appliedAt: app.appliedAt,
      user: {
        id: app.user.user_id,
        name: app.user.name,
        email: app.user.email,
        cv: app.user.cv,
        skills: app.user.skills,
      },
    }));

    res.status(200).json({
      message: "Applicants retrieved successfully",
      applicants: result,
    });
  }
);

// update status
export const updateApplicationStatus = asyncHandler(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const applicationId = parseInt(req.params.application_id);
    const { status } = req.body;
    const validStatuses = ["reviewed", "accepted", "rejected"];

    if (isNaN(applicationId)) {
      res.status(400).json({ message: "Invalid application ID" });
      return;
    }

    if (!validStatuses.includes(status)) {
      res.status(400).json({ message: "Invalid status value" });
      return;
    }

    const application = await applyDef.findOne({
      where: { id: applicationId },
      relations: ["job", "job.user", "user"], // <- Notice "job.user"
    });


    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    // ✅ Ensure the job belongs to the currently logged-in user

    if (application.job.user.user_id !== req.user?.user_id) {
      res.status(403).json({ message: "You are not authorized to update this application" });
      return;
    }

    application.status = status;
    await application.save();

    res.status(200).json({
      message: "Application status updated successfully",
      application: {
        id: application.id,
        status: application.status,
        user: {
          id: application.user.user_id,
          name: application.user.name,
          email: application.user.email,
        },
        job: {
          id: application.job.job_id,
          title: application.job.title, // if you have it
        },
      },
    });
  }
);




export const createQueryAI = asyncHandler(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.user_id;
    const { question } = req.body;

    if (!userId || !question?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a question"
      });
    }

    try {
      // Updated prompt with stricter formatting requirements
      const prompt = `
      You are an AI recruitment assistant. Your responses must be in valid JSON format.
      
      USER QUESTION: "${question}"
      
      RESPONSE RULES:
      1. Always return valid JSON
      2. Never include natural language outside the JSON
      3. No markdown formatting or code blocks
      4. Use the exact format shown below
      
      REQUIRED FORMAT:
      {
        "type": "chat" | "jobs" | "applications" | "interviews",
        "message": "Your response message here",
        "filters": {
          "status": "pending" | "accepted" | "rejected",
          "dateRange": "today" | "this_week" | "this_month",
          "searchTerm": ""
        }
      }

      For general greetings like "hi" or "hello", use this format:
      {
        "type": "chat",
        "message": "Hello! I'm your recruitment assistant. How can I help you today?",
        "filters": null
      }

      For data queries like "show applications" use:
      {
        "type": "applications",
        "message": "Here are your recent applications",
        "filters": {
          "status": "pending",
          "dateRange": "this_week",
          "searchTerm": ""
        }
      }
      
      for data that are empty the show a response exmaple you have no data curently how can i help  you
      
      RESPOND WITH JSON ONLY:`;

      const result = await model.generateContent(prompt);
      const rawText = await result.response.text();

      // Clean the response
      const cleanText = rawText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .replace(/^[\r\n]+|[\r\n]+$/g, '')
        .trim();

      // Validate JSON structure before parsing
      if (!cleanText.startsWith('{') || !cleanText.endsWith('}')) {
        throw new Error('Invalid JSON structure received from AI');
      }

      const aiResponse = JSON.parse(cleanText);

      // Validate response structure
      if (!aiResponse.type || !aiResponse.message) {
        throw new Error('Invalid response structure from AI');
      }

      // Handle general chat
      if (aiResponse.type === 'chat') {
        return res.json({
          success: true,
          message: aiResponse.message,
          type: 'chat'
        });
      }

      // Handle data queries
      let data = null;
      switch (aiResponse.type) {
        case 'jobs':
          data = await handleJobPostsQuery({
            user: userId,
            filters: aiResponse.filters || {}
          });
          break;

        case 'applications':
          data = await handleApplicationsQuery({
            user: userId,
            filters: aiResponse.filters || {}
          });
          break;

        case 'interviews':
          data = await handleInterviewsQuery({
            user: userId,
            filters: aiResponse.filters || {}
          });
          break;
      }

      const responseMessage = data && data.length > 0 ? aiResponse.message : "";

      return res.json({
        success: true,
        message: aiResponse.message || responseMessage,
        type: aiResponse.type,
        data
      });

    } catch (error) {
      console.error('AI Assistant Error:', error);
      return res.status(500).json({
        success: false,
        message: "Unable to process your request. Please try again.",
      });
    }
  }
);

interface QueryFilters {
  status?: string;
  dateRange?: string;
  searchTerm?: string;
}

interface QueryOptions {
  user: number;
  filters: QueryFilters;
}
// Enhanced Helper Functions

async function handleApplicationsQuery(query: QueryOptions) {
  try {
    const where: any = {
      job: {
        user: { user_id: query.user }
      }
    };

    // Add filters
    if (query.filters.status) {
      where.status = query.filters.status;
    }

    if (query.filters.searchTerm) {
      where.job = {
        ...where.job,
        title: ILike(`%${query.filters.searchTerm}%`)
      };
    }

    if (query.filters.dateRange) {
      where.appliedAt = createDateFilter(query.filters.dateRange);
    }

    const applications = await applyDef.find({
      where,
      relations: ['job', 'user'],
      order: { appliedAt: 'DESC' },
      take: 20
    });

    return applications.map(app => ({
      id: app.id,
      status: app.status,
      appliedAt: app.appliedAt,
      job: {
        title: app.job?.title || 'N/A',
        company: app.job?.company || 'N/A'
      },
      candidate: {
        name: app.user?.name || 'Anonymous',
        email: maskEmail(app.user?.email || 'no-email')
      }
    }));
  } catch (error) {
    console.error('Applications Query Error:', error);
    return [];
  }
}

// Helper function to protect PII
function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  return `${name[0]}${'*'.repeat(name.length - 2)}${name.slice(-1)}@${domain}`;
}

async function handleJobPostsQuery(options: QueryOptions) {
  try {
    const where = {
      user: { user_id: options.user },
      ...(options.filters.searchTerm && {
        title: ILike(`%${options.filters.searchTerm}%`)
      })
    };

    const jobs = await jobDef.find({
      where,
      relations: ['applications'],
      order: { postedDate: 'DESC' },
      take: 10
    });

    return jobs.map(job => ({
      id: job.job_id,
      title: job.title,
      company: job.company,
      applicationsCount: job.applications?.length || 0,
      postedDate: job.postedDate
    }));
  } catch (error) {
    console.error('Job Query Error:', error);
    return [];
  }
}

async function handleInterviewsQuery(query: QueryOptions) {
  try {
    const where: any = {
      job: {
        user: { user_id: query.user }
      }
    };

    if (query.filters.status) {
      where.status = query.filters.status;
    }

    if (query.filters.dateRange) {
      where.scheduledAt = createDateFilter(query.filters.dateRange);
    }

    const interviews = await InterDef.find({
      where,
      relations: ['application', 'application.user', 'job'],
      order: { scheduledAt: 'ASC' },
      take: 20
    });

    return interviews.map(interview => ({
      id: interview.interview_id,
      scheduledAt: interview.scheduledAt,
      mode: interview.mode,
      status: interview.status,
      job: {
        title: interview.job?.title || 'N/A'
      },
      candidate: {
        name: interview.application?.user?.name || 'Anonymous',
        email: maskEmail(interview.application?.user?.email || 'no-email')
      }
    }));
  } catch (error) {
    console.error('Interviews Query Error:', error);
    return [];
  }
}

// Reusable date filter creator
function createDateFilter(range: string) {
  const now = new Date();
  switch (range) {
    case 'last_7_days':
      return Between(
        new Date(now.setDate(now.getDate() - 7)),
        new Date()
      );
    case 'this_month':
      return Between(
        new Date(now.getFullYear(), now.getMonth(), 1),
        new Date(now.getFullYear(), now.getMonth() + 1, 0)
      );
    default:
      return undefined;
  }
}


// controller to to sheduel interviews
export const scheduledInterview = asyncHandler(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const { applicationId, mode, scheduledAt, notes } = req.body;
    const user = req.user;

    if (!applicationId || !mode || !scheduledAt) {
      return res.status(400).json({ message: "Missing information" });
    }

    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const application = await applyDef.findOne({
      where: { id: applicationId },
      relations: ['job'],
    });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const interview = InterDef.create({
      application: { id: application.id },
      user: { user_id: user.user_id },
      job: { job_id: application.job.job_id },
      mode,
      scheduledAt: scheduledDate,
      notes,
      status: 'scheduled',
    });

    await interview.save();

    return res.status(201).json({
      message: "Interview scheduled successfully",
      interview,
    });
  }
);

// upcomimg interview
export const getUpcomingInterviews = asyncHandler(
  async (req: UserRequest, res: Response) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const interviews = await InterDef.find({
      where: {
        user: { user_id: user.user_id },
        scheduledAt: MoreThan(new Date()),
        status: 'scheduled'
      },
      relations: [
        'application',
        'application.user',
        'job'
      ],
      order: { scheduledAt: 'ASC' }
    });

    return res.status(200).json({ interviews });
  }
);

// update interview
export const updateInterview = asyncHandler(
  async (req: UserRequest, res: Response) => {
    const { interviewId, scheduledAt, mode, notes } = req.body;

    const interview = await InterDef.findOne({ where: { interview_id: interviewId } });

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    if (scheduledAt) {
      const date = new Date(scheduledAt);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      interview.scheduledAt = date;
    }

    if (mode) interview.mode = mode;
    if (notes) interview.notes = notes;

    await interview.save();

    return res.status(200).json({ message: "Interview updated", interview });
  }
);

//  cancel interview
export const cancelInterview = asyncHandler(
  async (req: UserRequest, res: Response) => {
    const { interviewId } = req.params;

    const interview = await InterDef.findOne({ where: { interview_id: Number(interviewId) } });

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    interview.status = 'cancelled';
    await interview.save();

    return res.status(200).json({ message: "Interview cancelled successfully" });
  }
);

// Add this controller for applications
export const getApplicationsController = asyncHandler(
  async (req: UserRequest, res: Response) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const applications = await applyDef.find({
      where: {
        job: {
          user: {
            user_id: user.user_id  // <- only show applications for jobs the user posted
          }
        }
      },
      relations: ['job', 'job.user', 'user'], // include job.user so we can filter
      order: { appliedAt: 'DESC' }
    });

    const formattedApplications = applications.map((application) => ({
      id: application.id,
      job: {
        title: application.job.title
      },
      user: {
        name: application.user.name,
        email: application.user.email
      },
      status: application.status,
      appliedAt: application.appliedAt
    }));

    return res.status(200).json({ applications: formattedApplications });
  }
);


// inetrview for users who have apllied that job
export const getMyInterviewsController = asyncHandler(
  async (req: UserRequest, res: Response) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const interviews = await InterDef.find({
      where: {
        application: {
          user: {
            user_id: user.user_id
          }
        }
      },
      relations: ['application', 'application.user', 'job'],
      order: { scheduledAt: 'ASC' }
    });

    const formattedInterviews = interviews.map((interview) => ({
      interview_id: interview.interview_id,
      application: {
        id: interview.application.id,
        user: {
          name: interview.application.user.name
        }
      },
      job: {
        title: interview.job?.title ?? 'Unknown Title'
      },
      mode: interview.mode,
      scheduledAt: interview.scheduledAt,
      notes: interview.notes,
      status: interview.status
    }));

    return res.status(200).json({ interviews: formattedInterviews });
  }
);
