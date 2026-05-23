export type LeadtimeSessionWebhook = {
  type: string;
  sessionId: string;
  workspaceId?: string;
  botUserId?: string;
  trigger?: {
    type?: string;
    taskId?: string;
    commentId?: string;
  };
  task?: {
    id?: string;
    identifier?: string;
    title?: string;
    description?: string | null;
    status?: string | null;
  };
  guidance?: {
    instructions?: string;
  };
};

export class LeadtimeClient {
  constructor(
    private readonly apiBaseUrl: string,
    private readonly token: string,
  ) {}

  async getTask(taskId: string) {
    return this.request(`/public/tasks/${taskId}`);
  }

  async addTaskComment(taskId: string, body: string) {
    return this.request(`/public/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  }

  async updateTaskStatus(taskId: string, statusIdOrName: string) {
    return this.request(`/public/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: statusIdOrName }),
    });
  }

  async updateSessionStatus(sessionId: string, status: 'running' | 'completed' | 'failed', summary?: string) {
    return this.request(`/public/agent-sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, summary }),
    });
  }

  async appendSessionEvent(sessionId: string, event: Record<string, unknown>) {
    return this.request(`/public/agent-sessions/${sessionId}/events`, {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  async raw(path: string, init: RequestInit = {}) {
    return this.request(path, init);
  }

  private async request(path: string, init: RequestInit = {}) {
    const response = await fetch(`${this.apiBaseUrl.replace(/\/$/, '')}${path}`, {
      ...init,
      headers: {
        'authorization': `Bearer ${this.token}`,
        'content-type': 'application/json',
        ...(init.headers || {}),
      },
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    if (!response.ok) {
      throw new Error(`Leadtime API ${response.status}: ${text}`);
    }
    return body;
  }
}
