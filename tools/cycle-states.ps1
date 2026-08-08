# Cycles the watch through every state, holding each one on screen long enough
# to be looked at, and loops until stopped.
#
# WHY THIS EXISTS
#
# capture-states.ps1 photographs states; this one *shows* them. Anything that
# moves - the Gyro parallax, the Zzz drift, the falling rain, the sweat drips,
# the ambient crossfade - is invisible in a screenshot, so the only way to judge
# it is to put each state on a wrist and tilt. Doing that by hand is a
# mock/build/install cycle per state.
#
# EVERY STATE IS MOCKED WITH --live, which is the whole point: a plain mock pins
# ACCELEROMETER_ANGLE_* and the clock sources to constants, so the parallax and
# the drift are both switched off in it. Judging motion on a plain mock is how
# three non-existent bugs got reported.
#
#   powershell -File tools/cycle-states.ps1                 # loop forever
#   powershell -Command "& tools/cycle-states.ps1 -Laps 1"  # one pass
#   powershell -Command "& tools/cycle-states.ps1 -Only rainy,thunderstorm,night"
#
# Ctrl-C is safe: the screen timeout and the real build are restored in a
# finally block.
#
# A HARD KILL IS NOT. Observed, not theoretical - killing the background job
# that owned this script skipped finally entirely and left the watch on 45s and
# a mock build. So the original timeout is written to tools/cycle-states.state
# before anything changes, and recovery is one command:
#
#   powershell -Command "& tools/cycle-states.ps1 -Restore"
#
# which puts the timeout back, reinstalls the real build, and verifies both.
[CmdletBinding(PositionalBinding = $false)]
param(
    [int]$HoldSeconds = 20,
    [int]$Laps = 0,                  # 0 = until stopped
    [string[]]$Only,
    [switch]$Restore                 # clean up after a hard kill; cycles nothing
)

$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent $PSScriptRoot
$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
if (-not (Test-Path $adb)) { throw "adb not found at $adb" }
if (-not $env:JAVA_HOME) { $env:JAVA_HOME = "$env:USERPROFILE\.jdks\jdk-21.0.12+8" }
$stateFile = Join-Path $PSScriptRoot 'cycle-states.state'

# Ambient is excluded: both blob groups are alpha 0 there, so there is no
# parallax to see and nothing to hold on screen.
# The states that MUST be looked at here rather than in a screenshot are the two
# animated ramps, and both are included at more than one point along their range:
# rainy/thunderstorm/downpour are 50/90/100% precipitation, which drives the
# rain's drop count, size and speed; sweating/puffing/drenched are 100/135/200bpm,
# which drives the drip speed and the forehead pearl count. A still frame shows
# one arbitrary phase of each and says nothing about how either ramp reads.
# 'headset' is here for the reason 'salute' used to be: it is the one pose where
# an accessory crosses the head rather than sitting beside it, and whether a band
# arcing over the leaf tuft reads as "worn on top of" or "cutting through" is a
# question about real size on a real screen, not about the geometry alone - see
# the front-of-leaf/front-of-sweat priority note in blob-hero.ts. 'fricontroller'
# is here because it is the one NEW animated element, the controller's pulsing
# face button - a still frame proves the geometry but says nothing about whether
# the pulse itself reads as "on" rather than as a flicker.
$order = @('baseline', 'night', 'sunny', 'uv', 'cold', 'gloves', 'freezing', 'rainy', 'thunderstorm', 'downpour', 'sweating', 'puffing', 'drenched', 'goal', 'headset', 'fricontroller')
if ($Only) {
    $order = @($order | Where-Object { $_ -in $Only })
    if (-not $order) { throw "-Only matched nothing. Valid: $($order -join ', ')" }
}

function Get-Watch {
    $line = (& $adb devices | Select-String -Pattern '\sdevice$' | Select-Object -First 1)
    if ($line) { return ($line.ToString() -split '\s+')[0] }
    return $null
}
function Get-Timeout($s) {
    $v = (& $adb -s $s shell settings get system screen_off_timeout 2>$null | Select-Object -First 1)
    if ($v) { $v = $v.Trim() }
    if ($v -match '^\d+$') { return [int]$v }
    return $null
}

function Restore-Device($w, $origTimeout) {
    if ($w -and $origTimeout) {
        foreach ($attempt in 1..5) {
            & $adb -s $w shell settings put system screen_off_timeout $origTimeout 2>$null | Out-Null
            Start-Sleep -Milliseconds 500
            if ((Get-Timeout $w) -eq $origTimeout) { break }
        }
        $now = Get-Timeout $w
        if ($now -eq $origTimeout) { "  screen timeout back to ${now}ms" }
        else { Write-Warning "  timeout is ${now}ms, wanted ${origTimeout}ms" }
    }
    Push-Location $repo
    try {
        & node tools/mock-state.ts off 2>&1 | Out-Null
        & cmd /c ".\gradlew.bat :watchface:installDebug --console=plain" 2>&1 | Out-Null
        $ok = ($LASTEXITCODE -eq 0)
        # Verify against the DEVICE: the installed APK must be byte-identical to
        # what a clean tree builds. An exit code cannot tell a mock from a real
        # build; this can.
        if ($ok -and $w) {
            $path = (& $adb -s $w shell pm path de.redplant.watchface.blob 2>$null) -replace 'package:', ''
            $onWatch = ((& $adb -s $w shell md5sum $path.Trim() 2>$null) -split '\s+')[0]
            $apk = Join-Path $repo 'watchface\build\outputs\apk\debug\watchface-debug.apk'
            $local = (Get-FileHash $apk -Algorithm MD5).Hash.ToLower()
            if ($onWatch -eq $local) { "  real build reinstalled and verified (md5 $local)" }
            else { Write-Warning "  APK ON WATCH DOES NOT MATCH the clean build - it may still be a MOCK" }
        }
        elseif (-not $ok) { Write-Warning "  REINSTALL FAILED. Run: .\gradlew :watchface:installDebug" }
    }
    finally { Pop-Location }
    Remove-Item $stateFile -ErrorAction SilentlyContinue
}

if ($Restore) {
    $w = Get-Watch
    if (-not $w) { throw "no watch connected" }
    $orig = if (Test-Path $stateFile) { [int](Get-Content $stateFile).Trim() } else { 15000 }
    Write-Host "restoring after an interrupted cycle (original timeout ${orig}ms)..."
    Restore-Device $w $orig
    exit 0
}

$w = Get-Watch
if (-not $w) { throw "no watch connected" }

# Hold the screen open for a bit longer than one state, so a tilt-and-look is
# not racing the display timeout. Deliberately modest: an earlier version of the
# capture script left this at ten minutes and it took a while to notice.
$origTimeout = Get-Timeout $w
if ($null -eq $origTimeout) { $origTimeout = 15000 }
if ($origTimeout -ge 300000) {
    Write-Warning "screen_off_timeout was already ${origTimeout}ms - treating 15000 as the real value"
    $origTimeout = 15000
}
Set-Content -Path $stateFile -Value $origTimeout -Encoding utf8
$hold = [Math]::Max(($HoldSeconds + 10) * 1000, 45000)

try {
    & $adb -s $w shell settings put system screen_off_timeout $hold 2>$null | Out-Null
    Write-Host "screen timeout ${origTimeout}ms -> ${hold}ms for the cycle"
    Write-Host "cycling: $($order -join ' -> ')"
    Write-Host "holding each for ${HoldSeconds}s. Tilt your wrist - every state is mocked --live.`n"

    $lap = 0
    while ($true) {
        $lap++
        foreach ($st in $order) {
            Push-Location $repo
            try {
                & node tools/mock-state.ts on $st --live 2>&1 | Out-Null
                if ($LASTEXITCODE -ne 0) { Write-Warning "mock failed for $st, skipping"; continue }
                & cmd /c ".\gradlew.bat :watchface:installDebug --console=plain" 2>&1 | Out-Null
                $ok = ($LASTEXITCODE -eq 0)
                & node tools/mock-state.ts off 2>&1 | Out-Null
                if (-not $ok) { Write-Warning "install failed for $st, skipping"; continue }
            }
            finally { Pop-Location }

            & $adb -s $w shell input keyevent KEYCODE_WAKEUP 2>$null | Out-Null
            & $adb -s $w shell am broadcast -a com.google.android.wearable.app.DEBUG_SURFACE `
                --es operation set-watchface --es watchFaceId de.redplant.watchface.blob 2>$null | Out-Null
            Start-Sleep -Milliseconds 400
            & $adb -s $w shell input tap 213 213 2>$null | Out-Null

            "[lap $lap] $st  - holding ${HoldSeconds}s"
            Start-Sleep -Seconds $HoldSeconds
        }
        if ($Laps -gt 0 -and $lap -ge $Laps) { break }
    }
}
finally {
    Write-Host "`nrestoring..."
    Restore-Device (Get-Watch) $origTimeout
}
