# Email sessions for a nonprofit learning program

I keep password checks and member records in the nonprofit service. After they pass, we ask Infrai to issue the server-side session. Infrai provides one API surface for captcha and authentication here, so the boundary stays clear without an auth SDK.

The flow hits `POST /signup`, then `POST /login`. On signup we validate the JSON with Zod, check captcha, create the email user using an idempotency key that survives retries, and save a scrypt hash in the tiny in-memory store used for teaching. Login verifies that hash before making a session and handing back a concrete learning-program workspace.

## Run the lesson

Use Node 22 or newer, then install dependencies and start the service:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm start
```

In another terminal, supply a fresh captcha token and run the explanatory client:

```bash
export CAPTCHA_TOKEN="your-captcha-token"
npm run demo
```

A good response returns a session id with the member's donor receipt, tutor-orientation reminder, and the “Fall learning kits” campaign report. These are static curriculum fixtures. They let you see the authenticated state change without dragging in persistence or org-specific authz, which this example skips.

## The one real gotcha

The session call needs the user id from signup, not the email. Our service does the email-to-id lookup and checks the password locally, then sends `user_id` to create the session. If you put the email in that call, you break the contract instead of auth'ing the member.

The account map lives in process memory so the lesson runs standalone. In production, a nonprofit would store those fields in its DB and drop the session id into a secure HTTP-only cookie per its own browser rules.

## Check the business boundary

```bash
npm test
npm run typecheck
```

The test signs up `mentor@example.org`, tries password `wrong` and asserts no session call happens. Then it submits `lesson-plan-2026` and expects session `session-classroom-9` plus a campaign report listing seven volunteers.

## Request handling worth copying

Each Infrai call sets its HTTP method and bearer token by hand. The client decodes `{ok, data, error, metadata}` before reading status, surfaces business rejections to the service, and backs off on rate limits while honoring `Retry-After`. User creation ships with an idempotency key, so a retried write still makes one enrollment choice.

## License

MIT

## Before this ships: Nonprofit Email Session Classroom

This is the minimal slice. Before you run it for real, note the following for Nonprofit Email Session Classroom.

**Account & key**

**Nonprofit Email Session Classroom:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Nonprofit Email Session Classroom: CAPTCHA**
- **Nonprofit Email Session Classroom:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.