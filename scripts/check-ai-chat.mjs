import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import ts from "typescript"
import { z } from "zod"

function load(path, dependencies) {
  const compiled = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }
  ).outputText
  const exports = {}
  new Function("require", "exports", compiled)((name) => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`)
    return dependencies[name]
  }, exports)
  return exports
}

let authenticated = true
let owned = true
let failure = false
const calls = []
const actions = load("../actions/chat.ts", {
  zod: { z },
  "@clerk/nextjs/server": {
    auth: {
      protect: async () => {
        if (!authenticated) throw new Error("Unauthorized")
      },
    },
  },
  "@/queries/chats": {
    getChat: async () => {
      if (failure) throw new Error("Database unavailable")
      return owned ? { id: "chat_1" } : undefined
    },
  },
  "@trigger.dev/sdk": {
    auth: {
      createPublicToken: async (options) => {
        calls.push(options)
        return "token"
      },
    },
  },
  "@trigger.dev/sdk/ai": {
    defaultStorage: {},
    chat: {
      createStartSessionAction: (task) => async (params) => {
        calls.push({ task, ...params })
        return {}
      },
      createLoadTranscriptAction: () => async (params) => {
        calls.push(params)
        return { messages: [] }
      },
    },
  },
})
for (const action of [
  () =>
    actions.startChatSession({
      chatId: "chat_1",
      clientData: { userId: "spoof" },
    }),
  () => actions.mintChatAccessToken("chat_1"),
  () => actions.loadChatTranscript({ chatId: "chat_1" }),
]) {
  authenticated = false
  await assert.rejects(action(), /Unauthorized/)
  authenticated = true
  owned = false
  await assert.rejects(action(), /Chat not found/)
  owned = true
  failure = true
  await assert.rejects(action(), /Database unavailable/)
  failure = false
  assert.equal(calls.length, 0)
}
await assert.rejects(actions.startChatSession({ chatId: "" }))
await actions.startChatSession({
  chatId: "chat_1",
  clientData: { instructions: "spoof" },
})
await actions.mintChatAccessToken("chat_2")
await actions.loadChatTranscript({ chatId: "chat_2" })
assert.deepEqual(calls, [
  { task: "chat-agent", chatId: "chat_1" },
  {
    scopes: { read: { sessions: "chat_2" }, write: { sessions: "chat_2" } },
    expirationTime: "1h",
  },
  { chatId: "chat_2" },
])

let rows = [{ instructions: "Be concise." }]
let queryFailure = false
const queries = []
const { chatAgent } = load("../trigger/chat.ts", {
  zod: { z },
  "@ai-sdk/deepseek": { deepSeek: (model) => model },
  "@trigger.dev/sdk/ai": { chat: { agent: (config) => config } },
  pg: {
    Pool: class {
      on() {}
      async query(sql, values) {
        queries.push({ sql, values })
        if (queryFailure) throw new Error("Database unavailable")
        return { rows }
      }
    },
  },
})
const messages = [
  { id: "1", role: "user", parts: [{ type: "text", text: "Hello" }] },
]
assert.deepEqual(await chatAgent.onValidateMessages({ messages }), messages)
for (const invalid of [
  [],
  [{ ...messages[0], role: "system" }],
  [{ ...messages[0], parts: [{ type: "file" }] }],
]) {
  await assert.rejects(chatAgent.onValidateMessages({ messages: invalid }))
}
const oldDatabase = process.env.DATABASE_URL
const oldKey = process.env.DEEPSEEK_API_KEY
try {
  process.env.DATABASE_URL = "stub"
  process.env.DEEPSEEK_API_KEY = "stub"
  const signal = new AbortController().signal
  const run = () =>
    chatAgent.run({
      chatId: "chat_1",
      messages,
      signal,
      streamText: (options) => options,
    })
  const result = await run()
  assert.equal(result.instructions, "Be concise.")
  assert.equal(result.model, "deepseek-flash")
  assert.equal(result.abortSignal, signal)
  assert.deepEqual(result.messages, messages)
  assert.deepEqual(queries[0].values, ["chat_1"])
  rows = [{ instructions: null }]
  assert.equal((await run()).instructions, "You are a helpful assistant.")
  rows = []
  await assert.rejects(run(), /Chat not found/)
  queryFailure = true
  await assert.rejects(run(), /Database unavailable/)
  delete process.env.DEEPSEEK_API_KEY
  await assert.rejects(run(), /DEEPSEEK_API_KEY/)
  assert.equal(
    chatAgent.uiMessageStreamOptions.onError(new Error("secret")),
    "Could not get a reply. Please try again."
  )
} finally {
  if (oldDatabase === undefined) delete process.env.DATABASE_URL
  else process.env.DATABASE_URL = oldDatabase
  if (oldKey === undefined) delete process.env.DEEPSEEK_API_KEY
  else process.env.DEEPSEEK_API_KEY = oldKey
}
console.log(
  "Chat migration checks passed (stubbed auth, ownership, tokens, transcript reads, database, and provider)."
)
