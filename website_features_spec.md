# FormDrop Analytics — Features Required for a Successful Analysis

What your analytics tool (`form-drop.vercel.app/analytics.html`) must support to run the forest–water study end to end. Ordered by necessity: **must-have** items are hard blockers; without them the analysis is wrong or impossible.

---

## MUST-HAVE (analysis is wrong or blocked without these)

### 1. Derived grouping variable ("Stratum")
Let the user map the 8 raw community values into a **2-level custom group** (Lakeside / Inland) and treat that as a variable for every cross-tab. This is *the* independent variable for Objective 2. Without it, no comparison is possible.
- Ideally: a UI where you assign each distinct value of a column to a bucket, producing a new virtual column.

### 2. Multi-response (checkbox) handling
Columns Q14, Q16, Q26, Q35, Q36 hold multiple selections per respondent. The tool must:
- Parse a multi-value cell (split on delimiter) into separate options.
- Compute **% of respondents** who chose each option (base = respondents, so totals exceed 100%).
- Not mistake these for single categorical columns.

### 3. Mode as a selectable central-tendency measure
For Likert items, compute and display the **mode**, and **detect/flag multimodal** items (report all tied values rather than picking one arbitrarily).

### 4. Full frequency distribution + collapsed %Agree per Likert item
For each 5-point item: counts and % across SA/A/N/D/SD, **plus** a one-click collapse to 3-level (Agree/Neutral/Disagree) and 2-level (Agree/Not-agree) with %Agree vs %Disagree.

### 5. Cross-tabulation (any variable × Stratum)
Build a contingency table of any question against `Stratum` (and ideally occupation/age). This is the descriptive backbone of Objective 2.

### 6. Significance testing with sparse-cell handling
- **Chi-square** on cross-tabs, reporting statistic, df, and p-value.
- Automatic **expected-cell-count check** with a warning when any expected count < 5.
- **Fisher's exact test** fallback (or at least a prompt to collapse categories) for sparse tables. This is essential — with your sample size most 5×2 Likert tables will violate chi-square assumptions.

### 7. Filtered / conditional base for skip-logic items
Q14 and Q16 apply only to respondents who answered YES on Q13/Q15. The tool must let you compute percentages on a **filtered subset** and clearly display the base N used.

---

## STRONGLY RECOMMENDED (quality + credibility)

### 8. Data-quality diagnostics
- **Missing value** count and % per item, with exclude-pairwise vs include options.
- **Straight-lining detector** (respondent gives identical Likert answer across a block).
- **Duplicate / invalid community code** flag.

### 9. Reverse-item recoding
Ability to mark an item as negatively worded (e.g. Q7) and auto-recode before Agree/Disagree collapsing.

### 10. Median as secondary ordinal measure
Report median alongside mode for Likert items (both are ordinal-valid) as a robustness check.

### 11. Per-item export of tables and charts
Export each table to CSV/XLSX and each chart to PNG, so results drop straight into the write-up.

---

## NICE-TO-HAVE (polish, not blocking)

- **Segmented charts** — grouped/stacked bars showing Lakeside vs Inland side by side per item.
- **Auto-generated summary** — a "significant differences" list: every item where the stratum comparison was significant (the direct answer to Objective 2).
- **Effect size** (Cramér's V) alongside chi-square, so you can say *how large* a difference is, not just whether it's significant.
- **Qualitative tagging** for the open-ended Q28 — a simple theme-tagging interface with theme frequency counts.
- **Codebook view** — a table listing each variable, its type (demographic / Yes-No / Likert / categorical / multi-response / open), and its assigned analysis, mirroring the item classification in the guideline.

---

## Minimum viable checklist

If you build nothing else, the analysis still works with: **(1) Stratum grouping, (2) multi-response parsing, (3) mode + full distribution, (4) cross-tab × Stratum, (5) chi-square with a sparse-cell warning and category-collapse option.** Items 1–7 above cover the full correct run; everything below §7 improves rigour and speed.
