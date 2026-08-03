const fs = require('fs');
const path = require('path');

const themeCss = `<style id="universal-colorful-theme">
  :root {
    --luxe-bg: #0a0e27;
    --luxe-bg-2: #120a2e;
    --luxe-panel: rgba(16, 20, 48, 0.62);
    --gold: #d4af37;
    --gold-bright: #f4d872;
    --gold-dim: rgba(212, 175, 55, 0.25);
    --emerald: #34d399;
    --emerald-dim: rgba(52, 211, 153, 0.16);
    --sapphire: #60a5fa;
    --sapphire-dim: rgba(96, 165, 250, 0.16);
    --ruby: #fb7185;
    --ruby-dim: rgba(251, 113, 133, 0.16);
    --amber: #fbbf24;
    --amber-dim: rgba(251, 191, 36, 0.16);
    --ink: #e9e7f5;
    --ink-muted: #a7a3c4;
  }

  /* Luxury Aurora Background */
  body, html {
    background-color: var(--luxe-bg) !important;
    background-image:
      radial-gradient(at 8% 8%, rgba(212, 175, 55, 0.16) 0, transparent 42%),
      radial-gradient(at 92% 12%, rgba(96, 165, 250, 0.18) 0, transparent 42%),
      radial-gradient(at 88% 92%, rgba(52, 211, 153, 0.16) 0, transparent 42%),
      radial-gradient(at 10% 92%, rgba(167, 139, 250, 0.18) 0, transparent 42%),
      linear-gradient(180deg, var(--luxe-bg) 0%, var(--luxe-bg-2) 100%) !important;
    color: var(--ink) !important;
    font-family: 'Inter', system-ui, sans-serif !important;
    overflow-x: hidden;
  }

  /* Slow-drifting Aurora Glow */
  body::before, body::after {
    content: '';
    position: fixed;
    width: 100vw;
    height: 100vh;
    z-index: -1;
    opacity: 0.55;
    pointer-events: none;
    animation: auroraDrift 24s infinite alternate ease-in-out;
    filter: blur(90px);
  }
  body::before {
    background: radial-gradient(ellipse at 20% -10%, rgba(212, 175, 55, 0.35) 0%, transparent 55%),
                radial-gradient(ellipse at 80% 10%, rgba(96, 165, 250, 0.3) 0%, transparent 55%);
  }
  body::after {
    background: radial-gradient(ellipse at 80% 110%, rgba(52, 211, 153, 0.3) 0%, transparent 55%),
                radial-gradient(ellipse at 15% 100%, rgba(167, 139, 250, 0.3) 0%, transparent 55%);
    animation-delay: -12s;
  }

  @keyframes auroraDrift {
    0% { transform: scale(1) rotate(0deg); opacity: 0.45; }
    50% { transform: scale(1.12) rotate(2deg); opacity: 0.65; }
    100% { transform: scale(1) rotate(-2deg); opacity: 0.45; }
  }

  /* Jewel-Glass Panels (incl. Tailwind opacity variants like bg-surface-container-high/50) */
  .bg-surface-container-lowest, .bg-surface-container-low, .bg-surface-container,
  .bg-surface-container-high, .bg-primary-container, .bg-surface, .card, .tip-box,
  [class*="bg-surface-container-lowest/"], [class*="bg-surface-container-low/"],
  [class*="bg-surface-container/"], [class*="bg-surface-container-high/"],
  [class*="bg-primary-container/"], [class*="bg-surface/"] {
    background: var(--luxe-panel) !important;
    backdrop-filter: blur(24px) !important;
    -webkit-backdrop-filter: blur(24px) !important;
    border: 1px solid var(--gold-dim) !important;
    border-radius: 16px !important;
    box-shadow: 0 20px 55px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(212, 175, 55, 0.12) !important;
    color: var(--ink) !important;
    transition: transform 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease !important;
    transform-style: flat !important;
  }

  /* Gentle Float Entrance Animation */
  @keyframes elegantFloatUp {
    0% { opacity: 0; transform: translateY(15px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  table tbody tr { animation: elegantFloatUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both !important; }
  table tbody tr:nth-child(1) { animation-delay: 0.1s !important; }
  table tbody tr:nth-child(2) { animation-delay: 0.15s !important; }
  table tbody tr:nth-child(3) { animation-delay: 0.2s !important; }
  table tbody tr:nth-child(4) { animation-delay: 0.25s !important; }
  table tbody tr:nth-child(n+5) { animation-delay: 0.3s !important; }

  /* Champagne Gold Headings, Sapphire Secondary Accents */
  .text-primary, .header__title, h1, h2, h3, h4, [class*="text-[#002045]"] {
    color: var(--gold) !important;
    font-weight: 400 !important;
    letter-spacing: 0.05em !important;
    background: none !important;
    text-shadow: none !important;
    -webkit-text-fill-color: initial !important;
    text-transform: uppercase !important;
  }
  .text-secondary {
    color: var(--sapphire) !important;
    font-weight: 500 !important;
    letter-spacing: 0.05em !important;
    background: none !important;
    text-shadow: none !important;
    -webkit-text-fill-color: initial !important;
  }
  .text-tertiary-fixed-dim {
    color: var(--emerald) !important;
  }

  .text-on-surface-variant, .text-slate-500, .text-outline, .text-outline-variant, .text-muted, p, span, .card__desc {
    color: var(--ink-muted) !important;
    font-weight: 300 !important;
  }

  /* Status Tags -- colour-coded by meaning instead of one flat gold (incl. opacity variants like bg-tertiary-fixed/40) */
  .bg-tertiary-fixed, [class*="bg-tertiary-fixed/"], [class*="bg-emerald-500/"], .bg-secondary-fixed {
    background: var(--emerald-dim) !important;
    border: 1px solid rgba(52, 211, 153, 0.45) !important;
    color: var(--emerald) !important;
    font-weight: 700 !important;
    letter-spacing: 0.08em !important;
    box-shadow: none !important;
  }
  .bg-secondary-container, [class*="bg-secondary-container/"] {
    background: var(--amber-dim) !important;
    border: 1px solid rgba(251, 191, 36, 0.45) !important;
    color: var(--amber) !important;
    font-weight: 700 !important;
    letter-spacing: 0.08em !important;
    box-shadow: none !important;
  }
  .bg-error-container, [class*="bg-error-container/"], [class*="bg-rose-500/"] {
    background: var(--ruby-dim) !important;
    border: 1px solid rgba(251, 113, 133, 0.45) !important;
    color: var(--ruby) !important;
    font-weight: 700 !important;
    letter-spacing: 0.08em !important;
    box-shadow: none !important;
  }
  .text-on-tertiary-fixed, .text-on-secondary-fixed-variant { color: var(--emerald) !important; }
  .text-on-secondary-container { color: var(--amber) !important; }
  .text-on-error-container { color: var(--ruby) !important; }

  /* Jewel Tables */
  table { width: 100% !important; border-collapse: separate !important; border-spacing: 0 8px !important; }
  th {
    background: transparent !important;
    color: var(--gold) !important;
    font-weight: 500 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.15em !important;
    padding: 16px 12px !important;
    border-bottom: 1px solid var(--gold-dim) !important;
    font-size: 0.7rem !important;
    animation: none !important;
  }
  td {
    background: rgba(16, 20, 48, 0.55) !important;
    border-bottom: none !important;
    padding: 16px 12px !important;
    color: var(--ink) !important;
    font-weight: 300 !important;
    box-shadow: none !important;
    transition: background 0.4s ease, transform 0.4s ease !important;
    border-top: 1px solid transparent !important;
    border-bottom: 1px solid transparent !important;
  }
  td:first-child { border-top-left-radius: 8px; border-bottom-left-radius: 8px; border-left: 1px solid transparent !important; }
  td:last-child { border-top-right-radius: 8px; border-bottom-right-radius: 8px; border-right: 1px solid transparent !important; }

  tr:hover td {
    background: rgba(96, 165, 250, 0.12) !important;
    border-color: var(--gold-dim) !important;
    color: #ffffff !important;
  }

  /* Navigation */
  nav, header.fixed {
    background: rgba(10, 14, 39, 0.82) !important;
    backdrop-filter: blur(24px) !important;
    border-bottom: 1px solid var(--gold-dim) !important;
    animation: none !important;
  }
  nav a {
    color: #9490b3 !important;
    font-weight: 400 !important;
    letter-spacing: 0.08em !important;
    font-size: 0.8rem !important;
    padding: 8px 16px !important;
    border-radius: 4px !important;
    transition: all 0.4s ease !important;
    border: none !important;
  }
  nav a:hover, nav a.active-nav-tab {
    background: transparent !important;
    color: var(--gold) !important;
    box-shadow: none !important;
    border-bottom: 1px solid var(--gold) !important;
    border-radius: 0 !important;
  }

  /* Luxury Gold Silk Buttons */
  button, .clinical-gradient, .btn, .filter-pill {
    position: relative;
    background: transparent !important;
    color: var(--gold) !important;
    border: 1px solid var(--gold) !important;
    font-weight: 400 !important;
    letter-spacing: 0.1em !important;
    border-radius: 6px !important;
    font-size: 0.8rem !important;
    padding: 12px 24px !important;
    transition: all 0.5s ease !important;
    box-shadow: none !important;
    overflow: hidden;
  }
  button::before {
    content: '';
    position: absolute;
    top: 0; left: -100%;
    width: 50%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.25), transparent) !important;
    animation: goldSheen 4s infinite;
    z-index: 1;
    pointer-events: none;
    display: block !important;
  }
  @keyframes goldSheen {
    0% { left: -100%; }
    20%, 100% { left: 200%; }
  }

  button:hover, .clinical-gradient:hover {
    background: linear-gradient(135deg, var(--gold-bright), var(--gold)) !important;
    color: #1a1206 !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 10px 24px rgba(212, 175, 55, 0.3) !important;
  }

  /* Destructive actions read as ruby, not gold */
  button[title="Delete"], .delete-row-btn, .delete-new-btn {
    color: var(--ruby) !important;
    border-color: rgba(251, 113, 133, 0.5) !important;
  }
  button[title="Delete"]:hover, .delete-row-btn:hover, .delete-new-btn:hover {
    background: linear-gradient(135deg, #fda4af, var(--ruby)) !important;
    color: #2a0509 !important;
    box-shadow: 0 10px 24px rgba(251, 113, 133, 0.3) !important;
  }

  /* Inputs -- sapphire focus glow contrasts against the gold palette */
  button.bg-surface-container-high, button.p-2, input, select, textarea {
    background: rgba(0, 0, 0, 0.3) !important;
    border: 1px solid var(--gold-dim) !important;
    color: var(--ink) !important;
    border-radius: 6px !important;
    box-shadow: none !important;
    font-weight: 300 !important;
  }
  button.bg-surface-container-high:hover, button.p-2:hover {
    border-color: var(--gold) !important;
    color: var(--gold) !important;
  }
  input:focus, textarea:focus, select:focus {
    border-color: var(--sapphire) !important;
    outline: none !important;
    background: rgba(0, 0, 0, 0.5) !important;
    box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.18) !important;
  }
</style>`;

const root = path.join(__dirname, 'stitch');
const dirs = fs.readdirSync(root);
let updated = 0;
let inserted = 0;

for (const dir of dirs) {
    const filePath = path.join(root, dir, 'code.html');
    if (!fs.existsSync(filePath)) continue;

    let html = fs.readFileSync(filePath, 'utf8');
    if (/<style id="universal-colorful-theme">[\s\S]*?<\/style>/.test(html)) {
        html = html.replace(/<style id="universal-colorful-theme">[\s\S]*?<\/style>/, themeCss);
        updated++;
    } else if (html.includes('</head>')) {
        html = html.replace('</head>', `${themeCss}\n</head>`);
        inserted++;
    } else {
        console.log(`SKIPPED (no </head> found): ${filePath}`);
        continue;
    }
    fs.writeFileSync(filePath, html, 'utf8');
}

console.log(`Luxury Medicine theme applied. Replaced: ${updated}, newly inserted: ${inserted}`);
