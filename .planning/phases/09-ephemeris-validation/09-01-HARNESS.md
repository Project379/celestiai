# §9.1 — Harness validation semantics and Node-validation scope

**Opened:** 2026-04-20
**Status:** companion doc to `09-01-PRECISION-FLOOR.md` and `09-01-TEST-CASES.md`. Low-traffic — read when you need to understand what §9.2 is actually measuring, not what's passing.

## Scope of this doc

Documents the semantic distinction between different kinds of "pass" a test case can produce and the explicit scope of Mean Node validation. Complements:

- `09-01-PRECISION-FLOOR.md` — locked threshold values, precision-floor evidence, doc-drift tracker
- `09-01-TEST-CASES.md` — test-case list and scope boundaries
- `packages/astrology/test/validation/README.md` — harness code layout
- `packages/astrology/test/validation/reference-data/README.md` — reference-data protocol

This doc does **not** duplicate thresholds, case data, or code-layout information; it adds the epistemic layer that should accompany any §9.2 result reporting.

---

## §9.2 validation semantics — tiered by reference source

**Planet/Moon validation:** correctness against physical reality, anchored on **JPL Horizons**. A Jupiter or Moon threshold-pass means `sweph`'s Moshier-mode output matches the physical position of the body as JPL Horizons reports it, to arc-second tolerance for planets and ~3″ for Moon.

**Mean Node validation:** implementation self-consistency within the same polynomial model, anchored on an independent **Meeus Ch. 47 polynomial** implementation of ELP2000-85's secular mean-node formula. A Node threshold-pass means `sweph`'s polynomial code is transcribed/implemented correctly — it matches the same formula when the formula is implemented independently.

**The two share a sub-round and a tiered threshold structure but measure different things.** A "pass" for Node is weaker than a "pass" for Jupiter in an epistemic sense. Any future reader reporting §9.2 results — whether for internal review or external communication — should preserve this distinction.

---

## Node validation — explicit scope

**Scope of Node validation:** this check compares `sweph`'s Mean Node output against an independent implementation of Meeus Ch. 47's polynomial for ELP2000-85's secular mean node. Passing means `sweph`'s polynomial code is transcribed/implemented correctly. Passing does **NOT** validate the polynomial's agreement with physical reality — the underlying ELP2000-85 model's ~20″ fit to lunar laser ranging observations is trusted, not tested. Unlike the planet/Moon checks (which anchor on JPL Horizons, a physical-reality reference), this is a **code-path integrity check against the same mathematical formula `sweph` uses**.

**Why this is the right scope for §9:**

The stated worry for the ephemeris workstream is "the astrology math is wrong" in a way users can't recognize as wrong. The realistic failure mode for Mean Node is not "the ELP2000-85 polynomial is physically wrong" (that's settled science with decades of observational support); it is "our implementation of the polynomial silently disagrees with the reference polynomial due to a miscopied coefficient, wrong time epoch, off-by-one in centuries-from-J2000, or similar transcription bug." The Meeus-polynomial check catches exactly that failure class.

Extending Node validation to "physical reality" would require an independent lunar theory unrelated to ELP2000-85 — and no such theory at comparable precision is publicly implemented. This is accepted as a scope bound, not a gap.

**Implementation placement:** the Meeus polynomial implementation lands as part of the harness scaffold in §9.2, inline in `packages/astrology/test/validation/` (file TBD at implementation time). Not a network fetch, not a separate reference tool, not per-case reference data. Per-case reference-data `.ts` files omit the `northNode` entry from their `planets.jpl` array for this reason — see `packages/astrology/test/validation/reference-data/README.md § Mean Node — inline-reference asymmetry`.

---

## Reporting convention

When reporting §9.2 results (in a planning doc, commit message, PR description, or status update), preserve the semantic tier:

- **"Planet X passes / fails vs JPL Horizons"** — physical-reality check.
- **"Moon passes / fails vs JPL Horizons"** — physical-reality check.
- **"Mean Node passes / fails vs Meeus Ch. 47 polynomial"** — code-path integrity check against the same ELP2000-85 formula `sweph` uses.

Avoid shortcuts like "all 11 bodies pass" that flatten the tier — they lose the epistemic distinction a reviewer needs to interpret the result correctly.
