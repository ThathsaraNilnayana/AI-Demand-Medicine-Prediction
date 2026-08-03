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
    const threshold = Number(reorderLevel) || DEFAULT_MIN_THRESHOLD;
    if (qty <= 0) return 'red';
    if (qty <= threshold) return 'yellow';
    return 'green';
}

module.exports = { computeAlertStatus };
