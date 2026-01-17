"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = require("./config");
const port = config_1.config.port;
const host = config_1.config.host;
app_1.default.listen(port, host, () => {
    // eslint-disable-next-line no-console
    const displayHost = host === "0.0.0.0" ? "localhost (and LAN IP)" : host;
    console.log(`Backend listening on http://${displayHost}:${port}`);
});
