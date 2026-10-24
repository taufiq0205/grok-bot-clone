import { PricingTable } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"

export default async function PricingPage() {
  await auth.protect()

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Choose your plan</h1>
        <p className="text-muted-foreground">
          Pro unlocks bot creation, chat, and sandbox desktops. The free plan
          does not include access to bots or sandboxes.
        </p>
      </div>
      <PricingTable for="user" newSubscriptionRedirectUrl="/" />
    </main>
  )
}
