# Spec Delta

## MODIFIED Requirements

### Requirement: Commands reject options they do not take

A command SHALL fail with an error naming the option when it is invoked with an option outside its documented synopsis, rather than ignoring the option. The rejection SHALL apply at least to the value and boolean options that are specific to another command, and `--out` SHALL be accepted only by `adrkit graph`.

#### Scenario: tree rejects --out

- **WHEN** `adrkit tree <name> --out out.html` runs
- **THEN** the command exits non-zero with an error naming `--out` and writes no file

#### Scenario: list rejects a graph filter

- **WHEN** `adrkit list --tag frontend` runs
- **THEN** the command exits non-zero with an error naming `--tag` instead of ignoring the filter

#### Scenario: graph still accepts --out

- **WHEN** `adrkit graph --html --out map.html` runs
- **THEN** the map is written to the given path

#### Scenario: an option belonging to another command is rejected on decide

- **WHEN** `adrkit record "<title>" --raised-by human --decided-by human --tools claude` runs
- **THEN** the command exits non-zero with an error naming `--tools`
