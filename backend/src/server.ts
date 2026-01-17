import app from "./app";
import { config } from "./config";

const port = config.port;
const host = config.host;

app.listen(port, host, () => {
  // eslint-disable-next-line no-console
  const displayHost = host === "0.0.0.0" ? "localhost (and LAN IP)" : host;
  console.log(`Backend listening on http://${displayHost}:${port}`);
});
