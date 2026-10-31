# AT AI MOBIL — Android integration branch

This branch is a staging area, **not a released APK**.

Existing APK assets verified:
- `assets/node/public/classic/app.js`
- `assets/node/public/at-ai-app-v142.js`
- `assets/node/api/tjk-son800-v1.js`
- `assets/node/android-filesystem.js`

## Release gates
1. Wire shared model to actual prediction call sites in all three engines.
2. Train and validate coefficients using real historical results; no future leakage and no unverified track conditions.
3. Confirm Son 800 only uses verified individual splits.
4. Build from the existing APK with Android SDK build-tools (zipalign and apksigner).
5. Sign with a private keystore supplied through protected CI secrets, never committed.
6. Verify application ID, version, signing certificate, and install-over-existing behavior on Android.
7. Confirm that local archives remain intact.

**Status:** gates 1–7 have not been completed. Do not distribute a signed artifact as tested until all pass.
