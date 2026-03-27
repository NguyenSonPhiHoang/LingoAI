import app from "./app";
import { config } from "./config";
import { ensureEmailOtpsTable } from "./db";

const port = config.port;
const host = config.host;

app.listen(port, host, async () => {
  // eslint-disable-next-line no-console
  const displayHost = host === "0.0.0.0" ? "localhost (and LAN IP)" : host;
  console.log(`Backend listening on http://${displayHost}:${port}`);
  // Auto-create OTP table if not exists
  await ensureEmailOtpsTable();
});
