const fs = require('fs');
const path = require('path');

const themeCss = `<style id="universal-colorful-theme">
  :root {
    --ios-bg: #f2f2f7;
    --ios-card: #ffffff;
    --ios-label: #1c1c1e;
    --ios-label-secondary: #6e6e73;
    --ios-separator: #e5e5ea;
    --ios-blue: #007aff;
    --ios-blue-dim: rgba(0, 122, 255, 0.12);
    --ios-green: #248a3d;
    --ios-green-dim: rgba(52, 199, 89, 0.15);
    --ios-orange: #c93400;
    --ios-orange-dim: rgba(255, 149, 0, 0.15);
    --ios-red: #d70015;
    --ios-red-dim: rgba(255, 59, 48, 0.12);
  }

  /* Calm system background -- no gradients, no motion */
  body, html {
    background-color: var(--ios-bg) !important;
    background-image: none !important;
    color: var(--ios-label) !important;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    overflow-x: hidden;
  }
  body::before, body::after { content: none !important; display: none !important; }

  /* Grouped-list style cards (incl. Tailwind opacity variants like bg-surface-container-high/50) */
  .bg-surface-container-lowest, .bg-surface-container-low, .bg-surface-container,
  .bg-surface-container-high, .bg-primary-container, .bg-surface, .card, .tip-box,
  [class*="bg-surface-container-lowest/"], [class*="bg-surface-container-low/"],
  [class*="bg-surface-container/"], [class*="bg-surface-container-high/"],
  [class*="bg-primary-container/"], [class*="bg-surface/"] {
    background: var(--ios-card) !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    border: none !important;
    border-radius: 14px !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 8px rgba(0, 0, 0, 0.04) !important;
    color: var(--ios-label) !important;
    transition: transform 0.2s ease, box-shadow 0.2s ease !important;
    transform-style: flat !important;
  }

  /* Gentle Float Entrance Animation (kept, shortened -- iOS lists do fade/slide in) */
  @keyframes elegantFloatUp {
    0% { opacity: 0; transform: translateY(8px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  table tbody tr { animation: elegantFloatUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both !important; }
  table tbody tr:nth-child(1) { animation-delay: 0.05s !important; }
  table tbody tr:nth-child(2) { animation-delay: 0.08s !important; }
  table tbody tr:nth-child(3) { animation-delay: 0.11s !important; }
  table tbody tr:nth-child(4) { animation-delay: 0.14s !important; }
  table tbody tr:nth-child(n+5) { animation-delay: 0.17s !important; }

  /* Large-Title headings; blue for secondary/links, sentence case throughout */
  .text-primary, .header__title, h1, h2, h3, h4, [class*="text-[#002045]"] {
    color: var(--ios-label) !important;
    font-weight: 800 !important;
    letter-spacing: -0.02em !important;
    background: none !important;
    text-shadow: none !important;
    -webkit-text-fill-color: initial !important;
    text-transform: none !important;
  }
  .text-secondary {
    color: var(--ios-blue) !important;
    font-weight: 600 !important;
    letter-spacing: normal !important;
    background: none !important;
    text-shadow: none !important;
    -webkit-text-fill-color: initial !important;
  }
  .text-tertiary-fixed-dim {
    color: var(--ios-green) !important;
  }

  .text-on-surface-variant, .text-slate-500, .text-outline, .text-outline-variant, .text-muted, p, span, .card__desc {
    color: var(--ios-label-secondary) !important;
    font-weight: 400 !important;
  }

  /* Status Pills -- iOS semantic colours (incl. opacity variants like bg-tertiary-fixed/40) */
  .bg-tertiary-fixed, [class*="bg-tertiary-fixed/"], [class*="bg-emerald-500/"], .bg-secondary-fixed {
    background: var(--ios-green-dim) !important;
    border: none !important;
    color: var(--ios-green) !important;
    font-weight: 600 !important;
    letter-spacing: normal !important;
    text-transform: none !important;
    box-shadow: none !important;
  }
  .bg-secondary-container, [class*="bg-secondary-container/"] {
    background: var(--ios-orange-dim) !important;
    border: none !important;
    color: var(--ios-orange) !important;
    font-weight: 600 !important;
    letter-spacing: normal !important;
    text-transform: none !important;
    box-shadow: none !important;
  }
  .bg-error-container, [class*="bg-error-container/"], [class*="bg-rose-500/"] {
    background: var(--ios-red-dim) !important;
    border: none !important;
    color: var(--ios-red) !important;
    font-weight: 600 !important;
    letter-spacing: normal !important;
    text-transform: none !important;
    box-shadow: none !important;
  }
  .text-on-tertiary-fixed, .text-on-secondary-fixed-variant { color: var(--ios-green) !important; }
  .text-on-secondary-container { color: var(--ios-orange) !important; }
  .text-on-error-container { color: var(--ios-red) !important; }

  /* iOS Grouped List Tables */
  table { width: 100% !important; border-collapse: collapse !important; border-spacing: 0 !important; }
  th {
    background: transparent !important;
    color: var(--ios-label-secondary) !important;
    font-weight: 600 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.05em !important;
    padding: 12px 16px !important;
    border-bottom: 1px solid var(--ios-separator) !important;
    font-size: 0.7rem !important;
    animation: none !important;
  }
  td {
    background: transparent !important;
    border-bottom: 1px solid var(--ios-separator) !important;
    padding: 14px 16px !important;
    color: var(--ios-label) !important;
    font-weight: 400 !important;
    box-shadow: none !important;
    transition: background 0.2s ease !important;
    border-top: none !important;
  }
  td:first-child, td:last-child { border-radius: 0 !important; border-left: none !important; border-right: none !important; }

  tr:last-child td { border-bottom: none !important; }

  tr:hover td {
    background: var(--ios-bg) !important;
    border-color: var(--ios-separator) !important;
    color: var(--ios-label) !important;
  }

  /* iOS Navigation Bar -- translucent, blurred, hairline separator */
  nav, header.fixed {
    background: rgba(255, 255, 255, 0.82) !important;
    backdrop-filter: saturate(180%) blur(20px) !important;
    -webkit-backdrop-filter: saturate(180%) blur(20px) !important;
    border-bottom: 1px solid var(--ios-separator) !important;
    animation: none !important;
  }
  nav a {
    color: var(--ios-label-secondary) !important;
    font-weight: 500 !important;
    letter-spacing: normal !important;
    text-transform: none !important;
    font-size: 0.9rem !important;
    padding: 8px 16px !important;
    border-radius: 8px !important;
    transition: all 0.2s ease !important;
    border: none !important;
  }
  nav a:hover, nav a.active-nav-tab {
    background: var(--ios-blue-dim) !important;
    color: var(--ios-blue) !important;
    box-shadow: none !important;
    border-bottom: none !important;
    font-weight: 600 !important;
  }

  /* Primary filled buttons -- solid systemBlue, no shimmer, press-down feedback */
  button, .clinical-gradient, .btn, .filter-pill {
    position: relative;
    background: var(--ios-blue) !important;
    color: #ffffff !important;
    border: none !important;
    font-weight: 600 !important;
    letter-spacing: normal !important;
    text-transform: none !important;
    border-radius: 12px !important;
    font-size: 0.9rem !important;
    padding: 12px 22px !important;
    transition: transform 0.15s ease, opacity 0.15s ease !important;
    box-shadow: none !important;
    overflow: hidden;
  }
  button::before { content: none !important; display: none !important; }

  button:hover, .clinical-gradient:hover {
    background: var(--ios-blue) !important;
    color: #ffffff !important;
    transform: none !important;
    opacity: 0.85 !important;
    box-shadow: none !important;
  }
  button:active, .clinical-gradient:active {
    transform: scale(0.97) !important;
    opacity: 0.75 !important;
  }

  /* Icon-only toolbar buttons (bell, gear, pagination) read as ghost buttons, not filled */
  button.p-2, button.bg-surface-container-high {
    background: transparent !important;
    color: var(--ios-blue) !important;
    border: none !important;
  }
  button.p-2:hover, button.bg-surface-container-high:hover {
    background: var(--ios-blue-dim) !important;
    color: var(--ios-blue) !important;
    opacity: 1 !important;
  }

  /* Destructive actions read as systemRed text, not filled */
  button[title="Delete"], .delete-row-btn, .delete-new-btn {
    background: transparent !important;
    color: var(--ios-red) !important;
    border: none !important;
  }
  button[title="Delete"]:hover, .delete-row-btn:hover, .delete-new-btn:hover {
    background: var(--ios-red-dim) !important;
    color: var(--ios-red) !important;
    opacity: 1 !important;
  }

  /* Inputs -- systemGray6 fill, borderless, blue focus ring */
  input, select, textarea {
    background: var(--ios-bg) !important;
    border: 1px solid transparent !important;
    color: var(--ios-label) !important;
    border-radius: 10px !important;
    box-shadow: none !important;
    font-weight: 400 !important;
  }
  input:focus, textarea:focus, select:focus {
    border-color: var(--ios-blue) !important;
    outline: none !important;
    background: #ffffff !important;
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15) !important;
  }

  /* Footer -- was dark-mode-only (bg-slate-950 + white text); force it to match the light theme */
  footer {
    background: var(--ios-card) !important;
    border-top: 1px solid var(--ios-separator) !important;
  }
  footer span, footer p, footer a {
    color: var(--ios-label-secondary) !important;
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

console.log(`iOS theme applied. Replaced: ${updated}, newly inserted: ${inserted}`);
