import { timingSafeEqual } from "crypto";

export function verifyAdminAuth(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const token = authHeader.slice(7);
  const adminKey = process.env.PYX_ADMIN_API_KEY;
  if (!adminKey) return false;

  try {
    const tokenBuf = Buffer.from(token);
    const keyBuf = Buffer.from(adminKey);
    if (tokenBuf.length !== keyBuf.length) return false;
    return timingSafeEqual(tokenBuf, keyBuf);
  } catch {
    return false;
  }
}
