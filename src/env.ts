import * as v from "valibot";

const envSchema = v.object({
  UEC_ID: v.string(),
  UEC_PASSWORD: v.string(),
  UEC_TOTP_URL: v.string(),
});

export function env(): v.InferOutput<typeof envSchema> {
  try {
    const env = v.parse(envSchema, process.env);
    return env;
  } catch (error) {
    throw new Error(`Environment variable validation failed: ${error}`);
  }
}
