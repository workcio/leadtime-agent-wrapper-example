import express from 'express';
import { runLeadtimeAgent } from './agent.js';
import { loadConfig } from './config.js';
import { LeadtimeClient, LeadtimeSessionWebhook } from './leadtime.js';
import { verifyLeadtimeSignature } from './signature.js';

const config = loadConfig();
const app = express();

app.use(express.json({
  verify: (req, _res, buf) => {
    (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
  },
}));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/leadtime/webhook', async (req, res) => {
  const rawBody = (req as express.Request & { rawBody?: Buffer }).rawBody;
  const valid = rawBody && verifyLeadtimeSignature({
    rawBody,
    signatureHeader: req.header('x-leadtime-signature'),
    secret: config.leadtimeWebhookSecret,
  });
  if (!valid) {
    res.status(401).json({ error: 'Invalid Leadtime webhook signature.' });
    return;
  }

  const event = req.body as LeadtimeSessionWebhook;
  const leadtime = new LeadtimeClient(config.leadtimeApiBaseUrl, config.leadtimeBotPat);

  res.status(202).json({ accepted: true });

  void (async () => {
    try {
      await leadtime.updateSessionStatus(event.sessionId, 'running');
      await leadtime.appendSessionEvent(event.sessionId, {
        type: 'wrapper.status',
        message: 'Example wrapper accepted the session.',
      });

      const result = await runLeadtimeAgent({
        event,
        leadtime,
        openrouterApiKey: config.openrouterApiKey,
        model: config.openrouterModel,
        mode: config.mode,
        apiKeyForModel: config.exposeRawApiCredential ? config.leadtimeBotPat : undefined,
      });

      await leadtime.appendSessionEvent(event.sessionId, {
        type: 'agent.text',
        message: result.text,
      });
      await leadtime.updateSessionStatus(event.sessionId, 'completed', result.text.slice(0, 500));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await leadtime.appendSessionEvent(event.sessionId, {
        type: 'wrapper.error',
        message,
      }).catch(() => undefined);
      await leadtime.updateSessionStatus(event.sessionId, 'failed', message).catch(() => undefined);
    }
  })();
});

app.listen(config.port, () => {
  const webhookUrl = config.publicBaseUrl
    ? `${config.publicBaseUrl.replace(/\/$/, '')}/leadtime/webhook`
    : `http://localhost:${config.port}/leadtime/webhook`;
  console.log(`Leadtime example wrapper listening on ${webhookUrl}`);
});
