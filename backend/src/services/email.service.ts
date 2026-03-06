import nodemailer from "nodemailer";
import { config } from "../config";

function createTransporter() {
    return nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: {
            user: config.smtp.user,
            pass: config.smtp.pass,
        },
    });
}

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
    if (!config.smtp.user || !config.smtp.pass) {
        throw new Error("SMTP not configured. Please set SMTP_USER and SMTP_PASS in .env");
    }

    const transporter = createTransporter();

    await transporter.sendMail({
        from: `"LingoAI" <${config.smtp.from}>`,
        to,
        subject: "Your LingoAI Verification Code",
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 8px;">
        <h2 style="color: #4f46e5; margin-bottom: 8px;">Verify your email</h2>
        <p style="color: #555; margin-bottom: 24px;">
          Use the code below to complete your LingoAI registration.<br/>
          This code expires in <strong>5 minutes</strong>.
        </p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 10px; text-align: center;
                    background: #fff; border: 2px dashed #4f46e5; border-radius: 8px; padding: 20px;
                    color: #4f46e5;">
          ${otp}
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 24px; text-align: center;">
          If you did not request this, please ignore this email.
        </p>
      </div>
    `,
    });
}
