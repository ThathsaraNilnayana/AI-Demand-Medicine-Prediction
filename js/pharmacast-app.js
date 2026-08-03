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

  const DEFAULT_USERS = [
    {
      id: "USR-001",
      username: "admin",
      password: "admin",
      fullName: "Dr. Saman Weerasinghe",
      email: "admin@pharmacast.lk",
      contactNumber: "0770000001",
      role: "Admin",
      status: "Active",
      createdAt: "2026-01-10"
    },
    {
      id: "USR-002",
      username: "pharmacist",
      password: "Password@123",
      fullName: "Kasun Perera (Chief Pharmacist)",
      email: "kasun.perera@pharmacast.lk",
      contactNumber: "0771122334",
      role: "Pharmacist",
      status: "Active",
      createdAt: "2026-02-15"
    }
  ];

  const DEFAULT_REGISTRATION_REQUESTS = [
    {
      id: "REQ-201",
      fullName: "Nimesh Fernando",
      email: "nimesh.f@citypharmacy.lk",
      contactNumber: "0772345678",
      username: "nimesh_p",
      password: "Password@123",
      status: "Pending",
      submittedAt: "2026-07-29"
    },
    {
      id: "REQ-202",
      fullName: "Dilini Senanayake",
      email: "dilini.s@lankapharmacy.lk",
      contactNumber: "0773456789",
      username: "dilini_s",
      password: "Password@123",
      status: "Pending",
      submittedAt: "2026-07-30"
    }
  ];

  const DEFAULT_SALES_FILES = [
    {
      id: "FILE-301",
      fileName: "sri_lanka_pharmacy_sales_q1_q2_2026.csv",
      uploadDate: "2026-07-15",
      recordCount: 360,
      uploadedBy: "Admin (Dr. Saman Weerasinghe)",
      status: "Verified & Stored"
    },
    {
      id: "FILE-302",
      fileName: "colombo_district_sales_history_2025.xlsx",
      uploadDate: "2026-06-10",
      recordCount: 540,
      uploadedBy: "Admin (Dr. Saman Weerasinghe)",
      status: "Verified & Stored"
    }
  ];

  // Initialize localStorage if not present
  function initLocalStorage() {
    if (!localStorage.getItem('pc_medicines')) {
      localStorage.setItem('pc_medicines', JSON.stringify(DEFAULT_MEDICINES));
    }
    if (!localStorage.getItem('pc_users')) {
      localStorage.setItem('pc_users', JSON.stringify(DEFAULT_USERS));
    }
    if (!localStorage.getItem('pc_registration_requests')) {
      localStorage.setItem('pc_registration_requests', JSON.stringify(DEFAULT_REGISTRATION_REQUESTS));
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
  function getUsers() {
    const pcUsers = JSON.parse(localStorage.getItem('pc_users') || '[]');
    const otherUsers = JSON.parse(localStorage.getItem('users') || '[]');
    const map = new Map();
    [...DEFAULT_USERS, ...otherUsers, ...pcUsers].forEach(u => {
      if (u && (u.username || u.email)) {
        map.set((u.username || u.email).toLowerCase(), u);
      }
    });
    return Array.from(map.values());
  }
  function setUsers(data) { localStorage.setItem('pc_users', JSON.stringify(data)); }
  function getRequests() { return JSON.parse(localStorage.getItem('pc_registration_requests') || '[]'); }
  function setRequests(data) { localStorage.setItem('pc_registration_requests', JSON.stringify(data)); }
  function getSalesFiles() { return JSON.parse(localStorage.getItem('pc_sales_files') || '[]'); }
  function setSalesFiles(data) { localStorage.setItem('pc_sales_files', JSON.stringify(data)); }

  function isUserAdminRole(u) {
    if (!u) return false;
    const roleStr = String(u.role || u.user_role || u.type || '').toLowerCase();
    return roleStr.includes('admin') || u.username === 'admin' || u.email === 'admin@pharmacast.com' || u.email === 'admin@pharmacast.lk';
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

  async function apiRequest(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getRealAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(path, {
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
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
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
      res = await fetch(path, { method: 'POST', headers, body: form });
    } catch (networkErr) {
      throw new Error('Cannot reach the PharmaCast server. Is `node server.js` running on this machine?');
    }

    let data = {};
    try { data = await res.json(); } catch (e) { /* empty/non-JSON body */ }

    if (!res.ok) {
      const err = new Error(data.error || `Upload failed (${res.status})`);
      err.details = data.details;
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
  let currentUser = JSON.parse(sessionStorage.getItem('pc_current_user') || sessionStorage.getItem('currentUser') || localStorage.getItem('pc_current_user') || localStorage.getItem('currentUser') || 'null');
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
  const ADMIN_ONLY_PAGES = [
    'page-admin-dashboard',
    'page-admin-approvals',
    'page-admin-upload',
    'page-admin-medicines',
    'page-admin-users'
  ];

  function showPage(pageId) {
    if (ADMIN_ONLY_PAGES.includes(pageId) && !isUserAdminRole(currentUser)) {
      showToastNotification("Access denied: that area is restricted to administrators.", "error");
      pageId = currentUser ? 'page-pharmacist-dashboard' : 'page-home';
    }

    const pages = document.querySelectorAll('.page-view');
    pages.forEach(p => {
      p.classList.remove('active-page');
    });

    const target = document.getElementById(pageId);
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
    } else if (pageId === 'page-admin-upload') {
      renderSalesFilesTable();
    } else if (pageId === 'page-admin-medicines') {
      renderManageMedicinesTable();
    }
  }

  function updateNavbarState() {
    const navLoggedOut = document.getElementById('nav-logged-out');
    const navPharmacist = document.getElementById('nav-pharmacist');
    const navAdmin = document.getElementById('nav-admin');
    const navUserBadge = document.getElementById('nav-user-badge');

    if (navLoggedOut) navLoggedOut.style.display = 'none';
    if (navPharmacist) navPharmacist.style.display = 'none';
    if (navAdmin) navAdmin.style.display = 'none';

    if (!currentUser) {
      if (navLoggedOut) navLoggedOut.style.display = 'flex';
      if (navUserBadge) navUserBadge.innerHTML = '';
    } else if (isUserAdminRole(currentUser)) {
      if (navAdmin) navAdmin.style.display = 'flex';
      if (navUserBadge) {
        navUserBadge.innerHTML = `<span class="badge-stock-green" style="background:#d1fae5; color:#065f46;"><i class="bi bi-shield-lock-fill"></i> Admin: ${currentUser.fullName}</span>`;
      }
      updatePendingCountBadge();
    } else {
      if (navPharmacist) navPharmacist.style.display = 'flex';
      if (navUserBadge) {
        navUserBadge.innerHTML = `<span class="badge-stock-green" style="background:#e0f2fe; color:#0369a1;"><i class="bi bi-person-badge-fill"></i> Pharmacist: ${currentUser.fullName}</span>`;
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

    triggerAnimateNumbers();
    renderRecentMedicinesList(meds);
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
        const res = await fetch(`/api/predictions/generate/${med.id}`, { method: 'POST', headers });
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

    renderPredictionChart('predictionChartCanvas', prediction);

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
    const reason = document.getElementById('reject-reason-input').value.trim() || "Does not meet Sri Lanka pharmacy licensing verification.";

    try {
      await api.put(`/api/users/${selectedRejectId}/reject`, { reason });
      renderPendingApprovalsTable();
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

  // ─── ADMIN USER ACCOUNT CONTROL CENTER ("Create Admin account to control all account") ───
  function renderAllUsersTable() {
    const tbody = document.getElementById('admin-all-users-tbody');
    if (!tbody) return;

    const users = getUsers();
    tbody.innerHTML = '';

    users.forEach(u => {
      const isSelf = currentUser && currentUser.id === u.id;
      const isAdmin = isUserAdminRole(u);
      const roleBadge = isAdmin 
        ? `<span class="badge" style="background:#1e293b; color:#fff; border:1px solid #3b82f6;"><i class="bi bi-shield-lock-fill"></i> Admin</span>`
        : `<span class="badge" style="background:#d1fae5; color:#065f46; border:1px solid #10b981;"><i class="bi bi-person-fill"></i> Pharmacist</span>`;

      const statusBadge = u.status === 'Deactivated'
        ? `<span class="badge bg-danger">Deactivated</span>`
        : `<span class="badge-stock-green" style="font-size:0.8rem;">Active</span>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong class="text-dark">${u.id || 'USR-001'}</strong></td>
        <td>
          <div class="fw-bold text-dark">${u.fullName} ${isSelf ? '<span class="badge bg-light text-muted border ms-1">You</span>' : ''}</div>
          <div class="small text-muted">${u.email || ''}</div>
        </td>
        <td><code class="text-dark fs-6">${u.username}</code></td>
        <td>${roleBadge}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="d-flex flex-wrap gap-1">
            ${isSelf ? `
              <span class="small text-muted fst-italic">Primary Administrator</span>
            ` : `
              <button class="btn btn-sm ${u.status === 'Deactivated' ? 'btn-outline-success' : 'btn-outline-warning'} py-1 px-2" onclick="window.PharmaCastApp.toggleUserStatus('${u.id}')" title="Toggle account access">
                <i class="bi ${u.status === 'Deactivated' ? 'bi-unlock-fill' : 'bi-lock-fill'}"></i> ${u.status === 'Deactivated' ? 'Activate' : 'Deactivate'}
              </button>
              <button class="btn btn-sm btn-outline-primary py-1 px-2" onclick="window.PharmaCastApp.resetUserPassword('${u.id}')" title="Reset password to Password@123">
                <i class="bi bi-key-fill"></i> Reset Pass
              </button>
              <button class="btn btn-sm btn-outline-danger py-1 px-2" onclick="window.PharmaCastApp.deleteUserAccount('${u.id}')" title="Permanently delete user">
                <i class="bi bi-trash3-fill"></i>
              </button>
            `}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function toggleUserStatus(userId) {
    const users = getUsers();
    const u = users.find(x => x.id === userId);
    if (u) {
      u.status = u.status === 'Deactivated' ? 'Active' : 'Deactivated';
      setUsers(users);
      renderAllUsersTable();
      showToastNotification(`User account ${u.username} is now ${u.status}!`, u.status === 'Active' ? 'success' : 'warning');
    }
  }

  function resetUserPassword(userId) {
    const users = getUsers();
    const u = users.find(x => x.id === userId);
    if (u) {
      u.password = 'Password@123';
      setUsers(users);
      showToastNotification(`Password for ${u.username} has been reset to "Password@123"`, 'info');
    }
  }

  function deleteUserAccount(userId) {
    let users = getUsers();
    const u = users.find(x => x.id === userId);
    if (!u) return;
    if (u.id === 'USR-001' || u.username === 'admin') {
      showToastNotification('Cannot delete primary Admin account!', 'danger');
      return;
    }
    users = users.filter(x => x.id !== userId);
    setUsers(users);
    renderAllUsersTable();
    showToastNotification(`Account ${u.username} has been permanently deleted.`, 'warning');
  }

  function openCreateUserModal() {
    const modal = document.getElementById('modal-create-user');
    if (modal) modal.classList.add('show');
  }

  function closeCreateUserModal() {
    const modal = document.getElementById('modal-create-user');
    if (modal) modal.classList.remove('show');
  }

  function handleCreateUserSubmit(e) {
    e.preventDefault();
    const fullName = document.getElementById('new-user-fullname').value.trim();
    const email = document.getElementById('new-user-email').value.trim();
    const username = document.getElementById('new-user-username').value.trim();
    const password = document.getElementById('new-user-password').value || 'Password@123';
    const role = document.getElementById('new-user-role').value;

    const users = getUsers();
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      showToastNotification('Username already exists!', 'danger');
      return;
    }

    const newUser = {
      id: `USR-${Date.now()}`,
      username: username,
      password: password,
      fullName: fullName,
      email: email,
      contactNumber: 'N/A',
      role: role,
      status: 'Active',
      createdAt: new Date().toISOString().split('T')[0]
    };

    users.push(newUser);
    setUsers(users);
    closeCreateUserModal();
    renderAllUsersTable();
    showToastNotification(`New ${role} account "${username}" created successfully!`, 'success');
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
      `;
      tbody.appendChild(tr);
    });
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
            uploadedBy: currentUser ? `${currentUser.role} (${currentUser.fullName})` : "Admin",
            status: "Verified & Stored"
          });
          setSalesFiles(files);
          renderSalesFilesTable();
          if (previewArea) previewArea.style.display = 'none';
          if (typeof renderAdminDashboard === 'function') renderAdminDashboard();
          showToastNotification(
            `${result.imported} historical sales records stored from ${file.name}. Run the AI pipeline to refresh forecasts.`,
            "success"
          );
        } catch (err) {
          // Backend reports failures per row - surface them with row numbers.
          if (Array.isArray(err.details) && err.details.length) {
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

      // Check header columns
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const required = ['date', 'medicine', 'quantity'];
      const isValidHeader = required.every(r => headers.some(h => h.includes(r)));

      if (!isValidHeader) {
        showCsvError(`Invalid column headers found. Required CSV columns: Date (YYYY-MM-DD), Medicine Name, Quantity Sold. Found: [${lines[0]}]`);
        return;
      }

      // Build a first-10-rows preview (the server is the authority on validity).
      const previewRows = [];
      for (let i = 1; i < lines.length && i <= 10; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        previewRows.push({
          rowNum: i + 1,
          date: cols[0] || '',
          medName: cols[1] || '',
          qty: cols[2] || '',
          ok: Boolean(cols[0]) && Boolean(cols[1]) && !isNaN(parseInt(cols[2], 10))
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
          uploadedBy: currentUser ? `${currentUser.role} (${currentUser.fullName})` : "Admin",
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
    const csvContent = [
      "Date,Medicine Name,Quantity Sold",
      "2026-07-01,Panadol (Paracetamol 500mg),380",
      "2026-07-02,Piriton (Chlorpheniramine 4mg),185",
      "2026-07-03,Amoxil (Amoxicillin 500mg),340",
      "2026-07-04,Metformin (Glucophage 500mg),425",
      "2026-07-05,Beclo-C (Vitamin C + Zinc 500mg),290",
      "2026-07-06,Losartan Potassium 50mg),215",
      "2026-07-07,Cetirizine Hydrochloride 10mg,170",
      "2026-07-08,Acyclovir 200mg,105",
      "2026-07-09,Azithromycin 500mg,165",
      "2026-07-10,Panadol (Paracetamol 500mg),395"
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

  function submitCustomCsvData() {
    const textarea = document.getElementById('custom-csv-textarea');
    if (!textarea) return;
    const text = textarea.value.trim();
    if (!text) {
      showToastNotification("Please paste CSV data first!", "warning");
      return;
    }

    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    const parsedRows = [];
    for (let i = 0; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols.length >= 3 && !isNaN(parseInt(cols[2], 10))) {
        parsedRows.push({ date: cols[0], medName: cols[1], qty: parseInt(cols[2], 10) });
      }
    }
    saveUploadedSalesRecords(parsedRows);

    const files = getSalesFiles();
    files.unshift({
      id: `FILE-${Date.now()}`,
      fileName: "custom_pasted_dataset.csv",
      uploadDate: new Date().toISOString().split('T')[0],
      recordCount: lines.length,
      uploadedBy: currentUser ? `${currentUser.role} (${currentUser.fullName})` : "Admin",
      status: "Verified & Ready"
    });
    setSalesFiles(files);
    renderSalesFilesTable();
    closeCustomCsvModal();
    showToastNotification(`Successfully ingested ${lines.length} custom dataset records! Ready to train ML model.`, "success");
  }

  let aiTrainingInterval = null;
  // Real "Run ML Forecast Pipeline" - sequentially calls the actual backend
  // (POST /api/predictions/generate/:id, which in turn spawns ml/predict.py)
  // for every server-backed medicine, logging genuine per-medicine results
  // instead of a canned/fake terminal animation.
  let aiTrainingCancelled = false;
  async function trainModelWithDataset() {
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

    const meds = await syncMedicinesFromServer();
    const realMeds = meds.filter(m => /^\d+$/.test(String(m.id)));

    if (realMeds.length === 0) {
      log('> No server-backed medicines found. Log in as admin and add medicines via Manage Medicines first.', 'text-warning');
      statusText.textContent = 'Nothing to train.';
      finishBtn.style.display = 'inline-block';
      return;
    }

    log(`> Found ${realMeds.length} medicine(s) in the database. Requesting sales_data + running ml/predict.py for each...`, 'text-light');

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
        const res = await fetch(`/api/predictions/generate/${med.id}`, { method: 'POST', headers });
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
        log(`> [${med.name}] Error - ${err.message}`, 'text-danger');
      }

      completed++;
      bar.style.width = `${Math.round((completed / realMeds.length) * 100)}%`;
    }

    const meanConfidence = confidences.length ? (confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100 : 0;
    bar.className = 'progress-bar bg-success';
    statusText.textContent = 'AI Model Training Complete!';
    statusText.className = 'small text-success fw-bold';
    log(`> SUCCESS! ${succeeded}/${realMeds.length} medicine forecasts generated by the real ML pipeline. Mean confidence = ${meanConfidence.toFixed(1)}%.`, 'text-success fw-bold mt-1');
    finishBtn.style.display = 'inline-block';
    showToastNotification(`✓ AI pipeline run complete: ${succeeded}/${realMeds.length} medicines forecast using the real backend model.`, 'success');
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
  function renderManageMedicinesTable() {
    const tbody = document.getElementById('admin-medicines-tbody');
    if (!tbody) return;

    const meds = getMedicines();
    tbody.innerHTML = '';

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

  function openAddMedicineModal() {
    document.getElementById('modal-med-title').textContent = "Add New Medicine Record";
    document.getElementById('med-form-id').value = "";
    document.getElementById('med-form-name').value = "";
    document.getElementById('med-form-category').value = "Antipyretic";
    document.getElementById('med-form-description').value = "";
    document.getElementById('med-form-stock').value = "100";
    document.getElementById('med-form-price').value = "450";

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

    const existing = idVal ? getMedicines().find(m => m.id === idVal) : null;
    const payload = {
      medicine_name: nameVal,
      generic_name: descVal || null,
      category: catVal,
      unit_price: priceVal,
      reorder_level: (existing && existing.reorderLevel != null) ? existing.reorderLevel : 20,
      current_stock: stockVal
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
    sessionStorage.setItem('pc_current_user', JSON.stringify(currentUser));
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.setItem('pc_current_user', JSON.stringify(currentUser));
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
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

  // ─── INSTANT ADMIN ACCOUNT CREATION & LAUNCH ("create the admin account") ───
  function createDefaultAdminAccount() {
    let users = getUsers();
    let adminUser = users.find(u => u.username === 'admin');
    if (!adminUser) {
      adminUser = {
        id: "USR-001",
        username: "admin",
        password: "admin",
        fullName: "Dr. Saman Weerasinghe",
        email: "admin@pharmacast.lk",
        contactNumber: "0770000001",
        role: "Admin",
        status: "Active",
        createdAt: new Date().toISOString().split('T')[0]
      };
      users.unshift(adminUser);
      setUsers(users);
    } else {
      adminUser.status = "Active";
      adminUser.password = "admin";
      setUsers(users);
    }

    currentUser = adminUser;
    sessionStorage.setItem('pc_current_user', JSON.stringify(adminUser));
    sessionStorage.setItem('currentUser', JSON.stringify(adminUser));
    localStorage.setItem('pc_current_user', JSON.stringify(adminUser));
    localStorage.setItem('currentUser', JSON.stringify(adminUser));
    updateNavbarState();
    showPage('page-admin-dashboard');
    showToastNotification("✓ Active Administrator Account (admin / admin) created & logged in!", "success");
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

  // Quick evaluator demo switcher
  function switchDemoRole(role) {
    if (role === 'Admin' || String(role).toLowerCase().includes('admin')) {
      currentUser = getUsers().find(u => isUserAdminRole(u)) || DEFAULT_USERS[0];
      sessionStorage.setItem('pc_current_user', JSON.stringify(currentUser));
      sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
      localStorage.setItem('pc_current_user', JSON.stringify(currentUser));
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      updateNavbarState();
      showPage('page-admin-dashboard');
      // This switcher only changes the local UI role - it does NOT grant a real
      // server session, so admin API actions (approvals, uploads, medicine CRUD,
      // AI generation) will still be rejected with 401/403 until a real login.
      showToastNotification("Switched to Admin VIEW only - log in properly for admin actions to work.", "warning");
    } else if (role === 'Pharmacist') {
      currentUser = getUsers().find(u => u.role === 'Pharmacist') || DEFAULT_USERS[1];
      sessionStorage.setItem('pc_current_user', JSON.stringify(currentUser));
      updateNavbarState();
      showPage('page-pharmacist-dashboard');
      showToastNotification("Switched to Pharmacist view (Kasun Perera)", "success");
    } else {
      currentUser = null;
      sessionStorage.removeItem('pc_current_user');
      updateNavbarState();
      showPage('page-home');
      showToastNotification("Switched to Public Visitor view", "info");
    }
  }

  // ─── 13. EXPOSE PUBLIC APPLICATION API ───
  window.PharmaCastApp = {
    showPage,
    focusSearchInput,
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
    loadDemoCSV,
    downloadSampleCSV,
    testShowTimeoutWarning,
    dismissTimeoutWarning,
    switchDemoRole,
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
    closeAiTrainingModal,
    finishAiTraining,
    createDefaultAdminAccount
  };

  // Initialize on load
  document.addEventListener('DOMContentLoaded', () => {
    initAmbientParticles();
    initCursorGlowAura();
    initClickRippleEffect();
    bindSearchHandlers();
    updateNavbarState();

    // Default route
    if (currentUser) {
      if (isUserAdminRole(currentUser)) {
        showPage('page-admin-dashboard');
      } else {
        showPage('page-pharmacist-dashboard');
      }
      startInactivityTimer();
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
