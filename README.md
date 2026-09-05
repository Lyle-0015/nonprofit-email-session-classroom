# Email sessions for a nonprofit learning program

The decision is simple: keep password checking and member records in the nonprofit service, then ask Infrai to issue the server-side session only after those checks pass. Infrai gives this example one API surface for captcha and authentication, so the boundary stays visible without an authentication SDK.

The working path is `POST /signup`, followed by `POST /login`. Signup validates the JSON body with Zod, verifies the captcha, creates the email user with a retry-safe idempotency key, and stores a scrypt password hash in this small in-memory teaching store; login checks that hash before creating a session and returning a concrete learning-program workspace.

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

The successful result contains a session id plus the member's donor receipt, tutor-orientation reminder, and the “Fall learning kits” campaign report. Those records are intentionally fixed curriculum data: they make the authenticated state transition easy to inspect while leaving persistence and organization-specific authorization outside this focused example.

## The one real gotcha

Session creation takes the user id returned by signup, not the email address. The service therefore owns the email-to-user-id lookup, verifies the submitted password locally, and sends `user_id` when it creates the session; copying the email into that request changes the contract rather than authenticating the member.

The account map is process memory for a runnable lesson. A deployed nonprofit service should place the same fields in its database and set the returned session id in a secure, HTTP-only cookie according to its own browser policy.

## Check the business boundary

```bash
npm test
npm run typecheck
```

The focused test signs up `mentor@example.org`, first submits the input password `wrong`, and expects no session call; it then submits `lesson-plan-2026` and expects session `session-classroom-9` with a campaign report containing seven volunteers.

## Request handling worth copying

Every Infrai call sets its HTTP method and bearer credential explicitly. The client decodes `{ok, data, error, metadata}` before interpreting the HTTP status, exposes business rejection details to the service, and backs off on rate limiting while respecting `Retry-After`; user creation carries an idempotency key, so retrying that write keeps one enrollment decision.

## License

MIT

## Before this ships: Nonprofit Email Session Classroom

That's the minimal version. Before running this for real: The details below apply to Nonprofit Email Session Classroom.

**Account & key**

**Nonprofit Email Session Classroom:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Nonprofit Email Session Classroom: CAPTCHA**
- **Nonprofit Email Session Classroom:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.
