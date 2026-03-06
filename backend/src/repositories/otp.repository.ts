import { getPool } from "../db";

export class OtpRepository {
    /** Xóa tất cả OTP cũ (hết hạn hoặc chưa dùng) của email trước khi tạo mới */
    static async deleteByEmail(email: string): Promise<void> {
        const pool = await getPool();
        await pool
            .request()
            .input("Email", email)
            .query("DELETE FROM dbo.EmailOtps WHERE Email = @Email");
    }

    /**
     * Kiểm tra xem email này đã được gửi OTP trong vòng 60 giây chưa.
     * Dùng để rate-limit phía backend, tránh spam.
     */
    static async hasRecentOtp(email: string, cooldownSeconds = 60): Promise<boolean> {
        const pool = await getPool();
        const since = new Date(Date.now() - cooldownSeconds * 1000);
        const res = await pool
            .request()
            .input("Email", email)
            .input("Since", since)
            .query(`
        SELECT TOP 1 Id FROM dbo.EmailOtps
        WHERE Email = @Email AND CreatedAt > @Since
      `);
        return (res.recordset?.length ?? 0) > 0;
    }

    /** Lưu OTP mới vào DB, TTL = 5 phút */
    static async create(
        email: string,
        otp: string,
        pendingData: object,
        ttlMinutes = 5
    ): Promise<void> {
        const pool = await getPool();
        const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
        await pool
            .request()
            .input("Email", email)
            .input("Otp", otp)
            .input("PendingData", JSON.stringify(pendingData))
            .input("ExpiresAt", expiresAt)
            .query(`
        INSERT INTO dbo.EmailOtps (Email, Otp, PendingData, ExpiresAt)
        VALUES (@Email, @Otp, @PendingData, @ExpiresAt)
      `);
    }

    /**
     * Verify OTP: tìm bản ghi hợp lệ (chưa dùng, chưa hết hạn).
     * Nếu đúng → đánh dấu IsUsed=1 và trả về PendingData.
     */
    static async verify(
        email: string,
        otp: string
    ): Promise<object | null> {
        const pool = await getPool();

        // Tìm OTP hợp lệ
        const res = await pool
            .request()
            .input("Email", email)
            .input("Otp", otp)
            .query(`
        SELECT TOP 1 Id, PendingData
        FROM dbo.EmailOtps
        WHERE Email = @Email
          AND Otp = @Otp
          AND IsUsed = 0
          AND ExpiresAt > SYSUTCDATETIME()
        ORDER BY CreatedAt DESC
      `);

        const row = res.recordset?.[0];
        if (!row) return null;

        // Đánh dấu đã dùng
        await pool
            .request()
            .input("Id", row.Id)
            .query("UPDATE dbo.EmailOtps SET IsUsed = 1 WHERE Id = @Id");

        try {
            return JSON.parse(row.PendingData);
        } catch {
            return null;
        }
    }

    /** Xóa OTP hết hạn (cleanup, gọi định kỳ) */
    static async cleanupExpired(): Promise<void> {
        const pool = await getPool();
        await pool
            .request()
            .query(
                "DELETE FROM dbo.EmailOtps WHERE ExpiresAt < SYSUTCDATETIME() OR IsUsed = 1"
            );
    }
}
