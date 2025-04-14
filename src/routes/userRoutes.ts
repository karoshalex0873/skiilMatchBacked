import express from 'express'
import { protect } from '../midllewares/auth/protect'
import { updateUser, userInfo } from '../controllers/usersControllers'
import { jobSeeker } from '../midllewares/auth/roleGuard'

const router = express.Router()

router.get('/info',protect,userInfo)
router.patch('/update',protect,jobSeeker,updateUser)


export default router