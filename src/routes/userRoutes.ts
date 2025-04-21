import express from 'express'
import { protect } from '../midllewares/auth/protect'
import { getUserManagementData, recruiterAnalytics, updateUser, userInfo } from '../controllers/usersControllers'
import { jobSeeker } from '../midllewares/auth/roleGuard'
import { upload } from '../midllewares/fileUpload'

const router = express.Router()

router.get('/info',protect,userInfo)

router.patch(
  '/update',
  protect,
  upload.single('cv'), // Add multer middleware
  jobSeeker,
  updateUser
);
router.get('/analytics/recruiter',protect,recruiterAnalytics)
router.get('/manageUser',protect,getUserManagementData)


export default router