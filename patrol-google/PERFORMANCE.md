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

## Growing photo collections

History now renders 25 jobs per page with controls above and below the list. Changing search criteria or work type returns to page one; deletions clamp the current page. The map and the history-based report use the complete filtered set. The history report also follows the selected WBS/Patrol type and year.

The existing 1,100-pixel longest-side JPEG compression, authorized Drive thumbnails, load-on-scroll galleries and on-demand full images are retained. Reports still fetch full images when requested so printing does not depend on scrolling.

Photo RPCs now share a maximum of three concurrent requests. Thumbnail requests for multiple photo kinds in the same job are combined, including repeated waiters. A shared visibility observer releases removed galleries. Signing out cancels waiting requests and prevents old responses from filling new account galleries or refilling the persistent cache.

The memory cache is limited to eight sets and approximately 16 MiB of image-string data. The device cache is limited to approximately 64 MiB of image-string data as well as the existing 300 photo-set / 40 map-page counts. The oldest entries are removed first. Its version-2 index stores sizes alongside timestamps, so eviction reads metadata rather than every photo blob. Upgrading clears only this disposable device cache; original Drive photos, Sheet rows and work drafts are untouched. Photo loading falls back to the network if device storage is unavailable.

Validation: all `test*.cjs` scripts, `check-history-pagination.cjs`, `check-history-photos.cjs`, `check-photo-capacity.cjs` and `check-photo-loading.cjs`. These use local browser fixtures and simulated Google APIs, not a live deployment.

For this photo-capacity update, replace `Index.html` and publish a new version of the existing deployment; no APK rebuild or Sheet migration is needed. Server-side row pagination, archive workflows and a storage-provider migration are not part of this update.
