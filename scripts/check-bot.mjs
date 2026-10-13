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
let databaseFails = false
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
      insert: (table) => {
        assert.equal(table, schema.bots)
        return {
          values: async (row) => {
            if (databaseFails) throw new Error("Database unavailable")
            rows.push(row)
          },
        }
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
  }),
  { success: true }
)
assert.deepEqual(rows, [
  {
    name: "Ada",
    job: "Research assistant",
    avatar: "seed",
    instructions: "",
    userId: "user_1",
  },
])
assert.deepEqual(paths, ["/"])
databaseFails = true
assert.ok((await actions.createBot(valid)).error)
assert.equal(rows.length, 1)
assert.deepEqual(paths, ["/"])
console.log(
  "Bot checks passed: validation, ownership, auth, insert, and database failure."
)
