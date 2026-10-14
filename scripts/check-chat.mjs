import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import * as orm from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import ts from "typescript"
import * as schema from "../lib/db/schema.ts"

let authenticated = true
let failure = false
let rows = [["chat_1", "bot_1", "Writer", "Be brief", "Quill", "avatar_1"]]
const requests = []
const db = drizzle({
  client: {
    query: async (query, values) => {
      requests.push({ text: query.text, values })
      if (failure) throw new Error("Database unavailable")
      return { rows }
    },
  },
})
const dependencies = {
  "server-only": {},
  "@clerk/nextjs/server": {
    auth: {
      protect: async () => {
        if (!authenticated) throw new Error("Unauthorized")
        return { userId: "user_1" }
      },
    },
  },
  "drizzle-orm": orm,
  "@/lib/db": { db },
  "@/lib/db/schema": schema,
}
const compiled = ts.transpileModule(
  readFileSync(new URL("../queries/chats.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText
const queries = {}
new Function("require", "exports", compiled)((name) => {
  assert.ok(name in dependencies, `Unexpected dependency: ${name}`)
  return dependencies[name]
}, queries)

authenticated = false
await assert.rejects(queries.getChat("chat_1"), /Unauthorized/)
assert.equal(requests.length, 0)
authenticated = true
assert.deepEqual(await queries.getChat("chat_1"), {
  id: "chat_1",
  botId: "bot_1",
  botJob: "Writer",
  botInstructions: "Be brief",
  botName: "Quill",
  botAvatar: "avatar_1",
})
const request = requests[0]
assert.match(request.text, /"bots"\."user_id" = \$1/)
assert.match(
  request.text,
  /order by "chat_members"\."joined_at" asc, "bots"\."id" asc limit \$2/
)
assert.match(
  request.text,
  /where \("chats"\."id" = \$4 and "chats"\."user_id" = \$5\)/
)
assert.deepEqual(request.values, ["user_1", 1, "user_1", "chat_1", "user_1", 1])
rows = []
assert.equal(await queries.getChat("other_users_chat"), undefined)
failure = true
await assert.rejects(
  queries.getChat("chat_1"),
  (error) => error.cause?.message === "Database unavailable"
)
console.log(
  "Chat checks passed: auth, scoped SQL, first bot, missing chat, and database failure (stubbed)."
)
