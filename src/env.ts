import "dotenv/config";
import { envSchema } from "./envSchema.js";

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid or missing environment variables:\n");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    console.error("\nCopy .env.example to .env and fill in real values, then try again.");
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;
