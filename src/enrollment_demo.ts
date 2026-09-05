const origin = process.env.APP_ORIGIN ?? "http://localhost:3000";
const email = `teacher-${Date.now()}@example.org`;
const password = "course-notes-2026";

async function post(path: string, body: unknown): Promise<unknown> {
  const response = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}

const signup = await post("/signup", {
  email,
  password,
  name: "Avery Teacher",
  captchaToken: process.env.CAPTCHA_TOKEN ?? "",
});
console.log("Signup:", signup);

const workspace = await post("/login", { email, password });
console.log("Learning campaign workspace:", workspace);
