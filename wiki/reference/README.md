# Ability behavior reference

This is the saved, searchable reference for future BL:R wiki reviews, not a copy of the game's Lua.

- [ability-behavior.json](./ability-behavior.json): 361 moveset records, 376 implementation references (44 datasets and Easter Kaiser alias). Search by style slug, ability name, mastery/kit or source start line.
- [derived-kits.mjs](../derived-kits.mjs): website data, selector and implementation references.
- [ability-sequences.mjs](../ability-sequences.mjs): schematic preview stages and branch rules.
- [sequence-view.mjs](../sequence-view.mjs): presentation only (normalized field, perspective camera, humanoids, ball height, shadows and trails).
- [flight-3d.mjs](../flight-3d.mjs), [source-motion-review.mjs](../source-motion-review.mjs): numerical component models.

## Source identity

Client snapshot: 26 November 2026. Original export: BLR_AbilitiesClient(2).txt, 53,305 lines. SHA-256: 34cf84a79fe0b7efcf040123dbb560f56098416002a30e45a65aab63b4c9e069.

The raw export is not committed. Source ranges use one-based line numbers into that snapshot. If an export changes, do not reuse line references without checking the hash.

## Reading an ability

1. Identify the style, kit, mastery and input, then read selector conditions.
2. Read the individual implementation references. The collected checks may belong to separate branches, not one AND condition.
3. CHECK and OBSERVED entries summarize the existing client review. PREVIEW entries are presentation-level pseudocode, not an exact server algorithm. If a phase is missing, inspect that source range rather than assuming an action.
4. Distinguish an ability's setup, target interaction, server response, possession change, follow-up, cleanup and its optional movement/flight component. Do not treat a power parameter or the name "shot" as proof that every branch shoots.
5. Keep configured parameters distinct from measured distance, timing, hitboxes and protection.
6. Record gameplay measurements separately; never publish a guessed hitbox or acceptance condition as verified.

## Maintenance

The JSON is a checked-in snapshot and is not requested by the public website. Keep it synchronized when changing the selector data or preview logic. Review source order and conditions before promoting a schematic entry to a verified one. Existing server-response-unresolved and schematic-sequence-not-fully-verified status values are intentionally conservative.

Use a source range to reopen only the relevant module instead of scanning the entire export again. For an ability with multiple variants, keep every variant distinct rather than combining their parameters.
