# heic-to 1.6.7

HEIC/HEIF decoder, loaded on demand by `src/services/assistance-photo.js` only
when the browser cannot open the original photo. Conversion runs in the browser;
no photo is sent to an external conversion service.

- Project and source: https://github.com/hoppergee/heic-to
- Original package (including source): https://registry.npmjs.org/heic-to/-/heic-to-1.6.7.tgz
- Vendored file: `dist/csp/heic-to.js`, copied without modifications. This build
  uses a Web Worker and does not require `unsafe-eval`.
- npm package integrity: `sha512-GCPYNl86u6eZ7mr2aa+uQB+PrQOVKSBYfH8esovr8kh2c6EYQSDYIJ6uhXSmM2hPC8PdBVJ/Trn0jnfM9H9gvg==`
- License: LGPL-3.0-or-later; see the original `LICENSE` alongside this file and
  `COPYING` for the GNU GPL terms referenced by that license.

Keep this directory (including license notices) in static deployments. There is
no build step or CDN dependency. To update, copy the same CSP distribution from
an explicitly pinned npm release and repeat a real HEIC conversion check.
