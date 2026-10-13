import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import ts from "typescript"
import * as schema from "../lib/db/schema.ts"

const valid = {
  name: " Ada ",
  job: " Research assistant ",
  avatar: "seed",
  instructions: "",
}
assert.equal(schema.createBotSchema.parse(valid).name, "Ada")
for (const input of [
  null,
  {},
  { ...valid, name: " " },
  { ...valid, job: " " },
  { ...valid, avatar: "" },
  { ...valid, name: "a".repeat(101) },
  { ...valid, instructions: "a".repeat(10001) },
]) {
  assert.equal(schema.createBotSchema.safeParse(input).success, false)
}
assert.equal(
  schema.insertBotSchema.safeParse({ ...valid, userId: "user_1" }).success,
  true
)
assert.equal(schema.insertBotSchema.safeParse(valid).success, false)

// Run the real action with Clerk and database boundaries stubbed.
let authenticated = true
let failingTable
const rows = []
const paths = []
const dependencies = {
  "@clerk/nextjs/server": {
    auth: {
      protect: async () => {
        if (!authenticated) throw new Error("Unauthorized")
        return { userId: "user_1" }
      },
    },
  },
  "next/cache": { revalidatePath: (path) => paths.push(path) },
  "@/lib/db/schema": schema,
  "@/lib/db": {
    db: {
      transaction: async (callback) => {
        const pending = []
        await callback({
          insert: (table) => ({
            values: (row) => {
              const result = Promise.resolve().then(() => {
                if (table === failingTable)
                  throw new Error("Database unavailable")
                pending.push({ table, row })
                return [{ id: table === schema.bots ? "bot_1" : "chat_1" }]
              })
              result.returning = () => result
              return result
            },
          }),
        })
        rows.push(...pending)
      },
    },
  },
}
const compiled = ts.transpileModule(
  readFileSync(new URL("../actions/bot.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText
const actions = {}
new Function("require", "exports", compiled)((name) => {
  assert.ok(name in dependencies, `Unexpected dependency: ${name}`)
  return dependencies[name]
}, actions)

authenticated = false
await assert.rejects(actions.createBot(valid), /Unauthorized/)
assert.equal(rows.length, 0)
authenticated = true
assert.ok((await actions.createBot({ ...valid, name: " " })).error)
assert.equal(rows.length, 0)
assert.deepEqual(
  await actions.createBot({
    ...valid,
    userId: "attacker",
    id: "injected",
    sandboxId: "injected",
    chatId: "injected",
    botId: "injected",
    kind: "group",
  }),
  { success: true }
)
assert.deepEqual(rows, [
  {
    table: schema.bots,
    row: {
      name: "Ada",
      job: "Research assistant",
      avatar: "seed",
      instructions: "",
      userId: "user_1",
    },
  },
  { table: schema.chats, row: { userId: "user_1", kind: "direct" } },
  { table: schema.chatMembers, row: { chatId: "chat_1", botId: "bot_1" } },
])
assert.deepEqual(paths, ["/"])
for (const table of [schema.bots, schema.chats, schema.chatMembers]) {
  failingTable = table
  assert.ok((await actions.createBot(valid)).error)
  assert.equal(rows.length, 3)
  assert.deepEqual(paths, ["/"])
}
console.log(
  "Bot checks passed: validation, ownership, auth, linked inserts, and transaction failures."
)
