import express from "express";
import { Response } from "express";
import { createUser, deleteUser, loginUser, logoutUser, registerUser, resendOtp, updateUser, verifyOtp } from "../controllers/AuthControllers";
import { protect } from "../midllewares/auth/protect";
import { UserRequest } from "../utils/types/Usertype";




const router = express.Router();

// Route definition
router.post("/register",registerUser)
router.post('/login',loginUser)
router.post('/logout',logoutUser)
router.post('/create', createUser);
router.delete('/delete/:userId', deleteUser);
router.patch('/update/:userId', updateUser )
router.post('/verifyOtp/:userId',verifyOtp)
router.post('/resendOtp/:userId', resendOtp);

// vrification of authentication
router.get('/verify', protect, (req: UserRequest, res: Response) => {
  res.status(200).json({ message: "Authenticated", user: req.user, });
});


export default router;
