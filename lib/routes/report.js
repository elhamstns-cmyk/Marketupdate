import { json, query, DEMO, SEED, DEMO_AGENT, db, isActive, latestReport, reportFor, forPlan, publicAgent } from '../util.js';
// Public: the branded report an agent's clients open. ?v=<id> opens one saved version (its area and settings).
export default async function handler(req, res) {
  try {
    const q = query(req), slug = q.get('slug'), v = q.get('v');
    if (DEMO || slug === 'demo') return json(res, 200, { agent: DEMO_AGENT, report: SEED, plan: 'pro', sample: true, personal: q.get('p') ? { id: 'sample', name: 'the Chen family', city: 'Coquitlam', hood: 'Burke Mountain', type: 'd' } : null });
    const [p] = await db(`profiles?slug=eq.${encodeURIComponent(slug)}&limit=1`);
    if (!p || !isActive(p) || p.licence_status === 'rejected') return json(res, 404, { error: 'This report is not available right now.' });
    const agent = publicAgent(p);
    let view = null, report;
    if (v) {
      const [x] = await db(`exports?id=eq.${encodeURIComponent(v)}&user_id=eq.${p.id}&limit=1`);
      if (x) {
        if (p.plan === 'pro') { if (x.settings?.theme) agent.theme = x.settings.theme; if (x.settings?.show) agent.show = x.settings.show; }
        view = { area: x.area, kind: x.kind, month: x.month };
        // Links and emails always show the newest month; PDFs and images keep the month they were made from.
        report = ['pdf', 'post', 'story'].includes(x.kind) ? await reportFor(x.month_key) : await latestReport();
      }
    }
    // A personal link: the client's name and neighbourhood (Pro). Counts as opened.
    let personal = null;
    const pid = q.get('p');
    if (pid && p.plan === 'pro') {
      const [l] = await db(`personal_links?id=eq.${encodeURIComponent(pid)}&user_id=eq.${p.id}&limit=1`);
      if (l) { personal = { id: l.id, name: l.name, city: l.city, hood: l.hood, type: l.type };
        await db(`personal_links?id=eq.${l.id}`, { method: 'PATCH', prefer: 'return=minimal', data: { opens: (l.opens || 0) + 1, last_opened_at: new Date().toISOString() } }).catch(() => {}); }
    }
    json(res, 200, { agent, report: forPlan(report || (await latestReport()), p.plan), plan: p.plan, view, personal });
  } catch (err) { json(res, 500, { error: 'Something went wrong.' }); }
}
