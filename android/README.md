# CRAYON BLOOM Android release 1.0.2

Built from main `5924e1ba616e64191e19382ceed059ef04e169ee` with the existing publisher Android wrapper updated for the current game. Package `com.owl920411.crayonbloom`, versionCode 3, versionName `1.0.2`, minimum Android 7/API24, compile/target API36. The approved controls, engine and rules are preserved byte for byte.

## Build

Use Java 17, Gradle 8.13, Android SDK platform 36 and build-tools 36.0.0. Set the SDK path in private `local.properties`. Restore the existing upload key through private `signing.properties` with `storeFile`, `storePassword`, `keyAlias` and `keyPassword`. Run `./gradlew --no-daemon bundleRelease testReleaseUnitTest lintRelease` from this directory. Check bundle structure with bundletool and the upload-key signature with jarsigner before delivery. Never commit keys, credentials, local properties or build outputs.

## Advertising

Google Mobile Ads 25.5.0 and UMP 4.0.0 use the existing publisher app ID `ca-app-pub-5315201053842908~9602314344` and interstitial unit `ca-app-pub-5315201053842908/4383534846`. `TEST_ADS=false`.

A preloaded interstitial may show only after two completed normal games since the last actual display. No play-time condition remains. Tutorial, practice, guest sessions, pauses, menus, abandoned games and restarts do not count. The counter persists across app restarts and resets only after actual ad display. When an ad is unavailable or cannot show, the saved game result is released without waiting or showing an ad during the next game.

The non-input AdaptiveBridge reports session begin and genuine gameover. The final result notification runs after the controller has saved the score and rendered the result. Native UI locks only the result while deciding/showing an ad and restores it after dismissal or failure. Frozen controller files and their methods/timers/input handlers are unchanged.

Consent permission gates initialization, loading and display. The app requests the current UMP state at launch. Where UMP requires a privacy options entry, settings show `광고 개인정보 설정`. Updating privacy choices discards previous loaded/in-flight ads. Cached interstitials are discarded after 55 minutes.

The existing conservative advertising treatment is retained: nonpersonalized requests, under-age-of-consent treatment and maximum PG content. This is an existing configuration, not verified audience selection or account configuration. UMP messages and serving readiness belong to the publisher account and cannot be proven by building the app.

## App behavior and verification limits

Current game files and art are bundled locally via HTTPS WebViewAssetLoader, including the latest storybook and audio. QA pages are excluded. Record formats, audio options, tutorial and gameplay remain unchanged. Android backgrounding pauses through the approved controller's existing blur handler. AndroidX Activity 1.11.0 handles system back buttons/gestures through OnBackPressedDispatcher, preserving the exit confirmation on Android 16. The old upload key is reused so the signature remains compatible with earlier delivered builds.

Automated tests/build/signature checks do not establish actual Android touch/audio/advertising behavior. Verify installation, ordinary game completion 1→no ad, completion 2→at most one available ad, closing the ad→saved result and retry, unavailable/offline ad→immediate result, tutorial exclusion, background/resume and saved records. Actual AdMob delivery, account approval and Play Console acceptance/publication are not performed by a local build.
