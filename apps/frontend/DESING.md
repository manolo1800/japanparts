# Design System: ERP Dashboard

## 1. Concept & Visual Style

A modern, dark, and professional user interface designed for financial management and invoicing (SaaS). It focuses on data clarity, high contrast to highlight important actions, and a clean aesthetic with rounded corners and visual micro-interactions.

* **Theme:** Dark Mode.
* **Style:** Minimalist, corporate, modern.
* **Focus:** Data visualization (KPIs), list management, and parallel detail view (Master-Detail).

## 2. Color Palette

| Role                             | Color (Approx. Hex)     | Usage                                                      |
| :------------------------------- | :---------------------- | :--------------------------------------------------------- |
| **Main Background**        | `#0A0D14`             | General application background.                            |
| **Surface (Cards)**        | `#151A23`             | Background for cards, modals, and panels.                  |
| **Secondary Surface**      | `#1F2633`             | Input backgrounds, search bars, inactive tabs.             |
| **Primary Accent**         | `#C4F82A` (Lime/Neon) | Primary buttons, active states, progress bars, highlights. |
| **Primary Text**           | `#FFFFFF`             | Titles, large amounts, names.                              |
| **Secondary Text**         | `#8B949E`             | Labels, subtitles, dates, supporting text.                 |
| **Borders**                | `#2D3748`             | Subtle separators between sections and card borders.       |
| **Status: Success/Active** | `#C4F82A`             | "Unpaid" badges (when selected), positive indicators.      |
| **Status: Neutral**        | `#4A5568`             | Inactive badges, empty progress bars.                      |

## 3. Typography

* **Font Family:** Modern Sans-serif (e.g., *Inter, Roboto, SF Pro Display, Salesforce Sans*).
* **Hierarchy:**
  * **H1 (Page Title):** 32px, Bold. (e.g., "Invoices").
  * **H2 (KPI Amounts):** 28px, Bold. (e.g., "$31,211.00").
  * **H3 (Card Titles):** 16px, Medium. (e.g., "Overdue", "Invoice details").
  * **Body (General Text):** 14px, Regular.
  * **Caption (Labels):** 12px, Regular/Medium, secondary color. (e.g., "Due within next month").

## 4. Structure & Layout (Grid)

* **Top Navigation Bar:** Fixed. Contains logo, main navigation (Invoices, Payments, etc.), global search, notifications, and user profile.
* **Section Header:** Title on the left, primary action button ("Create an invoice") on the right.
* **KPI Grid:** 4 columns of equal width. Cards with key metrics, mini bar charts, and user avatars involved.
* **Filter Bar:** Horizontal row with tabs (All, Draft, Unpaid), date selectors (month/year), and local search.
* **Master-Detail Layout (Split View):**
  * *Left Panel (List):* Takes ~40% of the width. Scrollable invoice list.
  * *Right Panel (Detail):* Takes ~60% of the width. Floating card or side panel showing the selected invoice's details.

## 5. UI Components

### Buttons

* **Primary:** `#C4F82A` background, black text, rounded corners (pill shape or 8px). Used for main actions ("Create an invoice", "Pay out now").
* **Secondary:** Transparent background, `#2D3748` border, white text. Used for secondary actions ("Export").
* **Icons:** Circular buttons with `#1F2633` background for quick actions (search, filter, options).

### Cards

* **Background:** `#151A23`.
* **Borders:** `1px solid #2D3748`.
* **Border Radius:** 16px.
* **Padding:** 24px.
* **Shadows:** Soft, diffused shadow to add depth (especially on the detail panel).

### Invoice List (Left Panel)

* Each item contains:
  * Client's circular avatar.
  * Invoice ID (e.g., `#404-002`) and date/days overdue.
  * Status badge (Unpaid, Viewed) with a semi-transparent background.
  * Amount on the right (Right-aligned).
* **Selected State:** `#1F2633` background, accent green left border, or full highlight with border.

### Detail Panel (Right Panel)

* **Header:** Large invoice ID, company name with logo, and client profile card (Avatar, name, email).
* **Line Items Breakdown:** List of services (e.g., "Concept Development", "CRM Development") with individual prices and an options button (three dots).
* **Totals Summary:** Bottom row with Sub Total, Total, and Action Button ("Pay out now"). The green button strongly stands out here.
* **Badges:** Status pills (e.g., "Unpaid" in green, "Draft" in gray).

### Charts & Data Visualization

* **Mini Bar Charts:** Thin, rounded bars. The active/progress bar is neon green, inactive ones are gray. Accompanied by month labels (Sep, Oct, Nov).
* **Stacked Avatars:** Overlapping circles to show clients associated with a metric.

### Inputs & Filters

* **Tabs:** Pill shape. Dark gray background for inactive, neon green background with black text for active.
* **Date Selectors:** Dark background, calendar icon, light text.
* **Search Bar:** Dark background, magnifying glass icon, gray placeholder.

## 6. Interactions & Micro-animations (Suggested)

* **Primary Button Hover:** Subtle increase in brightness or shift to a slightly lighter green.
* **Invoice List Hover:** Background changes to `#1F2633` and a subtle border appears.
* **Detail Transition:** When selecting an invoice from the list, the right panel should smoothly slide in or update with a fade-in effect.
* **Charts:** The green bars could animate from 0 to their final height upon page load.
