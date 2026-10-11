import assert from "node:assert/strict"

const baseUrl = process.argv[2] ?? "http://localhost:3000"

for (const path of ["/", "/sign-in", "/sign-up"]) {
  const response = await fetch(new URL(path, baseUrl), { redirect: "manual" })
  assert.equal(response.status, 200, `${path} should be public`)
}

const response = await fetch(new URL("/dashboard", baseUrl), {
  redirect: "manual",
})
assert.ok(
  [302, 303, 307, 308].includes(response.status),
  "Signed-out dashboard access must redirect"
)
assert.equal(
  new URL(response.headers.get("location"), baseUrl).pathname,
  "/sign-in"
)
assert.ok(
  !(await response.text()).includes("You are signed in."),
  "Protected content must not leak"
)
console.log(
  "Auth smoke check passed: public routes load; signed-out dashboard access redirects."
)
