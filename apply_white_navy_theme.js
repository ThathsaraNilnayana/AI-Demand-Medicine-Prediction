const fs = require('fs');
const path = require('path');

const themeCss = `<style id="universal-colorful-theme">
  :root {
    --wn-bg: #ffffff;
    --wn-card: #f5f8fc;
    --wn-label: #0b2447;
    --wn-label-secondary: #5b6b85;
    --wn-separator: #e2e8f4;
    --wn-navy: #1d4ed8;
    --wn-navy-dim: rgba(29, 78, 216, 0.1);
    --wn-green: #248a3d;
    --wn-green-dim: rgba(52, 199, 89, 0.15);
    --wn-orange: #c93400;
    --wn-orange-dim: rgba(255, 149, 0, 0.15);
    --wn-red: #d70015;
    --wn-red-dim: rgba(255, 59, 48, 0.12);
  }

  /* Pure white page background -- no gradients, no motion */
  body, html {
    background-color: var(--wn-bg) !important;
    background-image: none !important;
    color: var(--wn-label) !important;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    overflow-x: hidden;
  }
  body::before, body::after { content: none !important; display: none !important; }

  /* Soft blue-tinted cards on the white page (incl. Tailwind opacity variants like bg-surface-container-high/50) */
  .bg-surface-container-lowest, .bg-surface-container-low, .bg-surface-container,
  .bg-surface-container-high, .bg-surface, .card, .tip-box,
  [class*="bg-surface-container-lowest/"], [class*="bg-surface-container-low/"],
  [class*="bg-surface-container/"], [class*="bg-surface-container-high/"],
  [class*="bg-surface/"] {
    background: var(--wn-card) !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    border: 1px solid var(--wn-separator) !important;
    border-radius: 14px !important;
    box-shadow: 0 1px 2px rgba(11, 36, 71, 0.03), 0 1px 8px rgba(11, 36, 71, 0.04) !important;
    color: var(--wn-label) !important;
    transition: transform 0.2s ease, box-shadow 0.2s ease !important;
    transform-style: flat !important;
  }

  /* Solid navy accent tiles/avatars/blobs -- always paired with white text in the markup, so keep them dark rather than flattening to a light card */
  .bg-primary-container, [class*="bg-primary-container/"] {
    background: linear-gradient(135deg, var(--wn-navy) 0%, #0b2447 100%) !important;
    border: none !important;
    border-radius: 14px !important;
    box-shadow: 0 4px 16px rgba(29, 78, 216, 0.25) !important;
    color: #ffffff !important;
  }
  .text-on-primary, .text-on-primary-container { color: #ffffff !important; }
  /* Descendant text needs its own contrast rule -- the generic heading/muted-text rules below assume a light card */
  .bg-primary-container h1, .bg-primary-container h2, .bg-primary-container h3, .bg-primary-container h4,
  .bg-primary-container .text-primary {
    color: #ffffff !important;
  }
  .bg-primary-container p, .bg-primary-container span, .bg-primary-container .text-on-surface-variant {
    color: rgba(255, 255, 255, 0.8) !important;
  }

  /* Gentle Float Entrance Animation */
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

  /* Dark navy headings; navy for secondary/links, sentence case throughout */
  .text-primary, .header__title, h1, h2, h3, h4, [class*="text-[#002045]"] {
    color: var(--wn-label) !important;
    font-weight: 800 !important;
    letter-spacing: -0.02em !important;
    background: none !important;
    text-shadow: none !important;
    -webkit-text-fill-color: initial !important;
    text-transform: none !important;
  }
  .text-secondary {
    color: var(--wn-navy) !important;
    font-weight: 600 !important;
    letter-spacing: normal !important;
    background: none !important;
    text-shadow: none !important;
    -webkit-text-fill-color: initial !important;
  }
  .text-tertiary-fixed-dim {
    color: var(--wn-green) !important;
  }

  .text-on-surface-variant, .text-slate-500, .text-outline, .text-outline-variant, .text-muted, p, span, .card__desc {
    color: var(--wn-label-secondary) !important;
    font-weight: 400 !important;
  }

  /* Status Pills -- kept functionally distinct from the navy brand colour (incl. opacity variants) */
  .bg-tertiary-fixed, [class*="bg-tertiary-fixed/"], [class*="bg-emerald-500/"], .bg-secondary-fixed {
    background: var(--wn-green-dim) !important;
    border: none !important;
    color: var(--wn-green) !important;
    font-weight: 600 !important;
    letter-spacing: normal !important;
    text-transform: none !important;
    box-shadow: none !important;
  }
  .bg-secondary-container, [class*="bg-secondary-container/"] {
    background: var(--wn-orange-dim) !important;
    border: none !important;
    color: var(--wn-orange) !important;
    font-weight: 600 !important;
    letter-spacing: normal !important;
    text-transform: none !important;
    box-shadow: none !important;
  }
  .bg-error-container, [class*="bg-error-container/"], [class*="bg-rose-500/"] {
    background: var(--wn-red-dim) !important;
    border: none !important;
    color: var(--wn-red) !important;
    font-weight: 600 !important;
    letter-spacing: normal !important;
    text-transform: none !important;
    box-shadow: none !important;
  }
  .text-on-tertiary-fixed, .text-on-secondary-fixed-variant { color: var(--wn-green) !important; }
  .text-on-secondary-container { color: var(--wn-orange) !important; }
  .text-on-error-container { color: var(--wn-red) !important; }

  /* Grouped List Tables */
  table { width: 100% !important; border-collapse: collapse !important; border-spacing: 0 !important; }
  th {
    background: transparent !important;
    color: var(--wn-label-secondary) !important;
    font-weight: 600 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.05em !important;
    padding: 12px 16px !important;
    border-bottom: 1px solid var(--wn-separator) !important;
    font-size: 0.7rem !important;
    animation: none !important;
  }
  td {
    background: transparent !important;
    border-bottom: 1px solid var(--wn-separator) !important;
    padding: 14px 16px !important;
    color: var(--wn-label) !important;
    font-weight: 400 !important;
    box-shadow: none !important;
    transition: background 0.2s ease !important;
    border-top: none !important;
  }
  td:first-child, td:last-child { border-radius: 0 !important; border-left: none !important; border-right: none !important; }

  tr:last-child td { border-bottom: none !important; }

  tr:hover td {
    background: var(--wn-navy-dim) !important;
    border-color: var(--wn-separator) !important;
    color: var(--wn-label) !important;
  }

  /* Navigation Bar -- translucent white, hairline separator, navy active state */
  nav, header.fixed {
    background: rgba(255, 255, 255, 0.88) !important;
    backdrop-filter: saturate(180%) blur(20px) !important;
    -webkit-backdrop-filter: saturate(180%) blur(20px) !important;
    border-bottom: 1px solid var(--wn-separator) !important;
    animation: none !important;
  }
  nav a {
    color: var(--wn-label-secondary) !important;
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
    background: var(--wn-navy-dim) !important;
    color: var(--wn-navy) !important;
    box-shadow: none !important;
    border-bottom: none !important;
    font-weight: 600 !important;
  }

  /* Primary filled buttons -- solid dark navy, press-down feedback */
  button, .clinical-gradient, .btn, .filter-pill {
    position: relative;
    background: var(--wn-navy) !important;
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
    background: var(--wn-navy) !important;
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
    color: var(--wn-navy) !important;
    border: none !important;
  }
  button.p-2:hover, button.bg-surface-container-high:hover {
    background: var(--wn-navy-dim) !important;
    color: var(--wn-navy) !important;
    opacity: 1 !important;
  }

  /* Destructive actions read as systemRed text, not filled */
  button[title="Delete"], .delete-row-btn, .delete-new-btn {
    background: transparent !important;
    color: var(--wn-red) !important;
    border: none !important;
  }
  button[title="Delete"]:hover, .delete-row-btn:hover, .delete-new-btn:hover {
    background: var(--wn-red-dim) !important;
    color: var(--wn-red) !important;
    opacity: 1 !important;
  }

  /* Inputs -- light card fill, borderless, navy focus ring */
  input, select, textarea {
    background: var(--wn-card) !important;
    border: 1px solid var(--wn-separator) !important;
    color: var(--wn-label) !important;
    border-radius: 10px !important;
    box-shadow: none !important;
    font-weight: 400 !important;
  }
  input:focus, textarea:focus, select:focus {
    border-color: var(--wn-navy) !important;
    outline: none !important;
    background: #ffffff !important;
    box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.15) !important;
  }

  /* Footer -- was dark-mode-only (bg-slate-950 + white text); force it to match the white/navy theme */
  footer {
    background: var(--wn-card) !important;
    border-top: 1px solid var(--wn-separator) !important;
  }
  footer span, footer p, footer a {
    color: var(--wn-label-secondary) !important;
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

console.log(`White/Navy theme applied. Replaced: ${updated}, newly inserted: ${inserted}`);
