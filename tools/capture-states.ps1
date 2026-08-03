<#
    Captures one screenshot per blob reaction state into docs/states/.

        pwsh tools/capture-states.ps1

    Needs pwsh 7+, not Windows PowerShell 5.1.

    Filenames are stable, so re-running overwrites the previous set rather
    than piling up - the directory is always "how the face looks right now".
    It also writes docs/states/all-states.png, a contact sheet of the lot.

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

param(
    [string]$OutDir = "docs/states"
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

$states = @(
    @{ level = 81; name = '0-baseline';     label = 'baseline' },
    @{ level = 82; name = '1-sweating';     label = 'heart rate 120+' },
    @{ level = 83; name = '2-sunny';        label = 'sunny: shades + cocktail' },
    @{ level = 84; name = '3-rain';         label = 'rain, umbrella up' },
    @{ level = 85; name = '4-thunderstorm'; label = 'storm: bolt + startled' },
    @{ level = 86; name = '5-night';        label = '23:00 to 07:00' },
    @{ level = 87; name = '7-cold';         label = 'below freezing: scarf' }
)

# Filenames this sweep is allowed to leave behind. Anything else in the
# directory is from an older revision - "2-sunglasses.png" outlived the state
# being renamed to "sunny" - and a stale frame under a plausible name is worse
# than a missing one, because nothing about the file says it is out of date.
$expected = @($states | ForEach-Object { "$($_.name).png" }) + @('6-ambient.png', 'all-states.png')

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
function Get-FrameStats($path) {
    Add-Type -AssemblyName System.Drawing
    try {
        $bmp = [System.Drawing.Bitmap]::FromFile($path)
        $max = 0; $lit = 0; $n = 0
        for ($y = 0; $y -lt $bmp.Height; $y += 6) {
            for ($x = 0; $x -lt $bmp.Width; $x += 6) {
                $c = $bmp.GetPixel($x, $y)
                $l = 0.299 * $c.R + 0.587 * $c.G + 0.114 * $c.B
                if ($l -gt $max) { $max = $l }
                if ($l -gt 60) { $lit++ }
                $n++
            }
        }
        $bmp.Dispose()
        return @{ max = $max; litFraction = ($lit / [double]$n) }
    }
    catch { return $null }
}

function Test-IsFace($path) {
    $s = Get-FrameStats $path
    if (-not $s) { return $false }
    return ($s.max -gt 60 -and $s.litFraction -lt 0.14)
}

function Wake($serial) {
    & $adb -s $serial shell input keyevent KEYCODE_WAKEUP 2>$null | Out-Null
    & $adb -s $serial shell am broadcast -a com.google.android.wearable.app.DEBUG_SURFACE `
        --es operation set-watchface --es watchFaceId de.redplant.watchface.blob 2>$null | Out-Null
    Start-Sleep -Milliseconds 1100
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

Get-ChildItem -Path $dir -Filter '*.png' -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notin $expected } |
    ForEach-Object {
        Write-Host "  removing orphaned $($_.Name) (state renamed or dropped)"
        Remove-Item $_.FullName -Force -Confirm:$false
    }

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

# Ambient is a display mode rather than a data state, so no battery involved.
$w = Get-Watch
if ($w) {
    $remote = '/sdcard/wf_ambient.png'
    $local = Join-Path $dir '6-ambient.png'

    # ENTER_AMBIENT does not work here. The broadcast is accepted but the
    # display stays interactive - it will not dim a screen that was just woken,
    # and every capture needs a wake first. So let the screen time out on its
    # own instead: shorten the timeout, stop touching the watch, wait it out.
    # The original value is read first and put back afterwards.
    $prevTimeout = (& $adb -s $w shell settings get system screen_off_timeout 2>$null | Select-Object -First 1)
    if (-not $prevTimeout -or $prevTimeout -notmatch '^\d+$') { $prevTimeout = 15000 }

    $got = $false
    try {
        & $adb -s $w shell settings put system screen_off_timeout 3000 2>$null | Out-Null
        Wake $w
        # Longer than the timeout, and no input in between or it resets.
        Start-Sleep -Seconds 7
        & $adb -s $w shell screencap -p $remote 2>$null | Out-Null
        & $adb -s $w pull $remote $local 2>$null | Out-Null
        & $adb -s $w shell rm $remote 2>$null | Out-Null
        if (Test-Path $local) {
            # Ambient is legitimately near-black, so Test-IsFace does not apply.
            # Check the opposite: it must be much dimmer than the interactive
            # face, or we captured the interactive one again.
            $s = Get-FrameStats $local
            if ($s -and $s.litFraction -lt 0.035) { $got = $true }
        }
    }
    finally {
        & $adb -s $w shell settings put system screen_off_timeout $prevTimeout 2>$null | Out-Null
    }

    if (Test-Path $local) {
        $written += @{ path = $local; label = 'ambient' }
        Write-Host "  wrote $OutDir/6-ambient.png  (ambient)"
        if (-not $got) { Write-Warning "  ambient shot may be the interactive face" }
    }
    Wake $w

    # Verify rather than assume. `dumpsys battery reset` takes a moment to
    # propagate, so reading straight after it reports the stale override and
    # gives a false all-clear - which is exactly how a fake level got left on
    # the watch the first time round. Retry until it settles.
    $lvl = $null
    foreach ($attempt in 1..5) {
        & $adb -s $w shell dumpsys battery reset 2>$null | Out-Null
        Start-Sleep -Milliseconds 1200
        $lvl = (& $adb -s $w shell dumpsys battery 2>$null | Select-String '^\s*level:' |
                ForEach-Object { ($_.Line -split ':')[1].Trim() } | Select-Object -First 1)
        if ($lvl -and ([int]$lvl -lt 81 -or [int]$lvl -gt 87)) { break }
    }
    if ($lvl -and ([int]$lvl -lt 81 -or [int]$lvl -gt 87)) { "battery reporting reset (real level $lvl%)" }
    else { Write-Warning "battery may still be overridden (reads $lvl%) - run: adb shell dumpsys battery reset" }
}

# ---------------------------------------------------------------------------
# Contact sheet
# ---------------------------------------------------------------------------
if ($written.Count -gt 0) {
    Add-Type -AssemblyName System.Drawing
    $cols = [Math]::Min(4, $written.Count)
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
