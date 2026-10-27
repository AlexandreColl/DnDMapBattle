import { networkInterfaces } from "node:os";
import { createApp } from "./app.js";
import { resolveDmKey } from "./dm-key.js";

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "0.0.0.0";
const MAX_PAYLOAD_MB = Number(process.env.MAX_PAYLOAD_MB) || 16;
const DM_KEY = resolveDmKey(process.env.DM_KEY);

const { server, io } = createApp({
  maxPayloadBytes: MAX_PAYLOAD_MB * 1024 * 1024,
  dmKey: DM_KEY,
});

server.listen(PORT, HOST, () => {
  console.log(`Servidor iniciado en el puerto ${PORT}\n`);
  for (const nets of Object.values(networkInterfaces())) {
    for (const net of nets ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        console.log(`  Jugadores: http://${net.address}:${PORT}`);
      }
    }
  }
  // The key goes after "#", so it never reaches the server in a URL.
  console.log(`  Máster:    http://localhost:${PORT}/#dm=${DM_KEY}`);
  console.log("\nNo compartas el enlace de máster con los jugadores.");
});

function shutdown() {
  console.log("\nCerrando servidor...");
  // Closes every socket and the underlying HTTP server.
  io.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
