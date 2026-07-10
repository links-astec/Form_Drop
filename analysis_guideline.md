# Analysis Guideline — Community Perspectives on Forest–Water Relationships

Case study: communities around the Sapawsu Forest Reserve / Volta Lake, Asuogyaman District.
Analysis run through the FormDrop analytics engine (SPSS-style, **mode** as the Likert central-tendency measure).

---

## 0. Set up the grouping variable FIRST

Everything in Objective 2 depends on a clean two-level stratum. Before running anything, derive `Stratum` from the community name:

| Stratum | Communities |
|---|---|
| **Inland** | Nyameben, Adjena Donor, Kudikope, Survey Line |
| **Lakeside** | Korankye, Mpakadan, Dodi Asantekrom, Labolabo Tornu |

Do **not** let the tool auto-group by the 8 raw community names for the objective-2 comparison — collapse to these two strata. Keep the raw community field too, for the demographic profile.

Other independent variables for cross-tabs: **gender** (Q2), **occupation** (Q3), **age group** (Q5), **years resident** (Q4).

**Gender gets full parallel treatment to Stratum** — every group B/C/D item that's cross-tabbed by Lakeside vs Inland should also get a **Male vs Female** cross-tab (mode/%category within each gender, chi-square or Fisher's exact, same collapse rules). Treat this as **Objective 2b**, run alongside the lakeside/inland comparison, not folded into it.

---

## The two objectives, restated

1. **Objective 1** — Assess community perceptions of the role of forests on water bodies. *(Whole-sample descriptives.)*
2. **Objective 2** — Determine differences between **lakeside vs inland** communities on forest-water perceptions and management strategies. *(Cross-tab + significance test by `Stratum`.)*
3. **Objective 2b** — Determine differences between **male vs female** respondents on the same items. *(Cross-tab + significance test by `Gender` — same method as Objective 2, run as a parallel comparison.)*

---

## 1. Item classification (drives which analysis each question gets)

**A — Demographics (frequencies + % only):** Q1 community, Q2 gender, Q3 occupation, Q4 years lived, Q5 age group.

**B — Yes/No/Not-sure perception & belief items (frequencies + %; cross-tab by stratum):** Q6, Q7, Q8, Q13, Q15, Q24, Q25.

**C — 5-point Likert items (MODE + full distribution + %Agree; cross-tab by stratum + chi-square):**
Q9, Q10, Q11, Q12, Q17, Q18, Q19, Q20, Q21, Q23, Q27, Q29, Q30, Q31.

**D — Categorical management / policy choice items (frequencies + %; cross-tab by stratum):** Q22, Q32, Q33, Q34.

**E — Multi-select checkbox items (multi-response frequencies; % of respondents, sums >100%):** Q14, Q16, Q35, Q36.

**F — Open-ended (qualitative, thematic coding — not statistical):** Q28.

> **Note on Q26 (biggest threat):** on this form it is built as single-choice *Multiple choice*. Christabel's instruction is to **treat it as multiple-select** — if any paper questionnaire has multiple ticks, count them all as valid rather than flagging an error. Analyse Q26 as a **multi-response** item (like group E), % of respondents per option.

---

## 2. Section-by-section run sheet

### Demographics (Q1–Q5) — group A
Frequencies + percentages for each. Produce a demographic profile table and bar/pie charts.
**Critical cross-check:** run `occupation × Stratum` and `gender × Stratum` now. If fishers cluster lakeside and farmers inland, later stratum differences may actually be livelihood differences — note this as a confounder up front. Likewise, if one gender is disproportionately concentrated in one stratum, gender and stratum differences may be confounded with each other — flag it before interpreting either comparison.

### Belief items (Q6, Q7, Q8) — group B
Frequencies + %. Q7 is the *negative* mirror of Q6 — report them together; high "Yes" on both would signal confusion or reversed reading, worth flagging. Cross-tab each by `Stratum`.

### Core Likert perception block (Q9–Q12, Q17–Q21) — group C
This is the heart of **Objective 1**. For **each** item:
1. **Mode** (the required central-tendency measure).
2. **Full 5-level frequency distribution** (SA/A/N/D/SD counts + %).
3. **Collapsed summary:** %Agree (SA+A) vs %Neutral vs %Disagree (SD+D).

Run whole-sample first (Objective 1), then re-run split by `Stratum` (Objective 2).

### Observed-change items (Q13→Q14, Q15→Q16) — B then E
Q13 and Q15 are Yes/No/Not-sure. Q14 and Q16 are **checkboxes shown only to those who answered YES** — so their base is *only YES respondents*, not the full sample. State the base N explicitly and compute % on that filtered base. Multi-response: percentages sum >100%.

### Riparian / hydrology Likert (Q17–Q21) — group C
Same treatment as Q9–Q12. These are the riparian-buffer and streamflow perceptions central to the forest-water linkage claim.

### Management & governance (Q22–Q36)
- **Q22, Q32, Q33, Q34** (group D): categorical choice — frequencies + %, cross-tab by stratum. These map directly to Objective 2 (management strategy preferences).
- **Q23, Q27, Q29, Q30, Q31** (group C Likert): mode + distribution + %Agree, cross-tab by stratum + chi-square.
- **Q24, Q25** (group B): Yes/No — frequencies + %, cross-tab by stratum.
- **Q26** (treat as multi-response E): % of respondents per threat option.
- **Q35, Q36** (group E checkboxes): multi-response frequencies, % of respondents.
- **Q28** (group F): open text → thematic coding (see §5).

---

## 3. The comparative layer (Objective 2 and 2b)

For every group B, C and D item, build **response × Stratum** cross-tabs, **and** the same **response × Gender** cross-tabs:

- Report mode + %Agree (or category %) **within each stratum** (and within each gender), side by side.
- Run **chi-square** for significance (as the methodology promises) — for both Stratum and Gender.
- **Expected-cell-count trap:** with ~8 communities × modest N and 5 Likert levels, many cells will have expected count < 5, which invalidates chi-square. This applies to the gender split too — a lopsided male/female split in some communities will make it worse, not better. Fixes:
  - Collapse Likert to **3 levels** (Agree / Neutral / Disagree) or **2 levels** (Agree / Not-agree) before testing.
  - Use **Fisher's exact test** for sparse tables where available.
  - Always **report which collapse or test** you used per item.
- Optional secondary cut: repeat key items by **occupation** (farmer vs fisher), since the conceptual framework predicts livelihood differences too.
- Optional tertiary cut: **Gender × Stratum** together (e.g. lakeside women vs inland women) where N allows — flag if any cell drops below a usable N rather than reporting an unstable %.

---

## 4. Using MODE for Likert (and its caveats)

Likert responses are **ordinal**, not interval — the mean assumes equal spacing between "Agree" and "Strongly Agree" that doesn't truly exist, so **mode** ("most common response") is the defensible choice and is what you were instructed to use.

Handle two weaknesses:
- **Multimodal items:** two tied levels → report *both*, never force one value.
- **Mode ignores spread:** always pair it with the full distribution and the %Agree summary, or a bimodal split looks identical to a tight consensus.
- Optionally also report the **median** (also ordinal-valid) as a secondary check, but keep mode primary.

---

## 5. Q28 open-ended (qualitative)

"How can communities support VRA's efforts?" → thematic coding. Read all responses, tag recurring themes (e.g. tree planting, reporting illegal logging, education, alternative livelihoods), then report theme frequencies. Not a statistical item; supports Objective 2 narrative.

---

## 6. Pre-flight data checklist

- Every respondent has a valid **community code** and derived **Stratum** before any comparison runs.
- **Missing/blank** responses per item — decide exclude-pairwise vs flag; report N per item.
- **Straight-lining** — spot respondents who answered all-SA (or all-A) down a Likert column.
- **Reverse-worded items** — Q7 (negative belief) and any negatively phrased Likert must be recoded *before* collapsing Agree/Disagree, or summaries flip.
- **Checkbox base N** — Q14/Q16 are filtered to YES-only respondents; state the base.
- **Multi-response columns** (Q14, Q16, Q26, Q35, Q36) must be parsed as multi-select, not single categorical — otherwise counts are wrong and %s won't exceed 100 when they should.

---

## 7. Output artefacts to produce

- Demographic profile table + charts.
- Per-item Likert table: mode | SA/A/N/D/SD % | %Agree — whole sample.
- Same table split Lakeside vs Inland, with chi-square/Fisher result and the collapse used.
- Same table split Male vs Female, with chi-square/Fisher result and the collapse used.
- Multi-response tables for Q14, Q16, Q26, Q35, Q36 — and the same tables split by Gender where the breakdown is meaningful (e.g. Q26 biggest-threat by gender).
- Categorical cross-tabs for Q22, Q32, Q33, Q34 by stratum and by gender.
- Thematic summary for Q28.
- A short "differences" summary: which items showed significant lakeside-vs-inland gaps (the direct answer to Objective 2), **and** a separate short summary of which items showed significant male-vs-female gaps (Objective 2b).
