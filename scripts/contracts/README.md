# Pinned B1 Bootstrap contract harness

Reviewed backend: `hassan-anari/WEDCAL`, Draft PR #26,
`cadc257fbed5c6bf36e31c767e70f4cd430e350d`.

`backend-bootstrap-schemas.py` and `backend-api-errors.py` are byte-exact snapshots
of `apps/rewards/schemas.py` and `apps/core/api_errors.py`. The generator verifies
their Git blob hashes, then imports their actual Django Ninja Schema classes using
the exact Django/Ninja/Pydantic versions in that commit's uv.lock.

Only standalone DTOs are loaded. Django settings contain no application models,
database, API origin or bot credential. Validation/serialization does not authenticate,
provision players, call HTTP or connect to a database. Fixture values are synthetic;
the progression numbers are not an approved production economy configuration.

```sh
python -m venv work/contract-venv
work/contract-venv/bin/python -m pip install -r scripts/contracts/requirements.txt
work/contract-venv/bin/python scripts/contracts/generate_bootstrap_fixture.py --check
```

Without `--check`, the script regenerates Bootstrap/error JSON fixtures, the exact
backend JSON schema and source pin. Frontend Vitest imports those fixtures, validates
them through Zod, and compares retained fields and normalization. Playwright uses
these same serialized values through an intercepted, GET-only API. CI independently
recreates/checks the fixtures before running all frontend validators and tests.

This verifies the pinned DTO pairing; it is not a backend service, HMAC, PostgreSQL,
staging or actual Telegram WebView test. Update source pins only after review of a
named backend commit; never silently regenerate against mutable main.
