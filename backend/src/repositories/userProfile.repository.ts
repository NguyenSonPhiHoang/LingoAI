import { getPool } from "../db";

export interface UserProfile {
  UserId: string;
  DisplayName?: string | null;
  PhotoUrl?: string | null;
  Bio?: string | null;
  Status?: string | null;
  CreatedAt?: Date | null;
  UpdatedAt?: Date | null;
}

export class UserProfileRepository {
  static async getByUserId(userId: string): Promise<UserProfile | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("UserId", userId)
      .execute("sp_UserProfiles_GetByUserId");
    return result.recordset && result.recordset.length
      ? (result.recordset[0] as UserProfile)
      : null;
  }

  static async upsert(profile: UserProfile): Promise<void> {
    const pool = await getPool();
    const now = new Date();
    await pool
      .request()
      .input("UserId", profile.UserId)
      .input("DisplayName", profile.DisplayName || null)
      .input("PhotoUrl", profile.PhotoUrl || null)
      .input("Bio", profile.Bio || null)
      .input("Status", profile.Status || null)
      .input("CreatedAt", profile.CreatedAt || now)
      .input("UpdatedAt", profile.UpdatedAt || now)
      .execute("sp_UserProfiles_Upsert");
  }
}

export default UserProfileRepository;
