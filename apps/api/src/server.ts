import mongoose from "mongoose";
import { createApp } from "./app.js";
import { env } from "./config/env.js";

async function main() { await mongoose.connect(env.MONGODB_URI); const port = Number(process.env.PORT) || env.API_PORT; const server = createApp().listen(port, () => console.log(`YATRA VERSE API listening on ${port}`));
  const close = async () => { server.close(); await mongoose.disconnect(); process.exit(0); }; process.on("SIGTERM", close); process.on("SIGINT", close); }
main().catch((error) => { console.error("API startup failed", error); process.exit(1); });
