from pathlib import Path
import re
base = Path(r'c:\Users\User\Desktop\stitch\stitch')
files = list(base.rglob('code.html'))
print('Found', len(files), 'files')
script = '''
<script>
  const navRoutes = {
    'Dashboard': '../admin_dashboard/code.html',
    'Medicines': '../manage_medicines/code.html',
    'History': '../pharmacist_dashboard_1/code.html',
    'Users': '../pending_registration_approvals/code.html',
    'Data Management': '../upload_sales_data/code.html'
  };
  document.querySelectorAll('nav a').forEach(a => {
    const t = a.textContent.trim();
    if(navRoutes[t]) { a.href = navRoutes[t]; a.setAttribute('title', 'Go to ' + t); }
  });
  document.querySelectorAll('button,a').forEach(el => {
    const txt = el.textContent.trim().replace(/\s+/g,' ');
    if(txt === 'Login') el.addEventListener('click', ()=> window.location.href = '../login_page/code.html');
    if(txt === 'Register') el.addEventListener('click', ()=> window.location.href = '../registration_page/code.html');
    if(txt === 'Get Started') el.addEventListener('click', ()=> window.location.href = '../registration_page/code.html');
    if(txt === 'View Demo') el.addEventListener('click', ()=> window.location.href = '../landing_page_1/code.html');
    if(txt === 'Upload Data') el.addEventListener('click', ()=> window.location.href = '../upload_sales_data/code.html');
    if(txt === 'Add Medicine') el.addEventListener('click', ()=> window.location.href = '../manage_medicines/code.html');
    if(txt === 'Export Reports') el.addEventListener('click', ()=> window.location.href = '../upload_sales_data/code.html');
    if(txt === 'Start Sync') el.addEventListener('click', ()=> window.location.href = '../upload_sales_data/code.html');
  });
  const brand = document.querySelector('nav span, header span');
  if(brand && brand.textContent && brand.textContent.includes('PharmaCast')) {
    var link=document.createElement('a');
    link.href='../index.html';
    link.style.color='inherit';
    link.style.textDecoration='none';
    link.textContent=brand.textContent;
    brand.replaceWith(link);
  }
</script>
'''
for p in files:
    t = p.read_text(encoding='utf8')
    t = t.replace('href="#">Dashboard</a>', 'href="../admin_dashboard/code.html">Dashboard</a>')
    t = t.replace('href="#">Medicines</a>', 'href="../manage_medicines/code.html">Medicines</a>')
    t = t.replace('href="#">History</a>', 'href="../pharmacist_dashboard_1/code.html">History</a>')
    t = t.replace('href="#">Users</a>', 'href="../pending_registration_approvals/code.html">Users</a>')
    t = t.replace('href="#">Data Management</a>', 'href="../upload_sales_data/code.html">Data Management</a>')
    if 'const navRoutes' not in t:
        t = t.replace('</body>', script + '\n</body>')
    p.write_text(t, encoding='utf8')
print('updated', len(files))