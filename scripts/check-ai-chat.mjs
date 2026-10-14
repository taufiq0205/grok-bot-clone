import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import ts from "typescript"
import { z } from "zod"

let authenticated = true
let chat = { botInstructions: "Be concise." }
let generation
const dependencies = {
  "@ai-sdk/deepseek": { deepSeek: (model) => model },
  "@clerk/nextjs/server": {
    auth: {
      protect: async () => {
        if (!authenticated) throw new Error("Unauthorized")
      },
    },
  },
  "@/queries/chats": { getChat: async () => chat },
  zod: { z },
  ai: {
    convertToModelMessages: async (messages) => messages,
    streamText: (options) => {
      generation = options
      return { stream: "stub" }
    },
    toUIMessageStream: ({ stream }) => stream,
    createUIMessageStreamResponse: () => new Response("stub stream"),
  },
}
const compiled = ts.transpileModule(
  readFileSync(
    new URL("../app/api/chats/[chatId]/route.ts", import.meta.url),
    "utf8"
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText
const route = {}
new Function("require", "exports", compiled)(
  (name) => dependencies[name],
  route
)
const context = { params: Promise.resolve({ chatId: "chat_1" }) }
const valid = {
  messages: [
    { id: "1", role: "user", parts: [{ type: "text", text: "Hello" }] },
  ],
}
const post = (body) =>
  route.POST(
    new Request("http://localhost/api/chats/chat_1", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    context
  )
const previousKey = process.env.DEEPSEEK_API_KEY
try {
  process.env.DEEPSEEK_API_KEY = "stub"
  authenticated = false
  await assert.rejects(post(valid), /Unauthorized/)
  assert.equal(generation, undefined)
  authenticated = true
  for (const body of [
    null,
    {},
    { messages: [] },
    { messages: [{ ...valid.messages[0], role: "system" }] },
  ]) {
    assert.equal((await post(body)).status, 400)
  }
  chat = undefined
  assert.equal((await post(valid)).status, 404)
  assert.equal(generation, undefined)
  chat = { botInstructions: "Be concise." }
  delete process.env.DEEPSEEK_API_KEY
  assert.equal((await post(valid)).status, 503)
  process.env.DEEPSEEK_API_KEY = "stub"
  assert.equal((await post(valid)).status, 200)
  assert.equal(generation.instructions, chat.botInstructions)
  assert.equal(generation.model, "deepseek-flash")
  assert.deepEqual(generation.messages, valid.messages)
  console.log(
    "Chat route checks passed (stubbed auth, chat lookup, and provider)."
  )
} finally {
  if (previousKey === undefined) delete process.env.DEEPSEEK_API_KEY
  else process.env.DEEPSEEK_API_KEY = previousKey
}
