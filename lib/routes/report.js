import { json, query, DEMO, SEED, DEMO_AGENT, db, isActive, latestReport, reportFor, forPlan, publicAgent, monthKeys, monthKey } from '../util.js';
import { cleanMonths, monthsAllowed } from '../../public/js/layout.js';
// Public: the branded report an agent's clients open. ?v=<id> opens one saved version (its area and settings).
// ?m=2024-03 opens an older month (Pro, when the agent lets clients look at past months, or for a link made for one month).
// `months` lists the months the client may pick (newest first); `latest` is the newest month.
export default async function handler(req, res) {
  try {
    const q = query(req), slug = q.get('slug'), v = q.get('v');
    if (DEMO || slug === 'demo') { const k = monthKey(SEED.month);
      return json(res, 200, { agent: DEMO_AGENT, report: SEED, plan: 'pro', sample: true, months: [k], latest: k, personal: q.get('p') ? { id: 'sample', name: 'the Chen family', city: 'Coquitlam', hood: 'Burke Mountain', type: 'd' } : null }); }
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
      if (l) { personal = { id: l.id, name: l.name, city: l.city, hood: l.hood, type: l.type, month: l.month || null };
        // Switching months inside the report (sw=1) is not a new open.
        if (q.get('sw') !== '1') await db(`personal_links?id=eq.${l.id}`, { method: 'PATCH', prefer: 'return=minimal', data: { opens: (l.opens || 0) + 1, last_opened_at: new Date().toISOString() } }).catch(() => {}); }
    }
    // Past months: what the client may pick, and the month this link opens on.
    let months = [], latest = null;
    if (p.plan === 'pro') {
      const keys = await monthKeys(), M = cleanMonths(agent.show?.months); latest = keys[0] || null;
      months = monthsAllowed(keys, M);
      const want = /^\d{4}-\d{2}$/.test(q.get('m') || '') ? q.get('m') : personal?.month || null;
      // A month is allowed when the client may pick it, or when the agent made a personal link that opens on it.
      const ok = want && keys.includes(want) && (months.includes(want) || want === personal?.month || (M.links && want === q.get('m')));
      if (ok && want !== latest && !report) report = await reportFor(want);
      if (ok && !months.includes(want)) months = [...months, want].sort().reverse();
    }
    json(res, 200, { agent, report: forPlan(report || (await latestReport()), p.plan), plan: p.plan, view, personal, months, latest });
  } catch (err) { json(res, 500, { error: 'Something went wrong.' }); }
}
