# Downloader provider test report

Test date: 2026-11-04. Public sample inputs were used: YouTube `dQw4w9WgXcQ` and TikTok `6718335390845095173`.

## Working providers

KnightBot returned HTTP 200 with a successful response containing `download`, `dl_url`, title, thumbnail, and metadata. The returned MP3 was fetched successfully with HTTP 200 and a 3.4 MB audio response. It is now the first provider used by `.play`.

TikWM returned HTTP 200 with a successful response containing `play`, `hdplay`, `wmplay`, metadata, and a TikTok title. The returned HD MP4 was fetched successfully with HTTP 200 and a 2.95 MB video response. It is now the first provider used by `.tiktok`.

Apix’s xjx-compatible endpoint was tested and returned HTTP 429 because the configured shared/default key had reached its daily limit. The correct endpoint and parameter format are integrated as the second `.play` provider; it will work after the key quota resets or `APIX_API_KEY` is replaced with a personal key.

## Providers not enabled as primary providers

The Apiskeith video endpoint returned HTTP 404 (`Application not found`). Siputzx TikTok returned HTTP 503 (`All nodes failed`), and Siputzx Instagram returned HTTP 404 (`Route not found on upstream nodes`). The Izumi and Yupra hosts failed DNS resolution. Ssstik returned a Cloudflare HTTP 403 challenge. These remain unused rather than causing avoidable delays in the bot.

## Code changes

`utils/api.js` now contains KnightBot, xjx-compatible Apix, and TikWM adapters. `commands/media/play.js` tries KnightBot, then Apix, then yt-dlp and the existing fallbacks. `commands/media/tiktok.js` tries TikWM before the existing providers.

The bot was restarted successfully with the updated commands. Its WhatsApp connection message was sent, and the configured newsletter autofollow actions completed.
