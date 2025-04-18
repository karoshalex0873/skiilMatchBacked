import express from 'express'
import { applyJob, cancelInterview, createJob, createLearningPath, createQueryAI, deleteApplication, deleteLearningPath, getAllApplicationsForMyJobs, getApplicantsByJobId, getApplicationsController, getJobs, getLearningPath, getMyInterviewsController, getRecruiterJobs, getUpcomingInterviews, getUserApplications, scheduledInterview, updateApplicationStatus, updateInterview } from '../controllers/jobsControllers'
import { protect } from '../midllewares/auth/protect'
import { Employer, jobSeeker } from '../midllewares/auth/roleGuard'

const router = express.Router()


router.get('/getAll', protect,jobSeeker, getJobs)
router.post('/create', protect,Employer, createJob)
router.get('/JobPost', protect,Employer, getRecruiterJobs)
router.post("/apply/:job_id", protect,jobSeeker, applyJob);
router.get("/getApplications", protect,jobSeeker, getUserApplications)

router.get('/:job_id/applicant', protect, getApplicantsByJobId)
router.patch('/:application_id/status', protect,Employer, updateApplicationStatus)
router.get('/allApplications', protect,Employer, getAllApplicationsForMyJobs)
router.delete('/applications/:application_id', protect, Employer,deleteApplication)


router.post('/ask',protect,Employer,createQueryAI)


router.post('/createInterview',protect,scheduledInterview)
router.get('/upcomingInterview',protect,getUpcomingInterviews)
router.patch('/updateInterview',protect,updateInterview)
router.delete('/cancel/:interviewId',protect,cancelInterview)
router.get('/interview/allApplications', protect, getApplicationsController)
router.get('/interview/myInterviews',protect,getMyInterviewsController)


router.post("/path", protect,jobSeeker, createLearningPath)
router.get('/path', protect,jobSeeker, getLearningPath)
router.delete('/path', protect,jobSeeker, deleteLearningPath)
export default router
