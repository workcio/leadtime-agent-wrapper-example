import { z } from 'zod';

const configSchema = z.object({
  port: z.coerce.number().default(8787),
  publicBaseUrl: z.string().url().optional(),
  leadtimeApiBaseUrl: z.string().url(),
  leadtimeBotPat: z.string().min(1),
  leadtimeWebhookSecret: z.string().min(1),
  openrouterApiKey: z.string().min(1),
  openrouterModel: z.string().default('openai/gpt-5.1-mini'),
  mode: z.enum(['basic', 'full']).default('basic'),
  exposeRawApiCredential: z.coerce.boolean().default(false),
});

export function loadConfig() {
  return configSchema.parse({
    port: process.env.PORT,
    publicBaseUrl: process.env.PUBLIC_BASE_URL,
    leadtimeApiBaseUrl: process.env.LEADTIME_API_BASE_URL,
    leadtimeBotPat: process.env.LEADTIME_BOT_PAT,
    leadtimeWebhookSecret: process.env.LEADTIME_WEBHOOK_SECRET,
    openrouterApiKey: process.env.OPENROUTER_API_KEY,
    openrouterModel: process.env.OPENROUTER_MODEL,
    mode: process.env.LEADTIME_AGENT_MODE,
    exposeRawApiCredential: process.env.EXPOSE_RAW_API_CREDENTIAL,
  });
}
