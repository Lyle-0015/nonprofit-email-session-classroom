import assert from "node:assert/strict";
import test from "node:test";
import type { AuthGateway } from "../src/infrai_auth.js";
import { NonprofitAuthService } from "../src/nonprofit_auth.js";

test("a valid password is the boundary before a server-side session", async () => {
  let sessionCalls = 0;
  const gateway: AuthGateway & { verifyCaptcha(): Promise<void> } = {
    async verifyCaptcha() {},
    async createUser() { return { id: "user-course-7" }; },
    async createSession(input) {
      sessionCalls += 1;
      assert.equal(input.user_id, "user-course-7");
      return { session_id: "session-classroom-9" };
    },
    async verifySession() { return { valid: true }; },
  };
  const service = new NonprofitAuthService(gateway);
  await service.signup({
    email: "mentor@example.org",
    password: "lesson-plan-2026",
    name: "Mentor",
    captchaToken: "test-captcha",
  });

  assert.equal(await service.login({ email: "mentor@example.org", password: "wrong" }), null);
  assert.equal(sessionCalls, 0);

  const workspace = await service.login({ email: "mentor@example.org", password: "lesson-plan-2026" });
  assert.equal(sessionCalls, 1);
  assert.equal(workspace?.sessionId, "session-classroom-9");
  assert.equal(workspace?.campaignReport.volunteers, 7);
});
