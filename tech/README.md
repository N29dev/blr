# BL:R Tech & Bug Directory

## Help and appeals (prioritized on the public page)

The first panel on [the tech directory](https://blr.n29.kz/tech/) is for players who were banned for bug abuse or need a ruling:

- [Join the BL:R support server](https://discord.gg/dgV4p83EHA) — required before opening support channels.
- [Open bug-abuse ban appeals](https://discord.com/channels/1313206300813033532/1313206301232463980) — appeal a ban, whether the player knew about the bug or not; approval is not guaranteed.
- [Open tech inquiry tickets](https://discord.com/channels/1313206300813033532/1348650686597955584) — include a clip, reproduction steps, and gameplay impact.
- [Main Blue Lock: Rivals Discord](https://discord.gg/bluelockrivals) — the community server, distinct from the support server.

These are direct URLs supplied by the site owner. Staff announcements and current moderation decisions supersede this unofficial catalog.

## Public search page + private admin

- **Public:** [blr.n29.kz/tech/](https://blr.n29.kz/tech/) — search a style name, select that style, see its allowed, disallowed and punishable techniques; follow real YouTube demonstration links.
- **Private:** [blr.n29.kz/tech/admin/](https://blr.n29.kz/tech/admin/) — owner-only add/edit/remove and YouTube link management. Type a new style name in the editor's **Styles** field if it's missing from the catalog. You may type `NEL Nagi` or `Nagi`; both save as `Nagi`.
- The static source below is the original moderation snapshot, while the public page merges additional edits from the Glutony Worker at `GET /api/tech` (Cloudflare D1). The original snapshot is still shown if the Worker is unavailable.
- For setup, apply Glutony D1 migration `0004_tech_rules.sql` and configure a **distinct** `TECH_ADMIN_KEY` Cloudflare Secret of at least 32 characters. [Full deployment instructions](https://github.com/N29dev/Glutony#blr-tech-rules-admin-editor). Never put admin keys in GitHub or share them in chats.
- The key stays only in the admin tab's memory. It is cleared on lock/reload and never persisted in browser local storage. The Worker enforces auth on every admin request; CORS alone is not an authentication mechanism.

The admin route can edit or hide any listing, including source entries, but cannot alter the static source snapshot. If your rule source changes, update both this index and its policy links carefully.



**Live path after GitHub Pages deploy:** https://blr.n29.kz/tech/

This is an **unofficial community-maintained transcription** of the moderation rules supplied on November 2, 2026. It is **not an official, automatically synchronized moderation database**. Staff may revise rules; their current instructions override this page.

The page includes the supplied allowed techs, disallowed techs, and separately listed examples of punishable bugs. The style catalog now uses the site owner's exact rarity assignments: **Rare (5), Epic (5), Legendary (6), Mythic (7), World Class (3), Master (3), Other (Bunny and Igaguri), and Limited (14)**. Base and NEL versions are intentionally treated as **one style entry**. Special-named event styles stay in Limited, while Bunny and Igaguri remain under Other. A style with no listed tech is **unclassified**, not automatically allowed.

## Add a YouTube video in 30 seconds

1. Upload a short demonstration clip to YouTube.
2. Open **[tech/videos.js](videos.js)** on GitHub and click Edit.
3. Find the tech's ID in **[tech/data.js](data.js)** or copy the tech's share link on the page (the \`tech=...\` URL parameter is its ID).
4. Add ONE entry to the exported \`VIDEOS\` object:

\`\`\`js
export const VIDEOS = {
  'nagi-delay-trap': 'https://www.youtube.com/shorts/EXAMPLE123',
  'nagi-moonwalk': 'https://youtu.be/EXAMPLE123',
};
\`\`\`

Replace \`EXAMPLE123\` with your real 11-character YouTube video ID. A full YouTube Shorts URL, regular watch URL, or \`youtu.be\` URL works. The browser validates the URL before showing **Watch example ↗**. If there's no link, the page says **Clip not added yet**. **Never publish a sample or made-up video link** as a real example.

The same tech can appear under multiple styles when the policy explicitly mentions both. It has **one video mapping** shared across those styles.

You do **not** need to edit HTML, JavaScript, CSS, or Glutony to add a clip.

## Edit policy entries

Edit [tech/data.js](data.js). Each entry is:

\`\`\`js
tech('unique-id','Exact technique name','allowed',['Nagi']),
tech('another-id','Exact technique name','disallowed',['Reo']),
tech('bug-example','Exact bug name','punishable',['General / Cross-style']),
\`\`\`

An optional fifth argument also accepts a YouTube link, but using \`videos.js\` is preferred. Do not label a tech "allowed" merely because it's absent from the published policy. Newly reported techs should remain unclassified until reviewed by BL:R staff. Avoid attributing generic techniques to a specific kit without evidence.

Style groups and variants are in the \`STYLE_GROUPS\` list. The initial names are a **broad, manually compiled roster**, not a guarantee of completeness or current rarity. Add new kits to the appropriate group as the game updates.

## Moderation policy and reporting

- [Moderation FAQ cited by the user](https://discord.com/channels/1304535758899777626/1364020867084062752/1559305710930759701)
- Tech support channel ID (copy in page): \`1348650686597955584\`
- Appeal channel ID (copy in page): \`1313206301232463980\`
- [Cheater and bug-abuse reports](https://blox.report/bluelock)

The "all forms of bug abuse are not allowed" principle is shown prominently. Examples involving an unintended speed boost, teleportation, flight, shot-range/power increase, automatic goals, and gameplay-affecting emote bugs can be punishable even if not separately listed.

The public site fetches only the Glutony tech-edit overlay when available. No Roblox account or private token is needed to browse. Clips are never embedded or autoplayed; visitors may open them on YouTube.

## Local verification

\`\`\`bash
cd tech
node --test data.test.mjs
\`\`\`

Tests validate unique IDs, full style catalog, classifications, base/NEL separation, representative bans, and safe YouTube host restrictions.

The page runs as a static ES module via GitHub Pages. For a local browser preview, serve the repository root (do not open \`index.html\` using \`file://\`) because absolute /asset paths and ES modules require an HTTP server.

## Source notes / roster research

- [Blue Lock: Rivals community style roster](https://bluelockrivals-roblox.fandom.com/wiki/Styles) — some headings/rarities may lag current patches.
- [BL:R styles list (Nov. 1, 2026)](https://blue-lock-rivals-codes.com/styles/) — baseline permanent and limited variants.
- [BL:R late-October update chronology](https://gamingroute.com/blue-lock-rivals-codes/) — Niko, Snuffy, Sendou and Zantetsu mentioned in 2026 event lists.

**The moderation classifications themselves come solely from the rules provided for this page, not from third-party tier lists.**
