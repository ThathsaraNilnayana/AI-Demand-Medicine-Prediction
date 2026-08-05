/**
 * Medicine identity helpers.
 *
 * Business rule (sales upload merge):
 *   - Same medicine + same dosage  -> the SAME product. Merge the quantity
 *     into the existing record instead of creating a duplicate.
 *   - Same medicine + DIFFERENT dosage -> a DIFFERENT product. Store it as a
 *     separate medicine record.
 *
 * So "Paracetamol 500mg" and "Paracetamol 250mg" are two distinct products,
 * while "paracetamol 500 mg" and "Paracetamol  500mg" are the same one.
 */

// Matches a dosage anywhere in a name: 500mg, 500 mg, 1g, 2.5ml, 10 mcg, 100IU...
const DOSAGE_PATTERN = /(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ug|g|ml|l|iu|%)\b/i;

/** Canonical dosage string, e.g. "500 MG" / "500 mg" / "500mg" -> "500mg". */
function normalizeDosage(raw) {
    if (!raw) return null;
    const match = String(raw).match(DOSAGE_PATTERN);
    if (!match) return null;

    let unit = match[2].toLowerCase();
    if (unit === 'µg' || unit === 'ug') unit = 'mcg';

    // Drop a trailing ".0" so "500.0mg" and "500mg" collapse together.
    const amount = parseFloat(match[1]);
    return `${amount}${unit}`;
}

/**
 * Splits a raw medicine label into its base name and dosage.
 * "Panadol (Paracetamol 500mg)" -> { baseName: 'panadol (paracetamol)', dosage: '500mg' }
 */
function parseMedicineLabel(rawName) {
    const original = String(rawName || '').trim();
    const dosage = normalizeDosage(original);

    // Remove the dosage token from the name so the remainder is the product
    // itself. Then squash punctuation/whitespace for a stable comparison key.
    let base = original.replace(DOSAGE_PATTERN, ' ');
    base = base
        .replace(/\(\s*\)/g, ' ')      // empty brackets left behind by the removal
        .replace(/\s+([)\]])/g, '$1')  // "(paracetamol )" -> "(paracetamol)"
        .replace(/([([])\s+/g, '$1')   // "( paracetamol)" -> "(paracetamol)"
        .replace(/[\s\-_,]+/g, ' ')
        .trim()
        .toLowerCase();

    return { originalName: original, baseName: base, dosage };
}

/**
 * The key two medicine rows must share to be considered the same product.
 * Dosage is part of the key, which is what keeps different strengths apart.
 */
function identityKey(rawName, explicitDosage) {
    const parsed = parseMedicineLabel(rawName);
    const dosage = normalizeDosage(explicitDosage) || parsed.dosage;
    return `${parsed.baseName}|${dosage || 'n/a'}`;
}

module.exports = { normalizeDosage, parseMedicineLabel, identityKey, DOSAGE_PATTERN };
