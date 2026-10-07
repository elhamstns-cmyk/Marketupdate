import { json, query, DEMO, SEED, DEMO_AGENT, db, isActive, latestReport, forPlan, publicAgent } from '../lib/util.js';
// Public: the branded report an agent's clients open.
export default async function handler(req, res) {
  try {
    const slug = query(req).get('slug');
    if (DEMO || slug === 'demo') return json(res, 200, { agent: DEMO_AGENT, report: SEED, plan: 'pro', sample: true });
    const [p] = await db(`profiles?slug=eq.${encodeURIComponent(slug)}&limit=1`);
    if (!p || !isActive(p)) return json(res, 404, { error: 'This report is not available right now.' });
    json(res, 200, { agent: publicAgent(p), report: forPlan(await latestReport(), p.plan), plan: p.plan });
  } catch (err) { json(res, 500, { error: 'Something went wrong.' }); }
}
