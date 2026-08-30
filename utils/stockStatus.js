const DEFAULT_MIN_THRESHOLD = 10;

/**
 * Classifies stock quantity into green/yellow/red per FR23:
 *  - green  ("In Stock"):  quantity > threshold
 *  - yellow ("Low Stock"): 0 < quantity <= threshold
 *  - red    ("Out of Stock"): quantity <= 0
 * threshold defaults to the medicine's reorder_level (or 10 if unset).
 */
function computeAlertStatus(quantity, reorderLevel) {
    const qty = Number(quantity) || 0;
    // `Number(reorderLevel) || DEFAULT_MIN_THRESHOLD` used to fall back to 10
    // whenever reorderLevel was 0 - 0 is falsy in JS, so an admin explicitly
    // setting "don't warn me until it's completely gone" (reorder_level = 0)
    // was silently overridden with the default threshold instead. That isn't
    // a rare edge case here: every bulk-uploaded medicine is created with
    // reorder_level = 0 (routes/sales.routes.js, routes/medicines.routes.js)
    // until an admin sets a real one, so most of the catalog was being
    // shown as "Low Stock" at <=10 units rather than only at 0. Distinguish
    // "genuinely 0" from "not provided" with a null/undefined check instead.
    const parsedReorderLevel = Number(reorderLevel);
    const threshold = (reorderLevel !== null && reorderLevel !== undefined && Number.isFinite(parsedReorderLevel))
        ? parsedReorderLevel
        : DEFAULT_MIN_THRESHOLD;
    if (qty <= 0) return 'red';
    if (qty <= threshold) return 'yellow';
    return 'green';
}

module.exports = { computeAlertStatus };
