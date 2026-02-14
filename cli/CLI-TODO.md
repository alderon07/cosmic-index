# CLI TODO

Tracks `cosmic-index` CLI feature work.

## Done

- [x] Add hidden compatibility aliases:
  - `cosmic-index search close-approaches`
  - `cosmic-index search fireballs`
- [x] Add `completion` command support (`bash`, `zsh`, `fish`, `powershell`).

## Next

- [x] Add `compare` command:
  - `cosmic-index compare exoplanets <id1> <id2> [id3]`
- [x] Add retry/backoff support for `429` / `503` with `Retry-After`.
- [x] Add `--columns` option for table outputs.
- [x] Add `--no-trunc` option for long fields in table outputs.

## Future

- [ ] Migrate API types/client to OpenAPI-generated code (`oapi-codegen`).
- [ ] Add local config file support:
  - `~/.config/cosmic-index/config.yaml`
- [ ] Add watch mode for saved queries (`watch` command).
- [ ] Add Homebrew tap automation workflow.
- [ ] Add richer integration tests against a running local API server.
