#!/usr/bin/env node
/**
 * Updates Supabase "Reset password" email template to avoid Gmail/link scanners
 * consuming one-time tokens before the parent opens the email.
 *
 * Requires SUPABASE_ACCESS_TOKEN (personal access token) in env.
 * Optional: SUPABASE_PROJECT_REF (defaults to gknnfbalijxykqycopic)
 */
import process from 'node:process';

const projectRef = process.env.SUPABASE_PROJECT_REF || 'gknnfbalijxykqycopic';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!accessToken) {
  console.error('Missing SUPABASE_ACCESS_TOKEN. Create one at https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const subject = 'Reset your Gradlify password';
const content = `
<h2>Reset your password</h2>
<p>We received a request to reset the password for your Gradlify account.</p>
<p>
  <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery">
    Reset password
  </a>
</p>
<p>If you did not request this, you can ignore this email.</p>
<p>This link expires in 1 hour.</p>
`.trim();

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    mailer_subjects_recovery: subject,
    mailer_templates_recovery_content: content,
  }),
});

const body = await response.text();
if (!response.ok) {
  console.error(`Failed to update recovery email template (${response.status}):`, body);
  process.exit(1);
}

console.log('Updated Supabase recovery email template.');
console.log('Subject:', subject);
console.log('Link target uses {{ .RedirectTo }} with token_hash (scanner-safe).');
