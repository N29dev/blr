# BL:R Wiki
Static GitHub Pages foundation. The roster is imported from tech/data.js so style names, rarity groups and NEL grouping have one source. It is a dated community snapshot, not a current official list.
## Editing
Add reviewed records by style slug in content.mjs. Article arrays: overview, evolutions, progression, mastery, counterplay, history (each {title,text,source,verified}); abilities additionally use name, kit, input, cooldown, condition, range, iframes, source, verified. Missing properties display as unverified. PATCHES is an array of {title,text,source,verified}; record the actual patch date in title/text, do not substitute the verification date.
Keep facts and community observations separate. Never infer that unlisted tech is permitted. Do not copy unlicensed articles. Run node --test wiki/content.test.mjs before publishing.
Mastery checklist is local browser state; it is not synced to Roblox or D1. Future editorial submissions or API integration should use moderation and versioned records.
Creator Studio is intentionally secondary and remains at /tools/ for compatibility; a separate hostname needs deployment and cross-origin checks.
