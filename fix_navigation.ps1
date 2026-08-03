$stitch = "c:\Users\User\Desktop\stitch\stitch"

$newScript = @"
<script>
  /* ── PharmaCast Global Navigation & Full Interactive Functions ── */
  const navRoutes = {
    'Dashboard': '../admin_dashboard/code.html',
    'Medicines': '../manage_medicines/code.html',
    'History': '../pharmacist_dashboard_1/code.html',
    'Users': '../pending_registration_approvals/code.html',
    'Data Management': '../upload_sales_data/code.html'
  };

  // Wire up top-nav links
  document.querySelectorAll('nav a').forEach(a => {
    const t = a.textContent.trim();
    if(navRoutes[t]) { a.href = navRoutes[t]; a.setAttribute('title', 'Go to ' + t); }
  });

  // Comprehensive button/link routing map
  const btnRoutes = {
    'Login':                '../login_page/code.html',
    'Register':             '../registration_page/code.html',
    'Get Started':          '../registration_page/code.html',
    'View Demo':            '../landing_page_1/code.html',
    'Upload Data':          '../upload_sales_data/code.html',
    'Add Medicine':         '../manage_medicines/code.html',
    'Export Reports':       '../upload_sales_data/code.html',
    'Start Sync':           '../upload_sales_data/code.html',
    'Manage Users':         '../pending_registration_approvals/code.html',
    'Manage Medicines':     '../manage_medicines/code.html',
    'System Analytics':     '../pharmacist_dashboard_1/code.html',
    'New Entry':            '../manage_medicines/code.html',
    'Contact Administrator':'../admin_dashboard/code.html',
    'View All':             '../manage_medicines/code.html',
    'View Details':         '../medicine_detail_prediction_1/code.html',
    'View Predictions':     '../medicine_detail_prediction_1/code.html',
    'View Forecast':        '../medicine_detail_prediction_1/code.html',
    'Back to Dashboard':    '../admin_dashboard/code.html',
    'Go to Dashboard':      '../admin_dashboard/code.html',
    'Return to Login':      '../login_page/code.html',
    'Log in here':          '../login_page/code.html',
    'Sign Up':              '../registration_page/code.html',
    'Create Account':       '../registration_page/code.html',
    'Forgot Password?':     '../login_page/code.html',
    'Learn More':           '../landing_page_2/code.html',
    'Try PharmaCast':       '../registration_page/code.html',
    'Start Free Trial':     '../registration_page/code.html',
    'Request Demo':         '../landing_page_1/code.html',
    'Explore Features':     '../landing_page_2/code.html',
    'Add New Medicine':     '../manage_medicines/code.html'
  };

  document.querySelectorAll('button,a').forEach(el => {
    // Check text content matches
    const txt = el.textContent.trim().replace(/\s+/g,' ');
    let matchedRoute = null;
    
    // Check direct match
    if(btnRoutes[txt]) {
      matchedRoute = btnRoutes[txt];
    } else {
      // Check partial match if it contains any key
      for (const key in btnRoutes) {
        if (txt.toLowerCase().includes(key.toLowerCase())) {
          matchedRoute = btnRoutes[key];
          break;
        }
      }
    }
    
    if(matchedRoute) {
      el.addEventListener('click', (e) => {
        // Only prevent default if it's not a submit button or delete button
        if (el.getAttribute('type') !== 'submit' && !txt.includes('Approve') && !txt.includes('Reject') && !txt.includes('Delete') && !el.title?.includes('Delete')) {
          e.preventDefault();
          window.location.href = matchedRoute;
        }
      });
      el.style.cursor = 'pointer';
    }
  });

  // Handle login form submission
  const loginForm = document.querySelector('form');
  if (loginForm && window.location.pathname.includes('login_page')) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.innerHTML = 'Signing in... <span class="material-symbols-outlined">autorenew</span>';
        submitBtn.style.opacity = '0.7';
        submitBtn.disabled = true;
      }
      setTimeout(() => {
        window.location.href = '../admin_dashboard/code.html';
      }, 800);
    });
  }

  // Handle registration form submission
  const regForm = document.querySelector('form');
  if (regForm && window.location.pathname.includes('registration_page')) {
    const regBtn = regForm.querySelector('button');
    if (regBtn) {
      regBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const overlay = document.querySelector('.hidden.absolute');
        if (overlay) {
          overlay.classList.remove('hidden');
        } else {
          regBtn.textContent = 'Registration Submitted!';
          regBtn.style.opacity = '0.7';
          regBtn.disabled = true;
          setTimeout(() => {
            window.location.href = '../login_page/code.html';
          }, 1500);
        }
      });
    }
  }

  // Handle Approval & Rejection on Pending Registration Requests page
  if (window.location.pathname.includes('pending_registration_approvals')) {
    document.querySelectorAll('tr').forEach(row => {
      const approveBtn = Array.from(row.querySelectorAll('button')).find(b => b.textContent.includes('Approve'));
      const rejectBtn = Array.from(row.querySelectorAll('button')).find(b => b.textContent.includes('Reject'));

      if (approveBtn) {
        approveBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const actionContainer = approveBtn.parentElement;
          actionContainer.innerHTML = '<span class="px-3 py-1.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-lg inline-flex items-center gap-1"><span class="material-symbols-outlined text-sm">check_circle</span> Approved</span>';
          
          // Update counters
          const pendingEl = document.querySelector('.bg-surface-container-high .text-2xl');
          const approvedEl = document.querySelector('.bg-tertiary-fixed .text-2xl');
          if (pendingEl) {
            let pVal = parseInt(pendingEl.textContent);
            if (pVal > 0) pendingEl.textContent = pVal - 1;
          }
          if (approvedEl) {
            let aVal = parseInt(approvedEl.textContent);
            approvedEl.textContent = aVal + 1;
          }
        });
      }

      if (rejectBtn) {
        rejectBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const actionContainer = rejectBtn.parentElement;
          actionContainer.innerHTML = '<span class="px-3 py-1.5 bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-lg inline-flex items-center gap-1"><span class="material-symbols-outlined text-sm">cancel</span> Rejected</span>';
          
          // Update counters
          const pendingEl = document.querySelector('.bg-surface-container-high .text-2xl');
          if (pendingEl) {
            let pVal = parseInt(pendingEl.textContent);
            if (pVal > 0) pendingEl.textContent = pVal - 1;
          }
        });
      }
    });
  }

  // Handle Delete Medicine & Add Medicine on Manage Medicines page
  if (window.location.pathname.includes('manage_medicines')) {
    document.querySelectorAll('button').forEach(btn => {
      const isDelete = btn.title?.includes('Delete') || btn.textContent.includes('delete') || btn.querySelector('.material-symbols-outlined')?.textContent.includes('delete');
      if (isDelete) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const row = btn.closest('tr');
          if (row) {
            row.style.transition = 'all 0.3s ease';
            row.style.opacity = '0';
            row.style.transform = 'translateX(20px)';
            setTimeout(() => {
              row.remove();
              const counter = document.querySelector('.border-t span');
              if (counter && counter.textContent.includes('Showing')) {
                const remaining = document.querySelectorAll('tbody tr').length;
                counter.textContent = `Showing 1 to ${remaining} of ${remaining} medicines`;
              }
            }, 300);
          }
        });
      }
    });

    // Save Medicine Record (Add Medicine form)
    const medForm = document.querySelector('form');
    if (medForm) {
      medForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = medForm.querySelector('input[type="text"]');
        const catSelect = medForm.querySelector('select');
        const descInput = medForm.querySelector('textarea');
        const stockInput = medForm.querySelector('input[type="number"]');

        const name = nameInput && nameInput.value.trim() ? nameInput.value.trim() : 'New Clinical Medicine';
        const category = catSelect ? catSelect.value : 'General';
        const stock = stockInput && stockInput.value ? stockInput.value : '100';

        const tbody = document.querySelector('tbody');
        if (tbody) {
          const tr = document.createElement('tr');
          tr.className = 'hover:bg-surface-container-low transition-colors';
          tr.innerHTML = `
            <td class="px-6 py-4 text-sm font-mono text-outline">PC-${Math.floor(1000 + Math.random() * 9000)}</td>
            <td class="px-6 py-4">
              <div class="flex flex-col">
                <span class="font-semibold text-primary">${name}</span>
                <span class="text-xs text-outline italic">${descInput && descInput.value ? descInput.value : 'Clinical stock record'}</span>
              </div>
            </td>
            <td class="px-6 py-4">
              <span class="bg-secondary-container/20 text-on-secondary-container px-3 py-1 rounded-full text-[11px] font-bold">${category}</span>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center gap-2">
                <div class="w-16 h-1.5 bg-surface-container rounded-full overflow-hidden">
                  <div class="bg-on-tertiary-container h-full w-[70%]"></div>
                </div>
                <span class="text-sm font-bold text-primary">${stock}</span>
              </div>
            </td>
            <td class="px-6 py-4 text-sm text-outline">Today</td>
            <td class="px-6 py-4 text-right space-x-1">
              <button class="p-2 text-on-secondary-fixed-variant hover:bg-secondary-fixed rounded transition-colors" title="Edit">
                <span class="material-symbols-outlined text-[18px]">edit</span>
              </button>
              <button class="p-2 text-error hover:bg-error-container rounded transition-colors delete-new-btn" title="Delete">
                <span class="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </td>
          `;
          tbody.prepend(tr);

          const newDel = tr.querySelector('.delete-new-btn');
          if (newDel) {
            newDel.addEventListener('click', (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              tr.remove();
            });
          }

          medForm.reset();
        }
      });
    }
  }

  // KPI Cards Interactivity
  document.querySelectorAll('.bg-surface-container-lowest, .bg-primary-container').forEach(card => {
    const text = card.textContent;
    if (text.includes('Total Users') || text.includes('Pending Approvals')) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        if (!e.target.closest('button, a')) {
          window.location.href = '../pending_registration_approvals/code.html';
        }
      });
    } else if (text.includes('Total Medicines')) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        if (!e.target.closest('button, a')) {
          window.location.href = '../manage_medicines/code.html';
        }
      });
    } else if (text.includes('Sales Records Uploaded')) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        if (!e.target.closest('button, a')) {
          window.location.href = '../upload_sales_data/code.html';
        }
      });
    }
  });

  // Table Row Search / Filtering
  const searchInput = document.querySelector('input[placeholder*="Search"]');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const rows = document.querySelectorAll('tbody tr');
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
      });
    });
  }

  // Table Rows Clickable to Details
  document.querySelectorAll('tbody tr').forEach(row => {
    if (!window.location.pathname.includes('pending_registration_approvals') && !window.location.pathname.includes('manage_medicines')) {
      row.style.cursor = 'pointer';
      row.addEventListener('click', (e) => {
        if (!e.target.closest('button, a, input')) {
          window.location.href = '../medicine_detail_prediction_1/code.html';
        }
      });
    }
  });

  // Brand logo → hub page
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
"@

# Force overwrite of the script tag in all code.html files
$files = Get-ChildItem $stitch -Recurse -Filter "code.html"
foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    
    $pattern = '(?s)<script>.*?const navRoutes = \{.*?</script>'
    $newContent = [regex]::Replace($content, $pattern, $newScript)
    
    if ($newContent -ne $content) {
        [System.IO.File]::WriteAllText($file.FullName, $newContent)
        Write-Host "Updated script in: $($file.FullName)"
    } else {
        Write-Host "Pattern did not match in: $($file.FullName)"
    }
}

Write-Host "`nDone updating script in all files!"
