import express from "express";
import { Response } from "express";
import { loginUser, logoutUser, registerUser, resendOtp, verifyOtp } from "../controllers/AuthControllers";
import { protect } from "../midllewares/auth/protect";
import { UserRequest } from "../utils/types/Usertype";



const router = express.Router();

// Route definition
router.post("/register",registerUser)
router.post('/login',loginUser)
router.post('/logout',logoutUser)
router.post('/verifyOtp/:userId',verifyOtp)
router.post('/resendOtp/:userId', resendOtp);
// vrification of authentication
router.get('/verify', protect, (req: UserRequest, res: Response) => {
  res.status(200).json({ message: "Authenticated", user: req.user, });
});


export default router;
