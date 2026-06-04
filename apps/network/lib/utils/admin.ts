/**
 * Admin access control utilities
 * Users can only access admin features if their email is in ADMIN_EMAILS env var
 */

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails.includes(email.toLowerCase());
}

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}
