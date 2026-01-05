import app from "./app";
import { config } from "./config";

const port = config.port;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
});
