import java.io.ByteArrayOutputStream
import java.io.File

plugins {
    id("com.android.application")
}

android {
    namespace = "de.redplant.watchface.blob"
    compileSdk = 36

    defaultConfig {
        applicationId = "de.redplant.watchface.blob"
        // WFF v4 requires Wear OS 6 / API 36. Lower this only together with
        // the format.version property in AndroidManifest.xml.
        minSdk = 36
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    // Nothing to compile - this module is resources only.
    androidResources {
        noCompress += listOf("xml")
    }
}

// ---------------------------------------------------------------------------
// Optional verification tasks.
//
// Both tools are separate downloads from https://github.com/google/watchface
// (see README). Drop the jars into <repo>/tools/ and these tasks light up:
//
//   ./gradlew :watchface:validateWatchFaceXml
//   ./gradlew :watchface:assembleDebug :watchface:checkMemoryFootprint
// ---------------------------------------------------------------------------

val toolsDir = rootProject.layout.projectDirectory.dir("tools")

// Both jars are plain executables, so run them with the JDK Gradle itself is on
// rather than whatever `java` happens to be on PATH - Android Studio's JDK is
// not on PATH by default.
val javaExe: String = File(System.getProperty("java.home"), "bin/java").let {
    if (it.exists()) it.path else File(System.getProperty("java.home"), "bin/java.exe").path
}

// Keep in step with com.google.wear.watchface.format.version in AndroidManifest.xml.
val wffFormatVersion = "5"

tasks.register<Exec>("validateWatchFaceXml") {
    group = "verification"
    description = "Validates res/raw/watchface.xml against the WFF v$wffFormatVersion schema."

    val validator = toolsDir.file("wff-validator.jar").asFile
    val watchFaceXml = layout.projectDirectory.file("src/main/res/raw/watchface.xml").asFile

    onlyIf {
        validator.exists().also {
            if (!it) logger.lifecycle("Skipping: ${validator.path} not found (see README).")
        }
    }
    commandLine(javaExe, "-jar", validator.path, wffFormatVersion, watchFaceXml.path)

    // The validator reports failures on stdout but still exits 0, so Exec alone
    // would let an invalid watch face through. Buffer the output and inspect it.
    val captured = ByteArrayOutputStream()
    standardOutput = captured
    errorOutput = captured

    doLast {
        val text = captured.toString()
        logger.lifecycle(text.trim())
        if (text.contains("NOT valid") || text.contains("SEVERE")) {
            throw GradleException("WFF validation failed - see the SEVERE lines above.")
        }
    }
}

// ---------------------------------------------------------------------------
// watchface.xml is generated from tools/gen/*.ts (see docs/authoring-strategy.md).
// The generated file IS committed, so a clone without node still builds a correct
// APK and `git diff` on the XML stays reviewable. This task guards the other
// direction: the committed file must match what the generator produces.
// ---------------------------------------------------------------------------

tasks.register<Exec>("checkWatchFaceXmlUpToDate") {
    group = "verification"
    description = "Regenerates watchface.xml from tools/gen and fails if the committed file differs."

    val genScript = rootProject.layout.projectDirectory.file("tools/gen/build.ts").asFile
    // mock-state.ts rewrites watchface.xml in place; after a capture run a mocked
    // tree is the NORMAL state. Regenerating then would look like a spurious
    // failure at best and discard the mock at worst.
    val mockBackup = layout.buildDirectory.file("mock-state-backup.xml").get().asFile

    onlyIf {
        // Deliberately NOT the onlyIf-on-missing-tool pattern the two jar tasks
        // use. Those skip because the jars are a separate download; the generator
        // is in the repo, so if it cannot run that is a broken checkout, not an
        // opt-out - and a check that silently skips is how this build already
        // manages to report SUCCESSFUL having verified nothing.
        if (!genScript.exists()) {
            throw GradleException("Missing ${genScript.path} - watchface.xml is generated (see docs/authoring-strategy.md).")
        }
        (!mockBackup.exists()).also {
            if (!it) logger.lifecycle("Skipping: a mock is in place (tools/mock-state.ts off to clear it).")
        }
    }

    commandLine("node", genScript.path, "--check")
}

// Run before validation, so a stale file is reported as stale rather than as a
// confusing schema result against markup nobody generated.
tasks.named("validateWatchFaceXml") { dependsOn("checkWatchFaceXmlUpToDate") }

tasks.register<Exec>("checkMemoryFootprint") {
    group = "verification"
    description = "Checks the built APK against the 10 MB ambient / 100 MB active limits."

    // Without this the task can run before the APK it wants to measure exists,
    // and onlyIf below would silently skip it.
    dependsOn("assembleDebug")

    val tool = toolsDir.file("memory-footprint.jar").asFile
    val apk = layout.buildDirectory.file("outputs/apk/debug/watchface-debug.apk").get().asFile

    onlyIf {
        (tool.exists() && apk.exists()).also {
            if (!it) logger.lifecycle("Skipping: need ${tool.path} and a built debug APK.")
        }
    }
    // No --schema-version on purpose. This tool only accepts up to 4 (it rejects 5
    // outright), and without the flag it reads the version straight out of the
    // manifest - which also means it can never drift from wffFormatVersion.
    commandLine(
        javaExe, "-jar", tool.path,
        "--watch-face", apk.path,
        "--ambient-limit-mb", "10",
        "--active-limit-mb", "100",
    )
}
