# Performance investigation — 17 November 2026

The investigation found repeated browser rendering on the contractor and inspector pages, and repeated opening of the same spreadsheet within server requests.

## Changes

- Preserve job rows, map markers and the inspector job dropdown when their data has not changed. Selecting a different job updates the selection without recreating every marker and row.
- Rebuild when the data array, filters, coordinates, explicit pole groups, permissions or workflow status change. Signing out clears the view caches.
- Count WBS membership in one pass instead of filtering every job again for every WBS option.
- Reuse the Spreadsheet handle only within one Apps Script execution. Every request still authenticates and reads current rows; no Sheet row data is cached between requests. Existing locks and write checks remain in place.

## Reproducible local measurements

Run `node patrol-google/bench-work-render.cjs` from the repository root. The browser fixture contains 1,000 jobs, opens jobs 10 times on each page, mocks Google RPC responses and blocks map tile downloads. The baseline was commit `60d4d2d22a20eab4fec8be45a4d0b20108ce910d`.

| Page | Baseline markers created | Updated markers created | Baseline browser time | Updated browser time (sample) |
| --- | ---: | ---: | ---: | ---: |
| Contractor | 10,000 | 0 | 2,234 ms | 163 ms |
| Inspector | 10,000 | 0 | 2,144 ms | 108 ms |

Timings vary between runs and describe repeated opening after initial rendering, not first load or end-to-end production latency. The fixture also checks cache invalidation after delivery, inspection, coordinate editing, filtering and replacement data.

`node patrol-google/test-request-book.cjs` verifies one Spreadsheet open across the five sheets used by `listPatrol`, fresh row reads, execution reset and authorization.

Actual Apps Script, Google Drive image upload/download, Google Sheets latency, mobile hardware and network performance have not been measured in the live deployment. Slow first load or uploads may still require timings from that deployment.

## Apply

Replace `Code.gs` and `Index.html` in the existing Apps Script project, then update the existing deployment to a new version. The web app URL and APK remain the same.
