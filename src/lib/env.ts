export const STORAGE_BUCKET = "math-forum-media";
export const MAX_BACKEND_IMAGE_BYTES = 1 * 1024 * 1024; // 1 MB hard server cap
export const MAX_FRONTEND_RAW_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB before client WebP compression

function isRealValue(val: string | undefined): val is string {
  if (!val) return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (
    trimmed.includes("your-project-id") ||
    trimmed.includes("your-project-ref") ||
    trimmed.includes("your-password") ||
    trimmed.includes("your_key")
  ) {
    return false;
  }
  return true;
}

export function getSupabaseUrl(): string | null {
  if (isRealValue(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
    return process.env.NEXT_PUBLIC_SUPABASE_URL.trim();
  }
  return null;
}

export function getSupabasePublishableKey(): string | null {
  for (const candidate of [
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ]) {
    if (isRealValue(candidate)) return candidate.trim();
  }
  return null;
}

export function getSupabaseSecretKey(): string | null {
  for (const candidate of [
    process.env.SUPABASE_SECRET_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ]) {
    if (isRealValue(candidate)) return candidate.trim();
  }
  return null;
}

export function isSupabaseAuthConfigured(): boolean {
  return getSupabaseUrl() !== null && getSupabasePublishableKey() !== null;
}

export function isSupabaseStorageConfigured(): boolean {
  return getSupabaseUrl() !== null && getSupabaseSecretKey() !== null;
}

export function getDatabaseUrl(): string | null {
  for (const candidate of [process.env.DATABASE_URL, process.env.DIRECT_URL]) {
    if (
      isRealValue(candidate) &&
      (candidate.trim().startsWith("postgresql://") ||
        candidate.trim().startsWith("postgres://"))
    ) {
      return candidate.trim();
    }
  }
  return null;
}

export function isDatabaseConfigured(): boolean {
  return getDatabaseUrl() !== null;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || adminEmail === "admin@example.com") return false;
  return email.trim().toLowerCase() === adminEmail;
}

export function getFallbackSiteName(): string {
  return process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "CMC";
}

export function getFallbackDefaultPoints(): number {
  const n = Number(process.env.DEFAULT_SOLVED_POINTS || "10");
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
}
