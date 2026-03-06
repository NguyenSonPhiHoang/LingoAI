import { Request, Response } from "express";
import { UserRepository } from "../repositories/user.repository";
import { RoleRepository } from "../repositories/role.repository";
import { OtpRepository } from "../repositories/otp.repository";
import UserProfileRepository from "../repositories/userProfile.repository";
import { sendOtpEmail } from "../services/email.service";
import jwt from "jsonwebtoken";
import { config } from "../config";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { id, email, displayName, password, roleId } = req.body;
      if (!id || !email || !password)
        return res.status(400).json({ error: "id, email, password required" });

      const existing = await UserRepository.findByEmail(email);
      if (existing)
        return res.status(409).json({ error: "email already exists" });

      // Generate OTP and store pending registration data
      const otp = generateOtp();
      await OtpRepository.deleteByEmail(email); // clear old OTPs
      await OtpRepository.create(email, otp, { id, email, displayName, password, roleId });

      // Send email
      await sendOtpEmail(email, otp);

      return res.json({ ok: true, message: "OTP sent to your email" });
    } catch (error: any) {
      console.error("Register error:", error);
      res.status(500).json({ error: error.message || "Registration failed" });
    }
  }

  static async verifyOtp(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;
      if (!email || !otp)
        return res.status(400).json({ error: "email and otp required" });

      const pendingData = await OtpRepository.verify(email, otp) as any;
      if (!pendingData)
        return res.status(400).json({ error: "Invalid or expired OTP" });

      // Create user with status=approved
      const user = await UserRepository.createUser(
        pendingData.id,
        pendingData.email,
        pendingData.displayName || null,
        pendingData.password,
        pendingData.roleId || "role_student",
        "approved"
      );

      return res.json({ ok: true, user });
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      res.status(500).json({ error: error.message || "OTP verification failed" });
    }
  }


  static async login(req: Request, res: Response) {
    try {
      const { emailOrId, password } = req.body;
      if (!emailOrId || !password)
        return res
          .status(400)
          .json({ error: "emailOrId and password required" });
      const ok = await UserRepository.verifyPassword(emailOrId, password);
      if (!ok) return res.status(401).json({ error: "invalid credentials" });
      const user =
        (await UserRepository.findByEmail(emailOrId)) ||
        (await UserRepository.findById(emailOrId));
      if (!user) return res.status(401).json({ error: "User not found" });

      const status = (user.Status || user.status || "").toLowerCase();
      if (status !== "approved")
        return res.status(403).json({ error: "account not approved" });

      const payload = {
        sub: user.Id,
        email: user.Email,
        roleId: user.RoleId,
        displayName: user.DisplayName,
      };
      const token = jwt.sign(payload, config.jwtSecret, { expiresIn: "7d" });
      res.json({ token });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: error.message || "Login failed" });
    }
  }

  // Get current user from JWT token
  static async me(req: Request, res: Response) {
    try {
      // req.user is set by auth middleware
      const tokenUser = (req as any).user;
      if (!tokenUser || !tokenUser.sub) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await UserRepository.findById(tokenUser.sub);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get role name
      let roleName = null;
      if (user.RoleId) {
        const role = await RoleRepository.findById(user.RoleId);
        roleName = role?.name || null;
      }

      const profile = await UserProfileRepository.getByUserId(tokenUser.sub);

      // Resolve photoUrl to full URL if it's a relative uploads path
      const stored = profile?.PhotoUrl;
      const host = req.get("host");
      const protocol = req.protocol || "http";
      const photoUrl = stored
        ? stored.startsWith("http")
          ? stored
          : `${protocol}://${host}${stored}`
        : null;

      res.json({
        id: user.Id,
        email: user.Email,
        displayName: profile?.DisplayName || user.DisplayName,
        roleId: user.RoleId,
        roleName,
        createdAt: user.CreatedAt,
        status: profile?.Status || null,
        photoUrl,
        bio: profile?.Bio || null,
        omniChatEnabled:
          typeof user.OmniChatEnabled === "boolean"
            ? user.OmniChatEnabled
            : user.OmniChatEnabled === 1,
      });
    } catch (error: any) {
      console.error("Me error:", error);
      res.status(500).json({ error: error.message || "Failed to get user" });
    }
  }

  static async assignRole(req: Request, res: Response) {
    try {
      const { userId, roleId } = req.body;
      if (!userId || !roleId)
        return res.status(400).json({ error: "userId and roleId required" });
      await UserRepository.assignRole(userId, roleId);
      res.json({ ok: true });
    } catch (error: any) {
      console.error("Assign role error:", error);
      res.status(500).json({ error: error.message || "Failed to assign role" });
    }
  }

  static async changePassword(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || !user.sub)
        return res.status(401).json({ error: "unauthorized" });

      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword)
        return res
          .status(400)
          .json({ error: "currentPassword and newPassword required" });

      const dbUser = await UserRepository.findById(user.sub);
      if (!dbUser) return res.status(404).json({ error: "user not found" });

      const ok = await UserRepository.verifyPassword(user.sub, currentPassword);
      if (!ok)
        return res.status(401).json({ error: "invalid current password" });

      // Update password (UserRepository.update will hash the password)
      await UserRepository.update(
        user.sub,
        dbUser.Email || null,
        dbUser.DisplayName || null,
        newPassword,
        dbUser.RoleId || null
      );

      res.json({ ok: true });
    } catch (err: any) {
      console.error("Change password error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to change password" });
    }
  }
}
