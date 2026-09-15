## 1. Format contract

- [x] 1.1 Add `decided-by` to `FRONT_MATTER_ORDER` between `date` and `created` in `src/core/adr.ts`, add the parsed `decidedBy` property to `AdrRecord`, and parse the value as exactly `human` or `machine`; verify with a parser test that round-trips both values
- [x] 1.2 Verify the parser fails a record whose `decided-by` is any other value with a format error naming the two accepted values

## 2. Environment probe

- [x] 2.1 Create `src/core/execution-env.ts` exporting `detectDecidedBy(env)`, returning `machine` when any known agent session marker is present and `human` otherwise; verify with a unit test that covers each marker and the empty environment
- [x] 2.2 Verify the probe is a pure function of the mapping it receives and imports nothing from `process.argv`, so tests never mutate the real process environment

## 3. Validation

- [x] 3.1 In `src/core/validate.ts`, require `decided-by` on accepted and superseded records and report a missing-field issue the way `created` is reported; verify with tests that both statuses fail without it and pass with either value
- [x] 3.2 Reject `decided-by` on a `proposed` draft in `validateDraft`; verify the draft test fails with the field present and passes once it is removed
- [x] 3.3 Verify `adrkit validate` on a repository whose accepted record lacks the field leaves the record file byte-identical on disk

## 4. Lifecycle writers

- [x] 4.1 Stamp the detected value in `decisionTemplate` and thread an environment parameter through `decideCommand` (defaulting to `process.env`) so a test can drive both branches; verify `adrkit decide` emits `decided-by` between `date` and `created`
- [x] 4.2 Stamp the detected value at promotion in `proposalToDecision` and thread the same parameter through `acceptCommand`; verify a draft that declares `decided-by: human` promoted in a machine-marked environment yields `decided-by: machine`
- [x] 4.3 Verify `adrkit propose` writes no `decided-by` key in the draft front matter
- [x] 4.4 Verify `adrkit supersede` leaves the retiring record's `decided-by` byte-identical even when the supersede runs with a different detected origin, and that the replacement carries its own independent value
- [x] 4.5 Verify `stampLifecycleMove` still drops non-canonical keys, and that the removal of a field from the canonical set is surfaced by `validate` instead of silently ignored

## 5. CLI surface and mirror sync

- [x] 5.1 Verify every lifecycle command rejects an origin-naming option such as `--decided-by human` with the parser's unknown-option error rather than accepting it
- [x] 5.2 Update the seven `skills/adrkit-*/SKILL.md` files and the mirrored templates in `src/core/tool-integrations.ts` together, and verify `test/integrations.test.ts` passes with no drift
- [x] 5.3 Run the full gate `npm test` and `npm run typecheck` and confirm both pass with no snapshot or fixture left un-updated

## 6. Documentation and release

- [x] 6.1 Document the field, its canonical position, the stamping rules, and the trust boundary in `docs/record-format.md` and `docs/zh/record-format.md`, stating in one place that the value is inferred, weaker than `date` and `commit`, and defeatable by masking, wrapping, or later edits; verify both languages carry the same facts
- [x] 6.2 Update `README.md` and `README.zh.md`, plus the record-format copies under `site/`, and verify the site build passes with `cd site && npm run build`
- [x] 6.3 Add a changeset whose body states that pre-existing accepted records fail validation until a value is supplied and that the tool will never write one; verify `npx changeset status` recognizes it
- [x] 6.4 Re-run `openspec validate add-decided-by-provenance --strict` and confirm the change reports no issues before archiving
