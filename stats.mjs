// Gera o card de estatísticas do GitHub (claro e escuro) com dados reais da API.
// Roda no GitHub Actions (precisa de GITHUB_TOKEN). Para testar o visual sem token:
//   node stats.mjs ./preview --mock

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { THEMES, SANS, MONO, GREEN, esc, svg } from './build.mjs';

const LOGIN = process.env.GITHUB_USER || 'GustavoViti';
const SINCE = 2020; // ano em que começou a desenvolver
const outDir = process.argv[2] || 'dist';
const mock = process.argv.includes('--mock');

const QUERY = `query($login: String!) {
  user(login: $login) {
    repositories(ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, first: 100) {
      totalCount
      nodes { languages(first: 10, orderBy: {field: SIZE, direction: DESC}) { edges { size node { name color } } } }
    }
    contributionsCollection {
      contributionCalendar { totalContributions weeks { contributionDays { contributionCount date } } }
    }
  }
}`;

async function fetchData() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN não definido (use --mock para testar localmente).');
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'profile-stats' },
    body: JSON.stringify({ query: QUERY, variables: { login: LOGIN } }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors || json));
  return json.data.user;
}

function mockData() {
  const days = [];
  const start = Date.now() - 364 * 864e5;
  for (let i = 0; i < 365; i++) {
    days.push({ date: new Date(start + i * 864e5).toISOString().slice(0, 10), contributionCount: i % 9 === 0 ? 0 : (i * 7) % 11 });
  }
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push({ contributionDays: days.slice(i, i + 7) });
  const lang = (name, color, size) => ({ size, node: { name, color } });
  return {
    repositories: {
      totalCount: 14,
      nodes: [
        { languages: { edges: [lang('JavaScript', '#f1e05a', 520000), lang('CSS', '#663399', 120000), lang('HTML', '#e34c26', 90000)] } },
        { languages: { edges: [lang('TypeScript', '#3178c6', 300000), lang('Dart', '#00B4AB', 110000)] } },
      ],
    },
    contributionsCollection: { contributionCalendar: { totalContributions: 1234, weeks } },
  };
}

function summarize(user) {
  const cal = user.contributionsCollection.contributionCalendar;
  const days = cal.weeks.flatMap((w) => w.contributionDays).sort((a, b) => a.date.localeCompare(b.date));

  // sequência atual: se hoje ainda está zerado, conta a partir de ontem
  let i = days.length - 1;
  if (i >= 0 && days[i].contributionCount === 0) i--;
  let current = 0;
  for (; i >= 0 && days[i].contributionCount > 0; i--) current++;

  let longest = 0, run = 0;
  for (const d of days) { run = d.contributionCount > 0 ? run + 1 : 0; longest = Math.max(longest, run); }

  const totals = new Map();
  for (const repo of user.repositories.nodes) {
    for (const { size, node } of repo.languages.edges) {
      const cur = totals.get(node.name) || { size: 0, color: node.color || '#8b949e' };
      cur.size += size;
      totals.set(node.name, cur);
    }
  }
  const sum = [...totals.values()].reduce((a, b) => a + b.size, 0) || 1;
  let langs = [...totals.entries()].map(([name, v]) => ({ name, color: v.color, pct: (v.size / sum) * 100 })).sort((a, b) => b.pct - a.pct);
  if (langs.length > 6) {
    const rest = langs.slice(5).reduce((a, b) => a + b.pct, 0);
    langs = [...langs.slice(0, 5), { name: 'Outras', color: '#8b949e', pct: rest }];
  }

  return {
    contributions: cal.totalContributions,
    current, longest,
    repos: user.repositories.totalCount,
    years: new Date().getFullYear() - SINCE,
    langs,
  };
}

const fmt = (n) => n.toLocaleString('pt-BR');

function card(s, t) {
  const W = 1200, H = 270;
  const metrics = [
    [fmt(s.contributions), 'contribuições em 12 meses'],
    [`${s.current} ${s.current === 1 ? 'dia' : 'dias'}`, 'sequência atual'],
    [`${s.longest} ${s.longest === 1 ? 'dia' : 'dias'}`, 'maior sequência no ano'],
    [`${s.years} anos`, `desenvolvendo, desde ${SINCE}`],
  ];
  let left = '';
  metrics.forEach(([value, label], i) => {
    const x = 40 + (i % 2) * 280, y = 96 + Math.floor(i / 2) * 104;
    left += `<text x="${x}" y="${y}" font-family="${SANS}" font-size="40" font-weight="700" letter-spacing="-1" fill="${i === 1 && s.current > 0 ? (t === THEMES.light ? '#15803d' : GREEN) : t.text}">${esc(value)}</text>` +
      `<text x="${x}" y="${y + 28}" font-family="${SANS}" font-size="15" fill="${t.muted}">${esc(label)}</text>`;
  });

  // barra de linguagens
  const bx = 640, bw = 520, by = 76;
  let bar = '', acc = 0;
  s.langs.forEach((l) => {
    const w = (l.pct / 100) * bw;
    bar += `<rect x="${(bx + acc).toFixed(1)}" y="${by}" width="${Math.max(w, 0).toFixed(1)}" height="12" fill="${l.color}"/>`;
    acc += w;
  });
  let legend = '';
  s.langs.forEach((l, i) => {
    const x = bx + (i % 2) * 270, y = by + 52 + Math.floor(i / 2) * 36;
    legend += `<circle cx="${x + 6}" cy="${y - 5}" r="6" fill="${l.color}"/>` +
      `<text x="${x + 22}" y="${y}" font-family="${SANS}" font-size="16" fill="${t.text}">${esc(l.name)}</text>` +
      `<text x="${x + 250}" y="${y}" text-anchor="end" font-family="${MONO}" font-size="14" fill="${t.muted}">${l.pct.toFixed(1)}%</text>`;
  });

  return svg(W, H, `
  <defs><clipPath id="bar"><rect x="${bx}" y="${by}" width="${bw}" height="12" rx="6"/></clipPath></defs>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="20" fill="${t.bg}" stroke="${t.stroke}"/>
  <text x="40" y="44" font-family="${MONO}" font-size="12" font-weight="700" letter-spacing="1.4" fill="${t.muted}">ATIVIDADE NO GITHUB</text>
  ${left}
  <line x1="600" y1="32" x2="600" y2="${H - 32}" stroke="${t.stroke}"/>
  <text x="${bx}" y="44" font-family="${MONO}" font-size="12" font-weight="700" letter-spacing="1.4" fill="${t.muted}">LINGUAGENS · ${s.repos} REPOS PÚBLICOS</text>
  <rect x="${bx}" y="${by}" width="${bw}" height="12" rx="6" fill="${t.stroke}"/>
  <g clip-path="url(#bar)">${bar}</g>
  ${legend}
  <text x="${W - 32}" y="${H - 18}" text-anchor="end" font-family="${MONO}" font-size="11" fill="${t.muted}">atualizado em ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</text>
  `, `Atividade no GitHub: ${s.contributions} contribuições em 12 meses, sequência atual de ${metrics[1][0]}, maior sequência de ${metrics[2][0]}. Linguagens: ${s.langs.map((l) => `${l.name} ${l.pct.toFixed(1)}%`).join(', ')}.`);
}

const data = mock ? mockData() : await fetchData();
const stats = summarize(data);
mkdirSync(outDir, { recursive: true });
for (const [mode, t] of Object.entries(THEMES)) {
  writeFileSync(join(outDir, `stats-${mode}.svg`), card(stats, t));
  console.log('✓', `stats-${mode}.svg`);
}
