import express from 'express'
import { systemAIAcurracy, systemController } from '../controllers/systemController';
import { protect } from '../midllewares/auth/protect';
const router= express.Router()


router.get("/system-performance", systemController);
router.get("/systemAIAcurracy",protect,systemAIAcurracy )
export default router
