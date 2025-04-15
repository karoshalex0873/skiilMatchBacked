import express from 'express'
import { protect } from '../midllewares/auth/protect'
import { updateUser, userInfo } from '../controllers/usersControllers'
import { jobSeeker } from '../midllewares/auth/roleGuard'

const router = express.Router()

router.get('/info',userInfo)
router.patch('/update',jobSeeker,updateUser)


export default router