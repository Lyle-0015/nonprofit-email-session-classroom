import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { z } from "zod";
import { InfraiAuth, InfraiError } from "./infrai_auth.js";
import { NonprofitAuthService } from "./nonprofit_auth.js";

const signupBody = z.object({
  email: z.email(),
  password: z.string().min(12),
  name: z.string().min(1).max(100),
  captchaToken: z.string().min(1),
});
const loginBody = z.object({ email: z.email(), password: z.string().min(1) });

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");
const service = new NonprofitAuthService(new InfraiAuth(apiKey));

createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/signup") {
      const input = signupBody.parse(await readJson(request));
      send(response, 201, await service.signup(input, request.socket.remoteAddress));
      return;
    }
    if (request.method === "POST" && request.url === "/login") {
      const input = loginBody.parse(await readJson(request));
      const workspace = await service.login(input);
      send(response, workspace ? 200 : 401, workspace ?? { error: "Invalid email or password" });
      return;
    }
    send(response, 404, { error: "Route not found" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      send(response, 400, { error: "Invalid request", details: error.issues });
      return;
    }
    if (error instanceof InfraiError) {
      send(response, error.status >= 400 && error.status < 500 ? error.status : 502, {
        error: error.code,
        message: error.message,
      });
      return;
    }
    send(response, 500, { error: "Request could not be completed" });
  }
}).listen(Number(process.env.PORT ?? 3000), () => {
  console.log(`Nonprofit auth service listening on http://localhost:${process.env.PORT ?? 3000}`);
});
