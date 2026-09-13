# Measurement contract — 2026-09-13.1

The portfolio and simulation pages share a consent-gated measurement adapter. The portfolio's production hits use `tsisakurai`. Lab pages, localhost, non-production Launch environments and `?ts_qa=1` use `egeo1xxtsakurailab`. The suite is chosen with `s.sa()` before tracking begins.

This source change requires the matching Adobe Tags library. `analytics-tracker.js` is the Analytics extension's custom setup code, executed after extension settings. The initial page view is owned by the single Analytics Fire rule: DOM Ready → clear/set variables and `tsMeasurement.connect(s)` → send page beacon → clear variables. `doPlugins` releases queued interactions only after the initial page hit starts. The obsolete catalog PV, pageName, PDF Download, addNewItem and Google Ads test rules are disabled. Rule component sequencing is enabled. Activity Map and automatic download/exit tracking are disabled because explicit site events own the links.

## Consent and data

No Launch script is loaded before explicit consent. The choice expires after 180 days. Declining after granting consent reloads the page to stop previously loaded SDKs. The adapter drops events while consent is absent and does not replay pre-consent activity. PDF viewing is a separate, user-initiated functional service; callbacks respect measurement consent.

The data layer accepts bounded attributes only. It never copies form fields, cookie values, arbitrary PDF URLs or complete SDK callback objects. Analytics page URLs and referrers omit query strings and fragments. Unknown paths use a fixed `not-found` ID. Portfolio acquisition uses an explicitly supplied, bounded `cid` code; internal Lab navigation never populates acquisition campaign. Do not put personal data into campaign codes.

## Analytics variables

All eVars below are text, enabled, last allocation, hit expiration.

| eVar | Definition |
|---|---|
|151|Page group|
|152|Event name|
|153|Section|
|154|Placement|
|155|Destination|
|156|Scroll depth|
|157|Measurement version|
|158|Synthetic traffic|
|159|PDF document|
|160|Virtual route|
|161|Environment|
|162|PDF event|

| Event | Definition |
|---|---|
|151|Measured page views|
|152|Navigation clicks|
|153|Email intent clicks|
|154|LinkedIn clicks|
|155|Section views: visible for at least one second|
|156|Scroll milestones: 25/50/75/100 percent of scrollable distance|
|157|Outbound clicks|
|158|PDF download link clicks|
|159|PDF interactions|
|160|Lab scenario events|
|161|Engaged visits: 30 seconds while visible and at least two sections, once per visit|
|162|Measurement errors: reserved for bounded diagnostic events|

Events are counters. Event 161 is serialized once per visit. Email and LinkedIn clicks do not mean a message was submitted, delivered or received. Section/depth events are once per page. Lab fixture purchases use SKU `LAB-SKU-001`, quantity 1, JPY 19800 and a stable session order ID. Repeated purchase clicks are suppressed. These are simulated orders, never portfolio conversions. Lab UI inputs are local demonstrations, not literal payload specifications.

## Target

Target's rule is limited to consented visits to the production portfolio hostname, excluding `ts_qa=1`. Lab and development traffic do not populate its production profile. The bootstrap sets `bodyHidingEnabled:false` and a 1500 ms timeout before Launch. Default portfolio content remains visible. No experiment is automatically activated by the site code; an A4T experiment needs separate activity, environment and reporting validation.

## PDF

The PDF SDK loads on explicit viewer action. Native auto-Analytics is disabled (`sendAutoPDFAnalytics:false`). Only the site's callback adapter sends allowed interaction types and fixed document IDs. Selected text, searched text, link destinations and arbitrary PDF URLs are omitted.

## Local checks

- `node tests/measurement.test.cjs`: nine focused mocked-SDK behavior tests.
- `python3 tests/check-syntax.py`: script syntax, including inline scripts.
- Serve the repository locally; localhost selects the development Launch library.

Mock tests and a successful library build do not prove successful HTTP collection or processed reporting. Validate actual browser requests, payloads, response status, then the matching report suite and saved Workspace project before production release. Avoid adding unrelated unpublished resources to a Tags library.
