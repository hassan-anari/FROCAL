# Official Telegram WebApp bridge snapshot

Source: https://telegram.org/js/telegram-web-app.js
Retrieved: 2026-10-14 over verified HTTPS. The upstream URL is mutable and has no release tag.
This file is an **unmodified byte snapshot**, pinned by content, not a claimed upstream package version.
SHA-256: `124bdff7ba3fe86c8ba5143467afec21e020405e74abdb92cfdda6c0ee3b5908`

Review: official WebView bridge and WebApp APIs; hash LaunchParams parsing, same-tab
`__telegram__initParams` recovery, native Android/iOS/desktop transports, version-gated
fullscreen/safe-area APIs. No automatic external SDK fetch; the optional serverless API
fetch is only invoked by a consumer (Dalexio does not invoke it). Telegram Web iframe
origin checks and native transport code are retained. No auth verification is replaced.

Update procedure: fetch the official URL over verified HTTPS into a temporary file;
review its diff (transports, origin checks, storage, new network/code execution paths),
run launch and layout tests plus actual device validation, compute SHA-256, rename the
snapshot and update index.html SRI and this record in a reviewed PR. Never overwrite a
published content-pinned asset. No separate upstream license notice was present in this
served source; retain it verbatim and review upstream distribution terms on updates.
