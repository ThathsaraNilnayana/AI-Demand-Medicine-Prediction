/**
 * Fetches the stock recommendation for a medicine and renders it into
 * a container element on the page. Framework-agnostic — works whether
 * you're using plain HTML, EJS, or embedding it in a component.
 *
 * Usage:
 *   <div id="stock-panel"></div>
 *   <script>loadStockRecommendation('MED123', 'stock-panel');</script>
 */

async function loadStockRecommendation(medicineId, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = 'Loading recommendation...';

  try {
    const response = await fetch('/api/stock-recommendation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicineId })
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();

    container.innerHTML = `
      <div class="stock-card ${data.needs_reorder ? 'stock-low' : 'stock-ok'}">
        <h4>${data.medicine_id}</h4>
        <p>Current stock: ${data.current_stock}</p>
        <p>Reorder point: ${data.reorder_point}</p>
        <p>${data.needs_reorder
          ? `⚠️ Reorder now — suggested quantity: ${data.recommended_order_qty}`
          : '✅ Stock is sufficient'}</p>
      </div>
    `;
  } catch (err) {
    container.innerHTML = 'Could not load recommendation.';
    console.error('Stock recommendation error:', err);
  }
}
