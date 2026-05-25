import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: 'postgresql://postgres.ceeqapencynfsbfphnmg:wNDrRdOYLj1pS3Wf@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1',
  },
});