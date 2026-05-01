import 'server-only';
import { Resend } from 'resend';
import {
  insertNotification,
  type Notification,
} from '@/db/queries/notifications';

export type NotificationKind =
  | 'kid_search_request'
  | 'channel_upload'
  | 'live_search_alert'
  | 'digest';

export type SendInput = {
  parentId: string;
  parentEmail: string | null;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string | null;
  email?: { subject: string; html: string; text: string };
};

let cachedResend: Resend | null = null;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cachedResend) cachedResend = new Resend(key);
  return cachedResend;
}

export async function send(input: SendInput): Promise<Notification> {
  const note = await insertNotification({
    parentId: input.parentId,
    kind: input.kind,
    title: input.title,
    body: input.body,
    href: input.href ?? null,
  });
  if (input.email && input.parentEmail) {
    const from = process.env.RESEND_FROM_EMAIL;
    const resend = getResend();
    if (resend && from) {
      await resend.emails.send({
        from,
        to: input.parentEmail,
        subject: input.email.subject,
        html: input.email.html,
        text: input.email.text,
      });
    }
  }
  return note;
}

export type DigestSummary = {
  parentId: string;
  parentEmail: string | null;
  pendingCount: number;
  searchRequestCount: number;
  channelUploadCount: number;
};

export async function sendDigest(input: DigestSummary): Promise<void> {
  if (input.pendingCount === 0) return;
  const subject = `${input.pendingCount} pending ${
    input.pendingCount === 1 ? 'video' : 'videos'
  } waiting for your review`;
  const text = [
    subject,
    '',
    `Channel uploads: ${input.channelUploadCount}`,
    `Search requests: ${input.searchRequestCount}`,
    '',
    'Open the parent dashboard to review.',
  ].join('\n');
  const html = `
    <p><strong>${subject}</strong></p>
    <ul>
      <li>Channel uploads: ${input.channelUploadCount}</li>
      <li>Search requests: ${input.searchRequestCount}</li>
    </ul>
    <p>Open the parent dashboard to review.</p>
  `.trim();
  await send({
    parentId: input.parentId,
    parentEmail: input.parentEmail,
    kind: 'digest',
    title: subject,
    body: `${input.channelUploadCount} new uploads, ${input.searchRequestCount} search requests`,
    href: '/dashboard',
    email: { subject, html, text },
  });
}
