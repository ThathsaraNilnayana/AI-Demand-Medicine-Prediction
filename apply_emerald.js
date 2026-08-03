const fs = require('fs');

const emeraldCss = `<style id="universal-colorful-theme">
  :root {
    --emerald-dark: #021a15;
    --emerald-panel: rgba(4, 30, 25, 0.7);
    --gold: #d4af37;
    --gold-dim: rgba(212, 175, 55, 0.2);
    --border-glow: rgba(212, 175, 55, 0.4);
  }
  
  /* Midnight Emerald Liquid Silk Background */
  body, html {
    background-color: var(--emerald-dark) !important;
    background-image: 
      radial-gradient(at 0% 0%, rgba(2, 40, 30, 1) 0, transparent 50%), 
      radial-gradient(at 100% 100%, rgba(5, 50, 40, 1) 0, transparent 50%) !important;
    color: #e5e5e5 !important;
    font-family: 'Inter', system-ui, sans-serif !important;
    overflow-x: hidden;
  }
  
  /* Silk Breathing Background Animation */
  body::before, body::after {
    content: '';
    position: fixed;
    width: 100vw;
    height: 100vh;
    z-index: -1;
    opacity: 0.5;
    pointer-events: none;
    animation: silkWave 20s infinite alternate ease-in-out;
    filter: blur(80px);
  }
  body::before {
    background: radial-gradient(ellipse at 50% -20%, rgba(10, 80, 60, 0.6) 0%, transparent 60%);
  }
  body::after {
    background: radial-gradient(ellipse at 50% 120%, rgba(10, 80, 60, 0.6) 0%, transparent 60%);
    animation-delay: -10s;
  }
  
  @keyframes silkWave {
    0% { transform: scale(1) rotate(0deg); opacity: 0.4; }
    50% { transform: scale(1.1) rotate(2deg); opacity: 0.6; }
    100% { transform: scale(1) rotate(-2deg); opacity: 0.4; }
  }

  /* Emerald Tinted Glass Panels */
  .bg-surface-container-lowest, .bg-surface-container-low, .bg-surface-container, 
  .bg-surface-container-high, .bg-primary-container, .bg-surface, .card, .tip-box {
    background: var(--emerald-panel) !important;
    backdrop-filter: blur(24px) !important;
    -webkit-backdrop-filter: blur(24px) !important;
    border: 1px solid var(--gold-dim) !important;
    border-radius: 12px !important;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(212,175,55,0.1) !important;
    color: #e5e5e5 !important;
    transition: transform 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease !important;
    transform-style: flat !important;
  }
  
  /* Gentle Float Entrance Animation */
  @keyframes elegantFloatUp {
    0% { opacity: 0; transform: translateY(15px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  
  main > * { animation: elegantFloatUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) both !important; }
  table tbody tr { animation: elegantFloatUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both !important; }
  table tbody tr:nth-child(1) { animation-delay: 0.1s !important; }
  table tbody tr:nth-child(2) { animation-delay: 0.15s !important; }
  table tbody tr:nth-child(3) { animation-delay: 0.2s !important; }
  table tbody tr:nth-child(4) { animation-delay: 0.25s !important; }
  table tbody tr:nth-child(n+5) { animation-delay: 0.3s !important; }
  
  /* Champagne Gold Typography */
  .text-primary, .text-secondary, .text-tertiary-fixed-dim, .text-\\[\\#002045\\], .header__title, h1, h2, h3, h4 {
    color: var(--gold) !important;
    font-weight: 400 !important;
    letter-spacing: 0.05em !important;
    background: none !important;
    text-shadow: none !important;
    -webkit-text-fill-color: initial !important;
    text-transform: uppercase !important;
  }
  
  .text-on-surface-variant, .text-slate-500, .text-outline, .text-outline-variant, .text-muted, p, span, .card__desc {
    color: #a0b0a8 !important;
    font-weight: 300 !important;
  }
  
  /* Emerald Tables */
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
    background: rgba(2, 26, 21, 0.5) !important;
    border-bottom: none !important;
    padding: 16px 12px !important;
    color: #e5e5e5 !important;
    font-weight: 300 !important;
    box-shadow: none !important;
    transition: background 0.4s ease, transform 0.4s ease !important;
    border-top: 1px solid transparent !important;
    border-bottom: 1px solid transparent !important;
  }
  td:first-child { border-top-left-radius: 8px; border-bottom-left-radius: 8px; border-left: 1px solid transparent !important; }
  td:last-child { border-top-right-radius: 8px; border-bottom-right-radius: 8px; border-right: 1px solid transparent !important; }
  
  tr:hover td { 
    background: rgba(4, 45, 35, 0.8) !important; 
    border-color: var(--gold-dim) !important;
    color: #ffffff !important;
  }
  
  /* Navigation */
  nav, header.fixed {
    background: rgba(2, 20, 16, 0.8) !important;
    backdrop-filter: blur(24px) !important;
    border-bottom: 1px solid var(--gold-dim) !important;
    animation: none !important;
  }
  nav a {
    color: #8fa098 !important;
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
    border-radius: 4px !important; 
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
    background: linear-gradient(90deg, transparent, rgba(212,175,55,0.2), transparent) !important;
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
    background: var(--gold) !important;
    color: #000000 !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 10px 20px rgba(212,175,55,0.2) !important;
  }
  
  /* Inputs */
  button.bg-surface-container-high, button.p-2, input, select, textarea {
    background: rgba(0,0,0,0.3) !important;
    border: 1px solid var(--gold-dim) !important;
    color: #e5e5e5 !important;
    border-radius: 4px !important;
    box-shadow: none !important;
    font-weight: 300 !important;
  }
  button.bg-surface-container-high:hover, button.p-2:hover {
    border-color: var(--gold) !important;
    color: var(--gold) !important;
  }
  input:focus, textarea:focus {
    border-color: var(--gold) !important;
    outline: none !important;
    background: rgba(0,0,0,0.5) !important;
    box-shadow: 0 0 10px rgba(212,175,55,0.1) !important;
  }
</style>`;

const dirs = fs.readdirSync('stitch');
for (const dir of dirs) {
    const filePath = `stitch/${dir}/code.html`;
    if (fs.existsSync(filePath)) {
        let html = fs.readFileSync(filePath, 'utf8');
        html = html.replace(/<style id="universal-colorful-theme">[\s\S]*?<\/style>/, emeraldCss);
        fs.writeFileSync(filePath, html, 'utf8');
    }
}
console.log('Emerald CSS applied globally!');
