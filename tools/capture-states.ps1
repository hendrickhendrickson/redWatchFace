<#
    Captures one screenshot per state into docs/states/, with fixed values.

        powershell -File tools/capture-states.ps1
        powershell -Command "& tools/capture-states.ps1 -Only 4-cold,5-freezing"

    USE -Command, NOT -File, WHEN PASSING -Only MORE THAN ONE STATE. Under
    -File every argument arrives as a separate string, so "-Only a,b" becomes
    the single literal "a,b" and matches nothing.

    Runs on Windows PowerShell 5.1.

    HOW THE STATES ARE FORCED - and why this changed on 2026-08-04

    Previously each reaction was forced by rewriting its trigger expression to
    `[BATTERY_PERCENT] == N` and setting the battery from the host. One build,
    nine adb calls, fast - but wrong in two ways. The numbers on screen were
    whatever the watch happened to report, so the "sunny" frame showed 24
    degrees and 0 steps; and forcing triggers individually broke the
    relationships between them, most visibly producing a freezing frame with a
    snowflake above two blobs wearing no scarves, which the watch can never do.

    Now tools/mock-state.mjs patches the DATA instead - temperature, heart rate,
    hour, and so on - and the real Conditions evaluate normally, so nesting
    takes care of itself. The cost is one BUILD PER STATE, about three minutes
    for the set. Correctness is worth more than the two minutes saved.

    There is no battery override any more, so none of the old warnings about
    leaving the watch reporting a fake level apply.

    -Only re-captures a subset. It skips the orphan prune, the ambient shot and
    the contact sheet, since all three are whole-set operations.
#>

# PositionalBinding=$false: every parameter must be named. Without it,
# `-Only 1-baseline 8-sweating` binds the first to -Only and hands the second to
# $OutDir, which once created a directory called "8-sweating" in the repo root
# and reported success.
[CmdletBinding(PositionalBinding = $false)]
param(
    [string]$OutDir = "docs/states",
    [string[]]$Only,
    # Rebuild all-states.png from the PNGs already on disk, touching no device
    # and building nothing. -Only deliberately leaves the sheet alone, so after
    # re-shooting a single state the sheet is stale; without this the only way
    # to refresh it was a full nine-build sweep to recapture eight images that
    # had not changed.
    [switch]$SheetOnly
)

$ErrorActionPreference = 'Continue'

$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
if (-not (Test-Path $adb)) { throw "adb not found at $adb" }
$repo = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $repo $OutDir
New-Item -ItemType Directory -Force $dir | Out-Null

# file name -> mock-state.mjs state name
$states = @(
    @{ file = '1-baseline';     mock = 'baseline';     label = 'baseline' },
    @{ file = '2-night';        mock = 'night';        label = '23:00 to 07:00' },
    @{ file = '3-sunny';        mock = 'sunny';        label = 'sunny 25 deg: shades + cocktail' },
    @{ file = '4-cold';         mock = 'cold';         label = 'cold 10 deg: scarf + gloves' },
    @{ file = '5-freezing';     mock = 'freezing';     label = 'freezing 0 deg: + snowflake' },
    @{ file = '6-rainy';        mock = 'rainy';        label = 'rain 50%: umbrella up' },
    @{ file = '7-thunderstorm'; mock = 'thunderstorm'; label = 'storm 90%: bolt + startled' },
    @{ file = '8-sweating';     mock = 'sweating';     label = 'heart rate 120' },
    # Strictly a mark rather than a state, like the snowflake and the moon - but
    # unlike those two it appears in NO other snapshot, so leaving it out of the
    # sweep meant the only record that it exists was the XML. If a reaction
    # cannot be seen in docs/states, assume it will be believed missing.
    @{ file = '9-step-goal';    mock = 'goal';         label = 'step goal met: flag' }
)
$expected = @($states | ForEach-Object { "$($_.file).png" }) + @('0-ambient.png', 'all-states.png')

function Write-ContactSheet($written) {
    Add-Type -AssemblyName System.Drawing
    # Sort by filename, not capture order: ambient is captured last but numbered
    # 0, so without this the sheet ends with the state it should start with.
    $written = @($written | Sort-Object { [System.IO.Path]::GetFileName($_.path) })
    $cols = [Math]::Min(3, $written.Count)
    $cell = 220
    $labelH = 24
    $rows = [Math]::Ceiling($written.Count / $cols)
    $sheet = New-Object System.Drawing.Bitmap ($cols * $cell), ($rows * ($cell + $labelH))
    $g = [System.Drawing.Graphics]::FromImage($sheet)
    $g.Clear([System.Drawing.Color]::FromArgb(18, 18, 18))
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $font = New-Object System.Drawing.Font 'Segoe UI', 9
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

# Sheet-only: no device, no build, no mock. Reads what is already on disk.
if ($SheetOnly) {
    if ($Only) { throw "-SheetOnly rebuilds the sheet from every state on disk; -Only makes no sense with it." }
    $onDisk = @(@{ file = '0-ambient'; label = 'ambient' }) + $states
    $written = @()
    foreach ($s in $onDisk) {
        $p = Join-Path $dir "$($s.file).png"
        if (Test-Path $p) { $written += @{ path = $p; label = $s.label } }
        else { Write-Warning "missing $($s.file).png - it will be absent from the sheet" }
    }
    if (-not $written) { throw "no state PNGs in $dir - run a full sweep first." }
    Write-ContactSheet $written
    exit 0
}

$partial = $false
# 0-ambient is not in $states - it is a display mode, not a data state - so it
# has to be pulled out of -Only by hand before the filter drops it on the floor.
$wantAmbient = $false
if ($Only -and ($Only -contains '0-ambient')) {
    $wantAmbient = $true
    $Only = @($Only | Where-Object { $_ -ne '0-ambient' })
}
if ($Only -or $wantAmbient) {
    $states = @($states | Where-Object { $_.file -in $Only })
    if (-not $states -and -not $wantAmbient) { throw "-Only matched no states. Valid: $(($expected | Where-Object { $_ -ne 'all-states.png' }) -join ', ')" }
    $partial = $true
    $names = @($states | ForEach-Object { $_.file }) + @(if ($wantAmbient) { '0-ambient' })
    Write-Host "  partial run: $($names -join ', ')"
}

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

# Three distinct bad captures had to be told apart from a real one, and none is
# obvious from the file:
#   - a black frame, when the screen was off or mid transition
#   - the app launcher or a notification, when something was on top
#   - the AMBIENT face, when the screen dimmed. This one defeated brightness
#     checks entirely: ambient is thin white text on black, so it is bright and
#     sparse, which is exactly the signature of a good capture.
#   - a frame caught MID ambient crossfade, which is neither.
#
# Thresholds are measured, not guessed. Across a full sweep:
#     good states      max 247   lit 10-12%   sat 4.3-6.0%
#     mid-transition   max 217   lit 3.7%     sat 1.5%
#     dimmed           max 255   lit 7.3%     sat 3.0%
#     true ambient     max 217   lit 2.4%     sat 0.00%
# max is the sharp one: undimmed cream #fff6e8 is luminance 247 exactly.
# sat separates the face from ambient, which is strictly greyscale.
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

function Test-IsFace($path) {
    $s = Get-FrameStats $path
    if (-not $s) { return $false }
    return ($s.max -ge 240 -and $s.litFraction -lt 0.14 -and $s.satFraction -gt 0.035)
}

function Test-IsAmbient($path) {
    $s = Get-FrameStats $path
    if (-not $s) { return $false }
    return ($s.litFraction -lt 0.035 -and $s.satFraction -lt 0.005)
}

function Get-Timeout($serial) {
    $v = (& $adb -s $serial shell settings get system screen_off_timeout 2>$null | Select-Object -First 1)
    if ($v) { $v = $v.Trim() }
    if ($v -match '^\d+$') { return [int]$v }
    return $null
}
function Set-Timeout($serial, $ms) {
    & $adb -s $serial shell settings put system screen_off_timeout $ms 2>$null | Out-Null
}

# KEYCODE_WAKEUP ALONE DOES NOT LIFT THE WATCH OUT OF AOD. With always-on
# display the screen is already on - dumpsys power reports mWakefulness=Dozing -
# so the keyevent is a no-op and every capture comes back ambient. A TAP wakes
# it. The tap is sent AFTER the set-watchface broadcast so the face is the
# foreground surface when it lands: this face declares no ComplicationSlot so a
# tap on it does nothing, but a tap on the launcher would open an app.
function Wake($serial) {
    & $adb -s $serial shell input keyevent KEYCODE_WAKEUP 2>$null | Out-Null
    & $adb -s $serial shell am broadcast -a com.google.android.wearable.app.DEBUG_SURFACE `
        --es operation set-watchface --es watchFaceId de.redplant.watchface.blob 2>$null | Out-Null
    Start-Sleep -Milliseconds 400
    & $adb -s $serial shell input tap 213 213 2>$null | Out-Null
    Start-Sleep -Milliseconds 900
}

# KEYCODE_HOME TOGGLES on Wear OS: from the face it opens the launcher, from the
# launcher it returns. So it is the corrective action, not part of the normal
# path - sending it pre-emptively produced a whole run of app-icon grids.
function Nudge($serial) {
    & $adb -s $serial shell input keyevent KEYCODE_WAKEUP 2>$null | Out-Null
    & $adb -s $serial shell input keyevent KEYCODE_HOME 2>$null | Out-Null
    Start-Sleep -Milliseconds 1300
}

function Invoke-Mock($mockName) {
    Push-Location $repo
    try {
        & node tools/mock-state.mjs on $mockName 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            & node tools/mock-state.mjs on $mockName
            throw "mock-state.mjs failed for '$mockName'"
        }
        & cmd /c ".\gradlew.bat :watchface:installDebug --console=plain" 2>&1 | Out-Null
        $ok = ($LASTEXITCODE -eq 0)
        & node tools/mock-state.mjs off 2>&1 | Out-Null
        if (-not $ok) { throw "install failed for '$mockName'" }
    }
    finally { Pop-Location }
}

function Grab($serial, $file, $label) {
    $remote = "/data/local/tmp/wf_$file.png"
    $local = Join-Path $script:dir "$file.png"
    $ok = $false
    foreach ($attempt in 1..4) {
        & $adb -s $serial shell screencap -p $remote 2>$null | Out-Null
        & $adb -s $serial pull $remote $local 2>$null | Out-Null
        & $adb -s $serial shell rm $remote 2>$null | Out-Null
        if ((Test-Path $local) -and (Test-IsFace $local)) { $ok = $true; break }
        Write-Host "  retry $file (not the watch face)"
        Nudge $serial
        Wake $serial
    }
    if (-not $ok) { Write-Warning "  $file may show the launcher, a notification or ambient - not the face" }
    if (Test-Path $local) {
        $script:written += @{ path = $local; label = $label }
        Write-Host "  wrote $script:OutDir/$file.png  ($label)"
    }
    else { Write-Warning "  failed: $file" }
}

$written = @()

if (-not $partial) {
    Get-ChildItem -Path $dir -Filter '*.png' -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notin $expected } |
        ForEach-Object {
            Write-Host "  removing orphaned $($_.Name) (state renamed or dropped)"
            Remove-Item $_.FullName -Force -Confirm:$false
        }
}

# SCREEN TIMEOUT: read ONCE, restore ONCE, verified at the end.
# Wear OS drives AOD from wrist-down detection, not from this setting, so
# holding it open stops the screen BLANKING but not dimming - hence the frame
# checks above as well. An earlier version read and restored it in two places,
# and one restore hit a moment when Get-Watch returned nothing, so the next
# section adopted the elevated 600000 as its "original" and put that back,
# leaving the watch never sleeping.
$origTimeout = $null
$w = Get-Watch
if ($w) { $origTimeout = Get-Timeout $w }
if ($null -eq $origTimeout -or $origTimeout -ge 300000) { $origTimeout = 15000 }
Write-Host "  screen timeout was ${origTimeout}ms; holding it open for the sweep"

try {
    if ($w) { Set-Timeout $w 600000 }

    foreach ($s in $states) {
        Write-Host "  building $($s.mock)..."
        Invoke-Mock $s.mock
        $w = Get-Watch
        if (-not $w) { Write-Warning "  no device for $($s.file), skipping"; continue }
        Wake $w
        Grab $w $s.file $s.label
    }
}
catch { Write-Warning "  sweep aborted: $_" }

# Ambient. A display mode rather than a data state, so it uses the base values
# and its own timeout dance. Reachable on its own with -Only 0-ambient, which
# matters because it is the one snapshot that can regress from a change to the
# clock mock without any of the other eight moving.
if ((-not $partial) -or $wantAmbient) {
    try {
        Write-Host "  building ambient..."
        Invoke-Mock 'ambient'
        $w = Get-Watch
        if ($w) {
            $local = Join-Path $dir '0-ambient.png'
            $remote = '/data/local/tmp/wf_ambient.png'
            # ENTER_AMBIENT does not work: the broadcast is accepted but the
            # display will not dim a screen that was just woken, and capturing
            # requires waking it. Shorten the timeout and wait it out instead.
            Set-Timeout $w 3000
            $got = $false
            Wake $w
            foreach ($attempt in 1..5) {
                Start-Sleep -Seconds 7
                & $adb -s $w shell screencap -p $remote 2>$null | Out-Null
                & $adb -s $w pull $remote $local 2>$null | Out-Null
                & $adb -s $w shell rm $remote 2>$null | Out-Null
                if ((Test-Path $local) -and (Test-IsAmbient $local)) { $got = $true; break }
                Write-Host "  retry ambient (caught the crossfade, not settled AOD)"
                Wake $w
            }
            if (Test-Path $local) {
                $written += @{ path = $local; label = 'ambient' }
                Write-Host "  wrote $OutDir/0-ambient.png  (ambient)"
                if (-not $got) { Write-Warning "  ambient shot may not be settled AOD" }
            }
        }
    }
    catch { Write-Warning "  ambient capture failed: $_" }
}

# THE single timeout restore, retried and verified.
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
    Write-Warning "no device at the end of the run - run: adb shell settings put system screen_off_timeout $origTimeout"
}

# ---------------------------------------------------------------------------
# PUT THE REAL BUILD BACK ON THE WATCH.
#
# Invoke-Mock restores watchface.xml after each state but does NOT reinstall,
# so without this the watch is left running whichever state was captured last.
# It looks fine - it is the same face - and `mock-state.mjs status` reports
# "real values (clean)", because that inspects the working tree and knows
# nothing about the device. The gap between those two facts cost a full round
# of "the animation is frozen / the parallax is gone / the ambient font is
# wrong" bug reports, all three of which were the mock: it pins the clock
# sources, zeroes the accelerometer, and swaps the clock element out.
#
# This runs even on a partial run and even if captures failed. It is the last
# thing the script does to the device.
# ---------------------------------------------------------------------------
if ($w) {
    Write-Host "restoring the real build to the watch..."
    Push-Location $repo
    try {
        & node tools/mock-state.mjs off 2>&1 | Out-Null   # no-op when already clean
        # `cmd /c`, NOT `cmd \c`. With a backslash, cmd does not recognise the
        # switch, opens an INTERACTIVE shell, reads EOF, exits 0, and never runs
        # the command - so the install silently does not happen and the exit
        # code still says it did. Cost an hour of chasing three phantom bugs.
        $before = (& $adb -s $w shell dumpsys package de.redplant.watchface.blob 2>$null |
            Select-String 'lastUpdateTime' | Select-Object -First 1).ToString()
        & cmd /c ".\gradlew.bat :watchface:installDebug --console=plain" 2>&1 | Out-Null
        $gradleOk = ($LASTEXITCODE -eq 0)
        $after = (& $adb -s $w shell dumpsys package de.redplant.watchface.blob 2>$null |
            Select-String 'lastUpdateTime' | Select-Object -First 1).ToString()
        # Trust the DEVICE, not the exit code: the package's install timestamp
        # has to have actually moved.
        if ($gradleOk -and $after -ne $before) { "  real build reinstalled - the watch is showing live data again" }
        else { Write-Warning "  REINSTALL FAILED - the watch is STILL RUNNING A MOCK BUILD. Run: .\gradlew :watchface:installDebug" }
    }
    finally { Pop-Location }
}
else {
    Write-Warning "no device - the watch may still be running a MOCK build. Run: .\gradlew :watchface:installDebug"
}

# ---------------------------------------------------------------------------
# Contact sheet
# ---------------------------------------------------------------------------
if ($partial) {
    Write-Host "  partial run - all-states.png is now stale; refresh it with -SheetOnly"
}
elseif ($written.Count -gt 0) {
    Write-ContactSheet $written
}
