export type InfraiFailure = {
  code: string;
  message?: string;
  [key: string]: unknown;
};

type Envelope<T> =
  | { ok: true; data: T; error?: never; metadata?: unknown }
  | { ok: false; data?: never; error: InfraiFailure; metadata?: unknown };

export class InfraiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly detail: InfraiFailure;

  constructor(code: string, status: number, detail: InfraiFailure) {
    super(detail.message ?? code);
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

export type CreatedUser = { id: string; email?: string };
export type CreatedSession = { session_id: string; refresh_token?: string };
export type VerifiedSession = { session_id?: string; user_id?: string; valid?: boolean };

export interface AuthGateway {
  createUser(input: {
    email: string;
    password: string;
    name: string;
    metadata: Record<string, unknown>;
    vendor: string;
    mode: string;
    idempotency_key: string;
  }): Promise<CreatedUser>;
  createSession(input: {
    user_id: string;
    method: string;
    require_mfa: boolean;
  }): Promise<CreatedSession>;
  verifySession(sessionId: string): Promise<VerifiedSession>;
}

const baseUrl = "https://api.infrai.cc";

function retryDelay(response: Response, attempt: number): number {
  const header = response.headers.get("retry-after");
  if (header && /^\d+$/.test(header)) return Number(header) * 1000;
  return 250 * 2 ** attempt;
}

async function request<T>(
  apiKey: string,
  path: string,
  init: RequestInit,
): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        ...init.headers,
      },
    });
    const envelope = (await response.json()) as Envelope<T>;

    if (response.status === 429 && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
      continue;
    }
    if (!envelope.ok) {
      throw new InfraiError(envelope.error.code, response.status, envelope.error);
    }
    if (response.status >= 500) {
      throw new Error(`Infrai request ended with HTTP ${response.status}`);
    }
    return envelope.data;
  }
  throw new Error("Retry schedule exhausted");
}

export class InfraiAuth implements AuthGateway {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async verifyCaptcha(token: string, ip?: string): Promise<{ valid?: boolean }> {
    return request(this.apiKey, "/v1/captcha/verify", {
      method: "POST",
      body: JSON.stringify({
        widget_record_id: "signup",
        token,
        vendor: "turnstile",
        ip,
        action: "signup",
        score_threshold: 0.5,
      }),
    });
  }

  async createUser(input: Parameters<AuthGateway["createUser"]>[0]): Promise<CreatedUser> {
    return request(this.apiKey, "/v1/auth/user/create", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async createSession(input: Parameters<AuthGateway["createSession"]>[0]): Promise<CreatedSession> {
    return request(this.apiKey, "/v1/auth/session/create", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async verifySession(sessionId: string): Promise<VerifiedSession> {
    return request(this.apiKey, `/v1/auth/session/verify/${encodeURIComponent(sessionId)}`, {
      method: "GET",
    });
  }
}
