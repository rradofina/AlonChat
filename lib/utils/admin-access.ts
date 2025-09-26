// Admin access control utility
// During development, uses environment variable
// In production, will use database table (see FUTURE_IMPLEMENTATIONS.md)

export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false

  // Get admin emails from environment variable (NEXT_PUBLIC_ prefix makes it accessible client-side)
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS || ''
  const adminEmailList = adminEmails.split(',').map(e => e.trim().toLowerCase())

  return adminEmailList.includes(email.toLowerCase())
}

// For client-side use in React components
export function isAdminEmailClient(email: string | undefined): boolean {
  if (!email) return false

  // Use NEXT_PUBLIC_ prefixed variable for client-side access
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS || ''
  const adminEmailList = adminEmails.split(',').map(e => e.trim().toLowerCase())

  return adminEmailList.includes(email.toLowerCase())
}