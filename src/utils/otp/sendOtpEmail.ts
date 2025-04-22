// utils/sendOtpEmail.ts
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, 
  },
});
  

// src/services/email.service.ts
export const sendOTPEmail = async (email: string, otpCode: string, otpId: string) => {
  const mailOptions = {
    from: `"SkillMatch AI" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your OTP Verification Code',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OTP Verification</title>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #0a0a14; border-radius:10px; display:flex; justify-content:start;>
        <center>
          <div style="max-width: 800px; margin: 20px auto; padding: 0 20px; text-align:start;">
          
            <div style="background: linear-gradient(135deg, rgba(103, 84, 226, 0.15), rgba(45, 198, 235, 0.15)); padding: 1px; border-radius: 20px; box-shadow: 0 0 20px rgba(103, 84, 226, 0.2);">
              <div style="background: #0f0d23; border-radius: 19px; overflow: hidden; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);">

                <div style="background: linear-gradient(135deg, #1a1738 0%, #0f0d23 100%); padding: 30px 0; text-align: center; border-bottom: 1px solid rgba(168, 181, 219, 0.1);">
                  <h1 style="color: #e0e4fc; font-size: 22px; font-weight: 600; margin: 0; letter-spacing: 0.5px;">
                    <span style="color: #6e8efb;">Skill</span>Match AI
                  </h1>
                  <div style="width: 60px; height: 3px; background: linear-gradient(90deg, #6e8efb, #a777e3); margin: 12px auto 0;"></div>
                </div>
                
                <!-- Content -->
                <div style="padding: 40px 30px;">
                  <h2 style="color: #e0e4fc; font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 20px; letter-spacing: 0.3px;">
                    VERIFICATION CODE
                  </h2>
                  
                  <p style="color: #a8b5db; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
                    Hello,<br><br>
                    Your secure one-time password for account verification:
                  </p>

                  <!-- OTP Box with neon glow -->
                  <div style="margin: 30px 0 40px; text-align: center;">
                    ${otpCode.split('').map(digit => `
                      <span style="
                        display: inline-block;
                        width: 50px;
                        height: 50px;
                        line-height: 50px;
                        text-align: center;
                        background: rgba(30, 28, 58, 0.8);
                        border: 1px solid rgba(110, 142, 251, 0.3);
                        border-radius: 12px;
                        color: #e0e4fc;
                        font-family: 'Courier New', monospace;
                        font-size: 24px;
                        font-weight: 600;
                        margin: 0 6px;
                        box-shadow: 0 4px 15px rgba(110, 142, 251, 0.15),
                                    inset 0 1px 0 rgba(255, 255, 255, 0.05);
                        backdrop-filter: blur(2px);
                      ">${digit}</span>
                    `).join('')}
                  </div>
                  
                  <!-- Warning badge -->
                  <div style="background: rgba(229, 62, 62, 0.1); border: 1px solid rgba(229, 62, 62, 0.2); border-radius: 10px; padding: 14px; text-align: center;">
                    <p style="color: #ff7a7a; font-size: 13px; margin: 0; font-weight: 500;">
                      <span style="font-weight: 600;">⚠ EXPIRES IN 5 MINUTES</span><br>
                      Do not share this code with anyone
                    </p>
                  </div>
                  
                  <p style="color: #7f8db0; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                    If this wasn't you, secure your account by ignoring this email or contacting
                    <a href="mailto:support@skillmatchai.com" style="color: #6e8efb; text-decoration: none; font-weight: 500;">support</a> immediately.
                  </p>
                </div>
                
                <!-- Footer -->
                <div style="background: rgba(15, 13, 35, 0.8); padding: 20px; text-align: center; border-top: 1px solid rgba(168, 181, 219, 0.1);">
                  <p style="color: #7f8db0; font-size: 12px; margin: 0;">
                    Ref: <span style="font-family: monospace; color: #a8b5db;">${otpId}</span><br>
                    © ${new Date().getFullYear()} SkillMatch AI
                  </p>
                </div>
              </div>
            </div>
          </div>
        </center>
      </body>
      </html>
    `
};
  

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(`Failed to send OTP email to ${email}:`, error);
    throw new Error('Email delivery failed');
  }
};