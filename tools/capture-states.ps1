<#
    Captures one screenshot per blob reaction state into docs/states/.

        powershell -File tools/capture-states.ps1                 # all states
        powershell -Command "& tools/capture-states.ps1 -Only 4-cold,5-freezing"

    USE -Command, NOT -File, WHEN PASSING -Only MORE THAN ONE STATE. Under
    -File every argument arrives as a separate string, so "-Only a,b" becomes
    the single literal "a,b" and matches nothing, while "-Only a b" binds only
    "a" and throws the rest at the next parameter.

    Runs on Windows PowerShell 5.1. (The header used to claim pwsh 7+ was
    required; it is not, and a full sweep was run on 5.1 on 2026-08-03.)

    Filenames are stable, so re-running overwrites the previous set rather
    than piling up - the directory is always "how the face looks right now".
    It also writes docs/states/all-states.png, a contact sheet of the lot.

    -Only re-captures a subset. It deliberately skips the orphan prune, the
    ambient shot and the contact sheet, because all three are whole-set
    operations that a partial run would corrupt.

    HOW THE STATE FORCING WORKS
    The reactions are normally driven by heart rate, weather and the clock,
    none of which can be set from the host: the watch is a production build so
    there is no root and the clock is untouchable, and weather cannot be faked
    at all. BATTERY_PERCENT is the one exception - `dumpsys battery set level`
    works without root - so for design review the triggers are temporarily
    repointed at battery levels.

    THIS SCRIPT ONLY PRODUCES DISTINCT STATES WHILE THOSE DEBUG TRIGGERS ARE
    IN PLACE. Against the real triggers every shot is whatever the weather and
    your pulse happen to be, which is still useful, just not a state sweep.

    Repointing the triggers is `tools/debug-triggers.mjs`, not a hand edit -
    two of the triggers are compound expressions that contain a shorter trigger
    as a substring, so the order of substitution matters and a hand edit can
    silently half-substitute one. Full sequence:

        node tools/debug-triggers.mjs on
        ./gradlew :watchface:installDebug
        pwsh tools/capture-states.ps1
        node tools/debug-triggers.mjs off
        ./gradlew :watchface:installDebug     # <- do not skip

    The levels below must match the STATES table in that script.

    WHY THE LEVELS ARE 81-87 AND NOT 10-15
    The first version used 10 to 15, which put the watch inside its own
    low-battery range: Wear OS switched on battery saver and painted a system
    indicator over the face, and BATTERY_IS_LOW flipped the face's own battery
    text to coral. None of that is the state being reviewed. Anything well
    clear of the low-battery threshold avoids it.

    ON THE BATTERY OVERRIDE
    `dumpsys battery set` sticks until it is reset or the watch reboots, and
    wireless debugging drops on its own every few minutes - so a naive sweep
    can leave the watch reporting a fake percentage indefinitely. This script
    therefore resets after every single capture rather than once at the end,
    and reconnects before each state. If a percentage ever looks wrong anyway:

        adb shell dumpsys battery reset
#>

# PositionalBinding=$false: every parameter must be named.
#
# Without it, `-Only 1-baseline 8-sweating` binds "1-baseline" to -Only and then
# quietly hands "8-sweating" to $OutDir as the first positional argument - so
# instead of capturing two states the script captured one, into a newly created
# directory called "8-sweating" in the repo root. It reported success.
#
# Note that with `powershell.exe -File`, a comma-separated list arrives as ONE
# string and matches nothing. Use -Command for multiple states:
#   powershell -Command "& tools/capture-states.ps1 -Only 1-baseline,8-sweating"
[CmdletBinding(PositionalBinding = $false)]
param(
    [string]$OutDir = "docs/states",

    # Capture only these state names, e.g. -Only 5-night,7-cold. Skips the
    # ambient shot and the contact sheet unless the set is complete, so a
    # partial re-run cannot quietly overwrite all-states.png with two tiles.
    [string[]]$Only
)

# Deliberately NOT 'Stop': adb writes its transfer progress to stderr, and
# under Stop every pull would surface as a terminating error. Each step is
# checked explicitly instead.
$ErrorActionPreference = 'Continue'

$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
if (-not (Test-Path $adb)) { throw "adb not found at $adb" }

# The watch's wireless-debugging port rotates every time it sleeps, so a
# hard-coded ip:port goes stale. Re-resolve through mDNS each time.
function Get-Watch {
    $d = & $adb devices 2>$null | Select-String '\sdevice$' |
         ForEach-Object { ($_.Line -split '\s+')[0] } |
         Where-Object { $_ -notmatch '^emulator' } | Select-Object -First 1
    if ($d) { return $d }

    $svc = & $adb mdns services 2>$null | Select-String '_adb-tls-connect\._tcp' |
           ForEach-Object { ($_.Line -split '\s+')[-1] } | Select-Object -First 1
    if ($svc) {
        & $adb connect $svc 2>$null | Out-Null
        Start-Sleep -Milliseconds 1200
        return (& $adb devices 2>$null | Select-String '\sdevice$' |
                ForEach-Object { ($_.Line -split '\s+')[0] } |
                Where-Object { $_ -notmatch '^emulator' } | Select-Object -First 1)
    }
    return $null
}

$repo = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $repo $OutDir
New-Item -ItemType Directory -Force $dir | Out-Null

# Order is the reading order of the face's states, not the order they were
# built in: quietest first (ambient, baseline), then time of day, then weather
# by increasing severity, then the body-driven one. Ambient is 0 because it is
# the state the watch spends most of its time in.
#
# Levels must match the STATES table in tools/debug-triggers.mjs. 81 is the
# baseline - no trigger is mapped to it, so nothing fires.
$states = @(
    @{ level = 81; name = '1-baseline';     label = 'baseline' },
    @{ level = 82; name = '2-night';        label = '23:00 to 07:00' },
    @{ level = 83; name = '3-sunny';        label = 'sunny: shades + cocktail' },
    @{ level = 84; name = '4-cold';         label = 'cold (<=10): scarf + gloves' },
    @{ level = 85; name = '5-freezing';     label = 'freezing (<=0): + snowflake' },
    @{ level = 86; name = '6-rainy';        label = 'rain, umbrella up' },
    @{ level = 87; name = '7-thunderstorm'; label = 'storm: bolt + startled' },
    @{ level = 88; name = '8-sweating';     label = 'heart rate 120+' }
)

# Filenames this sweep is allowed to leave behind. Anything else in the
# directory is from an older revision - "2-sunglasses.png" outlived the state
# being renamed to "sunny" - and a stale frame under a plausible name is worse
# than a missing one, because nothing about the file says it is out of date.
# The 2026-08-03 renumbering orphaned the whole previous set; the prune below
# clears them on the next full run.
$expected = @($states | ForEach-Object { "$($_.name).png" }) + @('0-ambient.png', 'all-states.png')

$written = @()

# Is this frame actually the watch face?
#
# Two distinct failures had to be told apart from a real capture, and neither
# is obvious from the file:
#   - a black frame, when the screen was off or mid transition
#   - the app launcher or a system notification, when something was on top
#     (the "Wireless debugging connected" toast reappears constantly)
#
# Brightness alone cannot separate the second case, because a launcher full of
# white icons is brighter than the face. What does separate them is coverage:
# the face is almost entirely black with a little cream text, while launchers
# and notifications fill the screen. So require both "something is lit" and
# "most of it is not".
#   - the AMBIENT face, when the screen dimmed mid-sweep. This one defeated
#     both checks above and silently ruined a whole run: ambient is thin white
#     text on black, so it is bright (max > 60) and sparse (litFraction well
#     under 0.14), which is exactly the signature of a good capture. Two of
#     seven states came back as ambient frames that looked plausible on disk.
#
# What separates ambient from the interactive face is COLOUR, not brightness.
# Ambient is strictly greyscale; the interactive face has a coral heart, a green
# battery gauge and two saturated blobs. So count chroma - max(R,G,B) minus
# min(R,G,B) - and require some of it.
function Get-FrameStats($path) {
    Add-Type -AssemblyName System.Drawing
    try {
        $bmp = [System.Drawing.Bitmap]::FromFile($path)
        $max = 0; $lit = 0; $sat = 0; $n = 0
        for ($y = 0; $y -lt $bmp.Height; $y += 6) {
            for ($x = 0; $x -lt $bmp.Width; $x += 6) {
                $c = $bmp.GetPixel($x, $y)
                $l = 0.299 * $c.R + 0.587 * $c.G + 0.114 * $c.B
                if ($l -gt $max) { $max = $l }
                if ($l -gt 60) { $lit++ }
                $hi = [Math]::Max($c.R, [Math]::Max($c.G, $c.B))
                $lo = [Math]::Min($c.R, [Math]::Min($c.G, $c.B))
                if (($hi - $lo) -gt 40) { $sat++ }
                $n++
            }
        }
        $bmp.Dispose()
        return @{ max = $max; litFraction = ($lit / [double]$n); satFraction = ($sat / [double]$n) }
    }
    catch { return $null }
}

# A THIRD failure, found after the first two were fixed: the AMBIENT
# TRANSITION. Wear OS drives AOD from wrist-down detection, NOT from
# screen_off_timeout, so holding that setting open does not stop the watch
# dimming - it only stops it blanking. A capture can therefore land mid
# crossfade, with the blobs already faded and the umbrella canopy not yet.
# Such a frame is neither the face nor ambient, and it is the worst kind of
# bad capture because it looks like a deliberate design.
#
# Thresholds below are measured, not guessed. Across a full sweep:
#
#   frame                max    lit%    sat%
#   good states          247   10-11   4.3-5.3
#   mid-transition       217    3.72     1.49
#   dimmed-but-not-out   255    7.31     2.99
#
# max is the sharp one: an undimmed frame renders cream #fff6e8 at luminance
# 247 exactly, and any dimming drags it down. sat separates the face from
# ambient, which is strictly greyscale.
function Test-IsFace($path) {
    $s = Get-FrameStats $path
    if (-not $s) { return $false }
    return ($s.max -ge 240 -and $s.litFraction -lt 0.14 -and $s.satFraction -gt 0.035)
}

# True ambient is greyscale and sparse. The 2.99% frame above was the
# interactive face caught part-way through dimming, and the old litFraction
# test passed it.
function Test-IsAmbient($path) {
    $s = Get-FrameStats $path
    if (-not $s) { return $false }
    return ($s.litFraction -lt 0.035 -and $s.satFraction -lt 0.005)
}

# KEYCODE_WAKEUP ALONE DOES NOT LIFT THE WATCH OUT OF AOD.
#
# With always-on display the screen is already on - `dumpsys power` reports
# mWakefulness=Dozing - so the keyevent is a no-op and every capture comes back
# as an ambient frame. A TAP is what actually wakes it to interactive.
#
# The tap is sent AFTER the set-watchface broadcast, so the face is guaranteed
# to be the foreground surface when it lands. That ordering matters: this face
# declares no ComplicationSlot, so a tap on it does nothing, but a tap on the
# app launcher would open whatever icon is under (213,213).
function Wake($serial) {
    & $adb -s $serial shell input keyevent KEYCODE_WAKEUP 2>$null | Out-Null
    & $adb -s $serial shell am broadcast -a com.google.android.wearable.app.DEBUG_SURFACE `
        --es operation set-watchface --es watchFaceId de.redplant.watchface.blob 2>$null | Out-Null
    Start-Sleep -Milliseconds 400
    & $adb -s $serial shell input tap 213 213 2>$null | Out-Null
    Start-Sleep -Milliseconds 900
}

# KEYCODE_HOME TOGGLES on Wear OS. From the watch face it opens the app
# launcher; from the launcher it returns to the watch face. Neither KEYCODE_BACK
# nor an edge swipe gets out of the launcher - BACK was tried five times in a
# row and the litFraction never budged off 0.32.
#
# So HOME is the corrective action, not part of the normal path: capture first,
# and only press HOME if the frame turns out not to be the face. Because it
# toggles, alternating converges within a couple of attempts.
function Nudge($serial) {
    & $adb -s $serial shell input keyevent KEYCODE_WAKEUP 2>$null | Out-Null
    & $adb -s $serial shell input keyevent KEYCODE_HOME 2>$null | Out-Null
    Start-Sleep -Milliseconds 1300
}

function Grab($serial, $name, $label) {
    $remote = "/sdcard/wf_$name.png"
    $local = Join-Path $script:dir "$name.png"
    $ok = $false
    foreach ($attempt in 1..4) {
        & $adb -s $serial shell screencap -p $remote 2>$null | Out-Null
        & $adb -s $serial pull $remote $local 2>$null | Out-Null
        & $adb -s $serial shell rm $remote 2>$null | Out-Null
        if ((Test-Path $local) -and (Test-IsFace $local)) { $ok = $true; break }
        Write-Host "  retry $name (not the watch face)"
        Nudge $serial
    }
    if (-not $ok) { Write-Warning "  $name may show the launcher or a notification, not the face" }
    if (Test-Path $local) {
        $script:written += @{ path = $local; label = $label }
        # Write-Host, not bare output: callers discard the return value with
        # Out-Null, which would swallow a plain string too.
        Write-Host "  wrote $script:OutDir/$name.png  ($label)"
        return $true
    }
    Write-Warning "  failed: $name"
    return $false
}

# Keep the unfiltered table: -Only narrows $states, but the battery-reset check
# at the bottom needs the FULL range of forcing levels or a partial run would
# compute a range of one level and mis-report everything outside it.
$allStates = $states

$partial = $false
if ($Only) {
    $states = $states | Where-Object { $_.name -in $Only }
    if (-not $states) { throw "-Only matched no states. Valid: $(($expected | Where-Object { $_ -ne 'all-states.png' }) -join ', ')" }
    $partial = $true
    Write-Host "  partial run: $(($states | ForEach-Object { $_.name }) -join ', ')"
}

# Only prune on a full run - a partial run would delete every state it is not
# capturing.
if (-not $partial) {
    Get-ChildItem -Path $dir -Filter '*.png' -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notin $expected } |
        ForEach-Object {
            Write-Host "  removing orphaned $($_.Name) (state renamed or dropped)"
            Remove-Item $_.FullName -Force -Confirm:$false
        }
}

# SCREEN TIMEOUT: read ONCE here, restore ONCE at the very end.
#
# Two separate bugs came out of this setting, and the structure below is what
# fixes both:
#
#  1. The screen dimming mid-sweep. Wake() only fires KEYCODE_WAKEUP, which does
#     nothing to the display timeout, so with the stock ~15 s timeout the watch
#     dimmed partway through and the last two states came back as ambient
#     frames. They passed validation and looked plausible in the contact sheet.
#     Fix: hold the timeout open across the whole state loop.
#
#  2. Restoring it wrong. The first attempt read the "previous" value in two
#     places and restored in two places. Wireless debugging drops constantly, so
#     one restore hit a moment when Get-Watch returned nothing and silently did
#     nothing - and the next section then read the ELEVATED value as its
#     original and faithfully put *that* back. The watch was left at 600000,
#     i.e. never sleeping. Fix: exactly one read, exactly one restore, verified.
function Get-Timeout($serial) {
    $v = (& $adb -s $serial shell settings get system screen_off_timeout 2>$null | Select-Object -First 1)
    if ($v) { $v = $v.Trim() }
    if ($v -match '^\d+$') { return [int]$v }
    return $null
}

function Set-Timeout($serial, $ms) {
    & $adb -s $serial shell settings put system screen_off_timeout $ms 2>$null | Out-Null
}

$origTimeout = $null
$wake = Get-Watch
if ($wake) { $origTimeout = Get-Timeout $wake }
# Never adopt the hold-open value as the thing to restore, however we got here.
if ($null -eq $origTimeout -or $origTimeout -ge 300000) { $origTimeout = 15000 }
Write-Host "  screen timeout was ${origTimeout}ms; holding it open for the sweep"

try {
    if ($wake) { Set-Timeout $wake 600000 }

    foreach ($s in $states) {
        $w = Get-Watch
        if (-not $w) { Write-Warning "  no device for $($s.name), skipping"; continue }
        try {
            & $adb -s $w shell dumpsys battery set level $s.level 2>$null | Out-Null
            Wake $w
            Grab $w $s.name $s.label | Out-Null
        }
        finally {
            # Immediately, not at the end of the sweep - see header.
            & $adb -s $w shell dumpsys battery reset 2>$null | Out-Null
        }
    }
}
catch {
    Write-Warning "  sweep aborted: $_"
}

# Ambient is a display mode rather than a data state, so no battery involved.
$w = Get-Watch
if ($w -and -not $partial) {
    $remote = '/sdcard/wf_ambient.png'
    $local = Join-Path $dir '0-ambient.png'

    # ENTER_AMBIENT does not work here. The broadcast is accepted but the
    # display stays interactive - it will not dim a screen that was just woken,
    # and every capture needs a wake first. So let the screen time out on its
    # own instead: shorten the timeout, stop touching the watch, wait it out.
    #
    # This section deliberately does NOT read or restore the timeout. It only
    # sets a short one; the single restore at the bottom of the script puts
    # $origTimeout back. See the note above the state loop for why.
    $got = $false
    try {
        Set-Timeout $w 3000
        # Retry: the first wait often catches the crossfade rather than settled
        # ambient, and waiting longer on a single attempt just risks the screen
        # blanking entirely. Wake once, then sample repeatedly.
        Wake $w
        foreach ($attempt in 1..5) {
            # Longer than the timeout, and no input in between or it resets.
            Start-Sleep -Seconds 7
            & $adb -s $w shell screencap -p $remote 2>$null | Out-Null
            & $adb -s $w pull $remote $local 2>$null | Out-Null
            & $adb -s $w shell rm $remote 2>$null | Out-Null
            if ((Test-Path $local) -and (Test-IsAmbient $local)) { $got = $true; break }
            Write-Host "  retry ambient (caught the crossfade, not settled AOD)"
            Wake $w
        }
    }
    catch {
        Write-Warning "  ambient capture failed: $_"
    }

    if (Test-Path $local) {
        $written += @{ path = $local; label = 'ambient' }
        Write-Host "  wrote $OutDir/0-ambient.png  (ambient)"
        if (-not $got) { Write-Warning "  ambient shot may be the interactive face" }
    }
}

# THE single restore. Retried and verified, because a silent miss here leaves
# the watch either never sleeping (600000) or sleeping in 3 s (the ambient
# value), and neither is obvious until the watch behaves strangely hours later.
$w = Get-Watch
if ($w) {
    $ok = $false
    foreach ($attempt in 1..5) {
        Set-Timeout $w $origTimeout
        Start-Sleep -Milliseconds 600
        if ((Get-Timeout $w) -eq $origTimeout) { $ok = $true; break }
    }
    if ($ok) { "screen timeout restored to ${origTimeout}ms" }
    else { Write-Warning "could not restore screen_off_timeout - run: adb shell settings put system screen_off_timeout $origTimeout" }
    Wake $w
}
else {
    Write-Warning "no device at the end of the run - screen_off_timeout may still be held open. Run: adb shell settings put system screen_off_timeout $origTimeout"
}

# Verify rather than assume, and do it on EVERY run including a partial one -
# this block used to sit inside the ambient section, so `-Only` would have
# skipped the one check that stops a fake battery level being left on the watch.
#
# `dumpsys battery reset` takes a moment to propagate, so reading straight after
# it reports the stale override and gives a false all-clear - which is exactly
# how a fake level got left on the watch the first time round. Retry until it
# settles.
$w = Get-Watch
if ($w) {
    # Range derived from $allStates, never hardcoded. It was written as a
    # literal 81..87 and then a level 88 was added, at which point a real
    # battery reading of 82% - the watch does drain during a sweep - was
    # reported as a stuck override. Note the inverse is unavoidable: while the
    # real level is inside the forcing range this check cannot prove anything,
    # so it says so rather than claiming success.
    $lo = ($allStates | ForEach-Object { $_.level } | Measure-Object -Minimum).Minimum
    $hi = ($allStates | ForEach-Object { $_.level } | Measure-Object -Maximum).Maximum
    $lvl = $null
    foreach ($attempt in 1..5) {
        & $adb -s $w shell dumpsys battery reset 2>$null | Out-Null
        Start-Sleep -Milliseconds 1200
        $lvl = (& $adb -s $w shell dumpsys battery 2>$null | Select-String '^\s*level:' |
                ForEach-Object { ($_.Line -split ':')[1].Trim() } | Select-Object -First 1)
        if ($lvl -and ([int]$lvl -lt $lo -or [int]$lvl -gt $hi)) { break }
    }
    if (-not $lvl) {
        Write-Warning "could not read the battery level - run: adb shell dumpsys battery reset"
    }
    elseif ([int]$lvl -lt $lo -or [int]$lvl -gt $hi) {
        "battery reporting reset (real level $lvl%)"
    }
    else {
        # `reset` has been issued five times and the level is still inside
        # $lo..$hi. Almost certainly the real charge; say so accurately.
        Write-Host "battery reads $lvl%, inside the forcing range $lo-$hi - reset was issued 5x, so this is very likely the real level. To be certain: adb shell dumpsys battery reset; adb shell dumpsys battery"
    }
}

# ---------------------------------------------------------------------------
# Contact sheet
# ---------------------------------------------------------------------------
# Skipped on a partial run: it is built from $written, so a two-state re-run
# would replace the eight-tile sheet with a two-tile one.
if ($partial) {
    Write-Host "  partial run - all-states.png left alone; re-run without -Only to rebuild it"
}
elseif ($written.Count -gt 0) {
    Add-Type -AssemblyName System.Drawing
    # Sort by filename, not capture order. Ambient is captured last (it needs
    # its own timeout dance after the state loop) but is numbered 0, so without
    # this the contact sheet ends with the state it should start with.
    $written = @($written | Sort-Object { [System.IO.Path]::GetFileName($_.path) })
    $cols = [Math]::Min(3, $written.Count)
    $cell = 220
    $labelH = 24
    $rows = [Math]::Ceiling($written.Count / $cols)
    $sheet = New-Object System.Drawing.Bitmap ($cols * $cell), ($rows * ($cell + $labelH))
    $g = [System.Drawing.Graphics]::FromImage($sheet)
    $g.Clear([System.Drawing.Color]::FromArgb(18, 18, 18))
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $font = New-Object System.Drawing.Font 'Segoe UI', 10
    $brush = [System.Drawing.Brushes]::Gainsboro

    for ($i = 0; $i -lt $written.Count; $i++) {
        $img = [System.Drawing.Bitmap]::FromFile($written[$i].path)
        $cx = ($i % $cols) * $cell
        $cy = [Math]::Floor($i / $cols) * ($cell + $labelH)
        $g.DrawImage($img, (New-Object System.Drawing.Rectangle ($cx + 6), ($cy + 6), ($cell - 12), ($cell - 12)))
        $g.DrawString($written[$i].label, $font, $brush, ($cx + 8), ($cy + $cell - 2))
        $img.Dispose()
    }
    $g.Dispose()
    $sheet.Save((Join-Path $dir 'all-states.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    $sheet.Dispose()
    "  wrote $OutDir/all-states.png"
}
