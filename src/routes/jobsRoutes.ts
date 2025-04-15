import  express from 'express'
import { applyJob, createJob, createLearningPath, deleteLearningPath, getJobs, getLearningPath, getUserApplications } from '../controllers/jobsControllers'
import { protect } from '../midllewares/auth/protect'
import { Employer, jobSeeker, jobSeekerAndEmployer } from '../midllewares/auth/roleGuard'

const router = express.Router()


router.get('/getAll',protect,jobSeekerAndEmployer,getJobs)
router.post('/create',protect,Employer,createJob)
router.post("/apply/:job_id", protect, applyJob);
router.get("/getApplications",protect,getUserApplications)
router.post("/path",protect, createLearningPath)
router.get('/path',protect,getLearningPath)
router.delete('/path',protect,deleteLearningPath)
export default router
