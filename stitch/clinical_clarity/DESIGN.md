# Design System Specification: Editorial Healthcare Excellence

## 1. Overview & Creative North Star
**Creative North Star: The Clinical Curator**
This design system rejects the cluttered, high-friction layouts of traditional medical portals. Instead, it adopts the "Clinical Curator" persona—an aesthetic that blends the sterile precision of high-end pharmacy packaging with the sophisticated legibility of an editorial broadsheet. 

We break the "template" look through **Intentional Asymmetry**. Rather than a rigid, centered grid, we utilize generous, staggered white space and oversized "Manrope" display type to guide the eye. Information density is managed through **Atmospheric Layering**—the feeling that elements are floating on sheets of pristine glass rather than being boxed in by lines.

## 2. Colors & Tonal Depth
The palette is rooted in medical authority but executed with a premium, multi-dimensional approach.

### The "No-Line" Rule
**Borders are prohibited for sectioning.** To define a new area, use a background shift from `surface` (#f7fafc) to `surface-container-low` (#f1f4f6). Boundaries must be felt, not seen. This creates a fluid, high-end experience that mirrors the cleanliness of a modern lab.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack. 
- **Base Level:** `surface` (#f7fafc)
- **Primary Content Blocks:** `surface-container-lowest` (#ffffff)
- **Interactive Insets:** `surface-container` (#ebeef0)

By nesting a `surface-container-lowest` card inside a `surface-container-low` wrapper, you create a natural lift that signals "priority" without the visual noise of a stroke.

### The "Glass & Gradient" Rule
For primary call-to-actions and hero sections, utilize a subtle **Signature Texture**. Transition from `primary` (#002045) to `primary_container` (#1a365d) at a 135-degree angle. For floating navigation or modal overlays, apply a `backdrop-blur` of 12px using a semi-transparent `surface_variant` at 80% opacity to maintain the "frosted glass" medical aesthetic.

## 3. Typography
We use a dual-font strategy to balance authority with accessibility.

*   **Display & Headlines (Manrope):** Chosen for its geometric precision and modern medical feel. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) for hero messaging to establish an immediate sense of "The Expert."
*   **Body & Labels (Inter):** The workhorse for readability. `body-md` (0.875rem) is our standard for patient instructions.
*   **Hierarchical Purpose:** High-contrast scale is mandatory. A `headline-lg` should sit boldly near `body-sm` metadata to create an editorial rhythm that feels premium and intentional.

## 4. Elevation & Depth
In this system, depth is a function of light, not lines.

### The Layering Principle
Avoid traditional shadows for standard cards. Use the **Tonal Layering** method:
- Place a white card (`surface-container-lowest`) on a light grey background (`surface`). The 4% difference in luminance is sufficient for the human eye to perceive depth.

### Ambient Shadows
When an element must float (e.g., a prescription refill modal), use an **Ambient Shadow**:
- `box-shadow: 0 20px 40px rgba(0, 32, 69, 0.06);` 
- Note the use of a tinted shadow (using `primary` color) instead of pure black. This mimics natural light passing through medical-grade polymers.

### The "Ghost Border" Fallback
If a boundary is required for accessibility (e.g., high-contrast mode), use a **Ghost Border**: `outline-variant` (#c4c6cf) at 15% opacity. Never use a 100% opaque border.

## 5. Components

### Buttons (The Clinical Interaction)
- **Primary:** Gradient-filled (`primary` to `primary_container`), `DEFAULT` (0.5rem) rounded corners. No border.
- **Secondary:** `surface_container_high` background with `on_primary_fixed_variant` text.
- **Tertiary/Ghost:** No background, `primary` text, with an 8px padding-inline to maintain the touch target.

### Search Bars
An essential pharmacy tool. Use `surface_container_lowest` with a "Ghost Border." The leading icon should be `primary` at 60% opacity. On focus, the container should transition to a 2px `outline` of `secondary` (#1960a3) with a soft ambient glow.

### Status Badges (The Triage System)
- **In-Stock:** `tertiary_fixed` (#9ff5c1) background with `on_tertiary_fixed` text.
- **Low-Stock:** `secondary_container` (#7db6ff) background with `on_secondary_container` text.
- **Out-of-Stock:** `error_container` (#ffdad6) background with `on_error_container` text.
- *Note:* Forbid "traffic light" brights. Use these muted, sophisticated tones to maintain a calm medical environment.

### Cards & Lists
**Strict Rule:** No dividers. Separate medication list items using `spacing-4` (1.4rem) of vertical white space. If separation is visually required, use a alternating background tint of `surface_container_low`.

### Medical Timeline (Additional Component)
A vertical track using `outline_variant` at 20% opacity. Milestones use `primary` dots. This visualizes a patient's journey or prescription history with editorial clarity.

## 6. Do’s and Don’ts

### Do
- **Do** use `spacing-8` and `spacing-12` between major sections to allow the design to "breathe."
- **Do** use asymmetrical layouts where the headline is offset from the body text to create a high-end feel.
- **Do** utilize `backdrop-filter: blur()` on all sticky headers.

### Don't
- **Don't** use 1px solid black or grey borders. This instantly makes the UI look like a "legacy" medical app.
- **Don't** use standard "drop shadows" (e.g., `0 2px 4px black`).
- **Don't** cram icons. If an icon is used, it must have at least `spacing-2` of internal padding.
- **Don't** use pure #000000 for text. Use `on_background` (#181c1e) for a softer, more professional read.