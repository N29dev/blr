# BL:R Wiki
The website root is the wiki. All styles and flows have stable static article URLs. 44 style icons and 33 flow icons are supplied October 2026 in-game screenshots, packed into two 128px-tile WebP sprites. Easter Kaiser has no supplied icon. Rarity labels are from the older Tech Rules roster, not verified current game data. NEL artwork is explicitly marked. Article content lives in content.mjs; mastery practice is browser-local and separate from in-game mastery. Do not invent stats, code validity or patch details. Old /wiki/ routes redirect to the new structure.

## Procedural icons
The icon renderer uses shared CSS and a small palette map in icons.mjs; screenshots are no longer requested. The legacy coordinate attributes in static HTML are ignored/removed on enhancement. Master-rarity borders rotate using a CSS transform, only while visible and when motion is allowed. No per-frame JS or extra font assets. Reference sprite files are retained for old cached versions. Palette values approximate the supplied screenshots; Easter Kaiser uses a neutral silver approximation.

Icon typography uses the observed line breaks from the reference tiles, a single local-font canvas measurement per distinct line, and relative container sizes; no font downloads, layout polling, resize handlers or per-frame JS are added.

UI maintenance: first-paint icons are embedded as small semantic markup; browser enhancement measures local font widths once. Versioned shared assets avoid mismatched CSS and module caches. Native cross-document transitions use opacity only and preserve normal navigation; mobile section navigation is a native disclosure. Search/filter state is URL-based. The dated roster and moderation snapshot remain separate from unverified game mechanics.

## Official update archive (reviewed import)

The source is the supplied Discord update-channel exports, 900 unique messages from 2024-11-24 through 2026-11-14 UTC. The public archive is a **curated historical archive**, not a full mirror. Release claims and dates are from the announcements; they do not establish current values or active codes.

- Review new local JSON exports: `node wiki/import-discord.mjs path/to/export.json > review.local.json`. Never commit raw exports or review queues (they may include personal metadata or conversations).
- Edit only the reviewed, paraphrased entries in `wiki/announcement-data.mjs`; preserve source message IDs, dates, exact code and ability names, and mark pending or superseded claims appropriately.
- Generate route-specific JSON: `node wiki/build-announcements.mjs` and validate with `node wiki/build-announcements.mjs --check`. Existing tests compare generated records against the curated source.
- The homepage and directory do not download the patch corpus. Updates load the compact archive; each style/flow loads only its own record file. Codes deliberately carry unverified redemption status.
- Missing ability conditions, cooldowns, flow effects and active-code state are not inferred. Keep the tech moderation snapshot distinct from updated wiki rarity data.

## Manually tested abilities

Private editor: `/wiki/admin/`. Unlock with the existing `TECH_ADMIN_KEY` (not stored in localStorage). Every edit adds a D1 revision in Glutony; archive hides the tested record without deleting history. Use the actual test date, leave unknown stats blank, and keep announcements separate. Later linked release/balance/patch dates flag a **possible** need to retest, not confirmed changes. The public site reads only the selected style's tested data. Requires the Glutony Wiki API and migration 0011.

### Expanded chronological review

Both exports were screened message by message (900 unique IDs). The keyword triage returned 491 candidate messages, 369 context/media messages and 40 empty/ping-only messages. Category flags overlap and do not establish whether a feature shipped. The expanded curated data references 178 distinct original messages; the remaining candidates are not automatically treated as facts. Some announcements rely on outside documents (12 messages link to Google Docs) or attachments and embeds (65 messages); their unseen content is not inferred. McNagi and Easter Kaiser lack a supported complete ability list in the supplied text. Historical names, conditions and balances are not assertions about the current game. Manually tested D1 values remain untouched.

Run `node wiki/audit-discord.mjs path/to/export1.json path/to/export2.json > audit.local.json` to screen every message, detect unreferenced candidates and verify all curated source IDs and dates against the original exports. This local-only audit excludes raw text and author metadata.
