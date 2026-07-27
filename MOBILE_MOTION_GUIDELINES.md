# Mobile Motion Guidelines

## Product target
Dalexio Mini App is designed for Telegram mobile WebViews first. Desktop is only a development preview.

## Allowed for primary animation
- `transform`
- `opacity`

## Avoid in live animation
- animated `filter` / blur
- large `backdrop-filter`
- animated layout height or `height: auto`
- long-distance movement
- simultaneous animation of many large surfaces

## Timing
- Tap response: 120–160ms
- Tab: 180–220ms
- Page: 220–260ms
- Sheet or drawer: 240–300ms
- Cinematic moments: up to 760ms, used sparingly

## Persistent animation
Only small or isolated elements may animate permanently. Pause ambient animation while a modal is open or the WebView is hidden.

## Quality bar
Motion must feel soft through easing and short settling movement—not through expensive live blur.
