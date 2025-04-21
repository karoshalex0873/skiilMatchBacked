import { LessThan, MoreThan } from "typeorm";
import { Otp } from "../../Entities/Otp";
import { User } from "../../Entities/User";

export class OtpService {

  // 1 generate OTP and save to db
  static async createOtp(user: User, otpCode: string): Promise<string> {
    await Otp.delete({ user: { user_id: user.user_id } });
  
    const otp = new Otp();
    otp.code = otpCode; // use the one passed in
    otp.expiresAt = new Date(Date.now() + 100 * 1000);
    otp.user = user;
  
    await otp.save();
    return otp.code;
  }
  
  // 2 verify OTP
  static async  verifyOtp(userId:number,code:string): Promise<boolean> {
    // find the OTP for the user
    const otp = await Otp.findOne({
      where:{
        user:{user_id:userId},
        code:code,
        expiresAt:MoreThan(new Date)
      }
    })

    if(!otp){
      return false; // OTP not found or expired
    }
    // delete the OTP after verification
    await Otp.delete(otp.otp_id)
    return true; // OTP verified successfully
  }

  // 3 cleanup Expired OTPs (run this periodically)
  static async cleanupOtps(): Promise<void> {
    await Otp.delete({ expiresAt: LessThan(new Date()) });
  }
}