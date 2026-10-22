import { networkInterfaces } from "node:os";
import { createApp } from "./app.js";

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "0.0.0.0";
const MAX_PAYLOAD_MB = Number(process.env.MAX_PAYLOAD_MB) || 16;

const { server, io } = createApp({
  maxPayloadBytes: MAX_PAYLOAD_MB * 1024 * 1024,
});

server.listen(PORT, HOST, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
  for (const nets of Object.values(networkInterfaces())) {
    for (const net of nets ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        console.log(`  Red local: http://${net.address}:${PORT}`);
      }
    }
  }
});

function shutdown() {
  console.log("\nCerrando servidor...");
  // Closes every socket and the underlying HTTP server.
  io.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
