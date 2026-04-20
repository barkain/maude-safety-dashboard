# MAUDE Safety Dashboard — Market Research & Strategic Analysis

**Date:** April 20, 2026
**Prepared by:** Forge (AI Technical Director)
**Scope:** Competitive landscape, market sizing, moat analysis, and strategic direction for the FDA MAUDE Safety Dashboard

---

## Executive Summary

The market for medical device safety intelligence sits at the intersection of regulatory affairs (~$7.4B TAM), regulatory intelligence platforms (~$2.8B growing to $7.6B by 2034), and healthcare procurement analytics. The niche of "MAUDE/adverse-event dashboarding" is currently underserved commercially — the closest direct competitor (Device Events) appears to be a small bootstrapped operation. However, one critical development reshapes the landscape:

> **The FDA launched AEMS on March 11, 2026, replacing MAUDE with a unified public dashboard and real-time data pipeline. MAUDE fully migrates by end of May 2026.**

This eliminates "better MAUDE search" as a viable product positioning. It does not, however, create a procurement intelligence layer, device comparison workflow, or manufacturer scoring system. That layer remains the opportunity.

**Primary recommendation:** Reposition from "MAUDE visualization tool" to **"procurement intelligence platform built on FDA data"** — targeting hospital Value Analysis Committees (VACs) and Group Purchasing Organizations (GPOs) as the primary market. The incumbent to displace is ECRI Institute, which charges $40,000–$100,000 per single device evaluation.

---

## 1. Competitive Landscape

### 1.1 Direct MAUDE / Adverse Event Dashboards

#### Device Events — `deviceevents.com`
The closest direct commercial competitor.

| Attribute | Detail |
|-----------|--------|
| Founded | 2017 |
| Company size | Small, appears bootstrapped |
| Pricing | Not public; estimated $5K–$30K/year institutional |
| Customers | Hospitals, law firms, financial institutions, insurers |
| Core product | Searchable MAUDE data with trend charts, CSV exports, monthly alerts, custom reports |
| Weaknesses | Dated UI, no natural language search, no AI layer, no procurement workflow |

**Assessment:** Beatable on product quality alone. Not well-funded or fast-moving.

---

#### FDA AEMS — `fda.gov/safety/aems` *(Launched March 11, 2026)*
**This is the most important competitive development.**

| Attribute | Detail |
|-----------|--------|
| Cost | Free |
| Coverage | Replaces MAUDE, FAERS, and VAERS in one system |
| Data | Real-time (vs. MAUDE's monthly batch updates) |
| Interface | Interactive public dashboard, enhanced APIs |
| Government savings | Estimated $120M over five years |

AEMS absorbs the "raw adverse event search" use case entirely, for free. It does not include:
- Manufacturer-level reliability scoring
- Cross-device comparison
- Procurement decision workflow
- Natural language query
- Aggregated severity metrics

The analytics and workflow layers remain a genuine product opportunity.

---

#### ECRI Institute — `ecri.org`
**The real incumbent to displace.**

| Attribute | Detail |
|-----------|--------|
| Type | Nonprofit research organization |
| Per-device evaluation cost | $40,000–$100,000 |
| Turnaround time | Weeks |
| Product | Evidence-based device safety evaluations for hospital procurement |
| Customers | Hospital VACs, GPOs, IDNs |
| Weaknesses | Slow, expensive, not self-serve |

ECRI is credible and entrenched, but its cost and speed are its vulnerabilities. A self-serve AI-powered alternative at 10–20% of the per-evaluation cost, delivering results in minutes, is a genuinely disruptive proposition.

---

#### Other Direct Tools

| Tool | Type | Relevance |
|------|------|-----------|
| FDA MAUDE search (accessdata.fda.gov) | Free government tool | Universally described as "antiquated and difficult to use." No visualization. |
| fda.report/MAUDE | Free community front-end | No analytics. Developers only. |
| OpenFDA API | Free JSON API | Technical users only. Not a product. |
| ICIJ International Medical Devices Database | Free, journalism-driven | 120K+ records from 46 countries. No trend analysis, not commercial. |
| John Snow Labs | Licensed data marketplace | Resells MAUDE as a licensed data product. B2B data licensing, not a dashboard. |
| NESTcc / NEST | FDA-funded infrastructure project | Real-world evidence platform for manufacturers and FDA. Not a commercial product. |

---

### 1.2 Enterprise Regulatory Intelligence (Manufacturer-Facing)

These platforms serve device *manufacturers* conducting competitive research and regulatory submissions, not procurement teams. Shown to anchor pricing expectations and confirm the procurement market is unaddressed.

| Platform | Focus | Est. Annual Price |
|----------|--------|-------------------|
| Clarivate Cortellis MedTech | Global regulatory submissions, device pipelines | $50K–$200K+ |
| GlobalData Medical | Market data, deals, pipeline, 39 countries | $30K–$150K |
| IQVIA MedTech Global Data Insights | Commercial analytics, real-world evidence | $100K+ |
| Definitive Healthcare | Hospital org charts, GPO contracts, spend data | $25K–$100K+ |

None of these are focused on adverse event safety intelligence for procurement teams evaluating device purchases.

---

### 1.3 QMS / Post-Market Surveillance Platforms (Manufacturer-Facing)

These help device *manufacturers* manage their own complaints and MDR filings internally. Entirely different use case from our product.

| Platform | Pricing | Notes |
|----------|---------|-------|
| Greenlight Guru | ~$20K/year + onboarding | #1 QMS for device manufacturers |
| Veeva Vault Product Surveillance | $100K–$500K+/year | Enterprise manufacturers |
| Qualio, MasterControl, ETQ, Intelex | Varies | QMS platforms, not procurement tools |

Medical device QMS software market: ~$1.2B in 2025, projected $2.45B by 2032.

---

### 1.4 Recall Management (Hospital-Facing)

| Platform | Notes |
|----------|-------|
| NotiSphere | Enterprise SaaS for automated FDA recall alerts and compliance workflow. Manages recall *response*, not pre-purchase intelligence. |
| Smarteeva | AI-powered recall management. Recall management software market projected $2.3B by 2027. |

These are complementary rather than competitive — they manage what happens *after* a recall is issued, not pre-purchase device evaluation.

---

### 1.5 Consumer / B2C Apps

| App | Status | Notes |
|-----|--------|-------|
| TrackMy Implants | Pre-revenue, mobile/web | Patients log implanted devices, get recall alerts. Connects to hospital EHRs. |
| SoomSafety | Pre-revenue, App Store | Barcode scan for recall/safety info using openFDA. No visible revenue model. |

Both appear small and struggling with monetization. The AEMS free public dashboard absorbs most consumer demand.

---

## 2. Target Market Analysis

### 2.1 Hospital Value Analysis Committees (VACs)

VACs are 12–24 member interdisciplinary committees (physicians, nurses, supply chain, legal, administration) that evaluate device purchases before a hospital signs procurement contracts. They are the primary decision-makers for hospital device spend.

**Current workflow:**
- Commission ECRI Institute evaluation ($40K–$100K, weeks to deliver)
- Review manufacturer-provided clinical data
- Search published literature
- Query FDA MAUDE manually

**The gap:** No rapid, self-serve adverse event intelligence tool for a device under consideration. A procurement analyst cannot currently get a comprehensive safety profile of a device vs. its alternatives in under an hour.

**Our opportunity:** Replace the first step — the ECRI evaluation — with a self-serve AI-powered alternative.

---

### 2.2 Group Purchasing Organizations (GPOs)

GPOs negotiate device contracts on behalf of member hospitals. The US GPO market is $7.3B in 2025.

| GPO | Market Coverage |
|-----|----------------|
| Vizient | ~29% of US hospital beds |
| Premier | Major national GPO |
| HealthTrust | Major national GPO |

85% of mature GPOs now use data analytics tools. They increasingly demand safety and outcomes data from manufacturers before finalizing contracts. A tool that arms GPO contract analysts with adverse-event trending per device category, across manufacturers, would be high-value — especially for the contract renewal cycle.

---

### 2.3 Medical Device Importers & Distributors

Companies importing devices into the US or sourcing for international distribution need to rapidly assess device safety profiles as part of regulatory and procurement due diligence. No purpose-built tool currently serves this segment. This is the project's original target market and remains underserved.

---

### 2.4 Legal / Litigation Research

Law firms handling medical device litigation (personal injury, product liability, class action) need MAUDE data aggregated by device with severity analysis to assess case viability. This is the clearest path to early revenue:

- Immediate willingness to pay: $500–$2,000/month per firm
- No long enterprise sales cycle
- Well-defined job to be done
- ~1,000 law firms with active medical device practices in the US

---

### 2.5 B2C / Consumer

**Assessment: Not a viable primary market.**

AEMS's free public dashboard absorbs most consumer adverse-event lookup demand. Free apps (SoomSafety, ICIJ database) cover basic recall search. Consumer willingness to pay for medical device safety data is very low. The regulatory/liability risk of providing procurement recommendations to individual patients adds further complexity.

B2C features (patient-friendly device pages, GUDID product info) are valuable for SEO and consumer discovery but should not be the primary monetization strategy.

---

## 3. Data Moat Analysis

### 3.1 Is the Raw Data a Moat?

**No.** MAUDE data (and from May 2026, AEMS data) is entirely public domain. Anyone can download bulk CSVs or query the openFDA API. A motivated competitor with two engineers could have basic MAUDE aggregation running in 4–8 weeks.

### 3.2 What Creates Defensibility?

| Layer | Moat Type | Durability | Notes |
|-------|-----------|------------|-------|
| Raw MAUDE / AEMS data | None | — | Fully public, free to download |
| Entity resolution & data cleaning | Technical | **Weak** | 3–6 months to replicate with engineering effort |
| Aggregated proprietary metrics (severity score, recall risk index, reliability index) | Analytical | **Medium** | Creates switching costs if the market adopts and trusts these metrics as a standard |
| Natural language / AI query layer | UX | **Medium** | Current differentiator; will commoditize in 2–3 years as LLM tools proliferate |
| Workflow integration (VAC, GPO, procurement systems) | Operational | **Strong** | Sticky once embedded in procurement decisions; high switching cost |
| Multi-source data enrichment (UDI + 510(k) + PMA + recalls + MAUDE) | Data | **Strongest** | Requires years of engineering and domain expertise to replicate |
| Network effects / community benchmarks | Network | **Long-term** | If benchmarks are published and cited, creates authoritative moat |

### 3.3 Strategic Implication

The product must be built with **multi-source enrichment** and **workflow integration** as the strategic priorities, not visualization. Visualization is table stakes; the durable business is in the intelligence layer and the workflow embedding.

---

## 4. Market Sizing

### US Serviceable Addressable Market (SAM)

| Segment | Count | Price/Year | SAM |
|---------|-------|------------|-----|
| US Hospitals (VAC purchasing decisions) | 6,000 | $15,000 | $90M |
| Medical Device Importers / Distributors | 500 | $10,000 | $5M |
| Group Purchasing Organizations | 200 | $25,000 | $5M |
| Law Firms (medical device litigation) | 1,000 | $8,000 | $8M |
| **Total SAM** | | | **~$108M** |

### Broader Context

| Market | 2025 Size | CAGR | 2030 Projection |
|--------|-----------|------|-----------------|
| Medical Device Regulatory Affairs | $7.4B | 9.55% | $11.66B |
| Regulatory Intelligence Platforms (all industries) | $2.8B | 11.6% | $7.6B by 2034 |
| Medical Device Recall Management Software | ~$1.5B | ~14% | $2.3B by 2027 |
| Healthcare GPO Market | $7.3B | ~5.6% | — |

**Realistic SOM (Year 1–3):** $500K–$3M ARR for a focused product with effective distribution into the hospital/GPO procurement channel.

---

## 5. What We Have vs. What Is Missing

### 5.1 Current Assets

| Asset | Status | Notes |
|-------|--------|-------|
| 600K+ MAUDE event records (2025 + Jan 2026) | ✅ Built | Entity-resolved, aggregated into Firestore |
| Per-device adverse event stats | ✅ Built | Deaths, injuries, malfunctions, trends |
| Per-manufacturer stats | ✅ Built | Reliability scoring, top devices, event trends |
| Recall risk scoring | ✅ Built | Risk tier: HIGH / MODERATE / LOW |
| Severity score | ✅ Built | Weighted composite per device |
| Natural language search (Claude API) | ✅ Built | NL query → Firestore filters |
| Device comparison (up to 4) | ✅ Built | Side-by-side manufacturer/device comparison |
| FDA Classification enrichment | ✅ Built | Device class, CFR regulation, submission type |
| GUDID product information | ✅ Built | Rx/OTC, MRI safety, sterility, model numbers |
| Event trend charts | ✅ Built | Monthly trend, forecast, severity breakdown |
| CSV export | ✅ Built | Per-device MAUDE data export |
| Firebase App Hosting deployment | ✅ Built | Deployed at maude-safety-dashboard.vercel.app |
| Mobile-responsive UI | ✅ Built | Passes on Android/iOS |

### 5.2 Critical Gaps (to reach B2B procurement market)

| Gap | Priority | Notes |
|-----|----------|-------|
| 2026 MAUDE data refresh | **High** | Only have Jan 1–5, 2026. Need Jan–Apr 2026 data. |
| AEMS API migration | **High** | MAUDE ends May 2026; must migrate data pipeline to AEMS |
| Device-vs-alternative comparison | **High** | "Compare DreamStation vs Resmed AirSense" — core VAC use case |
| Procurement report export | **High** | PDF or Word report for VAC presentation — ECRI's core deliverable |
| User accounts / saved searches | **Medium** | Required for B2B SaaS |
| API access for enterprise customers | **Medium** | GPOs need programmatic access |
| 510(k) / PMA history integration | **Medium** | Approval history for device under evaluation |
| Hospital/GPO pricing & contracting data | **Low** | Not publicly available; requires partnerships |
| International device data (ICIJ, MDR EU) | **Low** | Future expansion |

---

## 6. Strategic Recommendations

### 6.1 Reframe the Positioning

**From:** "Medical device adverse event dashboard for importers"
**To:** "Procurement intelligence platform for medical device buyers — instant ECRI alternative at a fraction of the cost"

### 6.2 Recommended Roadmap

#### Phase 1 — Data & Foundation (1–2 months)
- Migrate data pipeline from MAUDE to AEMS API before May cutover
- Refresh data with Jan–Apr 2026 events
- Build automated monthly data refresh

#### Phase 2 — B2B Product Features (2–4 months)
- Procurement report export (PDF) — the deliverable hospital VAC analysts actually need
- Device-vs-alternatives comparison page — core to device evaluation
- User accounts + saved device lists

#### Phase 3 — Go to Market (3–6 months)
- Target law firms first (fast revenue, low sales cycle)
- Approach medical device importers (original target, familiar need)
- Begin outreach to hospital VAC administrators and GPO analysts
- Consider ECRI-disruption messaging for hospital procurement

#### Phase 4 — Moat Building (6–18 months)
- API access for GPO integration
- Workflow embeds (VAC committee view, approval tracking)
- Expand data enrichment (EU MDR, international recalls)
- Build manufacturer benchmarking report (publishable, creates citation moat)

### 6.3 What to Avoid

- **Pure B2C play:** AEMS free dashboard absorbs this; no willingness to pay
- **Competing with QMS platforms** (Greenlight Guru, Veeva): serves manufacturers, entirely orthogonal use case
- **Trying to replicate Clarivate/IQVIA:** 9-figure businesses with decades of proprietary data

---

## 7. Sources

- [Device Events Software Features](https://deviceevents.com/software-features/)
- [FDA AEMS Launch](https://www.fda.gov/safety/fda-adverse-event-monitoring-system-aems)
- [MedTech Dive — AEMS Coverage](https://www.medtechdive.com/news/fda-adverse-event-monitoring-system-aems/814567/)
- [ASCO Post — AEMS Launch](https://ascopost.com/news/march-2026/fda-consolidates-systems-into-one-cohesive-adverse-event-monitoring-tool/)
- [NESTcc Active Surveillance](https://nestcc.org/active-surveillance/)
- [ICIJ International Medical Devices Database](https://medicaldevices.icij.org/p/about)
- [Greenlight Guru Pricing](https://www.greenlight.guru/quality-pricing)
- [ECRI Value Analysis Workflow](https://home.ecri.org/pages/ecri-value-analysis-workflow-solution)
- [Regulatory Intelligence Platform Market — Dataintelo](https://dataintelo.com/report/regulatory-intelligence-platform-market)
- [Medical Device Regulatory Affairs Market — Grand View Research](https://www.grandviewresearch.com/industry-analysis/medical-device-regulatory-affairs-market)
- [Medical Device QMS Market — Research and Markets](https://www.researchandmarkets.com/reports/6016110/medical-device-qms-software-market-global)
- [TrackMy Implants — MedTruth](https://medtruth.com/articles/medtech/trackmy-implants-app-medical-device-recalls/)
- [SoomSafety — NS Medical Devices](https://www.nsmedicaldevices.com/analysis/soomsafety-medical-device-recalls/)
- [Clarivate Cortellis MedTech](https://clarivate.com/life-sciences-healthcare/medtech/)
- [GlobalData Medical Devices](https://www.globaldata.com/industries/medical-devices/)
- [IQVIA MedTech Fact Sheet](https://www.iqvia.com/library/fact-sheets/iqvia-medtech-global-data-insights-fact-sheet)
- [GPO Market — IBISWorld](https://www.ibisworld.com/united-states/industry/group-purchasing-organizations/5963/)
- [John Snow Labs MAUDE Dataset](https://www.johnsnowlabs.com/marketplace/manufacturer-and-user-facility-device-experience-database/)

---

*Prepared by Forge — Lead Architect, MAUDE Safety Dashboard Project*
*Research conducted April 20, 2026*
