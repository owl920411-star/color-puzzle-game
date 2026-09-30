# CRAYON BLOOM Android — publisher advertising build

Built from public main 19d5859 with local Android wrapper and inert web/native ad hooks. App ID `com.owl920411.crayonbloom`, version code 2, version name `1.0.1`, minimum Android 7.0/API24, compile/target API36.

The game is bundled under HTTPS WebViewAssetLoader assets and does not fetch the public website to play. Browser records are separate from this app's storage; existing game record format is preserved. App updates with the same package/signature retain app storage. This build has Google Mobile Ads SDK 25.5.0 and UMP4.0.0, using the publisher app/interstitial IDs supplied by the user. TEST_ADS=false; consent checks are enforced. Store publication and actual serving approval are still pending.

## Build
Install Java17 JDK, Android SDK platform36/build-tools36.0.0/platform-tools. Set SDK path in local.properties. Keep signing.properties private and outside version control. Set storeFile, storePassword, keyAlias and keyPassword for the upload key. Run `./gradlew bundleRelease testReleaseUnitTest`.

## Ad behavior
Every two genuinely completed normal games since the last shown ad; no play-time requirement. Tutorial and practice finishes do not qualify. No active-time collector remains. Pauses, menus, tutorials and restarts do not count as finished games. Only a preloaded interstitial may show at a gameover result; unavailable ads are skipped without waiting, and cannot appear later in a new game. Counters reset only on actual display and persist across app restarts. A temporary result input lock protects against starting a new game before the native decision completes.

All ads are requested nonpersonalized, with under-age-of-consent treatment and maximum PG content. Production age/consent treatment still requires review against the intended audience and distribution regions. The earlier sample-ID consent bypass is disabled. Ads cannot initialize or show when UMP does not allow requests.

## Before production
1. Verify the intended permanent package ID before first Play upload.
2. Publisher IDs are connected and TEST_ADS=false. Confirm UMP account configuration and app readiness review. Increment versionCode for every later upload.
3. Finalize privacy policy and Data Safety disclosures from the actual SDK/configuration. No claims of zero data collection.
4. Run phone installation/input/audio/background/storage checks, genuine test ad load/show/close/failure checks and consent checks. These have not been performed in this environment.
5. Produce actual Android screenshots, complete Play Console declarations and required test-track review. No store publication was performed.

## Validated
Release AAB build and vital lint succeed; AdCadenceTest3/3 pass. Existing web regression gate34/34 test file bundles pass including native bridge4/4. Bundletool validation, signed bundle inspection and universal APK conversion are recorded in the delivery report. Automated tests do not prove play feel or physical device compatibility.

Upload key/credentials, local.properties, signing.properties and build artifacts are ignored and must not be committed to the public repository.
