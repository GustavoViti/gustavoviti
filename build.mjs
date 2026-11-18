// Gera as artes SVG do README do perfil do GitHub.
// Uso: node build.mjs   (os arquivos saem em ./assets)
// Para mudar textos, projetos ou stack, edite os dados abaixo e rode de novo.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'assets');

/* ------------------------------------------------------------------ */
/* Dados                                                               */
/* ------------------------------------------------------------------ */

const PROJECTS = [
  {
    file: 'turbo-dealer', mono: 'TD',
    label: 'PRODUTO PRÓPRIO · REPASSE DE VEÍCULOS',
    name: 'Turbo Dealer',
    sub: 'Plataforma para repasses de veículos',
    desc: 'Captura carros dos grupos de WhatsApp, escreve o anúncio com IA, elimina duplicados e mostra quais clientes procuram cada carro.',
    tags: ['Electron', 'React', 'TypeScript', 'PostgreSQL', 'Gemini'],
  },
  {
    file: 'viti-training', mono: 'VT',
    label: 'PRODUTO PRÓPRIO · SAAS FITNESS',
    name: 'Viti Training',
    sub: 'SaaS para academias e personais',
    desc: 'App instalável para alunos, painel de gestão, financeiro e plano alimentar com IA. Cada cliente com a própria marca e dados isolados.',
    tags: ['PWA', 'Node.js', 'PostgreSQL', 'Multi-tenant'],
  },
  {
    file: 'ferreira-repasse', mono: 'FR',
    label: 'SOB MEDIDA · REVENDA DE VEÍCULOS',
    name: 'Ferreira Repasse',
    sub: 'Sistema para revenda de veículos',
    desc: 'Site pronto para o Google, cadastro pelo celular, anúncio gerado a partir da foto do carro e controle de vendas com troca.',
    tags: ['PWA', 'Node.js', 'MariaDB', 'Docker'],
  },
  {
    file: 'vitium', mono: 'VI',
    label: 'PROJETO PESSOAL · IA POR VOZ',
    name: 'Vitium',
    sub: 'Assistente de IA por voz',
    desc: 'Transcreve a fala no próprio computador, executa tarefas com o Claude Code e guarda o que aprende numa memória de longo prazo.',
    tags: ['Electron', 'React', 'Whisper', 'Claude Code'],
  },
];

// Diagrama "Por baixo do capô": como os sistemas costumam ser montados.
const ARCH = {
  clients: [
    { title: 'PWA instalável', hint: 'web e celular' },
    { title: 'Desktop', hint: 'Electron + React' },
    { title: 'Mobile', hint: 'Flutter' },
  ],
  api: {
    title: 'API · Node.js',
    rows: ['REST e WebSocket', 'Auth e permissões por perfil', 'Regras de negócio', 'Notificações · Web Push / FCM'],
  },
  data: {
    title: 'PostgreSQL',
    desc: 'Row Level Security: cada cliente só enxerga os próprios dados.',
    hint: 'também Supabase · MySQL · MariaDB',
  },
  integrations: {
    title: 'Integrações',
    desc: 'WhatsApp via Baileys, IA com Gemini e Groq, transcrição local com Whisper.',
  },
  infra: ['VPS Linux', 'Docker', 'Nginx', 'PM2', 'Vercel', 'Render', 'Railway'],
};

const STEPS = [
  { title: 'Entendo o problema', desc: 'Como o processo funciona hoje e o que precisa mudar.' },
  { title: 'Defino a solução', desc: 'Escopo, prioridades e etapas antes da primeira linha.' },
  { title: 'Desenvolvo por etapas', desc: 'Você testa o sistema enquanto ele ganha forma.' },
  { title: 'Coloco no ar', desc: 'Publico, implanto e ajusto a partir do uso real.' },
];

/* ------------------------------------------------------------------ */
/* Tema e utilitários                                                  */
/* ------------------------------------------------------------------ */

export const SANS = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif`;
export const MONO = `ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace`;

export const THEMES = {
  dark: {
    bg: '#0a0f1e', surface: '#0f1830', stroke: '#1d3150', text: '#ffffff', body: '#c6d0e0',
    muted: '#7f8ea8', accent: '#2a9be2', soft: '#a9d8f8', chipBg: '#12233f', chipText: '#a9d8f8',
    chipStroke: '#1f3a60', watermark: 0.06,
  },
  light: {
    bg: '#ffffff', surface: '#f4f8fc', stroke: '#d6e4f2', text: '#0a0f1e', body: '#3b4a62',
    muted: '#64748b', accent: '#0b6db3', soft: '#1878bd', chipBg: '#e8f3fc', chipText: '#0b6db3',
    chipStroke: '#cfe4f6', watermark: 0.07,
  },
};
const D = THEMES.dark;
export const GREEN = '#22c55e';

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Quebra o texto em linhas de até `max` caracteres. */
export function wrap(text, max) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Chips em mono, quebrando linha quando passa de maxW. Retorna { svg, height }. */
export function chips(x, y, items, t, { size = 14, maxW = Infinity, h = 30, gap = 8 } = {}) {
  const cw = size * 0.62;
  let cx = x, cy = y, out = '';
  for (const item of items) {
    const w = Math.round(item.length * cw + 24);
    if (cx + w > x + maxW && cx > x) { cx = x; cy += h + gap; }
    out += `<rect x="${cx}" y="${cy}" width="${w}" height="${h}" rx="${h / 2}" fill="${t.chipBg}" stroke="${t.chipStroke}"/>`;
    out += `<text x="${cx + w / 2}" y="${cy + h / 2 + size * 0.35}" text-anchor="middle" font-family="${MONO}" font-size="${size}" fill="${t.chipText}">${esc(item)}</text>`;
    cx += w + gap;
  }
  return { svg: out, height: cy + h - y };
}

export const svg = (w, h, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${body}</svg>\n`;

const write = (name, content) => { writeFileSync(join(OUT, name), content); console.log('✓', name); };

const grid = (id, color, opacity) =>
  `<pattern id="${id}" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="${color}" stroke-opacity="${opacity}"/></pattern>`;

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

function header() {
  const W = 1200, H = 380;
  const status = 'AGENDA ABERTA PARA NOVOS PROJETOS';
  const pillW = Math.round(status.length * 13 * 0.62 + 60);
  const layers = [
    { n: '01', label: 'Interface', hint: 'React · PWA · Electron' },
    { n: '02', label: 'API e integrações', hint: 'Node · IA · WhatsApp' },
    { n: '03', label: 'Banco de dados', hint: 'PostgreSQL · RLS' },
  ];
  const bx = 800, bw = 340, bh = 64, by = [62, 158, 254];

  let boxes = '';
  layers.forEach((l, i) => {
    boxes += `
    <g>
      <rect x="${bx}" y="${by[i]}" width="${bw}" height="${bh}" rx="14" fill="${D.surface}" stroke="${D.accent}" stroke-opacity=".25" stroke-width="1.5">
        <animate attributeName="stroke-opacity" values=".25;1;.25;.25" keyTimes="0;.15;.4;1" dur="3.6s" begin="${i * 1.2}s" repeatCount="indefinite"/>
      </rect>
      <text x="${bx + 24}" y="${by[i] + 39}" font-family="${MONO}" font-size="14" fill="${D.accent}">${l.n}</text>
      <text x="${bx + 62}" y="${by[i] + 30}" font-family="${SANS}" font-size="20" font-weight="600" fill="${D.text}">${esc(l.label)}</text>
      <text x="${bx + 62}" y="${by[i] + 50}" font-family="${MONO}" font-size="12" fill="${D.muted}">${esc(l.hint)}</text>
    </g>`;
  });
  // conectores com pacotes de dados descendo e subindo
  let wires = '';
  [[by[0] + bh, by[1]], [by[1] + bh, by[2]]].forEach(([y1, y2], i) => {
    const x = bx + bw / 2;
    wires += `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${D.accent}" stroke-opacity=".4" stroke-dasharray="3 4"/>`;
    wires += `<circle cx="${x - 10}" cy="${y1}" r="3" fill="${D.soft}"><animate attributeName="cy" values="${y1};${y2}" dur="1.2s" begin="${i * 0.6}s" repeatCount="indefinite"/></circle>`;
    wires += `<circle cx="${x + 10}" cy="${y2}" r="3" fill="${GREEN}"><animate attributeName="cy" values="${y2};${y1}" dur="1.2s" begin="${i * 0.6 + 0.3}s" repeatCount="indefinite"/></circle>`;
  });

  const tags = chips(64, 296, ['Web', 'Desktop', 'Mobile', 'WhatsApp + IA'], D, { size: 14 });

  return svg(W, H, `
  <defs>
    ${grid('g', D.accent, 0.07)}
    <radialGradient id="glow" cx="78%" cy="45%" r="45%">
      <stop offset="0" stop-color="${D.accent}" stop-opacity=".35"/>
      <stop offset="1" stop-color="${D.accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fade" x1="0" x2="1">
      <stop offset="0" stop-color="${D.bg}" stop-opacity=".2"/>
      <stop offset=".55" stop-color="${D.bg}" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="clip"><rect width="${W}" height="${H}" rx="24"/></clipPath>
  </defs>
  <g clip-path="url(#clip)">
    <rect width="${W}" height="${H}" fill="${D.bg}"/>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <rect width="${W}" height="${H}" fill="url(#glow)">
      <animate attributeName="opacity" values=".7;1;.7" dur="6s" repeatCount="indefinite"/>
    </rect>
    <rect width="${W}" height="${H}" fill="url(#fade)"/>

    <rect x="64" y="52" width="${pillW}" height="36" rx="18" fill="${GREEN}" fill-opacity=".1" stroke="${GREEN}" stroke-opacity=".35"/>
    <circle cx="86" cy="70" r="5" fill="${GREEN}"/>
    <circle cx="86" cy="70" r="5" fill="none" stroke="${GREEN}">
      <animate attributeName="r" values="5;13" dur="1.8s" repeatCount="indefinite"/>
      <animate attributeName="stroke-opacity" values=".8;0" dur="1.8s" repeatCount="indefinite"/>
    </circle>
    <text x="104" y="75" font-family="${MONO}" font-size="13" letter-spacing="1.2" fill="${GREEN}">${status}</text>

    <text x="62" y="168" font-family="${SANS}" font-size="72" font-weight="700" letter-spacing="-1.5" fill="${D.text}">Gustavo Viti</text>
    <text x="64" y="218" font-family="${SANS}" font-size="28" font-weight="500" fill="${D.soft}">Do banco de dados à tela final.</text>
    <text x="64" y="256" font-family="${SANS}" font-size="19" fill="${D.body}">SaaS, sistemas sob medida e automações com IA.</text>
    ${tags.svg}

    ${wires}
    ${boxes}
  </g>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="24" fill="none" stroke="${D.stroke}"/>
  `, 'Gustavo Viti — sistemas completos, do banco de dados à tela final. SaaS, sistemas sob medida e automações com IA.');
}

/* ------------------------------------------------------------------ */
/* Terminal animado                                                    */
/* ------------------------------------------------------------------ */

function terminal() {
  const lines = [
    { cmd: 'whoami' },
    { out: [['gustavo viti', D.text, 700], [' — dev fullstack. entrego o sistema inteiro, do banco à tela.', D.body]] },
    { cmd: 'cat servicos.txt' },
    { out: [['→ ', D.accent], ['sistemas sob medida para web, desktop e mobile', D.body]] },
    { out: [['→ ', D.accent], ['SaaS multi-tenant com dados isolados por cliente', D.body]] },
    { out: [['→ ', D.accent], ['automações com IA integradas ao WhatsApp', D.body]] },
    { cmd: 'ls produtos/' },
    { out: [['turbo-dealer/   viti-training/   ferreira-repasse/   vitium/', D.soft]] },
    { cmd: './orcamento --status' },
    { out: [['● ', GREEN], ['agenda aberta', GREEN, 700], ['  ·  me chama no WhatsApp', D.muted]] },
  ];
  const W = 1200, top = 92, step = 31, size = 18, cw = size * 0.62;
  const H = top + lines.length * step + 46;
  let t = 0.4, body = '', defs = '';

  lines.forEach((l, i) => {
    const y = top + i * step;
    if (l.cmd) {
      const typeDur = Math.max(0.35, l.cmd.length * 0.055);
      defs += `<clipPath id="c${i}"><rect x="64" y="${y - 22}" height="32" width="0"><animate attributeName="width" from="0" to="${Math.ceil(l.cmd.length * cw + 12)}" begin="${t.toFixed(2)}s" dur="${typeDur.toFixed(2)}s" fill="freeze"/></rect></clipPath>`;
      body += `<g opacity="0"><set attributeName="opacity" to="1" begin="${t.toFixed(2)}s" fill="freeze"/>
        <text x="40" y="${y}" font-family="${MONO}" font-size="${size}" fill="${GREEN}">$</text>
        <text x="64" y="${y}" font-family="${MONO}" font-size="${size}" fill="${D.text}" clip-path="url(#c${i})">${esc(l.cmd)}</text></g>`;
      t += typeDur + 0.35;
    } else {
      const spans = l.out.map(([s, c, w]) => `<tspan fill="${c}"${w ? ` font-weight="${w}"` : ''}>${esc(s)}</tspan>`).join('');
      body += `<g opacity="0"><set attributeName="opacity" to="1" begin="${t.toFixed(2)}s" fill="freeze"/>
        <text x="40" y="${y}" font-family="${MONO}" font-size="${size}" xml:space="preserve">${spans}</text></g>`;
      t += 0.22;
    }
  });
  // prompt final com cursor piscando
  const yEnd = top + lines.length * step;
  body += `<g opacity="0"><set attributeName="opacity" to="1" begin="${(t + 0.2).toFixed(2)}s" fill="freeze"/>
    <text x="40" y="${yEnd}" font-family="${MONO}" font-size="${size}" fill="${GREEN}">$</text>
    <rect x="64" y="${yEnd - 16}" width="11" height="20" fill="${D.accent}">
      <animate attributeName="opacity" values="1;0" dur="1s" calcMode="discrete" repeatCount="indefinite"/>
    </rect></g>`;

  return svg(W, H, `
  <defs>${defs}<clipPath id="win"><rect width="${W}" height="${H}" rx="16"/></clipPath></defs>
  <g clip-path="url(#win)">
    <rect width="${W}" height="${H}" fill="#0b1222"/>
    <rect width="${W}" height="46" fill="${D.surface}"/>
    <line x1="0" y1="46" x2="${W}" y2="46" stroke="${D.stroke}"/>
    <circle cx="28" cy="23" r="7" fill="#ff5f57"/><circle cx="52" cy="23" r="7" fill="#febc2e"/><circle cx="76" cy="23" r="7" fill="#28c840"/>
    <text x="${W / 2}" y="28" text-anchor="middle" font-family="${MONO}" font-size="14" fill="${D.muted}">gustavo@viti: ~</text>
    ${body}
  </g>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="16" fill="none" stroke="${D.stroke}"/>
  `, 'whoami: Gustavo Viti, dev fullstack. Serviços: sistemas sob medida para web, desktop e mobile; SaaS multi-tenant; automações com IA integradas ao WhatsApp. Agenda aberta.');
}

/* ------------------------------------------------------------------ */
/* Cards de projeto                                                    */
/* ------------------------------------------------------------------ */

function projectCard(p, t) {
  const W = 580, H = 320;
  const desc = wrap(p.desc, 50);
  const tagRow = chips(32, 258, p.tags, t, { size: 13, h: 28, maxW: 516 });
  return svg(W, H, `
  <defs>
    <clipPath id="clip"><rect width="${W}" height="${H}" rx="20"/></clipPath>
    <linearGradient id="bar" x1="0" x2="1">
      <stop offset="0" stop-color="${t.accent}"/><stop offset=".5" stop-color="${t.soft}"/><stop offset="1" stop-color="${t.accent}"/>
      <animateTransform attributeName="gradientTransform" type="translate" values="-1 0;1 0" dur="4s" repeatCount="indefinite"/>
    </linearGradient>
  </defs>
  <g clip-path="url(#clip)">
    <rect width="${W}" height="${H}" fill="${t.bg}"/>
    <rect width="${W}" height="4" fill="url(#bar)"/>
    <text x="${W - 28}" y="236" text-anchor="end" font-family="${SANS}" font-size="150" font-weight="800" letter-spacing="-6" fill="${t.accent}" fill-opacity="${t.watermark}">${p.mono}</text>
    <text x="32" y="50" font-family="${MONO}" font-size="12" letter-spacing="1.4" fill="${t.accent}">${esc(p.label)}</text>
    <circle cx="${W - 44}" cy="46" r="18" fill="${t.chipBg}" stroke="${t.chipStroke}"/>
    <path d="M${W - 50} ${52} L${W - 38} ${40} M${W - 47} ${40} H${W - 38} V${49}" fill="none" stroke="${t.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="32" y="96" font-family="${SANS}" font-size="32" font-weight="700" letter-spacing="-.5" fill="${t.text}">${esc(p.name)}</text>
    <text x="32" y="124" font-family="${SANS}" font-size="17" font-weight="500" fill="${t.soft}">${esc(p.sub)}</text>
    ${desc.map((l, i) => `<text x="32" y="${170 + i * 25}" font-family="${SANS}" font-size="17" fill="${t.body}">${esc(l)}</text>`).join('')}
    ${tagRow.svg}
  </g>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="20" fill="none" stroke="${t.stroke}"/>
  `, `${p.name} — ${p.sub}. ${p.desc}`);
}

/* ------------------------------------------------------------------ */
/* Como eu trabalho                                                    */
/* ------------------------------------------------------------------ */

function process(t) {
  const W = 1200, H = 240, cy = 64, xs = [150, 450, 750, 1050];
  let steps = '';
  STEPS.forEach((s, i) => {
    const x = xs[i];
    steps += `
    <circle cx="${x}" cy="${cy}" r="28" fill="${t.bg}" stroke="${t.accent}" stroke-width="2">
      <animate attributeName="stroke-width" values="2;4;2;2" keyTimes="0;.08;.2;1" dur="5s" begin="${(i * 5 / 3).toFixed(2)}s" repeatCount="indefinite"/>
    </circle>
    <text x="${x}" y="${cy + 7}" text-anchor="middle" font-family="${MONO}" font-size="20" font-weight="700" fill="${t.accent}">${i + 1}</text>
    <text x="${x}" y="${cy + 70}" text-anchor="middle" font-family="${SANS}" font-size="21" font-weight="700" fill="${t.text}">${esc(s.title)}</text>
    ${wrap(s.desc, 30).map((l, j) => `<text x="${x}" y="${cy + 102 + j * 24}" text-anchor="middle" font-family="${SANS}" font-size="16" fill="${t.body}">${esc(l)}</text>`).join('')}`;
  });
  return svg(W, H, `
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="20" fill="${t.bg}" stroke="${t.stroke}"/>
  <line x1="${xs[0]}" y1="${cy}" x2="${xs[3]}" y2="${cy}" stroke="${t.stroke}" stroke-width="2"/>
  <line x1="${xs[0]}" y1="${cy}" x2="${xs[0]}" y2="${cy}" stroke="${t.accent}" stroke-width="2">
    <animate attributeName="x2" values="${xs[0]};${xs[3]};${xs[3]}" keyTimes="0;.9;1" dur="5s" repeatCount="indefinite"/>
    <animate attributeName="stroke-opacity" values="1;1;0" keyTimes="0;.9;1" dur="5s" repeatCount="indefinite"/>
  </line>
  ${steps}
  `, 'Como eu trabalho: ' + STEPS.map((s, i) => `${i + 1}. ${s.title} — ${s.desc}`).join(' '));
}

/* ------------------------------------------------------------------ */
/* Arquitetura                                                         */
/* ------------------------------------------------------------------ */

function architecture(t) {
  const W = 1200, H = 404;
  const label = (x, y, s) => `<text x="${x}" y="${y}" font-family="${MONO}" font-size="12" font-weight="700" letter-spacing="1.4" fill="${t.muted}">${esc(s)}</text>`;
  const box = (x, y, w, h, hot) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${t.surface}" stroke="${t.accent}" stroke-opacity="${hot ? 0.55 : 0.22}" stroke-width="1.5"/>`;
  const wire = (x1, y1, x2, y2, delay = 0) => `
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${t.accent}" stroke-width="2" stroke-dasharray="6 6" stroke-opacity=".7">
      <animate attributeName="stroke-dashoffset" from="12" to="0" dur=".8s" begin="${delay}s" repeatCount="indefinite"/>
    </line>
    <circle cx="${x1}" cy="${y1}" r="3.5" fill="${t.accent}"/><circle cx="${x2}" cy="${y2}" r="3.5" fill="${t.accent}"/>`;

  // clientes
  const cx = 32, cw = 250, ch = 64, cys = [52, 132, 212];
  let out = label(cx, 36, 'CLIENTES');
  ARCH.clients.forEach((c, i) => {
    const y = cys[i];
    out += box(cx, y, cw, ch) +
      `<text x="${cx + 20}" y="${y + 29}" font-family="${SANS}" font-size="18" font-weight="700" fill="${t.text}">${esc(c.title)}</text>` +
      `<text x="${cx + 20}" y="${y + 49}" font-family="${MONO}" font-size="13" fill="${t.muted}">${esc(c.hint)}</text>`;
    out += wire(cx + cw, y + ch / 2, 360, y + ch / 2, i * 0.2);
  });

  // API
  const ax = 360, aw = 330, ay = 52, ah = 224;
  out += label(ax, 36, 'BACKEND') + box(ax, ay, aw, ah, true) +
    `<text x="${ax + 22}" y="${ay + 36}" font-family="${SANS}" font-size="20" font-weight="700" fill="${t.text}">${esc(ARCH.api.title)}</text>` +
    `<line x1="${ax + 22}" y1="${ay + 52}" x2="${ax + aw - 22}" y2="${ay + 52}" stroke="${t.stroke}"/>`;
  ARCH.api.rows.forEach((r, i) => {
    const y = ay + 86 + i * 38;
    out += `<rect x="${ax + 22}" y="${y - 10}" width="8" height="8" rx="2" fill="${t.accent}"/>` +
      `<text x="${ax + 42}" y="${y}" font-family="${SANS}" font-size="16" fill="${t.body}">${esc(r)}</text>`;
  });

  // dados e integrações
  const dx = 770, dw = 398;
  const dy = 52, dh = 110, iy = 176, ih = 100;
  out += label(dx, 36, 'DADOS E INTEGRAÇÕES');
  out += box(dx, dy, dw, dh) +
    `<text x="${dx + 22}" y="${dy + 32}" font-family="${SANS}" font-size="20" font-weight="700" fill="${t.text}">${esc(ARCH.data.title)}</text>` +
    wrap(ARCH.data.desc, 46).map((l, i) => `<text x="${dx + 22}" y="${dy + 58 + i * 20}" font-family="${SANS}" font-size="15" fill="${t.body}">${esc(l)}</text>`).join('') +
    `<text x="${dx + 22}" y="${dy + dh - 12}" font-family="${MONO}" font-size="12" fill="${t.muted}">${esc(ARCH.data.hint)}</text>`;
  out += box(dx, iy, dw, ih) +
    `<text x="${dx + 22}" y="${iy + 32}" font-family="${SANS}" font-size="20" font-weight="700" fill="${t.text}">${esc(ARCH.integrations.title)}</text>` +
    wrap(ARCH.integrations.desc, 46).map((l, i) => `<text x="${dx + 22}" y="${iy + 58 + i * 20}" font-family="${SANS}" font-size="15" fill="${t.body}">${esc(l)}</text>`).join('');
  out += wire(ax + aw, dy + dh / 2, dx, dy + dh / 2, 0.1) + wire(ax + aw, iy + ih / 2, dx, iy + ih / 2, 0.3);

  // infra
  const by = 304, bh = 72;
  out += wire(ax + aw / 2, ay + ah, ax + aw / 2, by, 0.5);
  out += box(32, by, 1136, bh) +
    `<text x="56" y="${by + 42}" font-family="${MONO}" font-size="12" font-weight="700" letter-spacing="1.4" fill="${t.muted}">RODA EM</text>` +
    chips(150, by + 22, ARCH.infra, t, { size: 13, h: 28 }).svg;

  return svg(W, H, `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="20" fill="${t.bg}" stroke="${t.stroke}"/>
  <g transform="translate(0 0)">${out}</g>`,
  'Arquitetura: clientes (PWA, desktop Electron, mobile Flutter) conectados a uma API Node.js com REST, WebSocket, autenticação e permissões; PostgreSQL com Row Level Security; integrações com WhatsApp e IA; rodando em VPS Linux com Docker, Nginx e PM2.');
}

/* ------------------------------------------------------------------ */
/* CTA                                                                 */
/* ------------------------------------------------------------------ */

function cta() {
  const W = 1200, H = 230, bx = 872, by = 82, bw = 264, bh = 62;
  return svg(W, H, `
  <defs>
    ${grid('g', D.accent, 0.06)}
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${D.bg}"/><stop offset="1" stop-color="#0b2a4a"/>
    </linearGradient>
    <clipPath id="clip"><rect width="${W}" height="${H}" rx="24"/></clipPath>
  </defs>
  <g clip-path="url(#clip)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <text x="64" y="96" font-family="${SANS}" font-size="40" font-weight="700" letter-spacing="-.8" fill="${D.text}">Vamos tirar o seu sistema do papel?</text>
    <text x="64" y="136" font-family="${SANS}" font-size="19" fill="${D.body}">Me conta qual processo você quer automatizar ou qual sistema precisa existir.</text>
    <text x="64" y="180" font-family="${MONO}" font-size="14" fill="${D.muted}">gustavoviti.vercel.app  ·  gustavovitidev@gmail.com</text>

    <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${bh / 2}" fill="none" stroke="${GREEN}">
      <animate attributeName="stroke-opacity" values=".7;0" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="stroke-width" values="1;14" dur="2s" repeatCount="indefinite"/>
    </rect>
    <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${bh / 2}" fill="${GREEN}"/>
    <text x="${bx + bw / 2}" y="${by + 39}" text-anchor="middle" font-family="${SANS}" font-size="20" font-weight="700" fill="#052e16">Chamar no WhatsApp →</text>
  </g>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="24" fill="none" stroke="${D.stroke}"/>
  `, 'Vamos tirar o seu sistema do papel? Chamar no WhatsApp.');
}

/* ------------------------------------------------------------------ */

// Só gera os arquivos quando rodado direto (stats.mjs importa os utilitários daqui).
if (import.meta.url === pathToFileURL(globalThis.process.argv[1]).href) {
  mkdirSync(OUT, { recursive: true });
  write('header.svg', header());
  write('terminal.svg', terminal());
  write('cta.svg', cta());
  for (const [mode, t] of Object.entries(THEMES)) {
    for (const p of PROJECTS) write(`${p.file}-${mode}.svg`, projectCard(p, t));
    write(`process-${mode}.svg`, process(t));
    write(`architecture-${mode}.svg`, architecture(t));
  }
}
