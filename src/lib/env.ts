import { EnvSchema } from '../schemas';

function getProcessEnv() {
  return {
    PUBLIC_SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL || 'https://mock-supabase.local',
    PUBLIC_SUPABASE_ANON_KEY: import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
    PUBLIC_CLOUDINARY_CLOUD_NAME: import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME || 'mumu-tech',
    CLOUDINARY_API_KEY: import.meta.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: import.meta.env.CLOUDINARY_API_SECRET,
    ADMIN_SESSION_SECRET: import.meta.env.ADMIN_SESSION_SECRET || 'dev-secret-key-12345',
  };
}

export const env = EnvSchema.parse(getProcessEnv());
