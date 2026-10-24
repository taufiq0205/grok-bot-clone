"use client"

import Link from "next/link"
import { toast } from "@/components/ui/toast"
import { BILLING_ERROR } from "@/lib/billing"

export function showUpgradeToast() {
  toast.add({
    id: "paid-plan-required",
    type: "error",
    title: "Pro plan required",
    description: (
      <>
        {BILLING_ERROR}{" "}
        <Link href="/pricing" className="underline">
          View plans
        </Link>
      </>
    ),
  })
}
