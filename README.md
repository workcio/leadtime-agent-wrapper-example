# Leadtime Agent Wrapper Example

Reference implementation for a self-hosted Leadtime bot wrapper.

It shows how to:

- receive signed Leadtime agent-session webhooks
- verify webhook signatures
- update the session status and event stream
- call normal Leadtime public APIs as a bot using a bot PAT
- run an AI SDK agent with controlled tools
- optionally expose a raw API credential to the model for advanced batch scripts

This is intentionally smaller than the OpenClaw connector. Use it as a starting point when you want to build your own runtime instead of connecting an existing agent platform.

## Modes

`basic` mode gives the model only task-safe tools:

- read task
- write task comment
- update task status

`full` mode also provides a generic Leadtime public API request tool. Use this when the bot should manage more Leadtime objects through tools.

`EXPOSE_RAW_API_CREDENTIAL=true` additionally gives the model the bot PAT and API base URL in its instructions. Keep this disabled unless the bot needs to write direct API scripts for batch work.

## Setup

Create a self-hosted bot in Leadtime.

For manual setup:

1. Enable webhooks and sessions.
2. Set the webhook URL to `https://your-wrapper.example.com/leadtime/webhook`.
3. Copy or rotate the webhook signing secret.
4. Create a bot personal access token with the scopes your wrapper needs.
5. Configure this app from `.env.example`.

```bash
cp .env.example .env
npm install
npm run dev
```

For production, run behind public HTTPS. Leadtime Cloud cannot deliver webhooks to `localhost`, private LAN addresses, or Tailscale-only Serve URLs. Use Tailscale Funnel, a named Cloudflare Tunnel, or a normal HTTPS reverse proxy.

## Environment

```bash
PORT=8787
PUBLIC_BASE_URL=https://your-wrapper.example.com

LEADTIME_API_BASE_URL=https://leadtime.app/api
LEADTIME_BOT_PAT=lt_pat_your_bot_token
LEADTIME_WEBHOOK_SECRET=whsec_your_webhook_secret

OPENROUTER_API_KEY=sk-or-v1-your-key
OPENROUTER_MODEL=openai/gpt-5.1-mini

LEADTIME_AGENT_MODE=basic
EXPOSE_RAW_API_CREDENTIAL=false
```

## Webhook Contract

Leadtime sends a JSON session payload to `/leadtime/webhook` and signs the raw request body with `x-leadtime-signature`.

The wrapper should:

1. Verify the HMAC signature.
2. Respond quickly with `202 Accepted`.
3. Mark the session `running`.
4. Run the agent.
5. Append session events while work progresses.
6. Mark the session `completed` or `failed`.

The model does not need to update session state itself. The wrapper owns session lifecycle. The model uses Leadtime tools/API to do task work.

## Production Notes

- Store PATs and webhook secrets in a secret manager.
- Restrict bot role permissions to what the wrapper actually needs.
- Keep webhook signature verification mandatory.
- Use HTTPS for public webhook URLs.
- Add queue/retry handling if the wrapper may be offline or overloaded.
