import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const backend = process.env.BACKEND_URL;
  if (!backend) {
    return NextResponse.json(
      { error: { code: "config_error", message: "Service unavailable." } },
      { status: 503 },
    );
  }

  let email: string;
  try {
    const body = (await req.json()) as { email?: unknown };
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_body", message: "Invalid request." } },
      { status: 400 },
    );
  }

  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json(
      { error: { code: "invalid_email", message: "Enter a valid email address." } },
      { status: 422 },
    );
  }

  try {
    const upstream = await fetch(`${backend.replace(/\/$/, "")}/api/v1/waitlist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "X-Forwarded-For": req.headers.get("x-forwarded-for") ?? "",
        "User-Agent": req.headers.get("user-agent") ?? "knock-frontend-proxy",
      },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });

    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { error: { code: "upstream_unavailable", message: "Service is temporarily unavailable. Try again." } },
      { status: 502 },
    );
  }
}
