import { json, DEMO, SITE_NAME, PLANS } from '../util.js';
export default function handler(req, res) {
  json(res, 200, { demo: DEMO, siteName: SITE_NAME, plans: PLANS,
    supabaseUrl: process.env.SUPABASE_URL || '', supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '' });
}
