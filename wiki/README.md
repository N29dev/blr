# BL:R Wiki
The website root is the wiki. All styles and flows have stable static article URLs. 44 style icons and 33 flow icons are supplied October 2026 in-game screenshots, packed into two 128px-tile WebP sprites. Easter Kaiser has no supplied icon. Rarity labels are from the older Tech Rules roster, not verified current game data. NEL artwork is explicitly marked. Article content lives in content.mjs; mastery practice is browser-local and separate from in-game mastery. Do not invent stats, code validity or patch details. Old /wiki/ routes redirect to the new structure.

## Procedural icons
The icon renderer uses shared CSS and a small palette map in icons.mjs; screenshots are no longer requested. The legacy coordinate attributes in static HTML are ignored/removed on enhancement. Master-rarity borders rotate using a CSS transform, only while visible and when motion is allowed. No per-frame JS or extra font assets. Reference sprite files are retained for old cached versions. Palette values approximate the supplied screenshots; Easter Kaiser uses a neutral silver approximation.

Icon typography uses the observed line breaks from the reference tiles, a single local-font canvas measurement per distinct line, and relative container sizes; no font downloads, layout polling, resize handlers or per-frame JS are added.

UI maintenance: first-paint icons are embedded as small semantic markup; browser enhancement measures local font widths once. Versioned shared assets avoid mismatched CSS and module caches. Native cross-document transitions use opacity only and preserve normal navigation; mobile section navigation is a native disclosure. Search/filter state is URL-based. The dated roster and moderation snapshot remain separate from unverified game mechanics.
