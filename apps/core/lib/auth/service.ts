import { z } from "zod";
import { createAccessToken, createRefreshToken } from "@/lib/auth/tokens";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";

export const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  organizationId: z.string().optional()
});

export const signupSchema = credentialsSchema.extend({
  fullName: z.string().min(2),
  organizationName: z.string().min(2).optional()
});

export const resetPasswordSchema = z.object({
  email: z.string().email()
});

export const confirmResetSchema = z.object({
  token:    z.string().min(1),
  password: z.string().min(8),
});

export async function signup(input: z.infer<typeof signupSchema>) {
  if (!isSupabaseConfigured) {
    return issueLocalTokens("demo-user", input.organizationId, "organization_owner");
  }
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName }
  });
  if (error) throw error;
  return issueLocalTokens(data.user.id, input.organizationId, "organization_owner");
}

export async function login(input: z.infer<typeof credentialsSchema>) {
  if (!isSupabaseConfigured) {
    return issueLocalTokens("demo-user", input.organizationId, "organization_owner");
  }
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password
  });
  if (error) throw error;
  return issueLocalTokens(data.user.id, input.organizationId, "organization_owner");
}

export async function requestPasswordReset(input: z.infer<typeof resetPasswordSchema>) {
  if (!isSupabaseConfigured) {
    return { accepted: true };
  }
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.auth.resetPasswordForEmail(input.email);
  if (error) throw error;
  return { accepted: true };
}

/**
 * Complete the password reset using the recovery token from the email link
 * and set the new password via Supabase admin.
 */
export async function confirmPasswordReset(input: z.infer<typeof confirmResetSchema>) {
  if (!isSupabaseConfigured) {
    return { success: true };
  }
  const supabase = createSupabaseAdminClient();
  // Exchange recovery token for a user context, then update password
  const { data: { user }, error: verifyError } = await supabase.auth.getUser(input.token);
  if (verifyError || !user) {
    throw new Error("Invalid or expired reset token");
  }
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: input.password,
  });
  if (updateError) throw updateError;
  return { success: true };
}

async function issueLocalTokens(userId: string, organizationId: string | undefined, role: "organization_owner") {
  return {
    accessToken: await createAccessToken({ sub: userId, organizationId, role }),
    refreshToken: await createRefreshToken(userId),
    tokenType: "Bearer",
    expiresIn: 900
  };
}
