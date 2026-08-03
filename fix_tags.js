const fs = require('fs');

const dirs = fs.readdirSync('stitch');
for (const dir of dirs) {
    const filePath = `stitch/${dir}/code.html`;
    if (fs.existsSync(filePath)) {
        let html = fs.readFileSync(filePath, 'utf8');
        
        if (!html.includes('/* Tags */') && html.includes('universal-colorful-theme')) {
            const tagCss = `
  /* Tags */
  .bg-tertiary-fixed, .bg-secondary-container, .bg-error-container, .bg-tertiary-fixed\\/20, .bg-emerald-500\\/15, .bg-rose-500\\/15 {
    background: rgba(212,175,55,0.1) !important;
    border: 1px solid var(--gold-dim) !important;
    color: var(--gold) !important;
    font-weight: 600 !important;
    letter-spacing: 0.1em !important;
    box-shadow: none !important;
  }
  .text-on-tertiary-fixed, .text-on-secondary-container, .text-on-error-container {
    color: var(--gold) !important;
  }
</style>`;
            html = html.replace('</style>', tagCss);
            fs.writeFileSync(filePath, html, 'utf8');
        }
    }
}
console.log('Tags CSS fixed globally!');
