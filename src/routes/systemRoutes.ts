import express from 'express'
import { systemAIAcurracy, systemController, systemSecurity } from '../controllers/systemController';
import { protect } from '../midllewares/auth/protect';
const router= express.Router()


router.get("/system-performance", systemController);
router.get("/systemAIAcurracy",protect,systemAIAcurracy )
router.get("/systemSecurity",protect,systemSecurity)
export default router
