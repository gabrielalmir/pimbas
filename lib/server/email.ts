/**
 * Email service module.
 *
 * NOTE: The real email provider (Resend) is a pending blocker tracked in issue #11.
 * For now this module is a stub that logs the intent — no actual email is sent.
 */

type UserLike = {
  id: string;
  email: string;
  name: string;
};

export async function sendPasswordResetEmail(user: UserLike, token: string): Promise<void> {
  // TODO(#11): integrate Resend (or another provider) to deliver the actual email.
  console.info(`[email] password-reset token for ${user.email} (userId=${user.id}): ${token}`);
}
