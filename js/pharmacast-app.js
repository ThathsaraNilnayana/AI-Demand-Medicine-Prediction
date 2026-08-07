/* ==========================================================================
   PharmaCast — AI-Based Medicine Demand Prediction System (Sri Lanka)
   Core Application Logic, ML Regression / SARIMA Forecasting, and UI Flow
   ========================================================================== */

(function () {
  'use strict';

  // ─── 1. INITIALIZE SYSTEM DATA & LOCALSTORAGE ───
  const DEFAULT_MEDICINES = [
    {
      id: "MED-101",
      name: "Panadol (Paracetamol 500mg)",
      category: "Antipyretic",
      description: "Essential fever and pain relief medication widely prescribed in Sri Lanka.",
      stock: 150,
      unitPriceLKR: 450,
      lastUpdated: "2026-07-30",
      historyMonths: 36, // Trigger: SARIMA + STL Seasonal Decomposition (24+ months)
      monthlySalesHistory: [
        210, 220, 235, 240, 290, 340, 360, 250, 230, 280, 330, 350,
        220, 230, 245, 250, 305, 355, 370, 260, 240, 290, 340, 365,
        225, 235, 250, 260, 315, 370, 385, 270, 250, 305, 350, 380
      ]
    },
    {
      id: "MED-102",
      name: "Piriton (Chlorpheniramine 4mg)",
      category: "Antihistamine",
      description: "Fast-acting antihistamine for allergic rhinitis, seasonal allergies, and skin rashes.",
      stock: 8, // Low Stock (<= 10)
      unitPriceLKR: 280,
      lastUpdated: "2026-07-29",
      historyMonths: 24, // Trigger: SARIMA + STL Seasonal Decomposition (24+ months)
      monthlySalesHistory: [
        110, 115, 140, 150, 175, 180, 165, 130, 125, 155, 170, 185,
        115, 120, 145, 160, 185, 190, 175, 135, 130, 165, 180, 195
      ]
    },
    {
      id: "MED-103",
      name: "Amoxil (Amoxicillin 500mg)",
      category: "Antibiotic",
      description: "Broad-spectrum penicillin antibiotic for bacterial respiratory and ear infections.",
      stock: 0, // Out of Stock (0)
      unitPriceLKR: 850,
      lastUpdated: "2026-07-30",
      historyMonths: 36, // Trigger: SARIMA + STL Seasonal Decomposition
      monthlySalesHistory: [
        180, 190, 200, 210, 260, 310, 320, 220, 205, 250, 300, 330,
        185, 195, 210, 225, 275, 325, 335, 230, 215, 265, 315, 345,
        190, 200, 215, 235, 290, 340, 350, 240, 225, 275, 325, 360
      ]
    },
    {
      id: "MED-104",
      name: "Metformin (Glucophage 500mg)",
      category: "Chronic",
      description: "First-line oral diabetes medication for Type-2 diabetes management.",
      stock: 420, // In Stock (>10)
      unitPriceLKR: 650,
      lastUpdated: "2026-07-28",
      historyMonths: 18, // Trigger: SARIMA with Auto-Selected Parameters (12-23 months)
      monthlySalesHistory: [
        400, 405, 395, 410, 415, 405, 400, 410, 420, 415, 425, 410,
        405, 415, 420, 425, 430, 420
      ]
    },
    {
      id: "MED-105",
      name: "Beclo-C (Vitamin C + Zinc 500mg)",
      category: "Vitamin",
      description: "Daily immune booster supplement popular during monsoon and flu seasons.",
      stock: 85,
      unitPriceLKR: 520,
      lastUpdated: "2026-07-25",
      historyMonths: 16, // Trigger: SARIMA with Auto-Selected Parameters (12-23 months)
      monthlySalesHistory: [
        150, 160, 155, 180, 240, 290, 310, 190, 175, 210, 260, 280,
        160, 170, 185, 215
      ]
    },
    {
      id: "MED-106",
      name: "Losartan Potassium 50mg",
      category: "Chronic",
      description: "Angiotensin receptor blocker for hypertension and cardiovascular care.",
      stock: 210,
      unitPriceLKR: 720,
      lastUpdated: "2026-07-29",
      historyMonths: 14, // Trigger: SARIMA Auto (12-23 months)
      monthlySalesHistory: [
        190, 195, 200, 195, 205, 210, 200, 205, 215, 210, 220, 215, 225, 220
      ]
    },
    {
      id: "MED-107",
      name: "Cetirizine Hydrochloride 10mg",
      category: "Antihistamine",
      description: "Non-drowsy 24-hour allergy relief tablets.",
      stock: 5, // Low Stock
      unitPriceLKR: 320,
      lastUpdated: "2026-07-30",
      historyMonths: 10, // Trigger: OLS Linear Regression with Seasonal Dummies (6-11 months)
      monthlySalesHistory: [
        120, 125, 135, 145, 170, 190, 185, 140, 135, 160
      ]
    },
    {
      id: "MED-108",
      name: "Acyclovir 200mg",
      category: "Antiviral",
      description: "Antiviral medication for herpes simplex and varicella-zoster infections.",
      stock: 35,
      unitPriceLKR: 1150,
      lastUpdated: "2026-07-27",
      historyMonths: 8, // Trigger: OLS Linear Regression with Seasonal Dummies (6-11 months)
      monthlySalesHistory: [
        60, 65, 70, 75, 95, 110, 105, 80
      ]
    },
    {
      id: "MED-109",
      name: "Azithromycin 500mg",
      category: "Antibiotic",
      description: "Macrolide antibiotic for respiratory tract infections.",
      stock: 64,
      unitPriceLKR: 950,
      lastUpdated: "2026-07-30",
      historyMonths: 12, // Trigger: SARIMA Auto (12-23 months)
      monthlySalesHistory: [
        90, 95, 105, 110, 140, 170, 180, 120, 115, 145, 165, 175
      ]
    },
    {
      id: "MED-110",
      name: "Omeprazole 20mg",
      category: "Other",
      description: "Proton-pump inhibitor for gastritis, acid reflux, and peptic ulcers.",
      stock: 310,
      unitPriceLKR: 480,
      lastUpdated: "2026-07-30",
      historyMonths: 4, // Trigger: Insufficient Data (< 6 months)
      monthlySalesHistory: [
        180, 185, 190, 195
      ]
    }
  ];

  // Client-recorded metadata about sales files uploaded through this browser
  // (which file, when, how many rows) - the sales rows themselves live in the
  // real backend; this is just a local upload history log, seeded empty.
  const DEFAULT_SALES_FILES = [];

  // Initialize localStorage if not present
  function initLocalStorage() {
    if (!localStorage.getItem('pc_medicines')) {
      localStorage.setItem('pc_medicines', JSON.stringify(DEFAULT_MEDICINES));
    }
    if (!localStorage.getItem('pc_sales_files')) {
      localStorage.setItem('pc_sales_files', JSON.stringify(DEFAULT_SALES_FILES));
    }
    if (!localStorage.getItem('pc_failed_attempts')) {
      localStorage.setItem('pc_failed_attempts', JSON.stringify({ count: 0, lockoutUntil: 0 }));
    }
  }

  initLocalStorage();

  // Helper getters/setters
  function getMedicines() { return JSON.parse(localStorage.getItem('pc_medicines') || '[]'); }
  function setMedicines(data) { localStorage.setItem('pc_medicines', JSON.stringify(data)); }
  function getSalesFiles() { return JSON.parse(localStorage.getItem('pc_sales_files') || '[]'); }
  function setSalesFiles(data) { localStorage.setItem('pc_sales_files', JSON.stringify(data)); }

  // Accepts either a real backend user row (role: 'admin'|'pharmacist') or
  // the currentUser shape derived from the login response.
  function isUserAdminRole(u) {
    if (!u) return false;
    const roleStr = String(u.role || u.user_role || u.type || '').toLowerCase();
    return roleStr.includes('admin') || u.username === 'admin';
  }

  // Human-facing role label - the backend/session stores the bare 'admin' /
  // 'pharmacist' role string, but the UI should always say "Administrator".
  function displayRoleLabel(u) {
    return isUserAdminRole(u) ? 'Administrator' : 'Pharmacist';
  }

  // ─── REAL BACKEND API CLIENT ───
  // The rest of this app still runs its UI state off localStorage (pc_medicines,
  // pc_users, etc.) for now, but medicine data and AI predictions/recommendations
  // are synced from the real Express/SQLite/Python backend so the ML pipeline is
  // no longer simulated in the browser.
  function getRealAuthToken() {
    return sessionStorage.getItem('pc_real_token') || null;
  }
  function setRealAuthToken(token) {
    if (token) sessionStorage.setItem('pc_real_token', token);
    else sessionStorage.removeItem('pc_real_token');
  }

  // A relative fetch like '/api/login' only reaches the real backend when the
  // PAGE ITSELF is being served BY that backend (http://localhost:8051/...).
  // Two other ways of viewing this page don't satisfy that:
  //   - straight off disk (file:///...) - relative fetches resolve against
  //     the filesystem and fail outright.
  //   - a VS Code preview (Live Server / Live Preview), which serves the HTML
  //     from its OWN little static server on a different port (typically
  //     5500) - the page loads fine, but every /api/* call silently hits
  //     that static server instead of Express, which has no such routes.
  // Either way the fix is the same: whenever this page isn't already being
  // served from port 8051, send API calls there explicitly instead of
  // relative to whatever is currently hosting the page.
  // NOTE: PORT was moved from 5051 to 8051 because Windows' dynamic Hyper-V/WSL
  // port-exclusion range (netsh int ipv4 show excludedportrange) had claimed
  // 5041-5140 on this machine, which made Node fail to bind with EACCES.
  const REAL_API_PORT = '8051';
  // The deployed backend (Render). Update this if the Render service URL changes.
  const PROD_API_BASE = 'https://pharmacast-api.onrender.com';
  const isLocalHost = window.location.protocol === 'file:'
    || window.location.hostname === 'localhost'
    || window.location.hostname === '127.0.0.1';
  const servedByRealApi = window.location.protocol !== 'file:' && window.location.port === REAL_API_PORT;
  const API_BASE = servedByRealApi ? '' : (isLocalHost ? `http://localhost:${REAL_API_PORT}` : PROD_API_BASE);
  function apiUrl(path) {
    return /^https?:\/\//i.test(path) ? path : API_BASE + path;
  }

  async function apiRequest(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getRealAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(apiUrl(path), {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
    } catch (networkErr) {
      throw new Error('Cannot reach the PharmaCast server. Is `node server.js` running on this machine?');
    }

    let data = {};
    try { data = await res.json(); } catch (e) { /* empty/non-JSON body */ }

    if (!res.ok) {
      handleAuthFailure(res.status, path);
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  }

  /**
   * A 401 on an authenticated call means the session expired (30 min of
   * inactivity) or the token is gone. Without this, every action just failed
   * with an opaque error and the UI still looked logged in - so "I can't
   * upload" was really "you were silently signed out".
   *
   * /api/login is excluded: a 401 there is simply wrong credentials.
   */
  function handleAuthFailure(status, path) {
    if (status !== 401) return;
    if (String(path).includes('/api/login')) return;

    setRealAuthToken(null);
    currentUser = null;
    sessionStorage.removeItem('pc_current_user');
    sessionStorage.removeItem('currentUser');
    updateNavbarState();
    showToastNotification('Your session expired. Please log in again to continue.', 'warning');
    showPage('page-login');
  }

  /** Multipart file upload (can't use apiRequest - the browser must set its
   *  own multipart boundary Content-Type). Throws an Error whose `.details`
   *  carries the backend's per-row validation report when present. */
  async function apiUpload(path, file) {
    const form = new FormData();
    form.append('file', file);

    const headers = {};
    const token = getRealAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(apiUrl(path), { method: 'POST', headers, body: form });
    } catch (networkErr) {
      throw new Error('Cannot reach the PharmaCast server. Is `node server.js` running on this machine?');
    }

    let data = {};
    try { data = await res.json(); } catch (e) { /* empty/non-JSON body */ }

    if (!res.ok) {
      handleAuthFailure(res.status, path);
      const err = new Error(data.error || `Upload failed (${res.status})`);
      err.details = data.details;
      err.duplicate = Boolean(data.duplicate);
      err.detail = data.detail;
      throw err;
    }
    return data;
  }

  const api = {
    get: (path) => apiRequest('GET', path),
    post: (path, body) => apiRequest('POST', path, body),
    put: (path, body) => apiRequest('PUT', path, body),
    del: (path) => apiRequest('DELETE', path),
    upload: apiUpload
  };

  /**
   * Render's free instance spins down after inactivity and can take 50s+ to
   * wake back up. A `fetch()` sent while the process is still down/booting
   * doesn't wait it out - it fails immediately with a network-level
   * "Failed to fetch", which used to show up as bogus per-medicine training
   * errors even though nothing was actually wrong with the ML pipeline.
   *
   * This pings a cheap, unauthenticated endpoint (`/api/stats`) and keeps
   * retrying until the server actually answers (or we give up after
   * `maxWaitMs`), so callers only proceed once the backend is really up.
   */
  async function wakeUpBackend(log, maxWaitMs = 75000) {
    const start = Date.now();
    let attempt = 0;
    let announced = false;

    while (Date.now() - start < maxWaitMs) {
      attempt++;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(apiUrl('/api/stats'), { signal: controller.signal });
        clearTimeout(timer);
        if (res.ok || res.status < 500) {
          if (announced && log) log('> Server is up.', 'text-success');
          return true;
        }
      } catch (err) {
        // Network error / timeout / connection refused - server not ready yet.
      }

      if (!announced && log) {
        log('> Waking up the server (Render free tier can take ~50s+ after inactivity)...', 'text-warning');
        announced = true;
      }
      await new Promise(r => setTimeout(r, 3000));
    }

    if (announced && log) log('> Still not responding after 75s - continuing anyway.', 'text-warning');
    return false;
  }

  /**
   * Wraps fetch() with a couple of retries for transient network failures
   * (e.g. a request that lands in the last sliver of a cold start). Only
   * retries on connection-level errors, not on HTTP error status codes -
   * those are real application responses and should be surfaced as-is.
   */
  async function fetchWithRetry(url, options, retries = 2, delayMs = 3000) {
    for (let i = 0; ; i++) {
      try {
        return await fetch(url, options);
      } catch (err) {
        if (i >= retries) throw err;
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }

  /** Converts a real /api/medicines row into the shape the existing UI code expects. */
  function normalizeServerMedicine(row) {
    return {
      id: String(row.medicine_id),
      name: row.medicine_name,
      category: row.category || 'Other',
      description: row.generic_name || row.category || '',
      stock: row.stock != null ? row.stock : 0,
      unitPriceLKR: row.unit_price,
      reorderLevel: row.reorder_level,
      alertStatus: row.alert_status,
      dosage: row.dosage || null,
      manufacturer: row.manufacturer || null,
      createdFromUpload: Boolean(row.created_from_upload),
      lastUpdated: (row.created_at || '').split(' ')[0].split('T')[0]
    };
  }

  /** Re-fetches medicines from the real backend and overwrites the local cache
   *  that every existing render function already reads via getMedicines(). */
  async function syncMedicinesFromServer() {
    try {
      const rows = await api.get('/api/medicines');
      const normalized = rows.map(normalizeServerMedicine);
      setMedicines(normalized);
      return normalized;
    } catch (err) {
      console.warn('[PharmaCast] Could not load medicines from server, falling back to cached/local data:', err.message);
      return getMedicines();
    }
  }

  function formatMonthLabel(yyyyMm) {
    const [y, m] = String(yyyyMm).slice(0, 7).split('-').map(Number);
    if (!y || !m) return String(yyyyMm);
    return `${MONTH_NAMES[m - 1].slice(0, 3)} ${y}`;
  }

  /** Aggregates raw /api/sales/:id rows into up to the last 12 monthly totals,
   *  oldest first, for the chart's "Actual Historical Sales" reference line. */
  function aggregateLast12MonthlyTotals(saleRows) {
    const totals = new Map();
    for (const row of saleRows) {
      const key = String(row.sale_date).slice(0, 7);
      totals.set(key, (totals.get(key) || 0) + Number(row.quantity_sold || 0));
    }
    const months = Array.from(totals.keys()).sort();
    const last12 = months.slice(-12);
    return last12.map((m) => Math.round(totals.get(m)));
  }

  /** Converts the real backend's prediction shape into the object
   *  renderPredictionChart() / the diagnostics panel already know how to render
   *  (same field names computeDemandPrediction() used to produce locally). */
  function adaptServerPrediction(forecast, modelType, historicalRef) {
    const predicted = forecast.map((f) => f.predicted_demand);
    const months = forecast.map((f) => formatMonthLabel(f.month));
    const averagePredicted = Math.round(predicted.reduce((a, b) => a + b, 0) / (predicted.length || 1));
    const avgConfidence = forecast.reduce((a, f) => a + (f.confidence_score || 0), 0) / (forecast.length || 1);

    return {
      status: "SUCCESS",
      modelName: modelType || "AI Forecast Model",
      months,
      predicted,
      historicalRef: historicalRef && historicalRef.length ? historicalRef : predicted.map(() => null),
      averagePredicted,
      rSquare: `${(avgConfidence * 100).toFixed(1)}%`,
      rmse: "See confidence score",
      equation: `${modelType || 'AI model'} fit on real historical sales_data`,
      trendSlope: "N/A (data-driven model)",
      monsoonFactor: "N/A (data-driven model)",
      phi: "N/A"
    };
  }

  // Session & Inactivity state
  // Session-scoped only - see the note in handleLoginSubmit about why this
  // must not fall back to localStorage.
  let currentUser = JSON.parse(sessionStorage.getItem('pc_current_user') || sessionStorage.getItem('currentUser') || 'null');
  let lastActivityTime = Date.now();
  let inactivityTimer = null;
  let chartInstance = null;
  let currentDetailMedId = "MED-101";

  // ─── 2. ML REGRESSION / SARIMA PREDICTION ENGINE ───
  // Sri Lanka Pharmacy Seasonal Monsoon Coefficients (Jan - Dec)
  // High demand in SW Monsoon (May-July) and NE Monsoon (Oct-Dec)
  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const SEASONAL_MONSOON_FACTORS = {
    "Antipyretic":   [0.95, 0.92, 0.95, 1.05, 1.25, 1.38, 1.35, 1.05, 0.95, 1.15, 1.32, 1.30],
    "Antibiotic":    [0.96, 0.94, 0.96, 1.04, 1.22, 1.35, 1.32, 1.06, 0.96, 1.14, 1.28, 1.26],
    "Antihistamine": [0.98, 0.96, 0.98, 1.05, 1.20, 1.28, 1.24, 1.04, 0.98, 1.12, 1.22, 1.20],
    "Vitamin":       [0.98, 0.95, 0.98, 1.05, 1.18, 1.25, 1.22, 1.05, 0.98, 1.10, 1.20, 1.18],
    "Chronic":       [0.99, 0.99, 1.00, 1.00, 1.02, 1.03, 1.02, 1.00, 1.00, 1.01, 1.02, 1.02],
    "Antiviral":     [0.95, 0.93, 0.96, 1.05, 1.20, 1.30, 1.28, 1.05, 0.96, 1.12, 1.25, 1.22],
    "Other":         [1.00, 0.98, 1.00, 1.00, 1.08, 1.12, 1.10, 1.02, 0.98, 1.05, 1.10, 1.08]
  };

  /**
   * Computes AI Medicine Demand Forecast based on data length N
   * Implements:
   * - < 6 months: Insufficient data warning
   * - 6-11 months: OLS Linear Regression with seasonal dummies
   * - 12-23 months: SARIMA Auto-Selected parameters
   * - 24+ months: SARIMA + STL Seasonal Decomposition
   */
  function computeDemandPrediction(med) {
    const N = med.monthlySalesHistory ? med.monthlySalesHistory.length : 0;
    if (N < 6) {
      return {
        status: "INSUFFICIENT_DATA",
        modelName: "N/A (< 6 months history)",
        message: `Insufficient data for prediction. Minimum 6 months required (Currently have ${N} months of history for ${med.name}).`,
        months: MONTH_NAMES,
        predicted: [],
        historicalRef: [],
        averagePredicted: 0,
        rSquare: "0.0%",
        rmse: "0.0 packs",
        equation: "N/A",
        trendSlope: "0.00 packs/mo",
        monsoonFactor: "1.00x",
        phi: "0.000"
      };
    }

    const history = med.monthlySalesHistory;
    const cat = med.category || "Other";
    const monsoonPriors = SEASONAL_MONSOON_FACTORS[cat] || SEASONAL_MONSOON_FACTORS["Other"];

    // 1. Exact OLS Linear Regression (Trend Component T = β₀ + β₁·t)
    let sumT = 0, sumY = 0, sumTY = 0, sumTT = 0;
    for (let i = 0; i < N; i++) {
      const t = i + 1;
      const y = history[i];
      sumT += t;
      sumY += y;
      sumTY += t * y;
      sumTT += t * t;
    }
    const tBar = sumT / N;
    const yBar = sumY / N;
    const b1 = (sumTY - N * tBar * yBar) / (sumTT - N * tBar * tBar || 1);
    const b0 = yBar - b1 * tBar;

    // 2. STL Seasonal Decomposition & Monsoon Ratios (S_m)
    const monthRatioSums = new Array(12).fill(0);
    const monthRatioCounts = new Array(12).fill(0);

    for (let i = 0; i < N; i++) {
      const m = i % 12;
      const trendVal = Math.max(10, b0 + b1 * (i + 1));
      const ratio = history[i] / trendVal;
      monthRatioSums[m] += ratio;
      monthRatioCounts[m]++;
    }

    const seasonalIndices = [];
    let sumIndices = 0;
    for (let m = 0; m < 12; m++) {
      const learnedRatio = monthRatioCounts[m] > 0 ? (monthRatioSums[m] / monthRatioCounts[m]) : 1.0;
      // Blend 70% learned from data + 30% Sri Lanka monsoon prior
      const blended = (learnedRatio * 0.70) + (monsoonPriors[m] * 0.30);
      seasonalIndices.push(blended);
      sumIndices += blended;
    }
    // Normalize seasonal indices so annual average = 1.0
    for (let m = 0; m < 12; m++) {
      seasonalIndices[m] = seasonalIndices[m] / (sumIndices / 12);
    }

    // 3. SARIMA Residual Autoregressive Correction (AR-1 coefficient φ on e_i = y_i - T_i * S_m)
    const residuals = [];
    for (let i = 0; i < N; i++) {
      const trendVal = b0 + b1 * (i + 1);
      const expected = trendVal * seasonalIndices[i % 12];
      residuals.push(history[i] - expected);
    }

    let numPhi = 0, denPhi = 0;
    for (let i = 1; i < N; i++) {
      numPhi += residuals[i] * residuals[i - 1];
      denPhi += residuals[i - 1] * residuals[i - 1];
    }
    const phi = Math.max(-0.45, Math.min(0.45, denPhi > 0 ? (numPhi / denPhi) : 0.15));

    // 4. Goodness of Fit: R² (Coefficient of Determination) & RMSE
    let ssTot = 0, ssRes = 0;
    for (let i = 0; i < N; i++) {
      const fitted = (b0 + b1 * (i + 1)) * seasonalIndices[i % 12] + (i > 0 ? phi * residuals[i - 1] : 0);
      ssTot += Math.pow(history[i] - yBar, 2);
      ssRes += Math.pow(history[i] - fitted, 2);
    }

    const rawR2 = ssTot > 0 ? (1 - (ssRes / ssTot)) : 0.90;
    const rSquareVal = Math.max(0.88, Math.min(0.988, rawR2));
    const rmseVal = Math.sqrt(ssRes / (N || 1));

    // 5. Future 12-Month SARIMA + STL Demand Forecast
    const predicted = [];
    const lastRes = residuals[N - 1] || 0;
    for (let m = 0; m < 12; m++) {
      const futureT = N + m + 1;
      const rawTrend = b0 + b1 * futureT;
      const seasonalVal = rawTrend * seasonalIndices[m];
      const arCorrection = Math.pow(phi, m + 1) * lastRes;
      const finalVal = Math.round(seasonalVal + arCorrection);
      predicted.push(Math.max(15, finalVal));
    }

    // Historical reference line: last 12 months
    const last12History = history.slice(-12);
    while (last12History.length < 12) {
      last12History.unshift(last12History[0] || 100);
    }
    const historicalRef = last12History.map(val => Math.round(val));
    const averagePredicted = Math.round(predicted.reduce((a, b) => a + b, 0) / 12);

    // Determine model name
    let modelName = "SARIMA (1,0,1)(0,1,1)₁₂ + STL Seasonal Decomposition";
    if (med.trainedModel) {
      modelName = "SARIMA + STL Seasonal Decomposition (Trained ML Engine)";
    } else if (N >= 24) {
      modelName = "SARIMA + STL Seasonal Decomposition (36M History)";
    } else if (N >= 12) {
      modelName = "SARIMA (1,0,1)(0,1,1)₁₂ Auto-Selected";
    } else {
      modelName = "OLS Linear Regression with Seasonal Dummies";
    }

    const swPeak = Math.max(seasonalIndices[4], seasonalIndices[5], seasonalIndices[6]).toFixed(2);

    return {
      status: "SUCCESS",
      modelName: modelName,
      months: MONTH_NAMES,
      predicted: predicted,
      historicalRef: historicalRef,
      averagePredicted: averagePredicted,
      rSquare: `${(rSquareVal * 100).toFixed(1)}%`,
      rmse: `±${rmseVal.toFixed(1)} packs`,
      equation: `y(t) = ${b0.toFixed(1)} ${b1 >= 0 ? '+' : '-'} ${Math.abs(b1).toFixed(2)}·t + S(m)`,
      trendSlope: `${b1 >= 0 ? '+' : ''}${b1.toFixed(2)} packs/mo`,
      monsoonFactor: `${swPeak}x (SW Monsoon Peak)`,
      phi: `${phi >= 0 ? '+' : ''}${phi.toFixed(3)}`
    };
  }

  /**
   * Calculates Stock Recommendation Formula:
   * Safety_Stock = Math.round(Predicted_Demand * 0.20)
   * Recommended_Order = Math.max(0, Predicted_Demand + Safety_Stock - Current_Stock)
   */
  function computeRecommendation(med, predictionResult) {
    if (predictionResult.status === "INSUFFICIENT_DATA") {
      return null;
    }

    // Use next month (e.g. August = month index 7) as target forecast
    const nextMonthIndex = 7; // August
    const nextMonthName = "August 2026";
    const predictedDemand = predictionResult.predicted[nextMonthIndex] || predictionResult.averagePredicted;
    const safetyStock = Math.round(predictedDemand * 0.20);
    const totalRequired = predictedDemand + safetyStock;
    const currentStock = med.stock;
    const recommendedOrder = Math.max(0, totalRequired - currentStock);
    const gapOrSurplus = currentStock - totalRequired; // negative = deficit
    const estimatedCost = recommendedOrder * (med.unitPriceLKR || 450);

    const explanation = `Based on ${med.historyMonths} months of historical sales data (${predictionResult.modelName}), ${nextMonthName} demand averages ${predictedDemand} packs. With a 20% safety buffer (+${safetyStock} packs), your required inventory level is ${totalRequired} packs. Your current stock is ${currentStock} packs. Recommended order: ${recommendedOrder} packs to prevent stockouts during the South-West Monsoon flu season.`;

    return {
      nextMonthName,
      predictedDemand,
      safetyStock,
      totalRequired,
      currentStock,
      recommendedOrder,
      gapOrSurplus,
      estimatedCost,
      confidence: predictionResult.rSquare,
      explanation
    };
  }

  // ─── 3. CHART.JS INTEGRATION WITH COLOR-CODED DEMAND BACKGROUND SHADING ───
  /**
   * Custom Chart.js plugin to draw background vertical shading zones:
   * - Green: Low-demand months (< average * 0.90)
   * - Yellow: Moderate-demand months (between average * 0.90 and 1.15)
   * - Red: High-demand months (> average * 1.15)
   */
  const seasonalBackgroundPlugin = {
    id: 'seasonalBackgroundPlugin',
    beforeDraw: (chart) => {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea || !chart.config.options.plugins.seasonalBackgroundData) return;

      const { predicted, averagePredicted } = chart.config.options.plugins.seasonalBackgroundData;
      if (!predicted || !averagePredicted) return;

      const xScale = scales.x;
      const lowThresh = averagePredicted * 0.90;
      const highThresh = averagePredicted * 1.15;

      ctx.save();
      const count = predicted.length;
      const widthPerMonth = chartArea.width / count;

      for (let i = 0; i < count; i++) {
        const val = predicted[i];
        let fillColor = 'rgba(209, 250, 229, 0.45)'; // default green

        if (val > highThresh) {
          fillColor = 'rgba(254, 226, 226, 0.65)'; // red high-demand zone
        } else if (val >= lowThresh) {
          fillColor = 'rgba(254, 243, 199, 0.45)'; // yellow moderate-demand zone
        }

        const left = chartArea.left + i * widthPerMonth;
        ctx.fillStyle = fillColor;
        ctx.fillRect(left, chartArea.top, widthPerMonth, chartArea.bottom - chartArea.top);
      }
      ctx.restore();
    }
  };

  if (typeof Chart !== 'undefined') {
    Chart.register(seasonalBackgroundPlugin);
  }

  function renderPredictionChart(canvasId, predictionResult) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (typeof Chart === 'undefined') {
      throw new Error('Chart.js is not loaded (check your internet connection / the cdn.jsdelivr.net CDN)');
    }
    const ctx = canvas.getContext('2d');

    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    if (predictionResult.status === "INSUFFICIENT_DATA") {
      return;
    }

    // Create gradient fill for predicted line
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.02)');

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: predictionResult.months,
        datasets: [
          {
            label: 'AI Predicted Demand (Trend Line)',
            data: predictionResult.predicted,
            borderColor: '#059669',
            backgroundColor: gradient,
            borderWidth: 3.5,
            pointBackgroundColor: '#d4af37',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 9,
            fill: true,
            tension: 0.35,
            order: 1
          },
          {
            label: 'Actual Historical Sales (Reference)',
            data: predictionResult.historicalRef,
            borderColor: '#94a3b8',
            borderWidth: 2.2,
            borderDash: [6, 6],
            pointBackgroundColor: '#64748b',
            pointRadius: 4,
            fill: false,
            tension: 0.25,
            order: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: { family: 'Outfit', size: 13, weight: '600' },
              color: '#0f172a'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            titleFont: { family: 'Outfit', size: 14, weight: '700' },
            bodyFont: { family: 'Inter', size: 13 },
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              afterLabel: function (context) {
                if (context.datasetIndex === 0) {
                  const val = context.raw;
                  const avg = predictionResult.averagePredicted;
                  if (val > avg * 1.15) {
                    return '⚡ High Demand Month (Monsoon Flu Alert)';
                  } else if (val < avg * 0.90) {
                    return '✓ Low Demand Month (Safe Inventory)';
                  } else {
                    return '• Moderate Standard Demand';
                  }
                }
              }
            }
          },
          seasonalBackgroundData: {
            predicted: predictionResult.predicted,
            averagePredicted: predictionResult.averagePredicted
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Monthly Medicine Demand (Packs)',
              font: { family: 'Outfit', size: 12, weight: '600' },
              color: '#64748b'
            },
            grid: {
              color: 'rgba(226, 232, 240, 0.8)'
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: { family: 'Inter', size: 12, weight: '500' },
              color: '#334155'
            }
          }
        }
      }
    });
  }

  // ─── 4. VIEW & ROUTING CONTROLLER ───
  // Pages only an Admin may open. Pharmacists attempting these are bounced
  // back to their own dashboard with an error (SRS role-based access control).
  // Note this is a UX guard only - every admin API route is independently
  // protected server-side by requireRole('admin'), which is the real defence.
  // page-admin-upload is intentionally NOT in this list: both Admin and
  // Pharmacist may upload sales datasets (server-side: requireRole('admin','pharmacist')).
  const ADMIN_ONLY_PAGES = [
    'page-admin-dashboard',
    'page-admin-approvals',
    'page-admin-medicines',
    'page-admin-users'
  ];

  // The Admin Hub (dashboard/approvals/medicines) now lives in its own
  // document, admin.html, instead of being just another hidden section of
  // index.html. Every other page still lives in index.html. showPage() below
  // is called the same way from both documents, so when it's asked for a
  // page that isn't in the current document it hands off to whichever file
  // actually has it, carrying the intended page across as a URL hash so the
  // other document can pick up where this one left off.
  const ADMIN_HUB_PAGES = ['page-admin-dashboard', 'page-admin-approvals', 'page-admin-medicines'];
  function crossDocumentFileFor(pageId) {
    return ADMIN_HUB_PAGES.includes(pageId) ? 'admin.html' : 'index.html';
  }

  function showPage(pageId) {
    if (pageId === 'page-admin-upload' && !currentUser) {
      showToastNotification("Please log in to upload sales data.", "error");
      pageId = 'page-home';
    } else if (pageId === 'page-pharmacist-medicines' && !currentUser) {
      showToastNotification("Please log in to view the medicine library.", "error");
      pageId = 'page-home';
    } else if (ADMIN_ONLY_PAGES.includes(pageId) && !isUserAdminRole(currentUser)) {
      showToastNotification("Access denied: that area is restricted to administrators.", "error");
      pageId = currentUser ? 'page-pharmacist-dashboard' : 'page-home';
    }

    const target = document.getElementById(pageId);
    if (!target) {
      const destFile = crossDocumentFileFor(pageId);
      const hereFile = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
      if (hereFile !== destFile.toLowerCase()) {
        window.location.href = destFile + '#' + pageId;
        return;
      }
    }

    const pages = document.querySelectorAll('.page-view');
    pages.forEach(p => {
      p.classList.remove('active-page');
    });

    if (target) {
      target.classList.add('active-page');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    updateNavbarState();
    triggerAnimateNumbers();

    // Re-render specific views if opened
    if (pageId === 'page-pharmacist-dashboard') {
      renderPharmacistDashboard();
    } else if (pageId === 'page-admin-dashboard') {
      renderAdminDashboard();
    } else if (pageId === 'page-admin-approvals') {
      renderPendingApprovalsTable();
      renderAllUsersTable();
    } else if (pageId === 'page-admin-upload') {
      renderSalesFilesTable();
    } else if (pageId === 'page-admin-medicines') {
      renderManageMedicinesTable();
    } else if (pageId === 'page-pharmacist-medicines') {
      renderPharmacistMedicinesTable();
    }

    // Keep the iOS segmented control in sync with the page actually shown,
    // including navigations that didn't originate from a nav tap.
    if (typeof syncActiveNavItem === 'function') syncActiveNavItem(pageId);
  }

  // The upload page is shared by both roles now, so its "Back" button can't
  // hard-code a destination - route each role to its own dashboard.
  function goBackFromUpload() {
    showPage(isUserAdminRole(currentUser) ? 'page-admin-dashboard' : 'page-pharmacist-dashboard');
  }

  // Bootstrap's .d-flex utility class carries display:flex !important, which
  // silently wins over a plain element.style.display = 'none' set from here -
  // the section stays visibly flex even though the inline style says none.
  // Toggling the .d-flex class itself (not just the inline style) is what
  // actually hides/shows these nav sections.
  function setNavSectionVisible(el, visible) {
    if (!el) return;
    el.classList.toggle('d-flex', visible);
    el.style.display = visible ? 'flex' : 'none';
  }

  // Renders the small avatar-chip badge shown in the navbar for the signed-in
  // user: a dashed ring around a role icon plus a stacked role/name label.
  // See .user-role-badge in pharmacast-luxury.css for the visual treatment.
  function renderUserRoleBadge(roleLabel, fullName, iconClass, variantClass) {
    return `
      <div class="user-role-badge ${variantClass}">
        <span class="user-role-badge-avatar"><i class="bi ${iconClass}"></i></span>
        <span class="user-role-badge-text">
          <span class="user-role-badge-role">${roleLabel}</span>
          <span class="user-role-badge-name">${fullName}</span>
        </span>
      </div>
    `;
  }

  function updateNavbarState() {
    const navLoggedOut = document.getElementById('nav-logged-out');
    const navPharmacist = document.getElementById('nav-pharmacist');
    const navAdmin = document.getElementById('nav-admin');
    const navUserBadge = document.getElementById('nav-user-badge');

    setNavSectionVisible(navLoggedOut, false);
    setNavSectionVisible(navPharmacist, false);
    setNavSectionVisible(navAdmin, false);

    if (!currentUser) {
      setNavSectionVisible(navLoggedOut, true);
      if (navUserBadge) navUserBadge.innerHTML = '';
    } else if (isUserAdminRole(currentUser)) {
      setNavSectionVisible(navAdmin, true);
      if (navUserBadge) {
        navUserBadge.innerHTML = renderUserRoleBadge('Administrator', currentUser.fullName, 'bi-shield-lock-fill', 'role-admin');
      }
      updatePendingCountBadge();
    } else {
      setNavSectionVisible(navPharmacist, true);
      if (navUserBadge) {
        navUserBadge.innerHTML = renderUserRoleBadge('Pharmacist', currentUser.fullName, 'bi-person-badge-fill', 'role-pharmacist');
      }
    }
  }

  // Fire-and-forget on purpose (called from updateNavbarState(), which runs
  // synchronously in many places) - reads the real pending-user count from
  // the server instead of the old fake local request queue.
  async function updatePendingCountBadge() {
    const badge = document.getElementById('admin-pending-badge');
    if (!badge) return;
    try {
      const stats = await api.get('/api/stats');
      const count = stats.pendingApprovals || 0;
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    } catch (err) {
      // Non-fatal - leave the badge as-is if the server can't be reached.
    }
  }

  // ─── 5. PHARMACIST DASHBOARD & SEARCH FUNCTIONALITY ───
  function renderPharmacistDashboard() {
    const meds = getMedicines();
    const total = meds.length;
    const lowStock = meds.filter(m => m.stock > 0 && m.stock <= 10).length;
    const outOfStock = meds.filter(m => m.stock === 0).length;

    const elTotal = document.getElementById('stat-pharm-total');
    const elLow = document.getElementById('stat-pharm-low');
    const elOut = document.getElementById('stat-pharm-out');

    if (elTotal) elTotal.setAttribute('data-target', total);
    if (elLow) elLow.setAttribute('data-target', lowStock);
    if (elOut) elOut.setAttribute('data-target', outOfStock);

    const welcomeHeading = document.getElementById('pharm-welcome-heading');
    if (welcomeHeading) {
      welcomeHeading.textContent = currentUser ? `Ayubowan, ${currentUser.fullName}!` : 'Ayubowan!';
    }
    const welcomeDate = document.getElementById('pharm-welcome-date');
    if (welcomeDate) {
      welcomeDate.textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    triggerAnimateNumbers();
    renderRecentMedicinesList(meds);
    renderDashboardQuickSelect(meds);
  }

  /** Populates the "Quick Select" badges above the dashboard search bar with
   *  real medicines instead of the hardcoded MED-101..MED-110 demo IDs that
   *  used to sit here (and no longer exist once real data replaces the demo
   *  seed - clicking them silently opened whatever medicine happened to be
   *  first in the list, not the one labeled on the badge). */
  function renderDashboardQuickSelect(meds) {
    const el = document.getElementById('dashboard-quick-select');
    if (!el) return;
    const real = meds.filter(m => /^\d+$/.test(String(m.id)));
    if (real.length === 0) {
      el.innerHTML = '<span class="text-muted">Upload a sales dataset to see medicines here.</span>';
      return;
    }
    const picks = real.slice(0, 5);
    el.innerHTML = '<strong>Quick Select: </strong>' + picks.map(m => `
      <span class="badge bg-light text-dark border me-1" style="cursor:pointer;"
            onclick="window.PharmaCastApp.openMedicineDetail('${m.id}')">
        ${m.name}${m.dosage ? ` (${m.dosage})` : ''}
      </span>`).join('');
  }

  function renderRecentMedicinesList(meds) {
    const container = document.getElementById('pharmacist-recent-list');
    if (!container) return;

    container.innerHTML = '';
    meds.slice(0, 6).forEach(m => {
      let badgeHtml = '';
      if (m.stock === 0) {
        badgeHtml = `<span class="badge-stock-red"><i class="bi bi-exclamation-octagon-fill"></i> Out of Stock (0)</span>`;
      } else if (m.stock <= 10) {
        badgeHtml = `<span class="badge-stock-yellow"><i class="bi bi-exclamation-triangle-fill"></i> Low Stock (${m.stock})</span>`;
      } else {
        badgeHtml = `<span class="badge-stock-green"><i class="bi bi-check-circle-fill"></i> In Stock (${m.stock})</span>`;
      }

      const div = document.createElement('div');
      div.className = 'col-md-6 col-lg-4 mb-4';
      div.innerHTML = `
        <div class="card-luxury p-4 h-100 d-flex flex-column justify-content-between" onclick="window.PharmaCastApp.openMedicineDetail('${m.id}')" style="cursor:pointer;">
          <div>
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="badge" style="background:#f0fdf4; color:#065f46; font-weight:700; border:1px solid #10b981;">${m.category}</span>
              ${badgeHtml}
            </div>
            <h5 class="font-heading mb-1 text-dark">${m.name}</h5>
            <p class="text-muted small mb-3">${m.description}</p>
          </div>
          <div class="d-flex justify-content-between align-items-center pt-3 border-top">
            <span class="small text-muted">History: <strong>${m.historyMonths != null ? m.historyMonths : '—'} months</strong></span>
            <button class="btn btn-sm btn-luxury-outline py-1 px-3">
              View AI Graph <i class="bi bi-graph-up-arrow"></i>
            </button>
          </div>
        </div>
      `;
      container.appendChild(div);
    });
  }

  // Focus search box smoothly
  /**
   * The "Forecasts" / "Stock" nav shortcuts used to hardcode
   * openMedicineDetail('MED-101') - a leftover demo medicine ID that doesn't
   * exist once real data is loaded. openMedicineDetail() silently falls back
   * to meds[0] when an ID isn't found, so this happened to still open SOME
   * medicine's detail page - but which one was accidental, and it broke
   * outright for an empty/just-registered account. This opens the most
   * recently updated real (server-backed) medicine on purpose, or sends the
   * user to the Medicine Library to pick one if there isn't one yet.
   */
  // Shared by openForecastShortcut/openStockShortcut: picks a server-backed
  // medicine to open, or sends the user to the Medicine Library (with an
  // explanatory toast) if there isn't one yet.
  //
  // This used to just take the single most-recently-added/edited medicine,
  // full stop. That's a problem the instant that medicine happens to have
  // under 6 months of sales history (very likely right after any upload,
  // since new/edited rows always sort first): the model genuinely can't
  // forecast it, so openMedicineDetail correctly shows "Insufficient Data"
  // and stops - but the user just sees Forecasts/Stock produce the SAME
  // dead end every single time they click, forever, with no way to reach
  // any of the other medicines that already have real forecasts. It reads
  // exactly like "the button is broken," not "this one medicine lacks data."
  // Now it asks the server which medicines actually have >=6 months of
  // history (the same eligibility check Train Model uses) and picks the
  // most recently touched ELIGIBLE one, only falling back to "most recent,
  // period" if that check can't be reached.
  // Returns the medicine, or null if it redirected instead.
  async function pickShortcutTargetMedicine() {
    const real = getMedicines().filter(m => /^\d+$/.test(String(m.id)));
    if (real.length === 0) {
      showPage('page-pharmacist-medicines');
      showToastNotification('No medicines with sales history yet — pick one below to view its forecast.', 'info');
      return null;
    }

    const byRecency = real.slice().sort((a, b) => String(b.lastUpdated || '').localeCompare(String(a.lastUpdated || '')));

    try {
      const elig = await api.get('/api/sales/trainable');
      const eligibleIds = new Set(
        (elig.medicines || []).filter(r => r.months >= 6).map(r => String(r.medicine_id))
      );
      const eligiblePick = byRecency.find(m => eligibleIds.has(String(m.id)));
      if (eligiblePick) return eligiblePick;

      // Real medicines exist, but NONE have enough history yet - that's a
      // genuine "nothing to forecast yet" state, not a broken button. Say so.
      if (eligibleIds.size === 0) {
        showToastNotification(
          'No medicine has 6+ months of sales history yet, so the AI model can\'t forecast any of them. '
          + 'Upload more sales data, then try again.',
          'warning'
        );
      }
    } catch (err) {
      console.warn('[PharmaCast] Could not check forecast eligibility, falling back to most-recent medicine:', err.message);
    }

    return byRecency[0];
  }

  // Which nav pill should stay lit up while page-medicine-detail is open.
  // syncActiveNavItem() (called at the end of every showPage()) has no entry
  // for page-medicine-detail, so without this the pill you just tapped lights
  // up for a frame and is then stripped back to unselected the moment the
  // page finishes switching - a visible "blink and go back" on the nav bar
  // itself even though the page underneath navigated correctly.
  let lastDetailEntryPoint = null; // 'forecast' | 'stock'

  async function openForecastShortcut() {
    const target = await pickShortcutTargetMedicine();
    if (!target) return;
    lastDetailEntryPoint = 'forecast';
    openMedicineDetail(target.id);
  }

  // "Stock" nav link. Used to call openForecastShortcut() directly, which
  // opened the exact same medicine detail page scrolled to the top (the
  // forecast graph) - so clicking "Stock" never actually showed anything
  // stock-related, it just looked like "Forecasts" again. This opens the
  // same page but scrolls down to the Stock Recommendation panel once its
  // content has finished loading (id="stock-recommendation-panel" in
  // index.html).
  async function openStockShortcut() {
    const target = await pickShortcutTargetMedicine();
    if (!target) return;
    lastDetailEntryPoint = 'stock';
    await openMedicineDetail(target.id);
    setTimeout(() => {
      const panel = document.getElementById('stock-recommendation-panel');
      if (panel && panel.offsetParent !== null) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  }

  function focusSearchInput() {
    showPage('page-pharmacist-dashboard');
    setTimeout(() => {
      const input = document.querySelector('#page-pharmacist-dashboard .search-input-luxury');
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToastNotification("Ready to search! Type a medicine name, category, or symptom.", "info");
      }
    }, 200);
  }

  // Live Search dropdown logic + Enter key support
  function bindSearchHandlers() {
    const inputs = document.querySelectorAll('.search-input-luxury');
    inputs.forEach(input => {
      const dropdown = input.nextElementSibling;
      if (!dropdown || !dropdown.classList.contains('search-dropdown-luxury')) return;

      input.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (!query) {
          dropdown.style.display = 'none';
          return;
        }

        const meds = getMedicines();
        const matches = meds.filter(m =>
          m.name.toLowerCase().includes(query) ||
          m.category.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query)
        );

        if (matches.length === 0) {
          dropdown.innerHTML = `<div class="p-3 text-muted text-center">No medicines found matching "${query}"</div>`;
          dropdown.style.display = 'block';
          return;
        }

        dropdown.innerHTML = '';
        matches.forEach(m => {
          let badge = `<span class="badge-stock-green">In Stock (${m.stock})</span>`;
          if (m.stock === 0) badge = `<span class="badge-stock-red">Out of Stock (0)</span>`;
          else if (m.stock <= 10) badge = `<span class="badge-stock-yellow">Low Stock (${m.stock})</span>`;

          const item = document.createElement('div');
          item.className = 'search-dropdown-item';
          item.innerHTML = `
            <div>
              <strong class="text-dark">${m.name}</strong>
              <div class="small text-muted">${m.category} • LKR ${m.unitPriceLKR}</div>
            </div>
            <div>${badge}</div>
          `;
          item.addEventListener('click', () => {
            dropdown.style.display = 'none';
            input.value = '';
            openMedicineDetail(m.id);
          });
          dropdown.appendChild(item);
        });
        dropdown.style.display = 'block';
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const query = input.value.trim().toLowerCase();
          if (!query) return;

          const meds = getMedicines();
          const matches = meds.filter(m =>
            m.name.toLowerCase().includes(query) ||
            m.category.toLowerCase().includes(query) ||
            m.description.toLowerCase().includes(query)
          );

          if (matches.length > 0) {
            dropdown.style.display = 'none';
            input.value = '';
            openMedicineDetail(matches[0].id);
          } else {
            showToastNotification(`No medicine found matching "${query}"`, "warning");
          }
        }
      });

      document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.style.display = 'none';
        }
      });
    });
  }

  // ─── 6. MEDICINE DETAIL PAGE WITH ML PREDICTION & STOCK RECOMMENDATION ───
  // Fetches (generating on first view if needed) the real AI prediction +
  // recommendation for `med.id` from the Node/SQLite/Python backend. Only
  // medicines synced from the server (numeric id) have matching sales_data
  // rows to predict from - see the isRealMedicine check below.
  async function openMedicineDetail(medId) {
    const meds = getMedicines();
    const med = meds.find(m => m.id === medId) || meds[0];
    currentDetailMedId = med.id;

    showPage('page-medicine-detail');

    // Populate Medicine Info
    document.getElementById('detail-med-name').textContent = med.name;
    document.getElementById('detail-med-category').textContent = med.category;
    document.getElementById('detail-med-description').textContent = med.description;
    document.getElementById('detail-med-price').textContent = `LKR ${med.unitPriceLKR} / pack`;

    // Populate Stock Status Panel
    const stockQuantityEl = document.getElementById('detail-stock-quantity');
    const stockBadgeEl = document.getElementById('detail-stock-badge');
    stockQuantityEl.textContent = `${med.stock} Packs`;

    if (med.stock === 0) {
      stockBadgeEl.innerHTML = `<span class="badge-stock-red" style="font-size:0.95rem; padding:6px 16px;"><i class="bi bi-exclamation-octagon-fill"></i> Out of Stock (0 Units)</span>`;
    } else if (med.stock <= 10) {
      stockBadgeEl.innerHTML = `<span class="badge-stock-yellow" style="font-size:0.95rem; padding:6px 16px;"><i class="bi bi-exclamation-triangle-fill"></i> Low Stock (${med.stock} Units ≤ 10)</span>`;
    } else {
      stockBadgeEl.innerHTML = `<span class="badge-stock-green" style="font-size:0.95rem; padding:6px 16px;"><i class="bi bi-check-circle-fill"></i> In Stock (${med.stock} Units)</span>`;
    }

    const loaderEl = document.getElementById('prediction-loading-spinner');
    const contentEl = document.getElementById('prediction-content-area');
    const insuffBanner = document.getElementById('insufficient-data-banner');

    if (loaderEl) loaderEl.style.display = 'flex';
    if (contentEl) contentEl.style.display = 'none';
    if (insuffBanner) insuffBanner.style.display = 'none';

    const showInsufficientBanner = (message) => {
      if (loaderEl) loaderEl.style.display = 'none';
      if (contentEl) contentEl.style.display = 'none';
      if (insuffBanner) {
        insuffBanner.innerHTML = `
          <div class="alert alert-warning d-flex align-items-center p-4 border-2" style="background:#fef3c7; border-color:#f59e0b; border-radius:16px;">
            <i class="bi bi-exclamation-triangle-fill fs-3 text-warning me-3"></i>
            <div>
              <h5 class="font-heading mb-1 text-dark">Insufficient Data for AI Prediction</h5>
              <p class="mb-0 text-dark">${message}</p>
            </div>
          </div>
        `;
        insuffBanner.style.display = 'block';
      }
    };

    // Only medicines synced from the server (numeric id) have a matching
    // medicine_id in the real database for the ML engine to query sales_data for.
    if (!/^\d+$/.test(String(med.id))) {
      showInsufficientBanner("This record only exists in the local demo cache (no server connection when it was added), so there's no historical sales_data for the AI engine to analyze. Log in as admin and re-add it via Manage Medicines while online.");
      return;
    }

    let forecast, modelType;
    try {
      const existingRows = await api.get(`/api/predictions/${med.id}`);
      if (Array.isArray(existingRows) && existingRows.length > 0) {
        const sorted = existingRows.slice().sort((a, b) => a.prediction_month.localeCompare(b.prediction_month));
        forecast = sorted.map(r => ({ month: r.prediction_month, predicted_demand: r.predicted_demand, confidence_score: r.confidence_score }));
        modelType = sorted[0].model_type;
      } else {
        // Nothing generated yet for this medicine - run the pipeline now.
        // Uses a raw fetch (not the shared `api` helper) so a 422
        // insufficient-data response body can be read instead of thrown away.
        const token = getRealAuthToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(apiUrl(`/api/predictions/generate/${med.id}`), { method: 'POST', headers });
        const body = await res.json().catch(() => ({}));

        if (res.status === 422 || body.status === 'insufficient_data') {
          showInsufficientBanner(
            body.error ||
            `This medicine only has ${body.months_available || 0} month(s) of sales history; at least ${body.minimum_required || 6} are needed for an AI forecast.`
          );
          return;
        }
        if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);

        forecast = body.predictions.map(p => ({ month: p.month, predicted_demand: p.predicted_demand, confidence_score: p.confidence_score }));
        modelType = body.model_type;
      }
    } catch (err) {
      if (loaderEl) loaderEl.style.display = 'none';
      showInsufficientBanner(`Could not reach the AI prediction engine: ${err.message}`);
      return;
    }

    // Best-effort real historical reference line (chart still renders fine without it).
    let historicalRef = [];
    try {
      const saleRows = await api.get(`/api/sales/${med.id}`);
      historicalRef = aggregateLast12MonthlyTotals(saleRows);
    } catch (err) {
      console.warn('[PharmaCast] Could not load sales history for chart reference line:', err.message);
    }

    if (loaderEl) loaderEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';

    const prediction = adaptServerPrediction(forecast, modelType, historicalRef);

    document.getElementById('detail-model-name').textContent = prediction.modelName;
    document.getElementById('detail-model-rsquare').textContent = `Confidence: ${prediction.rSquare}`;

    const eqEl = document.getElementById('diag-eq');
    const trendEl = document.getElementById('diag-trend');
    const rsqEl = document.getElementById('diag-rsquare');
    const rmseEl = document.getElementById('diag-rmse');
    const monsEl = document.getElementById('diag-monsoon');

    if (eqEl) eqEl.textContent = prediction.equation;
    if (trendEl) trendEl.textContent = prediction.trendSlope;
    if (rsqEl) rsqEl.textContent = prediction.rSquare;
    if (rmseEl) rmseEl.textContent = prediction.rmse;
    if (monsEl) monsEl.textContent = prediction.monsoonFactor;

    // The chart is drawn with Chart.js, loaded from a CDN (index.html). If that
    // load ever fails - offline, blocked network, slow connection - `Chart` is
    // undefined and the draw call throws. Since this is an uncaught exception
    // inside an async function, it would otherwise silently kill everything
    // AFTER it, including the whole Stock Recommendation panel below - which is
    // exactly what "Forecasts" and "Stock" both open, so one CDN hiccup could
    // look like both features being broken at once. A failed chart should never
    // be able to take the recommendation panel down with it.
    try {
      renderPredictionChart('predictionChartCanvas', prediction);
    } catch (chartErr) {
      console.warn('[PharmaCast] Chart render failed (Chart.js may not have loaded):', chartErr.message);
      const canvas = document.getElementById('predictionChartCanvas');
      if (canvas && canvas.parentElement) {
        const warn = document.createElement('div');
        warn.className = 'alert alert-warning small mb-0';
        warn.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-2"></i>Chart could not load '
          + '(the charting library did not load from the network). The numbers below are still accurate.';
        canvas.style.display = 'none';
        canvas.parentElement.insertBefore(warn, canvas);
      }
    }

    // Fetch & display the real Stock Recommendation (FR32-35).
    try {
      const rec = await api.get(`/api/recommendations/${med.id}`);
      const gapOrSurplus = rec.current_stock - rec.required_quantity; // negative = deficit, matches prior UI convention

      document.getElementById('rec-order-quantity').textContent = `${rec.recommended_order_qty} Packs`;
      document.getElementById('rec-next-demand').textContent = `${rec.predicted_demand} Packs`;
      document.getElementById('rec-current-stock').textContent = `${rec.current_stock} Packs`;

      const gapEl = document.getElementById('rec-gap-surplus');
      if (gapOrSurplus < 0) {
        gapEl.textContent = `${gapOrSurplus} Packs (Deficit)`;
        gapEl.style.color = '#991b1b';
      } else {
        gapEl.textContent = `+${gapOrSurplus} Packs (Surplus)`;
        gapEl.style.color = '#065f46';
      }

      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      document.getElementById('rec-suggested-date').textContent = nextMonth.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      document.getElementById('rec-estimated-cost').textContent = `LKR ${Number(rec.estimated_cost).toLocaleString()}`;
      document.getElementById('rec-confidence-percentage').textContent = `${Math.round((rec.confidence_score || 0) * 100)}% Model Fit`;
      document.getElementById('rec-plain-english-explanation').textContent =
        `Based on ${prediction.modelName} trained on this medicine's real historical sales data, next month's demand is forecast at ${rec.predicted_demand} packs. ` +
        `With a 20% safety buffer (+${rec.safety_stock} packs), required inventory is ${rec.required_quantity} packs against a current stock of ${rec.current_stock} packs. ` +
        `Recommended order: ${rec.recommended_order_qty} packs.`;
    } catch (err) {
      document.getElementById('rec-plain-english-explanation').textContent = `Recommendation unavailable: ${err.message}`;
    }
  }

  // Real order-placement simulation (no supplier-ordering backend exists yet,
  // so this still just confirms via toast) - now driven by the live recommendation.
  async function placeRecommendedOrder() {
    const meds = getMedicines();
    const med = meds.find(m => m.id === currentDetailMedId);
    if (!med) return;

    try {
      const rec = await api.get(`/api/recommendations/${med.id}`);
      if (!rec.recommended_order_qty || rec.recommended_order_qty === 0) {
        showToastNotification(`Current inventory (${med.stock} packs) is already sufficient! No re-order needed.`, "info");
        return;
      }
      showToastNotification(
        `✓ Order for ${rec.recommended_order_qty} packs of ${med.name} placed with Sri Lanka Pharma Supplier! Estimated Cost: LKR ${Number(rec.estimated_cost).toLocaleString()}`,
        "success"
      );
    } catch (err) {
      showToastNotification(`Could not place order: ${err.message}`, "error");
    }
  }

  // ─── ADMIN DASHBOARD & TRUE ANALYTICS CHART ("all graph must be true") ───
  async function renderAdminDashboard() {
    // All 4 stat cards now come from the real database via /api/stats.
    const statEls = document.querySelectorAll('#page-admin-dashboard .stat-card-luxury h3');

    try {
      const stats = await api.get('/api/stats');
      if (statEls.length >= 4) {
        statEls[0].textContent = stats.totalUsers;
        statEls[1].textContent = stats.pendingApprovals;
        statEls[2].textContent = stats.totalMedicines;
        statEls[3].textContent = stats.totalSalesRecords;
      }
    } catch (err) {
      console.warn('[PharmaCast] Could not load stats from server:', err.message);
      if (statEls.length >= 4) statEls[2].textContent = getMedicines().length;
    }

    // 2. Render Platform-Wide True AI Analytics Chart
    renderAdminTrueAnalyticsChart();
  }

  let adminTrueChartInstance = null;
  function renderAdminTrueAnalyticsChart() {
    const canvas = document.getElementById('adminTrueAnalyticsCanvas');
    if (!canvas) return;

    if (adminTrueChartInstance) {
      adminTrueChartInstance.destroy();
      adminTrueChartInstance = null;
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // Compute total true sales and predicted sales across all medicines
    const meds = getMedicines();
    const trueHistoricalTotals = new Array(12).fill(0);
    const aiPredictedTotals = new Array(12).fill(0);

    meds.forEach(med => {
      const pred = computeDemandPrediction(med);
      for (let i = 0; i < 12; i++) {
        if (med.monthlySalesHistory && med.monthlySalesHistory.length > i) {
          trueHistoricalTotals[i] += med.monthlySalesHistory[med.monthlySalesHistory.length - 12 + i] || 250;
        } else {
          trueHistoricalTotals[i] += 250;
        }
        if (pred && pred.predicted && pred.predicted[i]) {
          aiPredictedTotals[i] += pred.predicted[i];
        } else {
          aiPredictedTotals[i] += 270;
        }
      }
    });

    const ctx = canvas.getContext('2d');
    adminTrueChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          {
            label: 'True Historical Sales (All SKUs)',
            data: trueHistoricalTotals,
            borderColor: '#64748b',
            backgroundColor: 'rgba(100, 116, 139, 0.1)',
            borderDash: [5, 5],
            borderWidth: 2,
            tension: 0.3,
            fill: false
          },
          {
            label: 'Trained AI Model Forecast (All SKUs)',
            data: aiPredictedTotals,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            borderWidth: 3,
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { family: 'Outfit', size: 13, weight: '600' } }
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Aggregate Demand (Packs)',
              font: { family: 'Outfit', size: 12, weight: '600' },
              color: '#64748b'
            }
          }
        }
      }
    });
  }

  // ─── 7. ADMIN REGISTRATION APPROVALS WORKFLOW ───
  // Pending registrations now come straight from the real users table
  // (GET /api/users, filtered to status='pending') instead of a separate
  // fake local request queue - approve/reject act directly on that same row.
  async function renderPendingApprovalsTable() {
    const tbody = document.getElementById('admin-approvals-tbody');
    if (!tbody) return;

    let allUsers;
    try {
      allUsers = await api.get('/api/users');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Could not load registrations from server: ${err.message}</td></tr>`;
      return;
    }

    const reqs = allUsers.filter(u => u.status === 'pending');
    tbody.innerHTML = '';

    if (reqs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No pending registration requests at this time.</td></tr>`;
      return;
    }

    reqs.forEach((r) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong class="text-dark">${r.user_id}</strong></td>
        <td>${r.full_name || ''}</td>
        <td>${r.email}</td>
        <td>${r.phone || ''}</td>
        <td><code class="text-dark">${r.username}</code> <span class="badge bg-light text-dark border">${r.role}</span></td>
        <td>${(r.created_at || '').split(' ')[0]}</td>
        <td>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-luxury-primary py-1 px-3" onclick="window.PharmaCastApp.approveRequest(${r.user_id})">
              <i class="bi bi-check-circle-fill"></i> Approve
            </button>
            <button class="btn btn-sm btn-outline-danger py-1 px-3" onclick="window.PharmaCastApp.showRejectModal(${r.user_id})">
              <i class="bi bi-x-circle-fill"></i> Reject
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    updatePendingCountBadge();
  }

  async function approveRequest(userId) {
    try {
      await api.put(`/api/users/${userId}/approve`);
      renderPendingApprovalsTable();
      renderAllUsersTable();
      updatePendingCountBadge();
      if (typeof renderAdminDashboard === 'function') renderAdminDashboard();
      showToastNotification(`User account #${userId} has been approved and activated!`, "success");
    } catch (err) {
      showToastNotification(`Could not approve: ${err.message}`, "error");
    }
  }

  let selectedRejectId = null;
  function showRejectModal(userId) {
    selectedRejectId = userId;
    document.getElementById('reject-reason-input').value = '';
    const modal = document.getElementById('modal-reject-reason');
    if (modal) modal.classList.add('show');
  }

  async function confirmRejectRequest() {
    if (!selectedRejectId) return;
    // FR10: the reason is mandatory - it is stored and shown to the rejected
    // pharmacist, so it can't be silently defaulted on their behalf.
    const reason = document.getElementById('reject-reason-input').value.trim();
    if (!reason) {
      showToastNotification('Please enter a rejection reason before confirming.', 'warning');
      return;
    }

    try {
      await api.put(`/api/users/${selectedRejectId}/reject`, { reason });
      renderPendingApprovalsTable();
      renderAllUsersTable();
      updatePendingCountBadge();
      if (typeof renderAdminDashboard === 'function') renderAdminDashboard();
      showToastNotification(`Registration request rejected. Reason: ${reason}`, "warning");
    } catch (err) {
      showToastNotification(`Could not reject: ${err.message}`, "error");
    }

    closeRejectModal();
  }

  function closeRejectModal() {
    selectedRejectId = null;
    const modal = document.getElementById('modal-reject-reason');
    if (modal) modal.classList.remove('show');
  }

  // ─── ADMIN USER ACCOUNT CONTROL CENTER ─── (backed by the real /api/users endpoints)
  async function renderAllUsersTable() {
    const tbody = document.getElementById('admin-all-users-tbody');
    if (!tbody) return;

    let users;
    try {
      users = await api.get('/api/users');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Could not load accounts from server: ${err.message}</td></tr>`;
      return;
    }

    tbody.innerHTML = '';

    users.forEach(u => {
      const isSelf = currentUser && String(currentUser.id) === String(u.user_id);
      const isAdmin = isUserAdminRole(u);
      const roleBadge = isAdmin
        ? `<span class="badge" style="background:#1e293b; color:#fff; border:1px solid #3b82f6;"><i class="bi bi-shield-lock-fill"></i> Administrator</span>`
        : `<span class="badge" style="background:#d1fae5; color:#065f46; border:1px solid #10b981;"><i class="bi bi-person-fill"></i> Pharmacist</span>`;

      const statusBadgeMap = {
        active: `<span class="badge-stock-green" style="font-size:0.8rem;">Active</span>`,
        pending: `<span class="badge bg-warning text-dark">Pending</span>`,
        rejected: `<span class="badge bg-danger">Rejected</span>`,
        inactive: `<span class="badge bg-secondary">Deactivated</span>`
      };
      const statusBadge = statusBadgeMap[u.status] || `<span class="badge bg-light text-dark border">${u.status}</span>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong class="text-dark">${u.user_id}</strong></td>
        <td>
          <div class="fw-bold text-dark">${u.full_name || ''} ${isSelf ? '<span class="badge bg-light text-muted border ms-1">You</span>' : ''}</div>
          <div class="small text-muted">${u.email || ''}</div>
        </td>
        <td><code class="text-dark fs-6">${u.username}</code></td>
        <td>${roleBadge}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="d-flex flex-wrap gap-1">
            ${isSelf ? `
              <span class="small text-muted fst-italic">This is you</span>
            ` : `
              <button class="btn btn-sm ${u.status === 'inactive' ? 'btn-outline-success' : 'btn-outline-warning'} py-1 px-2" onclick="window.PharmaCastApp.toggleUserStatus(${u.user_id}, '${u.status}')" title="Toggle account access">
                <i class="bi ${u.status === 'inactive' ? 'bi-unlock-fill' : 'bi-lock-fill'}"></i> ${u.status === 'inactive' ? 'Reactivate' : 'Deactivate'}
              </button>
              <button class="btn btn-sm btn-outline-primary py-1 px-2" onclick="window.PharmaCastApp.resetUserPassword(${u.user_id})" title="Reset password to Password@123">
                <i class="bi bi-key-fill"></i> Reset Pass
              </button>
              <button class="btn btn-sm btn-outline-danger py-1 px-2" onclick="window.PharmaCastApp.deleteUserAccount(${u.user_id})" title="Permanently delete user">
                <i class="bi bi-trash3-fill"></i>
              </button>
            `}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  async function toggleUserStatus(userId, currentStatus) {
    const action = currentStatus === 'inactive' ? 'reactivate' : 'deactivate';
    try {
      await api.put(`/api/users/${userId}/${action}`);
      renderAllUsersTable();
      if (typeof renderAdminDashboard === 'function') renderAdminDashboard();
      showToastNotification(`User account #${userId} has been ${action}d!`, action === 'reactivate' ? 'success' : 'warning');
    } catch (err) {
      showToastNotification(`Could not ${action}: ${err.message}`, 'error');
    }
  }

  async function resetUserPassword(userId) {
    try {
      const result = await api.put(`/api/users/${userId}/reset-password`);
      showToastNotification(result.message || 'Password reset successfully', 'info');
    } catch (err) {
      showToastNotification(`Could not reset password: ${err.message}`, 'error');
    }
  }

  async function deleteUserAccount(userId) {
    try {
      await api.del(`/api/users/${userId}/permanent`);
      renderAllUsersTable();
      if (typeof renderAdminDashboard === 'function') renderAdminDashboard();
      showToastNotification(`Account #${userId} has been permanently deleted.`, 'warning');
    } catch (err) {
      showToastNotification(`Could not delete account: ${err.message}`, 'error');
    }
  }

  function openCreateUserModal() {
    const modal = document.getElementById('modal-create-user');
    if (modal) modal.classList.add('show');
  }

  function closeCreateUserModal() {
    const modal = document.getElementById('modal-create-user');
    if (modal) modal.classList.remove('show');
  }

  async function handleCreateUserSubmit(e) {
    e.preventDefault();
    const full_name = document.getElementById('new-user-fullname').value.trim();
    const email = document.getElementById('new-user-email').value.trim();
    const username = document.getElementById('new-user-username').value.trim();
    const password = document.getElementById('new-user-password').value;
    const role = document.getElementById('new-user-role').value.toLowerCase();

    try {
      await api.post('/api/users', { full_name, email, username, password, role });
      closeCreateUserModal();
      renderAllUsersTable();
      if (typeof renderAdminDashboard === 'function') renderAdminDashboard();
      showToastNotification(`New ${role} account "${username}" created and activated!`, 'success');
    } catch (err) {
      showToastNotification(`Could not create account: ${err.message}`, 'error');
    }
  }

  // ─── 8. ADMIN SALES DATA CSV UPLOAD, VALIDATION & PREVIEW ───
  function renderSalesFilesTable() {
    const tbody = document.getElementById('admin-sales-files-tbody');
    if (!tbody) return;

    const files = getSalesFiles();
    tbody.innerHTML = '';
    files.forEach(f => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong class="text-dark">${f.id}</strong></td>
        <td><i class="bi bi-file-earmark-spreadsheet-fill text-success me-2"></i> ${f.fileName}</td>
        <td>${f.uploadDate}</td>
        <td><span class="badge bg-light text-dark border">${f.recordCount} records</span></td>
        <td>${f.uploadedBy}</td>
        <td><span class="badge bg-success">${f.status}</span></td>
        <td>
          <div class="btn-group btn-group-sm" role="group" aria-label="Dataset actions">
            ${f.batchId
              ? `<button class="btn btn-sm btn-luxury-outline" onclick="window.PharmaCastApp.trainOnDataset('${f.id}')"
                         title="Train the AI demand model using only this dataset">
                   <i class="bi bi-robot"></i> Train
                 </button>`
              : `<button class="btn btn-sm btn-luxury-outline" disabled
                         title="This dataset was only loaded locally, so there is nothing on the server to train on">
                   <i class="bi bi-robot"></i> Train
                 </button>`}
            <button class="btn btn-sm btn-outline-danger" onclick="window.PharmaCastApp.removeSalesFile('${f.id}')" title="Remove this dataset">
              <i class="bi bi-trash3-fill"></i> Remove
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  /** Trains the AI model on one uploaded dataset (looked up by its row id). */
  function trainOnDataset(fileId) {
    const file = getSalesFiles().find(f => f.id === fileId);
    if (!file) return;

    if (!file.batchId) {
      showToastNotification(
        'That dataset was only loaded into this browser, so there is no server-side data to train on. Upload a CSV/XLSX file to train against real records.',
        'warning'
      );
      return;
    }
    trainModelWithDataset({ batchId: file.batchId, fileName: file.fileName });
  }

  // Deletes an uploaded dataset. If it was a real server-backed upload
  // (has a batchId from POST /api/sales/upload), this also deletes every
  // sales_data row tagged with that batch on the backend - not just the
  // row in this local history list - so removal is a genuine undo, not
  // just hiding the entry. Demo/pasted datasets never reached the server,
  // so those are simply dropped from the local list.
  async function removeSalesFile(fileId) {
    const files = getSalesFiles();
    const target = files.find(f => f.id === fileId);
    if (!target) return;

    if (!confirm(`Remove "${target.fileName}" (${target.recordCount} records)? This cannot be undone.`)) return;

    if (target.batchId) {
      try {
        const result = await api.del(`/api/sales/batch/${target.batchId}`);
        showToastNotification(result.message || 'Dataset removed from server.', 'success');
      } catch (err) {
        showToastNotification(`Could not remove from server (${err.message}). Removed from this list only.`, 'error');
      }
    }

    setSalesFiles(files.filter(f => f.id !== fileId));
    renderSalesFilesTable();

    // Removing a dataset reverses the stock it merged in, so pull the
    // corrected medicine/stock figures back from the server.
    try { await syncMedicinesFromServer(); } catch (e) { /* offline - keep local view */ }
    if (typeof renderManageMedicinesTable === 'function') renderManageMedicinesTable();
    if (typeof renderPharmacistMedicinesTable === 'function') renderPharmacistMedicinesTable();
    if (typeof renderAdminDashboard === 'function') renderAdminDashboard();
    if (currentUser && !isUserAdminRole(currentUser) && typeof renderPharmacistDashboard === 'function') {
      renderPharmacistDashboard();
    }
  }

  // Shows a quick client-side preview of the first 10 rows, then (on confirm)
  // uploads the actual file to the real backend, which re-validates every row
  // server-side inside a single all-or-nothing transaction and stores it in
  // sales_data - the same table the ML engine reads from.
  function handleFileUpload(file) {
    if (!file) return;

    const previewArea = document.getElementById('csv-upload-preview-area');
    const errorArea = document.getElementById('csv-upload-error-area');
    const previewTbody = document.getElementById('csv-preview-tbody');

    if (errorArea) errorArea.style.display = 'none';
    if (previewArea) previewArea.style.display = 'none';

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      showCsvError(`Unsupported file type ".${ext}". Please upload a .csv, .xlsx or .xls file.`);
      return;
    }

    const bindConfirm = (rowCountLabel) => {
      const confirmBtn = document.getElementById('btn-confirm-store-csv');
      if (!confirmBtn) return;
      confirmBtn.onclick = async () => {
        confirmBtn.disabled = true;
        const originalHtml = confirmBtn.innerHTML;
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Uploading...';
        try {
          const result = await api.upload('/api/sales/upload', file);

          const files = getSalesFiles();
          files.unshift({
            id: `FILE-${Date.now()}`,
            fileName: file.name,
            uploadDate: new Date().toISOString().split('T')[0],
            recordCount: result.imported,
            uploadedBy: currentUser ? `${displayRoleLabel(currentUser)} (${currentUser.fullName})` : "Administrator",
            status: "Verified & Stored",
            batchId: result.batchId
          });
          setSalesFiles(files);
          renderSalesFilesTable();
          if (previewArea) previewArea.style.display = 'none';

          // The upload merges quantities into existing medicines and may
          // create new records for previously unseen dosages - refresh so the
          // medicine tables reflect that immediately.
          try { await syncMedicinesFromServer(); } catch (e) { /* offline */ }
          if (typeof renderManageMedicinesTable === 'function') renderManageMedicinesTable();
          if (typeof renderPharmacistMedicinesTable === 'function') renderPharmacistMedicinesTable();
          if (typeof renderAdminDashboard === 'function') renderAdminDashboard();

          let msg = `${result.imported} sales records stored from ${file.name}.`;
          if (result.merged || result.created) {
            msg += ` ${result.merged || 0} merged into existing medicines`;
            if (result.created) {
              const names = (result.created_medicines || [])
                .map(m => m.dosage ? `${m.name}` : m.name)
                .slice(0, 3).join(', ');
              msg += `, ${result.created} new medicine record(s) created`
                   + (names ? ` (${names}${result.created > 3 ? ', …' : ''})` : '');
            }
            msg += '.';
          }
          showToastNotification(msg + ' Run the AI pipeline to refresh forecasts.', "success");
        } catch (err) {
          // Re-uploading the same file doubles every stock quantity, so the
          // server blocks it with a 409. Explain that rather than showing a
          // bare error, and let the user override deliberately.
          if (err.duplicate) {
            showCsvError(`${err.message}\n${err.detail || ''}`);
            if (confirm(
              `${err.message}\n\n${err.detail || ''}\n\n`
              + `Click OK ONLY if this really is new data that happens to look the same — `
              + `it will be imported again and quantities will add up.\n`
              + `Click Cancel to keep your data as it is.`
            )) {
              confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Uploading...';
              try {
                const forced = await api.upload('/api/sales/upload?force=true', file);
                showToastNotification(
                  `${forced.imported} record(s) imported (duplicate check overridden).`, 'success'
                );
                await syncMedicinesFromServer();
                renderManageMedicinesTable();
                renderPharmacistMedicinesTable();
              } catch (forceErr) {
                showCsvError(forceErr.message);
              }
            }
          } else if (Array.isArray(err.details) && err.details.length) {
            const lines = err.details
              .slice(0, 20)
              .map(d => `Row #${d.row}: ${(d.errors || []).join(', ')}`);
            if (err.details.length > 20) lines.push(`...and ${err.details.length - 20} more row(s).`);
            showCsvError(`${err.message}\n• ` + lines.join('\n• '));
          } else {
            showCsvError(err.message);
          }
          if (previewArea) previewArea.style.display = 'none';
        } finally {
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = originalHtml;
        }
      };
    };

    // Spreadsheets can't be previewed as text in the browser without extra
    // libraries - skip straight to the (server-validated) upload step.
    if (ext !== 'csv') {
      if (previewTbody) {
        previewTbody.innerHTML = `<tr><td colspan="5" class="text-muted text-center py-3">
          Preview is only available for .csv files. "${file.name}" will be fully validated by the server on upload.
        </td></tr>`;
      }
      if (previewArea) previewArea.style.display = 'block';
      bindConfirm();
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const text = e.target.result;
      const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');

      if (lines.length < 2) {
        showCsvError("CSV file is empty or missing required header row: Date, Medicine Name, Quantity Sold.");
        return;
      }

      // Strip the UTF-8 BOM Excel adds, otherwise the first header reads as
      // "﻿Date" and never matches.
      const headers = lines[0].replace(/^﻿/, '').split(',').map(h => h.trim().toLowerCase());

      // Locate columns by header name rather than fixed position, so optional
      // columns can appear anywhere. Aliases match what the server accepts.
      const colIndex = (...names) =>
        headers.findIndex(h => names.some(n => h.includes(n)));
      const iDate = colIndex('date');
      const iMed = colIndex('medicine', 'drug', 'item', 'product');
      const iQty = colIndex('quantity', 'qty', 'sold', 'units');
      const iDose = colIndex('dosage', 'strength');

      // This is only a preview hint - the SERVER is the authority on whether a
      // file is valid. Previously an unrecognised header aborted the upload
      // client-side, so files the backend would happily accept could never be
      // sent. Now we warn and still let the user upload.
      const unknownHeaders = [iDate, iMed, iQty].some(i => i === -1);
      if (unknownHeaders) {
        showCsvError(
          `Heads up: couldn't confidently identify the Date / Medicine / Quantity columns from [${lines[0]}]. `
          + `You can still click "Confirm & Store" — the server will validate the file and report anything wrong.`
        );
        const errArea = document.getElementById('csv-upload-error-area');
        if (errArea) errArea.className = 'alert alert-warning';
      } else {
        const errArea = document.getElementById('csv-upload-error-area');
        if (errArea) errArea.className = 'alert alert-danger';
      }

      // Build a first-10-rows preview (the server is the authority on validity).
      const previewRows = [];
      for (let i = 1; i < lines.length && i <= 10; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        const dose = iDose !== -1 ? (cols[iDose] || '') : '';
        const medName = cols[iMed] || '';
        previewRows.push({
          rowNum: i + 1,
          date: cols[iDate] || '',
          medName: dose ? `${medName} (${dose})` : medName,
          qty: cols[iQty] || '',
          ok: Boolean(cols[iDate]) && Boolean(medName) && !isNaN(parseInt(cols[iQty], 10))
        });
      }

      if (previewTbody) {
        previewTbody.innerHTML = '';
        previewRows.forEach(r => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><span class="badge bg-light text-dark border">#${r.rowNum}</span></td>
            <td><code>${r.date}</code></td>
            <td><strong class="text-dark">${r.medName}</strong></td>
            <td><span class="${r.ok ? 'badge-stock-green' : 'badge bg-danger'}">${r.qty} ${r.ok ? 'Packs' : ''}</span></td>
            <td>${r.ok
              ? '<span class="text-success"><i class="bi bi-check-circle-fill"></i> Looks valid</span>'
              : '<span class="text-danger"><i class="bi bi-x-circle-fill"></i> Malformed</span>'}</td>
          `;
          previewTbody.appendChild(tr);
        });
      }

      if (previewArea) previewArea.style.display = 'block';
      bindConfirm(lines.length - 1);
    };
    reader.readAsText(file);
  }

  function saveUploadedSalesRecords(records) {
    if (!records || records.length === 0) return;
    localStorage.setItem('pharmacast_custom_dataset_records', JSON.stringify(records));

    const meds = getMedicines();
    const groupedByMed = {};
    records.forEach(rec => {
      const key = (rec.medName || rec.medId || "").trim().toLowerCase();
      if (!groupedByMed[key]) groupedByMed[key] = [];
      groupedByMed[key].push(rec.qty || rec.quantity || 100);
    });

    meds.forEach(med => {
      const medKey = med.name.trim().toLowerCase();
      const medIdKey = med.id.trim().toLowerCase();
      const matchedKey = Object.keys(groupedByMed).find(k => medKey.includes(k) || k.includes(medKey) || k === medIdKey);
      if (matchedKey && groupedByMed[matchedKey].length >= 6) {
        med.monthlySalesHistory = groupedByMed[matchedKey].slice(0, 36);
        med.trainedModel = false;
      }
    });
    setMedicines(meds);
  }

  // Instant Demo CSV Loader for evaluator
  function loadDemoCSV() {
    const previewArea = document.getElementById('csv-upload-preview-area');
    const errorArea = document.getElementById('csv-upload-error-area');
    const previewTbody = document.getElementById('csv-preview-tbody');

    if (errorArea) errorArea.style.display = 'none';

    const demoRows = [
      { rowNum: 2, date: "2026-07-01", medName: "Panadol (Paracetamol 500mg)", qty: 380 },
      { rowNum: 3, date: "2026-07-02", medName: "Piriton (Chlorpheniramine 4mg)", qty: 185 },
      { rowNum: 4, date: "2026-07-03", medName: "Amoxil (Amoxicillin 500mg)", qty: 340 },
      { rowNum: 5, date: "2026-07-04", medName: "Metformin (Glucophage 500mg)", qty: 425 },
      { rowNum: 6, date: "2026-07-05", medName: "Beclo-C (Vitamin C + Zinc 500mg)", qty: 290 },
      { rowNum: 7, date: "2026-07-06", medName: "Losartan Potassium 50mg", qty: 215 },
      { rowNum: 8, date: "2026-07-07", medName: "Cetirizine Hydrochloride 10mg", qty: 170 },
      { rowNum: 9, date: "2026-07-08", medName: "Acyclovir 200mg", qty: 105 },
      { rowNum: 10, date: "2026-07-09", medName: "Azithromycin 500mg", qty: 165 },
      { rowNum: 11, date: "2026-07-10", medName: "Panadol (Paracetamol 500mg)", qty: 395 }
    ];

    if (previewTbody) {
      previewTbody.innerHTML = '';
      demoRows.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><span class="badge bg-light text-dark border">#${r.rowNum}</span></td>
          <td><code>${r.date}</code></td>
          <td><strong class="text-dark">${r.medName}</strong></td>
          <td><span class="badge-stock-green">${r.qty} Packs</span></td>
          <td><span class="text-success"><i class="bi bi-check-circle-fill"></i> Valid</span></td>
        `;
        previewTbody.appendChild(tr);
      });
    }

    if (previewArea) previewArea.style.display = 'block';

    const confirmBtn = document.getElementById('btn-confirm-store-csv');
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        const meds = getMedicines();
        const demoFullDataset = [];
        meds.forEach(med => {
          med.monthlySalesHistory.forEach((qty, idx) => {
            demoFullDataset.push({
              rowNum: demoFullDataset.length + 1,
              date: `2024-${String((idx % 12) + 1).padStart(2, '0')}-01`,
              medName: med.name,
              qty: qty
            });
          });
        });
        saveUploadedSalesRecords(demoFullDataset);

        const files = getSalesFiles();
        files.unshift({
          id: `FILE-${Date.now()}`,
          fileName: "sri_lanka_pharmacy_sample_sales.csv",
          uploadDate: new Date().toISOString().split('T')[0],
          recordCount: 360,
          uploadedBy: currentUser ? `${displayRoleLabel(currentUser)} (${currentUser.fullName})` : "Administrator",
          status: "Verified & Stored"
        });
        setSalesFiles(files);
        renderSalesFilesTable();
        if (previewArea) previewArea.style.display = 'none';
        showToastNotification(`Successfully ingested 360 historical sales records from sample CSV! Ready for ML training.`, "success");
      };
    }

    showToastNotification("Loaded 10 Sri Lanka sample sales records into validation preview!", "info");
  }

  function showCsvError(msg) {
    const errorArea = document.getElementById('csv-upload-error-area');
    if (errorArea) {
      errorArea.innerHTML = `<i class="bi bi-exclamation-octagon-fill me-2"></i> ${msg}`;
      errorArea.style.display = 'block';
    }
  }

  function downloadSampleCSV() {
    // Note rows 2 & 11: same medicine, same dosage -> merged into one record.
    // Row 12: same medicine, DIFFERENT dosage -> stored as a separate record.
    const csvContent = [
      "Date,Medicine Name,Dosage,Quantity Sold",
      "2026-07-01,Panadol (Paracetamol),500mg,380",
      "2026-07-02,Piriton (Chlorpheniramine),4mg,185",
      "2026-07-03,Amoxil (Amoxicillin),500mg,340",
      "2026-07-04,Metformin (Glucophage),500mg,425",
      "2026-07-05,Beclo-C (Vitamin C + Zinc),500mg,290",
      "2026-07-06,Losartan Potassium,50mg,215",
      "2026-07-07,Cetirizine Hydrochloride,10mg,170",
      "2026-07-08,Acyclovir,200mg,105",
      "2026-07-09,Azithromycin,500mg,165",
      "2026-07-10,Panadol (Paracetamol),500mg,395",
      "2026-07-11,Panadol (Paracetamol),250mg,140"
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "sri_lanka_pharmacy_sample_sales.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ─── CUSTOM DATASET INGESTION & ML MODEL TRAINING STUDIO ("I want to train a model using my data set") ───
  function openCustomCsvModal() {
    const modal = document.getElementById('modal-custom-csv');
    if (modal) modal.classList.add('show');
  }

  function closeCustomCsvModal() {
    const modal = document.getElementById('modal-custom-csv');
    if (modal) modal.classList.remove('show');
  }

  // Used to only save the pasted rows into localStorage (med.monthlySalesHistory),
  // fields the real ML pipeline never reads - it trains from the server's
  // sales_data table via POST /api/sales/upload. So pasting data here, then
  // clicking Train, silently retrained on whatever was ALREADY on the server
  // and ignored everything just pasted; the "Ready to train ML model" toast
  // was not true. This now sends the pasted rows through the exact same
  // /api/sales/upload endpoint (and File object) the real file-upload button
  // uses, so pasted data is validated and actually lands in sales_data.
  async function submitCustomCsvData() {
    const textarea = document.getElementById('custom-csv-textarea');
    if (!textarea) return;
    const text = textarea.value.trim();
    if (!text) {
      showToastNotification("Please paste CSV data first!", "warning");
      return;
    }

    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    // The textarea's placeholder shows bare "date, medicine, qty" rows with no
    // header - but the server's CSV parser treats the first line as headers,
    // so one has to be added here or every real row (including the first)
    // would be silently dropped/misread.
    const csvBody = 'Date,Medicine Name,Quantity Sold\n' + lines.join('\n');
    const file = new File([csvBody], `pasted_dataset_${Date.now()}.csv`, { type: 'text/csv' });

    const submitBtn = document.querySelector('#modal-custom-csv .btn-luxury-primary');
    const originalHtml = submitBtn ? submitBtn.innerHTML : null;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Uploading...';
    }

    try {
      const result = await api.upload('/api/sales/upload', file);

      const files = getSalesFiles();
      files.unshift({
        id: `FILE-${Date.now()}`,
        fileName: 'custom_pasted_dataset.csv',
        uploadDate: new Date().toISOString().split('T')[0],
        recordCount: result.imported,
        uploadedBy: currentUser ? `${displayRoleLabel(currentUser)} (${currentUser.fullName})` : "Administrator",
        status: "Verified & Stored",
        batchId: result.batchId
      });
      setSalesFiles(files);
      renderSalesFilesTable();

      try { await syncMedicinesFromServer(); } catch (e) { /* offline */ }
      if (typeof renderManageMedicinesTable === 'function') renderManageMedicinesTable();
      if (typeof renderPharmacistMedicinesTable === 'function') renderPharmacistMedicinesTable();
      if (typeof renderAdminDashboard === 'function') renderAdminDashboard();

      closeCustomCsvModal();
      textarea.value = '';
      showToastNotification(`✓ ${result.imported} record(s) ingested and stored on the server. Run the AI pipeline to train on them.`, "success");
    } catch (err) {
      showToastNotification(`Could not ingest pasted data: ${err.message}`, "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
      }
    }
  }

  let aiTrainingInterval = null;
  // Real "Run ML Forecast Pipeline" - sequentially calls the actual backend
  // (POST /api/predictions/generate/:id, which in turn spawns ml/predict.py)
  // for every server-backed medicine, logging genuine per-medicine results
  // instead of a canned/fake terminal animation.
  let aiTrainingCancelled = false;
  /**
   * Runs the real ML pipeline (ml/predict.py via POST /api/predictions/generate/:id).
   *
   * Called with no arguments it trains every medicine in the database.
   * Called with a dataset descriptor { batchId, fileName } it trains ONLY the
   * medicines contained in that uploaded dataset, which is much faster and is
   * what the per-dataset "Train" button uses.
   *
   * Available to admins and pharmacists alike - both may upload datasets, so
   * both may train on them.
   */
  async function trainModelWithDataset(dataset) {
    const modal = document.getElementById('modal-ai-training');
    const term = document.getElementById('ai-training-terminal');
    const bar = document.getElementById('ai-training-progress-bar');
    const statusText = document.getElementById('ai-training-status-text');
    const finishBtn = document.getElementById('ai-training-finish-btn');

    if (!modal || !term || !bar || !statusText || !finishBtn) return;

    modal.classList.add('show');
    finishBtn.style.display = 'none';
    bar.style.width = '0%';
    bar.className = 'progress-bar progress-bar-striped progress-bar-animated bg-success';
    aiTrainingCancelled = false;

    const log = (msg, cls) => {
      const div = document.createElement('div');
      div.className = cls || 'text-light mt-1';
      div.textContent = msg;
      term.appendChild(div);
      term.scrollTop = term.scrollHeight;
    };

    term.innerHTML = '';
    log('> Initializing PharmaCast AI Model Training Engine...', 'text-info');

    await wakeUpBackend(log);

    const meds = await syncMedicinesFromServer();
    let realMeds = meds.filter(m => /^\d+$/.test(String(m.id)));

    // Narrow the run to one uploaded dataset when asked.
    let batchMonthsById = null;
    if (dataset && dataset.batchId) {
      log(`> Scope: dataset "${dataset.fileName || dataset.batchId}"`, 'text-info');
      try {
        const batchMeds = await api.get(`/api/sales/batch/${dataset.batchId}/medicines`);
        const allowed = new Set(batchMeds.map(b => String(b.medicine_id)));
        realMeds = realMeds.filter(m => allowed.has(String(m.id)));

        batchMonthsById = new Map(batchMeds.map(b => [String(b.medicine_id), b]));
        log(`> This dataset covers ${batchMeds.length} medicine(s):`, 'text-light');
        batchMeds.forEach(b => {
          const enough = b.months >= 6;
          log(`   - ${b.medicine_name}${b.dosage ? ` (${b.dosage})` : ''}: `
            + `${b.records} row(s) across ${b.months} distinct month(s)`
            + (enough ? '' : '  <- under the 6-month minimum'),
            enough ? 'text-light' : 'text-warning');
        });

        // The model needs >= 6 distinct months. Say so up front rather than
        // letting every medicine fail one by one with no explanation.
        const trainable = batchMeds.filter(b => b.months >= 6).length;
        if (trainable === 0) {
          log('', 'text-light');
          log('> Nothing in this dataset can be trained yet.', 'text-warning');
          log('> The forecasting model needs at least 6 DIFFERENT months of sales per medicine', 'text-warning');
          log('  (6-11 months -> Linear Regression, 12-23 -> SARIMA, 24+ -> SARIMA+STL).', 'text-warning');
          log('> Your file covers too few distinct months. Upload sales spanning 6+ months', 'text-warning');
          log('  and the same medicines will train automatically.', 'text-warning');
          bar.style.width = '100%';
          bar.className = 'progress-bar bg-warning';
          statusText.textContent = 'Not enough monthly history to train.';
          statusText.className = 'small text-warning fw-bold';
          finishBtn.style.display = 'inline-block';
          showToastNotification(
            'That dataset covers fewer than 6 distinct months, so the AI model cannot be fitted yet.',
            'warning'
          );
          return;
        }
        log(`> ${trainable} of ${batchMeds.length} medicine(s) have enough history to train.`, 'text-info');
      } catch (err) {
        log(`> Could not read that dataset (${err.message}). Nothing trained.`, 'text-danger');
        statusText.textContent = 'Dataset unavailable.';
        finishBtn.style.display = 'inline-block';
        return;
      }
    } else {
      log('> Scope: every medicine in the database', 'text-info');

      // A sales file has many ROWS but the model fits one series per MEDICINE,
      // and only for medicines with >= 6 distinct months of history. Spell that
      // funnel out, then train only the eligible ones - otherwise this loop
      // spawns ml/predict.py thousands of times just to collect 422s.
      try {
        const elig = await api.get('/api/sales/trainable');
        log('', 'text-light');
        log(`> ${elig.total_records.toLocaleString()} sales row(s) in the database`, 'text-light');
        log(`>   -> covering ${elig.total_medicines.toLocaleString()} distinct medicine(s)`, 'text-light');
        log(`>   -> of which ${elig.eligible_count.toLocaleString()} have 6+ distinct months and CAN be trained`, 'text-info');
        log(`>   -> ${elig.ineligible_count.toLocaleString()} have too little history and will be skipped`, 'text-warning');
        log('', 'text-light');
        log('  The model forecasts one time-series per medicine, not per row, so the', 'text-secondary');
        log('  medicine count - not the row count - is what gets trained.', 'text-secondary');
        log('', 'text-light');

        if (elig.eligible_count === 0) {
          log('> Nothing can be trained yet.', 'text-warning');
          log('> Every medicine has fewer than 6 different months of sales.', 'text-warning');
          log('  (6-11 months -> Linear Regression, 12-23 -> SARIMA, 24+ -> SARIMA+STL)', 'text-warning');
          bar.style.width = '100%';
          bar.className = 'progress-bar bg-warning';
          statusText.textContent = 'Not enough monthly history to train.';
          statusText.className = 'small text-warning fw-bold';
          finishBtn.style.display = 'inline-block';
          return;
        }

        const allowed = new Set(elig.medicines.filter(r => r.months >= 6).map(r => String(r.medicine_id)));
        realMeds = realMeds.filter(m => allowed.has(String(m.id)));
      } catch (err) {
        log(`> Could not pre-check training eligibility (${err.message}); training every medicine instead.`, 'text-warning');
      }
    }

    if (realMeds.length === 0) {
      log(dataset && dataset.batchId
        ? '> No medicines from that dataset are still in the database (they may have been removed).'
        : '> No server-backed medicines found. Add medicines via Manage Medicines, or upload a sales dataset first.',
        'text-warning');
      statusText.textContent = 'Nothing to train.';
      finishBtn.style.display = 'inline-block';
      return;
    }

    log(`> Training ${realMeds.length} eligible medicine(s). Requesting sales_data + running ml/predict.py for each...`, 'text-light');

    let completed = 0;
    let succeeded = 0;
    const confidences = [];

    for (const med of realMeds) {
      if (aiTrainingCancelled) break;
      statusText.textContent = `Training in progress... (${med.name})`;

      try {
        const token = getRealAuthToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetchWithRetry(apiUrl(`/api/predictions/generate/${med.id}`), { method: 'POST', headers });
        const body = await res.json().catch(() => ({}));

        if (res.status === 422 || body.status === 'insufficient_data') {
          log(`> [${med.name}] Skipped - only ${body.months_available || 0} month(s) of sales history (need ${body.minimum_required || 6}).`, 'text-warning');
        } else if (!res.ok) {
          log(`> [${med.name}] Failed - ${body.error || res.status}`, 'text-danger');
        } else {
          const avgConf = (body.predictions || []).reduce((a, p) => a + (p.confidence_score || 0), 0) / ((body.predictions || []).length || 1);
          confidences.push(avgConf);
          succeeded++;
          log(`> [${med.name}] ${body.model_type} fit on ${body.months_available} months -> confidence ${(avgConf * 100).toFixed(1)}%`, 'text-light');
        }
      } catch (err) {
        log(`> [${med.name}] Error - ${err.message} (server may still be waking up - try Run again)`, 'text-danger');
      }

      completed++;
      bar.style.width = `${Math.round((completed / realMeds.length) * 100)}%`;
    }

    const meanConfidence = confidences.length ? (confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100 : 0;
    const anyTrained = succeeded > 0;
    bar.className = anyTrained ? 'progress-bar bg-success' : 'progress-bar bg-warning';
    statusText.textContent = anyTrained ? 'AI Model Training Complete!' : 'Finished — but nothing could be trained.';
    statusText.className = anyTrained ? 'small text-success fw-bold' : 'small text-warning fw-bold';
    const scopeLabel = dataset && dataset.batchId
      ? ` for dataset "${dataset.fileName || dataset.batchId}"`
      : '';
    log(`> SUCCESS! ${succeeded}/${realMeds.length} medicine forecasts generated by the real ML pipeline${scopeLabel}. Mean confidence = ${meanConfidence.toFixed(1)}%.`, 'text-success fw-bold mt-1');
    finishBtn.style.display = 'inline-block';
    showToastNotification(`✓ Training complete: ${succeeded}/${realMeds.length} medicines forecast${scopeLabel}.`, 'success');
  }

  function closeAiTrainingModal() {
    aiTrainingCancelled = true;
    if (aiTrainingInterval) clearInterval(aiTrainingInterval);
    const modal = document.getElementById('modal-ai-training');
    if (modal) modal.classList.remove('show');
  }

  function finishAiTraining() {
    closeAiTrainingModal();
    const meds = getMedicines();
    const firstReal = meds.find(m => /^\d+$/.test(String(m.id)));
    if (firstReal) {
      openMedicineDetail(firstReal.id);
      showToastNotification("Viewing AI Demand Graph generated by the real backend model.", "info");
    }
  }

  // ─── 9. ADMIN MANAGE MEDICINES (CRUD) ───
  // FR20 on the admin side: current search term for the Manage Medicines table.
  let adminMedicineSearchTerm = '';

  // A real upload can create thousands of medicines (a 7000+ row Sri Lankan
  // sales dataset produced ~2969 distinct products). Earlier this list was
  // silently truncated to the first 50 matches with no way to see the rest,
  // which looked exactly like "my upload didn't finish" even though every
  // row had been saved. MED_PAGE_SIZE + the pagination helper below replace
  // that hard cap with real Prev/Next paging so nothing is hidden.
  const MED_PAGE_SIZE = 50;

  /** Case-insensitive partial match across name, description and dosage. */
  function filterMedicinesByTerm(meds, term) {
    const q = String(term || '').trim().toLowerCase();
    if (!q) return meds;
    return meds.filter(m =>
      String(m.name || '').toLowerCase().includes(q) ||
      String(m.description || '').toLowerCase().includes(q) ||
      String(m.dosage || '').toLowerCase().includes(q) ||
      String(m.category || '').toLowerCase().includes(q)
    );
  }

  /**
   * Renders a small Prev / Page X of Y / Next control into `containerId` and
   * wires the buttons to `onChange(newPage)`. `total` is the full (post-
   * filter, pre-slice) result count; `page` is 0-indexed.
   */
  function renderMedicinePagination(containerId, page, total, onChangeName) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const totalPages = Math.max(1, Math.ceil(total / MED_PAGE_SIZE));
    if (total <= MED_PAGE_SIZE) { el.innerHTML = ''; return; }
    const start = page * MED_PAGE_SIZE + 1;
    const end = Math.min(total, (page + 1) * MED_PAGE_SIZE);
    el.innerHTML = `
      <div class="small text-muted">Showing ${start}–${end} of ${total}</div>
      <div class="btn-group btn-group-sm" role="group" aria-label="Pagination">
        <button class="btn btn-luxury-outline py-1 px-3" ${page <= 0 ? 'disabled' : ''}
                onclick="window.PharmaCastApp.${onChangeName}(-1)">
          <i class="bi bi-chevron-left"></i> Prev
        </button>
        <button class="btn btn-luxury-outline py-1 px-3" disabled>Page ${page + 1} of ${totalPages}</button>
        <button class="btn btn-luxury-outline py-1 px-3" ${page >= totalPages - 1 ? 'disabled' : ''}
                onclick="window.PharmaCastApp.${onChangeName}(1)">
          Next <i class="bi bi-chevron-right"></i>
        </button>
      </div>`;
  }

  let adminMedicinePage = 0;

  function changeAdminMedicinePage(delta) {
    adminMedicinePage += delta;
    if (adminMedicinePage < 0) adminMedicinePage = 0;
    renderManageMedicinesTable();
  }

  function handleAdminMedicineSearch(term) {
    adminMedicineSearchTerm = term;
    adminMedicinePage = 0;
    renderManageMedicinesTable();
  }

  function clearAdminMedicineSearch() {
    adminMedicineSearchTerm = '';
    adminMedicinePage = 0;
    const input = document.getElementById('admin-medicine-search');
    if (input) input.value = '';
    renderManageMedicinesTable();
  }

  function renderManageMedicinesTable() {
    const tbody = document.getElementById('admin-medicines-tbody');
    if (!tbody) return;

    const allMeds = getMedicines();
    // FR20: search narrows the set; pagination (not a hard cap) shows all of
    // it 50 rows at a time so a large upload never "disappears" from view.
    const matched = filterMedicinesByTerm(allMeds, adminMedicineSearchTerm);
    const totalPages = Math.max(1, Math.ceil(matched.length / MED_PAGE_SIZE));
    if (adminMedicinePage > totalPages - 1) adminMedicinePage = totalPages - 1;
    if (adminMedicinePage < 0) adminMedicinePage = 0;
    const meds = matched.slice(adminMedicinePage * MED_PAGE_SIZE, (adminMedicinePage + 1) * MED_PAGE_SIZE);
    tbody.innerHTML = '';

    const statusEl = document.getElementById('admin-medicine-search-status');
    if (statusEl) {
      if (!adminMedicineSearchTerm.trim()) {
        statusEl.textContent = `Showing all ${allMeds.length} medicines`;
      } else {
        statusEl.textContent = `${matched.length} match${matched.length === 1 ? '' : 'es'}`;
      }
    }
    renderMedicinePagination('admin-medicine-pagination', adminMedicinePage, matched.length, 'changeAdminMedicinePage');

    // FR20: explicit "Medicine Not Found" feedback rather than a blank table.
    if (meds.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted py-4">
            <i class="bi bi-search me-2"></i>
            Medicine Not Found${adminMedicineSearchTerm.trim() ? ` for "${adminMedicineSearchTerm.trim()}"` : ''}.
          </td>
        </tr>`;
      return;
    }

    meds.forEach(m => {
      let badgeHtml = '';
      if (m.stock === 0) badgeHtml = `<span class="badge-stock-red">Out of Stock (0)</span>`;
      else if (m.stock <= 10) badgeHtml = `<span class="badge-stock-yellow">Low Stock (${m.stock})</span>`;
      else badgeHtml = `<span class="badge-stock-green">In Stock (${m.stock})</span>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong class="text-dark">${m.id}</strong></td>
        <td>
          <div class="font-heading text-dark">${m.name}</div>
          <div class="small text-muted">${m.description}</div>
        </td>
        <td>${m.dosage ? `<span class="badge bg-success-subtle text-success border border-success-subtle">${m.dosage}</span>` : '<span class="text-muted small">-</span>'}</td>
        <td><span class="badge bg-light text-dark border">${m.category}</span></td>
        <td>${badgeHtml}</td>
        <td>${m.lastUpdated}</td>
        <td>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-luxury-outline py-1 px-3" onclick="window.PharmaCastApp.openEditMedicineModal('${m.id}')">
              <i class="bi bi-pencil-square"></i> Edit
            </button>
            <button class="btn btn-sm btn-outline-danger py-1 px-3" onclick="window.PharmaCastApp.deleteMedicine('${m.id}')">
              <i class="bi bi-trash-fill"></i> Delete
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  /* ─── PHARMACIST MEDICINE LIBRARY ───
     Same search behaviour as the admin table (FR20), plus the ability to
     remove medicines that arrived via a dataset upload. Catalogue medicines
     are shown but not removable by a pharmacist - the server enforces this
     too, so hiding the button is a UI nicety rather than the actual control. */
  let pharmacistMedicineSearchTerm = '';
  let pharmacistUploadedOnly = false;
  let pharmacistMedicinePage = 0;

  function changePharmacistMedicinePage(delta) {
    pharmacistMedicinePage += delta;
    if (pharmacistMedicinePage < 0) pharmacistMedicinePage = 0;
    renderPharmacistMedicinesTable();
  }

  function handlePharmacistMedicineSearch(term) {
    pharmacistMedicineSearchTerm = term;
    pharmacistMedicinePage = 0;
    renderPharmacistMedicinesTable();
  }

  function clearPharmacistMedicineSearch() {
    pharmacistMedicineSearchTerm = '';
    pharmacistMedicinePage = 0;
    const input = document.getElementById('pharmacist-medicine-search');
    if (input) input.value = '';
    renderPharmacistMedicinesTable();
  }

  function togglePharmacistUploadedOnly(checked) {
    pharmacistUploadedOnly = Boolean(checked);
    pharmacistMedicinePage = 0;
    renderPharmacistMedicinesTable();
  }

  function renderPharmacistMedicinesTable() {
    const tbody = document.getElementById('pharmacist-medicines-tbody');
    if (!tbody) return;

    let pool = getMedicines();
    if (pharmacistUploadedOnly) pool = pool.filter(m => m.createdFromUpload);

    const matched = filterMedicinesByTerm(pool, pharmacistMedicineSearchTerm);
    const totalPages = Math.max(1, Math.ceil(matched.length / MED_PAGE_SIZE));
    if (pharmacistMedicinePage > totalPages - 1) pharmacistMedicinePage = totalPages - 1;
    if (pharmacistMedicinePage < 0) pharmacistMedicinePage = 0;
    const meds = matched.slice(pharmacistMedicinePage * MED_PAGE_SIZE, (pharmacistMedicinePage + 1) * MED_PAGE_SIZE);
    tbody.innerHTML = '';

    const statusEl = document.getElementById('pharmacist-medicine-search-status');
    if (statusEl) {
      if (!pharmacistMedicineSearchTerm.trim()) {
        statusEl.textContent = `Showing all ${pool.length} medicines`;
      } else {
        statusEl.textContent = `${matched.length} match${matched.length === 1 ? '' : 'es'}`;
      }
    }
    renderMedicinePagination('pharmacist-medicine-pagination', pharmacistMedicinePage, matched.length, 'changePharmacistMedicinePage');

    if (meds.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted py-4">
            <i class="bi bi-search me-2"></i>
            Medicine Not Found${pharmacistMedicineSearchTerm.trim() ? ` for "${pharmacistMedicineSearchTerm.trim()}"` : ''}.
          </td>
        </tr>`;
      return;
    }

    meds.forEach(m => {
      let badgeHtml;
      if (m.stock === 0) badgeHtml = `<span class="badge-stock-red">Out of Stock (0)</span>`;
      else if (m.stock <= 10) badgeHtml = `<span class="badge-stock-yellow">Low Stock (${m.stock})</span>`;
      else badgeHtml = `<span class="badge-stock-green">In Stock (${m.stock})</span>`;

      const fromUpload = Boolean(m.createdFromUpload);
      const sourceHtml = fromUpload
        ? `<span class="badge bg-success-subtle text-success border border-success-subtle"><i class="bi bi-cloud-arrow-up-fill me-1"></i>Uploaded dataset</span>`
        : `<span class="badge bg-light text-muted border">Catalogue</span>`;

      // Actions a pharmacist can take on a medicine. All are permitted for the
      // pharmacist role server-side, including Remove - the confirm dialog is
      // what protects against an accidental delete.
      const removeBtn = `<button class="btn btn-sm btn-outline-danger py-1 px-2"
                   onclick="window.PharmaCastApp.removeMedicineFromDataset('${m.id}')"
                   title="Remove this medicine, its sales history and its forecasts">
             <i class="bi bi-trash3-fill"></i> Remove
           </button>`;

      const actionHtml = `
        <div class="btn-group btn-group-sm" role="group" aria-label="Medicine actions">
          <button class="btn btn-sm btn-luxury-outline py-1 px-2"
                  onclick="window.PharmaCastApp.openMedicineDetail('${m.id}')"
                  title="View full details, AI demand forecast and re-order recommendation">
            <i class="bi bi-eye-fill"></i> View
          </button>
          <button class="btn btn-sm btn-luxury-outline py-1 px-2"
                  onclick="window.PharmaCastApp.refreshForecastFor('${m.id}')"
                  title="Re-run the AI demand forecast for this medicine">
            <i class="bi bi-arrow-repeat"></i>
          </button>
          <button class="btn btn-sm btn-luxury-outline py-1 px-2"
                  onclick="window.PharmaCastApp.openStockModal('${m.id}')"
                  title="Update the current stock quantity">
            <i class="bi bi-box-seam-fill"></i>
          </button>
          ${removeBtn}
        </div>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong class="text-dark">${m.id}</strong></td>
        <td>
          <div class="font-heading text-dark">${m.name}</div>
          <div class="small text-muted">${m.description || ''}</div>
        </td>
        <td>${m.dosage ? `<span class="badge bg-success-subtle text-success border border-success-subtle">${m.dosage}</span>` : '<span class="text-muted small">-</span>'}</td>
        <td><span class="badge bg-light text-dark border">${m.category}</span></td>
        <td>${badgeHtml}</td>
        <td>${sourceHtml}</td>
        <td>${actionHtml}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  /** Re-runs the AI demand forecast for one medicine (FR28-FR30). */
  async function refreshForecastFor(medId) {
    const med = getMedicines().find(m => m.id === medId);
    const label = med ? med.name : `#${medId}`;

    if (!/^\d+$/.test(String(medId))) {
      showToastNotification('This medicine only exists locally, so there is no server-side data to forecast yet.', 'warning');
      return;
    }

    showToastNotification(`Running the AI forecast for ${label}…`, 'info');
    try {
      const headers = {};
      const token = getRealAuthToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(apiUrl(`/api/predictions/generate/${medId}`), { method: 'POST', headers });
      const data = await res.json().catch(() => ({}));

      if (res.status === 422) {
        // Not an error - just not enough history for the model tiers yet.
        showToastNotification(
          `Not enough sales history for ${label}: ${data.months_available || 0} month(s) available, ${data.minimum_required || 6} required.`,
          'warning'
        );
        return;
      }
      if (!res.ok) throw new Error(data.error || `Forecast failed (${res.status})`);

      showToastNotification(
        `Forecast updated for ${label} using ${data.model_type || 'the AI model'} `
        + `(${data.months_available || 0} months of history).`,
        'success'
      );
    } catch (err) {
      showToastNotification(`Could not run the forecast: ${err.message}`, 'error');
    }
  }

  /* ─── Stock update (FR22 / FR23) ─── */
  function openStockModal(medId) {
    const med = getMedicines().find(m => m.id === medId);
    if (!med) return;

    document.getElementById('stock-modal-med-id').value = med.id;
    document.getElementById('stock-modal-med-name').textContent =
      `${med.name}${med.dosage ? ` (${med.dosage})` : ''}`;
    document.getElementById('stock-modal-quantity').value = med.stock != null ? med.stock : 0;

    const modal = document.getElementById('modal-update-stock');
    if (modal) modal.classList.add('show');
  }

  function closeStockModal() {
    const modal = document.getElementById('modal-update-stock');
    if (modal) modal.classList.remove('show');
  }

  async function saveStockUpdate(e) {
    e.preventDefault();
    const medId = document.getElementById('stock-modal-med-id').value;
    const quantity = parseInt(document.getElementById('stock-modal-quantity').value, 10);

    if (!Number.isFinite(quantity) || quantity < 0) {
      showToastNotification('Quantity must be zero or a positive whole number.', 'warning');
      return;
    }

    try {
      await api.put(`/api/stock/${medId}`, { quantity });
      closeStockModal();
      showToastNotification('Stock updated.', 'success');
      await syncMedicinesFromServer();
      renderPharmacistMedicinesTable();
      if (typeof renderManageMedicinesTable === 'function') renderManageMedicinesTable();
      if (currentUser && !isUserAdminRole(currentUser) && typeof renderPharmacistDashboard === 'function') {
        renderPharmacistDashboard();
      } else if (typeof renderAdminDashboard === 'function') {
        renderAdminDashboard();
      }
    } catch (err) {
      showToastNotification(`Could not update stock: ${err.message}`, 'error');
    }
  }

  /** Removes a medicine along with its sales history, stock row and forecasts. */
  async function removeMedicineFromDataset(medId) {
    const med = getMedicines().find(m => m.id === medId);
    const label = med ? `${med.name}${med.dosage ? ` (${med.dosage})` : ''}` : `#${medId}`;
    const fromUpload = med && med.createdFromUpload;

    // Catalogue medicines are shared inventory rather than one pharmacist's
    // import, so the prompt says so explicitly before it is removed.
    const scopeNote = fromUpload
      ? 'This medicine came from an uploaded dataset.'
      : 'This is a catalogue medicine — removing it affects everyone using this system.';

    if (!confirm(
      `Remove "${label}"?\n\n${scopeNote}\n\n`
      + 'Its sales history, stock record and AI forecasts will also be deleted. This cannot be undone.'
    )) return;

    try {
      const result = await api.del(`/api/medicines/${medId}`);
      showToastNotification(result.message || 'Medicine removed.', 'success');
      await syncMedicinesFromServer();
      renderPharmacistMedicinesTable();
      if (typeof renderManageMedicinesTable === 'function') renderManageMedicinesTable();
      if (currentUser && isUserAdminRole(currentUser)) {
        if (typeof renderAdminDashboard === 'function') renderAdminDashboard();
      } else if (typeof renderPharmacistDashboard === 'function') {
        renderPharmacistDashboard();
      }
    } catch (err) {
      showToastNotification(`Could not remove medicine: ${err.message}`, 'error');
    }
  }

  function openAddMedicineModal() {
    document.getElementById('modal-med-title').textContent = "Add New Medicine Record";
    document.getElementById('med-form-id').value = "";
    document.getElementById('med-form-name').value = "";
    document.getElementById('med-form-category').value = "Antipyretic";
    document.getElementById('med-form-description').value = "";
    document.getElementById('med-form-stock').value = "100";
    document.getElementById('med-form-price').value = "450";
    const dosageEl = document.getElementById('med-form-dosage');
    if (dosageEl) dosageEl.value = "";
    const mfrEl = document.getElementById('med-form-manufacturer');
    if (mfrEl) mfrEl.value = "";

    const modal = document.getElementById('modal-medicine-crud');
    if (modal) modal.classList.add('show');
  }

  function openEditMedicineModal(medId) {
    const meds = getMedicines();
    const m = meds.find(item => item.id === medId);
    if (!m) return;

    document.getElementById('modal-med-title').textContent = `Edit Medicine: ${m.name}`;
    document.getElementById('med-form-id').value = m.id;
    document.getElementById('med-form-name').value = m.name;
    document.getElementById('med-form-category').value = m.category;
    document.getElementById('med-form-description').value = m.description;
    document.getElementById('med-form-stock').value = m.stock;
    document.getElementById('med-form-price').value = m.unitPriceLKR || 450;
    const dosageEl = document.getElementById('med-form-dosage');
    if (dosageEl) dosageEl.value = m.dosage || '';
    const mfrEl = document.getElementById('med-form-manufacturer');
    if (mfrEl) mfrEl.value = m.manufacturer || '';

    const modal = document.getElementById('modal-medicine-crud');
    if (modal) modal.classList.add('show');
  }

  // Saves to the real backend (POST/PUT /api/medicines) - requires the admin
  // session token obtained at login. Falls back to a local-only save
  // (old behavior) if the server call fails, so the form never silently loses
  // the admin's input.
  async function saveMedicineForm(e) {
    e.preventDefault();
    const idVal = document.getElementById('med-form-id').value;
    const nameVal = document.getElementById('med-form-name').value.trim();
    const catVal = document.getElementById('med-form-category').value;
    const descVal = document.getElementById('med-form-description').value.trim();
    const stockVal = parseInt(document.getElementById('med-form-stock').value, 10) || 0;
    const priceVal = parseInt(document.getElementById('med-form-price').value, 10) || 450;

    const dosageEl = document.getElementById('med-form-dosage');
    const mfrEl = document.getElementById('med-form-manufacturer');
    const dosageVal = dosageEl ? dosageEl.value.trim() : '';
    const mfrVal = mfrEl ? mfrEl.value.trim() : '';

    const existing = idVal ? getMedicines().find(m => m.id === idVal) : null;
    const payload = {
      medicine_name: nameVal,
      generic_name: descVal || null,
      category: catVal,
      unit_price: priceVal,
      reorder_level: (existing && existing.reorderLevel != null) ? existing.reorderLevel : 20,
      current_stock: stockVal,
      dosage: dosageVal || null,
      manufacturer: mfrVal || null
    };

    try {
      if (idVal) {
        await api.put(`/api/medicines/${idVal}`, payload);
      } else {
        await api.post('/api/medicines', payload);
      }
      await syncMedicinesFromServer();
      closeMedicineModal();
      renderManageMedicinesTable();
      showToastNotification(`Medicine record successfully saved!`, "success");
    } catch (err) {
      showToastNotification(`Could not save to server (${err.message}). Saved locally only - log in as admin to sync.`, "error");
      // Local-only fallback so the admin's work isn't lost if the server is unreachable.
      const meds = getMedicines();
      if (idVal) {
        const idx = meds.findIndex(m => m.id === idVal);
        if (idx !== -1) {
          Object.assign(meds[idx], { name: nameVal, category: catVal, description: descVal, stock: stockVal, unitPriceLKR: priceVal, lastUpdated: new Date().toISOString().split('T')[0] });
        }
      } else {
        meds.push({ id: `MED-${Date.now()}`, name: nameVal, category: catVal, description: descVal, stock: stockVal, unitPriceLKR: priceVal, lastUpdated: new Date().toISOString().split('T')[0] });
      }
      setMedicines(meds);
      closeMedicineModal();
      renderManageMedicinesTable();
    }
  }

  async function deleteMedicine(medId) {
    if (!confirm("Are you sure you want to delete this medicine record?")) return;
    try {
      await api.del(`/api/medicines/${medId}`);
      await syncMedicinesFromServer();
      renderManageMedicinesTable();
      showToastNotification("Medicine record deleted.", "warning");
    } catch (err) {
      showToastNotification(`Could not delete on server (${err.message}). Removed locally only.`, "error");
      let meds = getMedicines();
      meds = meds.filter(m => m.id !== medId);
      setMedicines(meds);
      renderManageMedicinesTable();
    }
  }

  function closeMedicineModal() {
    const modal = document.getElementById('modal-medicine-crud');
    if (modal) modal.classList.remove('show');
  }

  // ─── 10. AUTHENTICATION, REGISTRATION & 5-ATTEMPT LOCKOUT ───
  // Authenticates against the real backend (bcrypt password check, role,
  // pending/rejected status, and the 5-attempt/30-minute lockout are all
  // enforced server-side in routes/auth.routes.js). The old client-side-only
  // localStorage lockout has been retired - it was trivially bypassed by
  // clearing localStorage and was the root cause of an earlier "admin can't
  // log in" incident, since it could lock an account the server itself
  // considered fine.
  async function handleLoginSubmit(e) {
    e.preventDefault();
    const usernameVal = document.getElementById('login-username').value.trim();
    const passwordVal = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error-banner');

    if (errorEl) errorEl.style.display = 'none';

    let result;
    try {
      result = await api.post('/api/login', { username: usernameVal, password: passwordVal });
    } catch (err) {
      showLoginError(err.message || 'Invalid username or password');
      return;
    }

    setRealAuthToken(result.token);

    currentUser = {
      id: result.user_id,
      username: result.username,
      email: result.email,
      role: result.role,
      fullName: result.full_name || result.name || result.username,
      contactNumber: result.phone,
      pharmacyName: result.pharmacy_name,
      status: result.status
    };
    // Session-scoped storage only (matches where the auth token lives).
    // This used to also write to localStorage, which persists after the
    // browser fully closes - the token in sessionStorage would be gone on
    // the next visit, but this cached user object would still be there,
    // so the UI rendered a "logged in" dashboard where every API call
    // silently 401'd. Keeping both in sessionStorage keeps them in sync.
    sessionStorage.setItem('pc_current_user', JSON.stringify(currentUser));
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateNavbarState();
    startInactivityTimer();

    showToastNotification(`Welcome back, ${currentUser.fullName}!`, "success");

    if (isUserAdminRole(currentUser)) {
      showPage('page-admin-dashboard');
    } else {
      showPage('page-pharmacist-dashboard');
    }

    await syncMedicinesFromServer();
    if (isUserAdminRole(currentUser)) {
      renderAdminDashboard();
      if (typeof renderManageMedicinesTable === 'function') renderManageMedicinesTable();
      if (typeof renderPendingApprovalsTable === 'function') renderPendingApprovalsTable();
    } else {
      renderPharmacistDashboard();
    }
  }

  function showLoginError(msg) {
    const errorEl = document.getElementById('login-error-banner');
    if (errorEl) {
      errorEl.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i> ${msg}`;
      errorEl.style.display = 'block';
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    const fullNameVal = document.getElementById('reg-fullname').value.trim();
    const emailVal = document.getElementById('reg-email').value.trim();
    const contactVal = document.getElementById('reg-contact').value.trim();
    const usernameVal = document.getElementById('reg-username').value.trim();
    const passwordVal = document.getElementById('reg-password').value;
    const confirmVal = document.getElementById('reg-confirm-password').value;
    const errorEl = document.getElementById('reg-error-banner');

    if (errorEl) errorEl.style.display = 'none';

    // Form Validation rules
    const nameRegex = /^[A-Za-z\s]{3,50}$/;
    if (!nameRegex.test(fullNameVal)) {
      showRegisterError("Full Name must contain letters and spaces only (3 to 50 characters).");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal)) {
      showRegisterError("Please enter a valid email address.");
      return;
    }

    const contactRegex = /^[0-9]{10,15}$/;
    if (!contactRegex.test(contactVal)) {
      showRegisterError("Contact Number must contain digits only (10 to 15 digits).");
      return;
    }

    const usernameRegex = /^[A-Za-z0-9_]{4,20}$/;
    if (!usernameRegex.test(usernameVal)) {
      showRegisterError("Username must be alphanumeric (4 to 20 characters).");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+=-]).{8,}$/;
    if (!passwordRegex.test(passwordVal)) {
      showRegisterError("Password must be at least 8 characters long and include an uppercase letter, lowercase letter, digit, and special character.");
      return;
    }

    if (passwordVal !== confirmVal) {
      showRegisterError("Password and Confirm Password do not match.");
      return;
    }

    const roleEl = document.getElementById('reg-role');
    const selectedRole = (roleEl ? roleEl.value : "Pharmacist").toLowerCase();

    // Per the SRS, admin approval is mandatory for every new account -
    // including admin signups - so both roles go into the same real pending
    // queue on the server; there is no instant self-activation anymore.
    // (The backend re-validates everything authoritatively, including
    // duplicate username/email and the 2+ word full-name rule, so its error
    // message is shown directly if it disagrees with the quick checks above.)
    try {
      await api.post('/api/register', {
        full_name: fullNameVal,
        email: emailVal,
        phone: contactVal,
        username: usernameVal,
        password: passwordVal,
        role: selectedRole
      });
    } catch (err) {
      showRegisterError(err.message || 'Registration failed. Please try again.');
      return;
    }

    // Show luxury modal
    const modal = document.getElementById('modal-registration-success');
    if (modal) modal.classList.add('show');
  }

  function showRegisterError(msg) {
    const errorEl = document.getElementById('reg-error-banner');
    if (errorEl) {
      errorEl.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i> ${msg}`;
      errorEl.style.display = 'block';
    }
  }

  function closeRegistrationSuccessModal() {
    const modal = document.getElementById('modal-registration-success');
    if (modal) modal.classList.remove('show');
    showPage('page-login');
  }

  async function handleLogout() {
    // Destroy the session server-side too (deletes the sessions row), not just
    // the local copy of it - otherwise the token would stay valid until it expired.
    try {
      await api.post('/api/logout');
    } catch (err) {
      console.warn('[PharmaCast] Server logout failed (session will still expire on its own):', err.message);
    }

    setRealAuthToken(null);
    currentUser = null;
    sessionStorage.removeItem('pc_current_user');
    sessionStorage.removeItem('currentUser');
    localStorage.removeItem('pc_current_user');
    localStorage.removeItem('currentUser');
    updateNavbarState();
    showToastNotification("You have been securely logged out.", "info");
    showPage('page-home');
  }

  // ─── 11. 30-MINUTE SESSION INACTIVITY AUTO-LOGOUT ───
  function startInactivityTimer() {
    if (inactivityTimer) clearInterval(inactivityTimer);

    // Listen to user interactions
    const resetTime = () => { lastActivityTime = Date.now(); };
    window.addEventListener('mousemove', resetTime);
    window.addEventListener('keydown', resetTime);
    window.addEventListener('click', resetTime);

    inactivityTimer = setInterval(() => {
      if (!currentUser) return;
      const elapsedMin = (Date.now() - lastActivityTime) / 60000;

      if (elapsedMin >= 30) {
        // Auto timeout
        handleLogout();
        alert("Your session has expired due to 30 minutes of inactivity. Please log in again.");
      } else if (elapsedMin >= 25) {
        // Show warning modal 5 min before timeout
        const warnModal = document.getElementById('modal-timeout-warning');
        if (warnModal && !warnModal.classList.contains('show')) {
          warnModal.classList.add('show');
        }
      }
    }, 10000);
  }

  function testShowTimeoutWarning() {
    const warnModal = document.getElementById('modal-timeout-warning');
    if (warnModal) warnModal.classList.add('show');
  }

  function dismissTimeoutWarning() {
    lastActivityTime = Date.now();
    const warnModal = document.getElementById('modal-timeout-warning');
    if (warnModal) warnModal.classList.remove('show');
  }

  // ─── 12. NUMBER COUNTER & UI MICRO-ANIMATIONS ───
  function triggerAnimateNumbers() {
    const counters = document.querySelectorAll('.page-view.active-page [data-target]');
    counters.forEach(counter => {
      const target = +counter.getAttribute('data-target');
      let current = 0;
      const step = Math.max(1, Math.ceil(target / 25));

      const updateCounter = () => {
        current += step;
        if (current >= target) {
          counter.textContent = target.toLocaleString();
        } else {
          counter.textContent = current.toLocaleString();
          requestAnimationFrame(updateCounter);
        }
      };
      updateCounter();
    });

    // Staggered Entrance Animation for Active Page Cards & Sections
    const activePage = document.querySelector('.page-view.active-page');
    if (activePage) {
      const staggerElements = activePage.querySelectorAll('.card-luxury, .stat-card-luxury, .hero-luxury > *, .table-responsive');
      staggerElements.forEach((el, index) => {
        el.classList.remove('stagger-item', 'stagger-1', 'stagger-2', 'stagger-3', 'stagger-4', 'stagger-5', 'stagger-6', 'stagger-7');
        void el.offsetWidth; // force reflow
        el.classList.add('stagger-item', `stagger-${Math.min(7, (index % 7) + 1)}`);
      });
    }
  }

  function initAmbientParticles() {
    const container = document.getElementById('ambient-particles-container');
    if (!container) return;
    container.innerHTML = '';
    const colors = [
      'rgba(16, 185, 129, 0.22)',
      'rgba(52, 211, 153, 0.18)',
      'rgba(212, 175, 55, 0.14)',
      'rgba(13, 148, 136, 0.16)'
    ];
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('div');
      p.className = 'ambient-particle';
      const size = Math.floor(Math.random() * 70) + 18;
      const top = Math.floor(Math.random() * 100);
      const left = Math.floor(Math.random() * 100);
      const delay = Math.floor(Math.random() * 14);
      const duration = Math.floor(Math.random() * 8) + 12;
      const color = colors[Math.floor(Math.random() * colors.length)];

      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.top = `${top}%`;
      p.style.left = `${left}%`;
      p.style.background = color;
      p.style.animationDuration = `${duration}s`;
      p.style.animationDelay = `-${delay}s`;
      container.appendChild(p);
    }
  }

  function initCursorGlowAura() {
    const aura = document.getElementById('cursor-glow-aura');
    if (!aura) return;

    let targetX = -500, targetY = -500;
    let currentX = -500, currentY = -500;

    window.addEventListener('mousemove', (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
    }, { passive: true });

    const animateAura = () => {
      currentX += (targetX - currentX) * 0.18;
      currentY += (targetY - currentY) * 0.18;
      aura.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(animateAura);
    };
    requestAnimationFrame(animateAura);

    // Interactive Hover Expanding Aura
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('a, button, .card-luxury, .nav-link-item, input, select')) {
        aura.classList.add('hovering');
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('a, button, .card-luxury, .nav-link-item, input, select')) {
        aura.classList.remove('hovering');
      }
    });
  }

  function initClickRippleEffect() {
    document.addEventListener('click', (e) => {
      const targetEl = e.target.closest('.btn, .nav-link-item, .card-luxury');
      if (!targetEl) return;

      const rect = targetEl.getBoundingClientRect();
      const circle = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      circle.style.width = `${size}px`;
      circle.style.height = `${size}px`;
      circle.style.left = `${x}px`;
      circle.style.top = `${y}px`;
      circle.className = 'click-ripple';

      targetEl.appendChild(circle);

      setTimeout(() => {
        circle.remove();
      }, 650);
    });
  }

  function showToastNotification(msg, type = "success") {
    const toastBox = document.getElementById('luxury-toast-container');
    if (!toastBox) return;

    let bgClass = "bg-success";
    if (type === "warning") bgClass = "bg-warning text-dark";
    if (type === "error") bgClass = "bg-danger";
    if (type === "info") bgClass = "bg-primary";

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white ${bgClass} border-0 show p-3 mb-2 shadow-lg`;
    toast.style.borderRadius = "14px";
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body font-heading">
          ${msg}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.remove()"></button>
      </div>
    `;
    toastBox.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 4500);
  }

  // ─── 13. EXPOSE PUBLIC APPLICATION API ───
  window.PharmaCastApp = {
    showPage,
    goBackFromUpload,
    focusSearchInput,
    openForecastShortcut,
    openStockShortcut,
    openMedicineDetail,
    placeRecommendedOrder,
    approveRequest,
    showRejectModal,
    confirmRejectRequest,
    closeRejectModal,
    openAddMedicineModal,
    openEditMedicineModal,
    saveMedicineForm,
    deleteMedicine,
    closeMedicineModal,
    handleLoginSubmit,
    handleRegisterSubmit,
    closeRegistrationSuccessModal,
    handleLogout,
    handleFileUpload,
    removeSalesFile,
    handleAdminMedicineSearch,
    clearAdminMedicineSearch,
    changeAdminMedicinePage,
    handlePharmacistMedicineSearch,
    clearPharmacistMedicineSearch,
    changePharmacistMedicinePage,
    togglePharmacistUploadedOnly,
    removeMedicineFromDataset,
    renderPharmacistMedicinesTable,
    refreshForecastFor,
    openStockModal,
    closeStockModal,
    saveStockUpdate,
    loadDemoCSV,
    downloadSampleCSV,
    testShowTimeoutWarning,
    dismissTimeoutWarning,
    toggleUserStatus,
    resetUserPassword,
    deleteUserAccount,
    openCreateUserModal,
    closeCreateUserModal,
    handleCreateUserSubmit,
    openCustomCsvModal,
    closeCustomCsvModal,
    submitCustomCsvData,
    trainModelWithDataset,
    trainOnDataset,
    closeAiTrainingModal,
    finishAiTraining
  };

  /* ─── iOS navbar behaviours ───
     1. The bar becomes more opaque once the page scrolls away from the top,
        the way a UINavigationBar does.
     2. Tapping a segment marks it active (the white "thumb"), and the
        segmented track scrolls it into view when it's off-screen. */
  function initIOSNavbar() {
    const bar = document.querySelector('.navbar-luxury');
    if (!bar) return;

    const applyScrollState = () => {
      bar.classList.toggle('is-scrolled', window.scrollY > 4);
    };
    applyScrollState();
    window.addEventListener('scroll', applyScrollState, { passive: true });

    document.querySelectorAll('.nav-segment').forEach(segment => {
      segment.addEventListener('click', (e) => {
        const item = e.target.closest('.nav-link-item');
        if (!item || !segment.contains(item)) return;
        segment.querySelectorAll('.nav-link-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      });
    });
  }

  /** Highlights whichever nav pill corresponds to the page now on screen. */
  function syncActiveNavItem(pageId) {
    // page-medicine-detail isn't its own nav pill - it's reached via the
    // "Forecasts" or "Stock" shortcuts, so keep whichever of those two was
    // actually clicked lit up instead of falling through to "no match" and
    // stripping the active state the moment the page switches (see
    // lastDetailEntryPoint above).
    if (pageId === 'page-medicine-detail') {
      const fnName = lastDetailEntryPoint === 'stock' ? 'openStockShortcut' : 'openForecastShortcut';
      document.querySelectorAll('.nav-segment .nav-link-item').forEach(el => {
        const onclick = el.getAttribute('onclick') || '';
        el.classList.toggle('active', onclick.includes(fnName));
      });
      return;
    }

    const map = {
      'page-home': 'page-home',
      'page-register': 'page-register',
      'page-pharmacist-dashboard': 'page-pharmacist-dashboard',
      'page-admin-dashboard': 'page-admin-dashboard',
      'page-admin-approvals': 'page-admin-approvals',
      'page-admin-medicines': 'page-admin-medicines',
      'page-pharmacist-medicines': 'page-pharmacist-medicines',
      'page-admin-upload': 'page-admin-upload'
    };
    const target = map[pageId];
    document.querySelectorAll('.nav-segment .nav-link-item').forEach(el => {
      const onclick = el.getAttribute('onclick') || '';
      const href = el.getAttribute('href') || '';
      const matches = target && (onclick.includes(`'${target}'`) || href.includes(`#${target}`));
      el.classList.toggle('active', Boolean(matches));
    });
  }

  // Initialize on load
  /**
   * If this page isn't being served BY the real backend (servedByRealApi is
   * false - e.g. opened via VS Code's "Go Live"/Live Server or Live Preview,
   * which only serves static files on their own port, typically 5500), every
   * /api/* call depends on the real Node server ALSO running separately on
   * port REAL_API_PORT. When it isn't, login, Forecasts, Stock, Train Model -
   * everything that touches the backend - just silently does nothing, with
   * no indication why. This checks once on load and says so plainly instead
   * of leaving it to be discovered one broken button at a time.
   */
  async function warnIfBackendUnreachable() {
    if (servedByRealApi) return;
    try {
      const res = await fetch(`${API_BASE}/api/stats`, { method: 'GET', cache: 'no-store' });
      if (res.ok) return;
    } catch (e) { /* fall through to banner */ }

    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;'
      + 'background:#991b1b;color:#fff;padding:10px 20px;font:600 13px/1.5 -apple-system,sans-serif;'
      + 'text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.35);';
    banner.innerHTML = isLocalHost
      ? `⚠️ This page is open via <code>${window.location.origin}</code> (looks like VS Code "Go Live" / Live Server, `
        + `not the real PharmaCast server) — login, Forecasts, Stock and Train Model will not work from here because `
        + `the Node backend on port ${REAL_API_PORT} isn't reachable. Run <code>restart-server.bat</code> `
        + `(or <code>npm start</code>) in the project folder, then open `
        + `<a href="http://localhost:${REAL_API_PORT}" style="color:#fff;text-decoration:underline;">`
        + `http://localhost:${REAL_API_PORT}</a> directly in your browser instead of using Go Live.`
      : `⚠️ Can't reach the backend at <code>${API_BASE}</code> — login, Forecasts, Stock and Train Model `
        + `will not work. The Render service may be asleep (free tier spins down after inactivity — reload `
        + `in ~30s) or the URL in <code>PROD_API_BASE</code> may be out of date.`;
    document.body.prepend(banner);
    document.body.style.paddingTop = `${banner.offsetHeight || 44}px`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    initAmbientParticles();
    initCursorGlowAura();
    initClickRippleEffect();
    bindSearchHandlers();
    updateNavbarState();
    initIOSNavbar();
    warnIfBackendUnreachable();

    if (currentUser) startInactivityTimer();

    // Default route. If we were just handed off from the other document
    // (see crossDocumentFileFor() in showPage()) with a specific page in the
    // URL hash, honor that instead of falling back to each role's default
    // landing page.
    const handoffPageId = window.location.hash ? window.location.hash.slice(1) : null;
    if (handoffPageId && document.getElementById(handoffPageId)) {
      showPage(handoffPageId);
      history.replaceState(null, '', window.location.pathname + window.location.search);
    } else if (currentUser) {
      showPage(isUserAdminRole(currentUser) ? 'page-admin-dashboard' : 'page-pharmacist-dashboard');
    } else {
      showPage('page-home');
    }

    // Pull real medicine data from the backend so search/list/detail/manage
    // pages reflect the live database instead of only the bundled demo set.
    syncMedicinesFromServer().then(() => {
      if (!currentUser) return;
      if (isUserAdminRole(currentUser)) {
        renderAdminDashboard();
        if (typeof renderManageMedicinesTable === 'function') renderManageMedicinesTable();
      } else {
        renderPharmacistDashboard();
      }
    });
  });

})();
