import { createClerkClient } from "@clerk/backend"

import { BILLING_ERROR } from "./billing"

// Workers have no request session; check the chat owner's subscription each turn.
export async function requirePaidUser(userId: string) {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  const subscription = await clerk.billing.getUserBillingSubscription(userId)
  if (
    !subscription.subscriptionItems.some(
      (item) =>
        item.plan?.slug === "pro" &&
        (item.status === "active" ||
          (item.status === "canceled" &&
            item.periodEnd !== null &&
            item.periodEnd > Date.now()))
    )
  )
    throw new Error(BILLING_ERROR)
}
