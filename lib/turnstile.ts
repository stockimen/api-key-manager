/**
 * Cloudflare Turnstile 验证工具
 */

export const TURNSTILE_SITE_KEY = "0x4AAAAAAC6DuV0dfRnI8BLG"

export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY || ""
  if (!secret) return true // 未配置时跳过验证
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${secret}&response=${token}&remoteip=${ip}`,
  })
  const data = await res.json()
  return data.success === true
}

export function getClientIP(request: Request): string {
  const forwardedFor = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown"
  return forwardedFor.split(",")[0]?.trim() || "unknown"
}
