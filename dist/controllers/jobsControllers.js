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
exports.deleteLearningPath = exports.getLearningPath = exports.createLearningPath = exports.getUserApplications = exports.applyJob = exports.createJob = exports.getJobs = void 0;
const asyncHandler_1 = __importDefault(require("../midllewares/asyncHandler"));
const data_source_1 = require("../config/data-source");
const Jobs_1 = require("../Entities/Jobs");
const User_1 = require("../Entities/User");
const generative_ai_1 = require("@google/generative-ai");
const Application_1 = require("../Entities/Application ");
const typeorm_1 = require("typeorm");
// job repository defincation
const jobDef = data_source_1.AppDataSource.getRepository(Jobs_1.Jobs);
// User repositoty
const userDef = data_source_1.AppDataSource.getRepository(User_1.User);
// apllication repository
const applyDef = data_source_1.AppDataSource.getRepository(Application_1.Application);
// AI
if (!process.env.GOOGLE_GEMINI_API_KEY) {
    throw new Error("GOOGLE_GEMINI_API_KEY is not defined in the environment variables.");
}
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
// function to get jobs
exports.getJobs = (0, asyncHandler_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // 1. Get user profile
    const user = yield userDef.findOne({ where: { user_id: (_a = req.user) === null || _a === void 0 ? void 0 : _a.user_id } });
    if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
    }
    const userProfile = {
        name: user.name,
        bio: user.bio,
        skills: user.skills,
        experience: user.experience,
        location: user.location
    };
    // 2. Get jobs from DB
    const allJobs = (yield jobDef.find()).sort((a, b) => b.job_id - a.job_id);
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
    ${JSON.stringify(jobSummaries.map(j => (Object.assign({}, j))), null, 2)}
    
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
    const results = yield model.generateContent(prompt);
    const text = yield results.response.text();
    let matches;
    try {
        matches = JSON.parse(text);
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to parse Gemini response',
            raw: text
        });
    }
    // 5 build response
    const recommended = matches.map((match) => {
        const job = allJobs.find(j => j.job_id.toString() === match.jobId);
        if (!job)
            return null;
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
        };
    }).filter(Boolean);
    // 6. Sort by best match
    const sortedRecommendations = recommended.sort((a, b) => b.matchPercentage - a.matchPercentage);
    // 7. Return to client
    res.status(200).json({
        success: true,
        count: recommended.length,
        data: recommended
    });
}));
// function to post data
exports.createJob = (0, asyncHandler_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // user info  
    const user = req.user;
    console.log(user === null || user === void 0 ? void 0 : user.role);
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
        yield job.save();
        // response with job data
        res.status(201).json({
            success: true,
            message: "Job created successfully",
            data: job
        });
    }
    catch (error) {
        console.error('Error creating job:', error);
        next(error); // Pass the error to the error handling middleware
    }
}));
// function to Apply for a job
exports.applyJob = (0, asyncHandler_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const jobId = parseInt(req.params.job_id);
    const user = req.user;
    if (!jobId || isNaN(jobId) || !user) {
        res.status(400);
        throw new Error("Valid Job ID and user are required");
    }
    const job = yield jobDef.findOne({ where: { job_id: jobId } });
    if (!job) {
        res.status(404);
        throw new Error("Job not found");
    }
    const existingApplication = yield applyDef.findOne({
        where: {
            job: { job_id: jobId },
            user: { user_id: user.user_id },
        },
    });
    if (existingApplication) {
        res.status(400).json({ message: "You have applied for this job" });
        return;
    }
    const application = applyDef.create({
        user: { user_id: user.user_id },
        job,
        status: "pending",
    });
    yield applyDef.save(application);
    res.status(201).json({
        message: "Application submitted successfully",
        application,
    });
}));
// fuction to get apllications for specifi user
exports.getUserApplications = (0, asyncHandler_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    // 1. Ensure that use is the one
    if (!user) {
        res.status(401);
        throw new Error("Not authorized");
    }
    const { status, fromDate, toDate } = req.query;
    let filters = {
        user: { user_id: user.user_id },
    };
    // Filter by status if provided
    if (status) {
        filters.status = (0, typeorm_1.Equal)(status);
    }
    // Filter by date range if both are provided
    if (fromDate && toDate) {
        filters.appliedAt = (0, typeorm_1.Between)(new Date(fromDate), new Date(toDate));
    }
    // 2. getting applications
    const applications = yield applyDef.find({
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
    });
}));
// fuction to generate the leaning path
exports.createLearningPath = (0, asyncHandler_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { skills, goal, studyHours } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.user_id;
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
      `;
        // 1. Call model
        const result = yield model.generateContent([prompt]);
        const rawText = yield result.response.text();
        // 2. Clean output
        const cleanedText = rawText
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
        // 3. Safe parse with fallback
        let data;
        try {
            data = JSON.parse(cleanedText);
        }
        catch (err) {
            console.error("Invalid JSON:", cleanedText);
            return res.status(400).json({ error: "Model returned invalid JSON format" });
        }
        if (!data.milestones ||
            !Array.isArray(data.milestones) ||
            !data.milestones.every((m) => typeof m.week === 'number' &&
                typeof m.title === 'string' &&
                typeof m.description === 'string' &&
                m.resources &&
                Array.isArray(m.resources.articles) &&
                Array.isArray(m.resources.videos) &&
                Array.isArray(m.resources.projects))) {
            return res.status(400).json({ error: 'Invalid data structure in response' });
        }
        // 5. Save to DB
        const user = yield userDef.findOneBy({ user_id: userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.path = data;
        yield user.save();
        res.json(data);
    }
    catch (error) {
        console.error('Error generating path:', error);
        res.status(500).json({ error: 'Failed to generate learning path' });
    }
}));
exports.getLearningPath = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const user = yield userDef.findOneBy({ user_id: (_a = req.user) === null || _a === void 0 ? void 0 : _a.user_id });
    if (!(user === null || user === void 0 ? void 0 : user.path))
        return res.status(404).json({ error: 'No learning path found' });
    res.json(user.path);
}));
exports.deleteLearningPath = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const user = yield userDef.findOneBy({ user_id: (_a = req.user) === null || _a === void 0 ? void 0 : _a.user_id });
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    user.path = null;
    yield user.save();
    res.json({ message: 'Learning path deleted' });
}));
