// Polyfills for browser APIs used by pdfjs (pdf-parse)
/* eslint-disable @typescript-eslint/no-var-requires */
if (typeof (global as any).DOMMatrix === "undefined") {
  try {
    // Try a DOMMatrix implementation if available
    (global as any).DOMMatrix =
      require("dombuilder").DOMMatrix || require("dommatrix").DOMMatrix;
  } catch (e) {
    // Minimal stub to satisfy pdfjs checks
    (global as any).DOMMatrix = class DOMMatrix {
      constructor() {}
      multiply() {
        return this;
      }
      invertSelf() {
        return this;
      }
    };
  }
}

if (typeof (global as any).ImageData === "undefined") {
  try {
    (global as any).ImageData = require("canvas").ImageData;
  } catch (e) {
    (global as any).ImageData = class ImageData {};
  }
}

if (typeof (global as any).Path2D === "undefined") {
  try {
    (global as any).Path2D = require("path2d-polyfill");
  } catch (e) {
    (global as any).Path2D = function Path2D() {};
  }
}

// Some libs also expect a `window`/`navigator` global
if (typeof (global as any).window === "undefined") {
  (global as any).window = global;
}
if (typeof (global as any).navigator === "undefined") {
  (global as any).navigator = { userAgent: "node" };
}

// Require app/config after polyfills so pdf-parse sees them
const app = require("./app").default;
const { config } = require("./config");

const port = config.port;
const host = config.host;

app.listen(port, host, () => {
  // eslint-disable-next-line no-console
  const displayHost = host === "0.0.0.0" ? "localhost (and LAN IP)" : host;
  console.log(`Backend listening on http://${displayHost}:${port}`);
});
