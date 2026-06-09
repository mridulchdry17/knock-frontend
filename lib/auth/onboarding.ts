import { apiFetch } from "@/lib/api/client";
import { OnboardingStatusSchema, type OnboardingStatus } from "@/lib/auth/types";

export async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  const data = await apiFetch<unknown>("/api/v1/onboarding/status");
  return OnboardingStatusSchema.parse(data);
}

export async function claimWaitlist(email: string): Promise<OnboardingStatus> {
  const data = await apiFetch<unknown>("/api/v1/onboarding/claim-waitlist", {
    method: "POST",
    body: { email },
  });
  return OnboardingStatusSchema.parse(data);
}

export async function joinWaitlist(): Promise<{ status: string }> {
  const data = await apiFetch<{ status: string }>("/api/v1/onboarding/join-waitlist", {
    method: "POST",
  });
  return data ?? { status: "awaiting_approval" };
}

export async function logout(): Promise<void> {
  await apiFetch<{ ok: boolean }>("/api/v1/auth/logout", { method: "POST" });
}
