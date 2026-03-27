import dotenv from "dotenv";
dotenv.config();

export const config = {
  host: process.env.HOST || "0.0.0.0",
  port: process.env.PORT ? Number(process.env.PORT) : 4000,
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel:
    process.env.GEMINI_MODEL_NAME ||
    process.env.GEMINI_MODEL ||
    "gemini-1.5-flash",
  geminiTtsModel: process.env.GEMINI_TTS_MODEL || "",
  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@lingoai.com",
  },
  db: {
    user: process.env.DB_USER || "sa",
    password: process.env.DB_PASSWORD || "",
    // Accept either DB_HOST or DB_SERVER (some envs use DB_SERVER)
    server: process.env.DB_HOST || process.env.DB_SERVER || "localhost",
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 1433,
    database: process.env.DB_DATABASE || "lingoai",
    encrypt: process.env.DB_ENCRYPT === "true" || false,
    trustServerCertificate:
      process.env.DB_TRUST_SERVER_CERTIFICATE === "true" || false,
    // Optional TLS server name (SNI) to use instead of raw IP. Set to the hostname
    // that matches the SQL Server certificate to avoid TLS warning about IP SNI.
    serverName: process.env.DB_SERVERNAME || process.env.DB_HOST || undefined,
  },
  firebaseServiceAccount: process.env.FIREBASE_SERVICE_ACCOUNT || "",
  jwtSecret: process.env.JWT_SECRET || "change_me_in_production",
  corsOrigin: process.env.CORS_ORIGIN || "*",
};
