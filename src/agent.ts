import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, stepCountIs, tool } from 'ai';
import { z } from 'zod';
import { LeadtimeClient, LeadtimeSessionWebhook } from './leadtime.js';

export async function runLeadtimeAgent(params: {
  event: LeadtimeSessionWebhook;
  leadtime: LeadtimeClient;
  apiKeyForModel?: string;
  openrouterApiKey: string;
  model: string;
  mode: 'basic' | 'full';
}) {
  const provider = createOpenAICompatible({
    name: 'openrouter',
    apiKey: params.openrouterApiKey,
    baseURL: 'https://openrouter.ai/api/v1',
  });

  const taskId = params.event.trigger?.taskId || params.event.task?.id;
  if (!taskId) {
    throw new Error('Webhook payload does not include a task id.');
  }

  const tools = {
    readTask: tool({
      description: 'Read the current Leadtime task by id.',
      inputSchema: z.object({ taskId: z.string() }),
      execute: ({ taskId }) => params.leadtime.getTask(taskId),
    }),
    writeComment: tool({
      description: 'Write a comment to the Leadtime task.',
      inputSchema: z.object({ taskId: z.string(), body: z.string() }),
      execute: ({ taskId, body }) => params.leadtime.addTaskComment(taskId, body),
    }),
    updateTaskStatus: tool({
      description: 'Update the Leadtime task status by status id or status name.',
      inputSchema: z.object({ taskId: z.string(), status: z.string() }),
      execute: ({ taskId, status }) => params.leadtime.updateTaskStatus(taskId, status),
    }),
    ...(params.mode === 'full'
      ? {
          leadtimeApiRequest: tool({
            description: 'Advanced mode only. Call an arbitrary Leadtime public API path as this bot.',
            inputSchema: z.object({
              method: z.enum(['GET', 'POST', 'PATCH', 'PUT', 'DELETE']).default('GET'),
              path: z.string().startsWith('/'),
              body: z.unknown().optional(),
            }),
            execute: ({ method, path, body }) =>
              params.leadtime.raw(path, {
                method,
                body: body === undefined ? undefined : JSON.stringify(body),
              }),
          }),
        }
      : {}),
  };

  const rawCredentialGuidance = params.apiKeyForModel
    ? [
        'Raw API credential is intentionally exposed for this run.',
        `LEADTIME_API_BASE_URL=${process.env.LEADTIME_API_BASE_URL}`,
        `LEADTIME_BOT_PAT=${params.apiKeyForModel}`,
        'Prefer tools for normal actions. Use direct API scripts only when a batch operation genuinely needs it.',
      ].join('\n')
    : 'Raw API credential is not exposed. Use the provided tools.';

  return generateText({
    model: provider(params.model),
    tools,
    stopWhen: stepCountIs(8),
    system: [
      'You are running inside a self-hosted Leadtime bot wrapper.',
      'Use tools to inspect and update Leadtime. Keep comments concise and task-focused.',
      'Only the wrapper updates session status and events; you perform task work through tools.',
      rawCredentialGuidance,
      params.event.guidance?.instructions || '',
    ].filter(Boolean).join('\n\n'),
    prompt: [
      `Task id: ${taskId}`,
      `Task identifier: ${params.event.task?.identifier || 'unknown'}`,
      `Task title: ${params.event.task?.title || 'unknown'}`,
      `Task status: ${params.event.task?.status || 'unknown'}`,
      `Trigger: ${params.event.trigger?.type || params.event.type}`,
      '',
      'Read the task, decide the smallest useful action, then comment with what you did.',
    ].join('\n'),
  });
}
