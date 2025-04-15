"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jobsControllers_1 = require("../controllers/jobsControllers");
const protect_1 = require("../midllewares/auth/protect");
const roleGuard_1 = require("../midllewares/auth/roleGuard");
const router = express_1.default.Router();
router.get('/getAll', protect_1.protect, roleGuard_1.jobSeekerAndEmployer, jobsControllers_1.getJobs);
router.post('/create', protect_1.protect, roleGuard_1.Employer, jobsControllers_1.createJob);
router.post("/apply/:job_id", protect_1.protect, jobsControllers_1.applyJob);
router.get("/getApplications", protect_1.protect, jobsControllers_1.getUserApplications);
router.post("/path", protect_1.protect, jobsControllers_1.createLearningPath);
router.get('/path', protect_1.protect, jobsControllers_1.getLearningPath);
router.delete('/path', protect_1.protect, jobsControllers_1.deleteLearningPath);
exports.default = router;
