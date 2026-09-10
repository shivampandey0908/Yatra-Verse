import mongoose from "mongoose";
import { createApp } from "./app.js";
import { env } from "./config/env.js";

async function main() { await mongoose.connect(env.MONGODB_URI); const server = createApp().listen(env.API_PORT, () => console.log(`YATRA VERSE API listening on ${env.API_PORT}`));
  const close = async () => { server.close(); await mongoose.disconnect(); process.exit(0); }; process.on("SIGTERM", close); process.on("SIGINT", close); }
main().catch((error) => { console.error("API startup failed", error); process.exit(1); });
