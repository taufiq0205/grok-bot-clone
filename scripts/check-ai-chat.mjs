import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import ts from "typescript"
import { configure } from "@trigger.dev/sdk"
import { apiClientManager } from "@trigger.dev/core/v3"
import { z } from "zod"
import * as React from "react"
import * as jsxRuntime from "react/jsx-runtime"
import { renderToStaticMarkup } from "react-dom/server"
import { isToolUIPart, getToolName } from "ai"
import { stepCountIs } from "ai"
import { createSandboxTools } from "../lib/sandbox-tools.ts"

function load(path, dependencies) {
  const compiled = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
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
const previousVercelBranch = process.env.VERCEL_GIT_COMMIT_REF
process.env.VERCEL_GIT_COMMIT_REF = "main"
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
    configure,
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
assert.equal(
  apiClientManager.branchName,
  undefined,
  "Vercel main must not select a Trigger preview branch"
)
if (previousVercelBranch === undefined) delete process.env.VERCEL_GIT_COMMIT_REF
else process.env.VERCEL_GIT_COMMIT_REF = previousVercelBranch
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

let rows = [
  {
    name: "Ada",
    job: "Research assistant",
    instructions: "Be concise.",
    sandboxId: "sandbox_1",
  },
]
let queryFailure = false
const queries = []
const sandboxIds = []
const { chatAgent } = load("../trigger/chat.ts", {
  zod: { z },
  ai: { stepCountIs },
  "../lib/sandbox-tools": { createSandboxTools },
  "../lib/daytona": {
    getDaytona: () => ({
      get: async (id) => {
        sandboxIds.push(id)
        return { state: "started", fs: { listFiles: async () => [] } }
      },
    }),
  },
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
  const resolvedTools = chatAgent.tools({ chatId: "chat_1" })
  const run = () =>
    chatAgent.run({
      chatId: "chat_1",
      messages,
      signal,
      tools: resolvedTools,
      streamText: (options) => options,
    })
  const result = await run()
  assert.match(result.instructions, /"name":"Ada","job":"Research assistant"/)
  assert.match(result.instructions, /Your purpose is to help the user/)
  assert.match(result.instructions, /isolated Linux machine in the cloud/)
  assert.match(
    result.instructions,
    /filesystem, network, CPU, memory, and disk/
  )
  assert.doesNotMatch(result.instructions, /Daytona/i)
  assert.match(result.instructions, /This chat runs separately/)
  assert.match(
    result.instructions,
    /Additional bot instructions:\nBe concise\./
  )
  assert.match(result.instructions, /sandbox tools/)
  assert.equal(result.tools, resolvedTools)
  assert.ok(result.tools.viewScreen.toModelOutput)
  assert.equal(typeof result.stopWhen, "function")
  assert.equal(result.model, "deepseek-flash")
  assert.equal(result.abortSignal, signal)
  assert.deepEqual(result.messages, messages)
  assert.deepEqual(queries[0].values, ["chat_1"])
  rows = [{ instructions: null }]
  const fallback = await run()
  assert.match(
    fallback.instructions,
    /"name":"Assistant","job":"General assistant"/
  )
  assert.match(fallback.instructions, /No sandbox is associated/)
  assert.doesNotMatch(fallback.instructions, /Additional bot instructions/)
  rows = [{ name: "Grace", job: "Writer", instructions: "", sandboxId: null }]
  assert.match((await run()).instructions, /"name":"Grace","job":"Writer"/)
  assert.match(queries[0].sql, /b\.user_id = c\.user_id/)
  assert.match(queries[0].sql, /b\.sandbox_id AS "sandboxId"/)
  rows = [{ sandboxId: "owned_sandbox" }]
  const toolOptions = { toolCallId: "call_1", messages: [] }
  await resolvedTools.listFiles.execute({ path: "/tmp" }, toolOptions)
  assert.deepEqual(sandboxIds, ["owned_sandbox"])
  assert.match(queries.at(-1).sql, /b\.user_id = c\.user_id/)
  assert.deepEqual(queries.at(-1).values, ["chat_1"])
  rows = []
  const missingTools = chatAgent.tools({ chatId: "missing_chat" })
  await assert.rejects(
    missingTools.listFiles.execute({ path: "/tmp" }, toolOptions),
    /Sandbox operation failed/
  )
  assert.deepEqual(sandboxIds, ["owned_sandbox"])
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

// Render the actual chat with transport/UI boundaries stubbed, including screenshot data.
const wrapper = ({ children }) => React.createElement("div", null, children)
const primitives = (names) =>
  Object.fromEntries(names.map((name) => [name, wrapper]))
const renderedMessages = [
  {
    id: "tool_message",
    role: "assistant",
    parts: [
      { type: "text", text: "Done." },
      {
        type: "tool-bash",
        toolCallId: "bash_1",
        state: "output-available",
        input: { command: "pwd" },
        output: { output: "/home/test" },
      },
      {
        type: "tool-viewScreen",
        toolCallId: "screen_1",
        state: "output-available",
        input: {},
        output: { screenshot: "SECRET_SCREENSHOT_BYTES" },
      },
      {
        type: "dynamic-tool",
        toolName: "readFile",
        toolCallId: "read_1",
        state: "output-error",
        input: { path: "/bad" },
        errorText: "Sandbox operation failed.",
      },
      {
        type: "tool-mouseClick",
        toolCallId: "click_1",
        state: "input-streaming",
      },
    ],
  },
]
const { Chat } = load("../components/chat.tsx", {
  "react/jsx-runtime": jsxRuntime,
  react: React,
  ai: { isToolUIPart, getToolName },
  "@ai-sdk/react": {
    useChat: () => ({ messages: renderedMessages, status: "ready" }),
  },
  "@trigger.dev/sdk/chat/react": {
    useTriggerChatTransport: () => ({}),
    useLoadTranscript: () => ({ messages: renderedMessages, isLoading: false }),
  },
  "@/actions/chat": {},
  "@/components/ai-elements/conversation": primitives([
    "Conversation",
    "ConversationContent",
    "ConversationEmptyState",
    "ConversationScrollButton",
  ]),
  "@/components/ai-elements/message": primitives([
    "Message",
    "MessageContent",
    "MessageResponse",
  ]),
  "@/components/ai-elements/prompt-input": primitives([
    "PromptInput",
    "PromptInputBody",
    "PromptInputFooter",
    "PromptInputSubmit",
    "PromptInputTextarea",
  ]),
  "@/components/ai-elements/tool": {
    ...primitives(["Tool", "ToolContent"]),
    ToolHeader: (props) => React.createElement("div", null, props.state),
    ToolInput: ({ input }) =>
      React.createElement("pre", null, JSON.stringify(input)),
    ToolOutput: ({ output, errorText }) =>
      React.createElement("pre", null, JSON.stringify(output), errorText),
  },
  "@/components/ui/alert": primitives(["Alert", "AlertDescription"]),
  "@/components/ui/button": primitives(["Button"]),
})
const markup = renderToStaticMarkup(
  React.createElement(Chat, { chatId: "chat_1" })
)
assert.match(markup, /Done\./)
assert.match(markup, /output-available/)
assert.match(markup, /input-streaming/)
assert.match(markup, /output-error/)
assert.match(markup, /home\/test/)
assert.match(markup, /Screen inspected/)
assert.match(markup, /Sandbox operation failed/)
assert.doesNotMatch(markup, /SECRET_SCREENSHOT_BYTES/)
console.log(
  "Chat render checks passed: text, static/dynamic tool calls, pending/errors, and screenshots excluded (stubbed UI boundaries)."
)
