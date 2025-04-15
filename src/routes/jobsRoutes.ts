import  express from 'express'
import { applyJob, createJob, createLearningPath, deleteLearningPath, getJobs, getLearningPath, getRecruiterJobs, getUserApplications } from '../controllers/jobsControllers'
import { protect } from '../midllewares/auth/protect'
import { Employer, jobSeeker, jobSeekerAndEmployer } from '../midllewares/auth/roleGuard'

const router = express.Router()


router.get('/getAll',jobSeekerAndEmployer,getJobs)
router.post('/create',Employer,createJob)
router.get('/JobPost',Employer,getRecruiterJobs)
router.post("/apply/:job_id",jobSeeker, applyJob);
router.get("/getApplications",jobSeeker,getUserApplications)
router.post("/path", jobSeeker,createLearningPath)
router.get('/path',jobSeeker,getLearningPath)
router.delete('/path',jobSeeker,deleteLearningPath)
export default router
