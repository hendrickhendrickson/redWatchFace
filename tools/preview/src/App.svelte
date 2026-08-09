<script lang="ts">
  import {
    DEFAULTS, DRIVEN, SOURCE_NAMES, STATE_NAMES, TILT_RANGE, build, changedBy,
    type Controls,
  } from './frame.ts'
  import { DAY_SECONDS } from './clock.ts'

  let c = $state<Controls>({ ...DEFAULTS })
  let playing = $state(false)
  /** Seconds of face time per second of wall time. */
  let rate = $state(1)
  let showValues = $state(false)

  const frame = $derived(build(c))
  const changed = $derived(changedBy(c.state))

  /**
   * ADVANCE THE CLOCK, DO NOT READ IT. The preview's clock is a control, so the
   * frame loop moves `secondsOfDay` by the elapsed wall time and everything else
   * follows. Reading the real clock would make the scrubber fight the animation.
   */
  $effect(() => {
    if (!playing) return
    let last = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      c.secondsOfDay = (c.secondsOfDay + dt * rate) % DAY_SECONDS
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  })

  /** Drag anywhere on the pad to tilt. Bounded by the face's own GYRO_CLAMP. */
  const onPad = (e: PointerEvent) => {
    if (e.buttons === 0 && e.type !== 'pointerdown') return
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const to = (v: number, size: number) => Math.round((v / size * 2 - 1) * TILT_RANGE)
    c.tiltX = to(e.clientX - r.left, r.width)
    c.tiltY = to(e.clientY - r.top, r.height)
  }

  const hhmm = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
</script>

<main>
  <section class="stage">
    <div class="face">{@html frame.svg}</div>
    <p class="caveat">
      450&times;450 design canvas. Not pixel truth: text metrics belong to the device
      (<code>SYNC_TO_DEVICE</code>), the ambient easing curves are approximated, and
      hardware reports 426 where the emulator reports 454. The wrist is the arbiter &mdash;
      <code>tools/cycle-states.ps1</code> is still the final word.
    </p>
  </section>

  <aside>
    <label class="row">
      <span>State</span>
      <select bind:value={c.state}>
        {#each STATE_NAMES as name (name)}<option value={name}>{name}</option>{/each}
      </select>
    </label>

    <fieldset>
      <legend>Clock &mdash; {frame.display.time} {frame.display.weekday}</legend>
      <div class="row">
        <button onclick={() => (playing = !playing)}>{playing ? 'Pause' : 'Play'}</button>
        <label>
          <span>&times;</span>
          <select bind:value={rate}>
            {#each [0.25, 1, 4, 60, 900] as r (r)}<option value={r}>{r}</option>{/each}
          </select>
        </label>
      </div>
      <input type="range" min="0" max={DAY_SECONDS - 1} step="0.05" bind:value={c.secondsOfDay} />
      <p class="hint">
        Drives <code>HOUR_0_23</code>, <code>MINUTE</code>, <code>SECOND</code> and
        <code>SECOND_MILLISECOND</code> from one value, so the clock text can never
        disagree with the night predicate. Watch at &times;1: 24 rain drops on
        independent phases, a 2s drip loop, a 3s z drift, a 2s controller pulse.
      </p>
    </fieldset>

    <fieldset>
      <legend>Ambient</legend>
      <div class="row">
        <button onclick={() => (c.ambient = 0)} class:on={c.ambient === 0}>Interactive</button>
        <button onclick={() => (c.ambient = 1)} class:on={c.ambient === 1}>Ambient</button>
      </div>
      <input type="range" min="0" max="1" step="0.01" bind:value={c.ambient} />
      <label class="row">
        <span>Direction</span>
        <select bind:value={c.toAmbient}>
          <option value={true}>going ambient</option>
          <option value={false}>coming back</option>
        </select>
      </label>
      <p class="hint">
        Scrub between the two. One pair of windows serves both directions, so
        <strong>going ambient leaves a 0.05 gap</strong> with neither clock copy drawn
        and <strong>coming back leaves an overlap</strong> with both. Hold the slider
        near 0.47 in each direction to see it. The clock survives its overlap because
        its two copies are congruent; the date's were not, which is why the date's was
        the first thing seen on a wrist.
      </p>
    </fieldset>

    <fieldset>
      <legend>Tilt &mdash; {c.tiltX}&deg;, {c.tiltY}&deg;</legend>
      <div
        class="pad"
        onpointerdown={onPad}
        onpointermove={onPad}
        role="slider"
        tabindex="0"
        aria-label="wrist tilt"
        aria-valuenow={c.tiltX}
      >
        <span style="left:{(c.tiltX / TILT_RANGE + 1) * 50}%; top:{(c.tiltY / TILT_RANGE + 1) * 50}%"></span>
      </div>
      <button onclick={() => { c.tiltX = 0; c.tiltY = 0 }}>Flat</button>
      <p class="hint">
        &plusmn;{TILT_RANGE}&deg;, the face's own <code>GYRO_CLAMP</code> &mdash; past it
        there is nothing more to see. <code>&lt;Gyro&gt;</code> is not inherited by
        siblings, so the gain is repeated seven times in the output; sweep the pad to
        the corners to check the hero's fist still sits on the umbrella shaft and the
        props still sit in the fist.
      </p>
    </fieldset>

    <fieldset>
      <legend>
        <button class="link" onclick={() => (showValues = !showValues)}>
          {showValues ? 'Hide' : 'Show'} sources
        </button>
      </legend>
      {#if showValues}
        <table>
          <tbody>
            {#each SOURCE_NAMES as s (s)}
              <tr class:changed={changed.has(s)} class:driven={DRIVEN.includes(s)}>
                <td>{s}</td><td>{Math.round(frame.values[s] * 100) / 100}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        <p class="hint">
          <span class="key changed"></span> set by this state
          <span class="key driven"></span> driven by the controls above
        </p>
      {/if}
    </fieldset>
  </aside>
</main>

<style>
  :global(body) {
    margin: 0;
    background: #16161a;
    color: #d8d6cc;
    font: 13px/1.5 system-ui, sans-serif;
  }
  main {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    padding: 1.5rem;
    align-items: flex-start;
  }
  .stage { flex: 0 0 auto; }
  /* A round bezel, because the face is designed for one and a square crop hides
     what falls off the edge. */
  .face {
    width: 450px;
    height: 450px;
    border-radius: 50%;
    overflow: hidden;
    background: #000;
    box-shadow: 0 0 0 6px #2a2a30;
  }
  .face :global(svg) { display: block; }
  .caveat { max-width: 450px; color: #8a8880; font-size: 11px; }
  aside { flex: 1 1 22rem; max-width: 30rem; display: grid; gap: 1rem; }
  fieldset { border: 1px solid #33333a; border-radius: 6px; padding: 0.75rem; margin: 0; }
  legend { color: #a8a69c; padding: 0 0.4rem; }
  .row { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; }
  input[type='range'] { width: 100%; }
  select, button {
    background: #22222a;
    color: inherit;
    border: 1px solid #3a3a44;
    border-radius: 4px;
    padding: 0.25rem 0.6rem;
    font: inherit;
  }
  button.on { background: #3f5f4a; border-color: #5a8a6a; }
  button.link { background: none; border: none; padding: 0; text-decoration: underline; cursor: pointer; }
  .hint { color: #77756e; font-size: 11px; margin: 0.5rem 0 0; }
  .pad {
    position: relative;
    aspect-ratio: 1;
    max-width: 11rem;
    border: 1px solid #3a3a44;
    border-radius: 6px;
    background:
      linear-gradient(#3a3a44, #3a3a44) center/1px 100% no-repeat,
      linear-gradient(#3a3a44, #3a3a44) center/100% 1px no-repeat;
    touch-action: none;
    cursor: crosshair;
    margin-bottom: 0.5rem;
  }
  .pad span {
    position: absolute;
    width: 10px; height: 10px;
    margin: -5px 0 0 -5px;
    border-radius: 50%;
    background: #e8b04a;
  }
  table { width: 100%; border-collapse: collapse; font-family: ui-monospace, monospace; font-size: 11px; }
  td { padding: 1px 4px; border-bottom: 1px solid #26262c; }
  td:last-child { text-align: right; }
  tr.changed td { color: #e8b04a; }
  tr.driven td { color: #6aa88a; }
  .key { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin: 0 0.2rem 0 0.6rem; }
  .key.changed { background: #e8b04a; }
  .key.driven { background: #6aa88a; }
</style>
