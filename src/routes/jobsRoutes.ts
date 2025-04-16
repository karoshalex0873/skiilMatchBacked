import express from 'express'
import { applyJob, cancelInterview, createJob, createLearningPath, createQueryAI, deleteApplication, deleteLearningPath, getAllApplicationsForMyJobs, getApplicantsByJobId, getApplicationsController, getJobs, getLearningPath, getMyInterviewsController, getRecruiterJobs, getUpcomingInterviews, getUserApplications, scheduledInterview, updateApplicationStatus, updateInterview } from '../controllers/jobsControllers'
import { protect } from '../midllewares/auth/protect'

const router = express.Router()


router.get('/getAll', protect, getJobs)
router.post('/create', protect, createJob)
router.get('/JobPost', protect, getRecruiterJobs)
router.post("/apply/:job_id", protect, applyJob);
router.get("/getApplications", protect, getUserApplications)

router.get('/:job_id/applicant', protect, getApplicantsByJobId)
router.patch('/:application_id/status', protect, updateApplicationStatus)
router.get('/allApplications', protect, getAllApplicationsForMyJobs)
router.delete('/applications/:application_id', protect, deleteApplication)


router.post('/ask',protect,createQueryAI)


router.post('/createInterview',protect,scheduledInterview)
router.get('/upcomingInterview',protect,getUpcomingInterviews)
router.patch('/updateInterview',protect,updateInterview)
router.delete('/cancel/:interviewId',protect,cancelInterview)
router.get('/interview/allApplications', protect, getApplicationsController)
router.get('/interview/myInterviews',protect,getMyInterviewsController)


router.post("/path", protect, createLearningPath)
router.get('/path', protect, getLearningPath)
router.delete('/path', protect, deleteLearningPath)
export default router
