import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { AuthGateway, CreatedSession } from "./infrai_auth.js";

export type SignupInput = {
  email: string;
  password: string;
  name: string;
  captchaToken: string;
};

export type LoginInput = { email: string; password: string };

type Account = { userId: string; salt: string; passwordHash: string };

export type MemberWorkspace = {
  sessionId: string;
  nextLesson: string;
  donorReceipts: Array<{ receiptId: string; amount: number; issuedOn: string }>;
  volunteerReminders: Array<{ activity: string; startsAt: string }>;
  campaignReport: { campaign: string; donations: number; volunteers: number };
};

function hashPassword(password: string, salt: string): Buffer {
  return scryptSync(password, salt, 32);
}

export class NonprofitAuthService {
  private readonly accounts = new Map<string, Account>();
  private readonly auth: AuthGateway & { verifyCaptcha(token: string, ip?: string): Promise<unknown> };

  constructor(auth: AuthGateway & { verifyCaptcha(token: string, ip?: string): Promise<unknown> }) {
    this.auth = auth;
  }

  async signup(input: SignupInput, ip?: string): Promise<{ userId: string }> {
    await this.auth.verifyCaptcha(input.captchaToken, ip);
    const idempotencyKey = `signup-${randomBytes(16).toString("hex")}`;
    const user = await this.auth.createUser({
      email: input.email,
      password: input.password,
      name: input.name,
      metadata: { role: "supporter", learning_track: "campaign_stewardship" },
      vendor: "infrai",
      mode: "email",
      idempotency_key: idempotencyKey,
    });
    const salt = randomBytes(16).toString("hex");
    this.accounts.set(input.email.toLowerCase(), {
      userId: user.id,
      salt,
      passwordHash: hashPassword(input.password, salt).toString("hex"),
    });
    return { userId: user.id };
  }

  async login(input: LoginInput): Promise<MemberWorkspace | null> {
    const account = this.accounts.get(input.email.toLowerCase());
    if (!account) return null;
    const expected = Buffer.from(account.passwordHash, "hex");
    const supplied = hashPassword(input.password, account.salt);
    if (!timingSafeEqual(expected, supplied)) return null;

    const session: CreatedSession = await this.auth.createSession({
      user_id: account.userId,
      method: "password",
      require_mfa: false,
    });
    return {
      sessionId: session.session_id,
      nextLesson: "Reading a campaign report",
      donorReceipts: [{ receiptId: "rcpt-course-101", amount: 75, issuedOn: "2026-09-01" }],
      volunteerReminders: [{ activity: "Tutor orientation", startsAt: "2026-09-08T17:00:00Z" }],
      campaignReport: { campaign: "Fall learning kits", donations: 24, volunteers: 7 },
    };
  }
}
