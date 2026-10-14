import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import ts from "typescript"
import * as orm from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
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
let updateRows = [["bot_1"]]
let updateFailure = false
const updates = []
const updateDb = drizzle({
  client: {
    query: async (query, values) => {
      updates.push({ text: query.text, values })
      if (updateFailure) throw new Error("Database unavailable")
      return { rows: updateRows }
    },
  },
})
const dependencies = {
  "drizzle-orm": orm,
  "@clerk/nextjs/server": {
    auth: {
      protect: async () => {
        if (!authenticated) throw new Error("Unauthorized")
        return { userId: "user_1" }
      },
    },
  },
  "next/cache": { revalidatePath: (...args) => paths.push(args) },
  "@/lib/db/schema": schema,
  "@/lib/db": {
    db: {
      update: (...args) => updateDb.update(...args),
      delete: (...args) => updateDb.delete(...args),
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
assert.deepEqual(paths, [["/(dashboard)", "layout"]])
for (const table of [schema.bots, schema.chats, schema.chatMembers]) {
  failingTable = table
  assert.ok((await actions.createBot(valid)).error)
  assert.equal(rows.length, 3)
  assert.deepEqual(paths, [["/(dashboard)", "layout"]])
}
console.log(
  "Bot checks passed: validation, ownership, auth, linked inserts, and transaction failures."
)

authenticated = false
await assert.rejects(actions.updateBot("bot_1", valid), /Unauthorized/)
assert.equal(updates.length, 0)
authenticated = true
for (const [id, input] of [
  [null, valid],
  ["", valid],
  ["bot_1", { ...valid, name: " " }],
]) {
  assert.ok((await actions.updateBot(id, input)).error)
}
assert.equal(updates.length, 0)
assert.deepEqual(
  await actions.updateBot("bot_1", {
    ...valid,
    userId: "attacker",
    id: "injected",
    sandboxId: "injected",
  }),
  { success: true }
)
assert.match(
  updates[0].text,
  /where \(.*"bots"\."id" = \$5 and "bots"\."user_id" = \$6\)/
)
assert.deepEqual(updates[0].values, [
  "Ada",
  "seed",
  "Research assistant",
  "",
  "bot_1",
  "user_1",
])
assert.deepEqual(paths.at(-1), ["/(dashboard)", "layout"])
const pathCount = paths.length
updateRows = []
assert.ok((await actions.updateBot("other_users_bot", valid)).error)
updateFailure = true
assert.ok((await actions.updateBot("bot_1", valid)).error)
assert.equal(paths.length, pathCount)
console.log(
  "Update checks passed: validation, authentication, ownership-scoped SQL, spoofed fields, missing bot, and database failure (stubbed)."
)

authenticated = false
await assert.rejects(actions.deleteBot("bot_1"), /Unauthorized/)
authenticated = true
const beforeDelete = updates.length
for (const id of [null, "", {}, 123])
  assert.ok((await actions.deleteBot(id)).error)
assert.equal(updates.length, beforeDelete)
updateFailure = false
updateRows = [["bot_1"]]
assert.deepEqual(await actions.deleteBot("bot_1"), { success: true })
assert.match(
  updates.at(-1).text,
  /delete from "bots" where \("bots"\."id" = \$1 and "bots"\."user_id" = \$2\)/
)
assert.deepEqual(updates.at(-1).values, ["bot_1", "user_1"])
const deletePathCount = paths.length
updateRows = []
assert.ok((await actions.deleteBot("other_users_bot")).error)
updateFailure = true
assert.ok((await actions.deleteBot("bot_1")).error)
assert.equal(paths.length, deletePathCount)
console.log(
  "Delete checks passed: authentication, ID validation, ownership-scoped SQL, missing bot, and database failure (stubbed)."
)
