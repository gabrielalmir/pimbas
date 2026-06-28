/**
 * Compute a Gravatar URL from an email address.
 * Uses SHA-256 hashing, which Gravatar supports since 2024.
 */
export async function gravatarUrl(email: string, size = 80): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `https://www.gravatar.com/avatar/${hashHex}?s=${size}&d=identicon`;
}
