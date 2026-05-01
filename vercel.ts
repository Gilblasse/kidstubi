import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  framework: 'nextjs',
  crons: [
    { path: '/api/cron/channel-uploads', schedule: '0 6 * * *' },
    { path: '/api/cron/digest', schedule: '0 14 * * *' },
  ],
};
