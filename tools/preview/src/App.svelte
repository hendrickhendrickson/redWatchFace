<script lang="ts">
	import { onMount } from 'svelte';
	import {
		DEFAULTS,
		FIELD_SPECS,
		GALLERY,
		SOURCE_NAMES,
		STATE_NAMES,
		TILT_RANGE,
		build,
		changedFrom,
		loadPreset,
		type Controls
	} from './frame.ts';
	import { DAY_SECONDS } from './clock.ts';
	import { dateValues } from './calendar.ts';
	import { currentClock, fetchWeatherFields } from './live.ts';

	let c = $state<Controls>({ ...DEFAULTS });
	let playing = $state(true);
	/** Seconds of face time per second of wall time. */
	let rate = $state(1);
	let showValues = $state(false);

	const frame = $derived(build(c));
	const changed = $derived(changedFrom(frame.values));

	/**
	 * Sentinel preset name for "now". Handled locally rather than through STATES -
	 * unlike every other preset, it is a live browser reading rather than a fixed
	 * face state build.ts or a device capture could reproduce, so it has no place
	 * in the table those tools share. See CURRENT's row in the presets UI below.
	 */
	const CURRENT = 'current';

	/**
	 * OPEN ON TODAY, NOT ON THE MOCKED BASELINE. The clock half is synchronous and
	 * always applies; the weather half is a best-effort network call - see
	 * live.ts. `baseline` in the Preset gallery still loads the fixed mock values
	 * if that's what's wanted back. Also reachable any time afterwards from the
	 * `current` preset, to return here after loading something else.
	 */
	const applyCurrent = () => {
		c = { ...c, ...currentClock(), ambient: 0 };
		fetchWeatherFields().then((fields) => {
			if (fields) {
				c.fields = { ...c.fields, ...fields };
			}
		});
	};

	const applyPreset = (name: string) => {
		if (name === CURRENT) {
			applyCurrent();
			return;
		}
		c = loadPreset(c, name);
	};

	onMount(applyCurrent);

	/**
	 * ADVANCE THE CLOCK, DO NOT READ IT. The preview's clock is a control, so the
	 * frame loop moves `secondsOfDay` by the elapsed wall time and everything else
	 * follows. Reading the real clock would make the scrubber fight the animation.
	 */
	$effect(() => {
		if (!playing) return;
		let last = performance.now();
		let raf = 0;
		const tick = (now: number) => {
			const dt = (now - last) / 1000;
			last = now;
			c.secondsOfDay = (c.secondsOfDay + dt * rate) % DAY_SECONDS;
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

	/**
	 * Drag anywhere on the pad to tilt. Bounded by the face's own GYRO_CLAMP: the ratio is
	 * clamped to [0, 1] before it is scaled, so a fast or off-pad drag cannot push the marker
	 * past its own edge. Pointer capture keeps the drag tracking even once the pointer leaves
	 * the pad's rect, and preventDefault stops the gesture from also starting a text selection.
	 */
	const onPad = (e: PointerEvent) => {
		// currentTarget is typed EventTarget because a listener can be attached to anything; this
		// one is attached to the pad <div> right below, in this same component, so the element type
		// is guaranteed here and nowhere assumed about a caller.
		const pad = e.currentTarget as HTMLElement;
		if (e.type === 'pointerdown') {
			pad.setPointerCapture(e.pointerId);
		} else if (e.buttons === 0) {
			return;
		}
		e.preventDefault();
		const r = pad.getBoundingClientRect();
		const to = (v: number, size: number) => {
			const ratio = Math.min(1, Math.max(0, v / size));
			return Math.round((ratio * 2 - 1) * TILT_RANGE);
		};
		c.tiltX = to(e.clientX - r.left, r.width);
		c.tiltY = to(e.clientY - r.top, r.height);
	};

	const releasePad = (e: PointerEvent) => {
		(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
	};

	/** Reset the picker to its placeholder after loading, since there's no persistent selection. */
	const onPickPreset = (e: Event & { currentTarget: HTMLSelectElement }) => {
		if (!e.currentTarget.value) return;
		applyPreset(e.currentTarget.value);
		e.currentTarget.selectedIndex = 0;
	};

	const onToggleField = (
		e: Event & { currentTarget: HTMLInputElement },
		key: (typeof FIELD_SPECS)[number]['key']
	) => {
		c.fields[key] = e.currentTarget.checked ? 1 : 0;
	};

	/** Recompute DAY_OF_WEEK from the real calendar - see Controls.dayOfWeek in frame.ts. */
	const onPickDate = (e: Event & { currentTarget: HTMLInputElement }) => {
		const iso = e.currentTarget.value;
		if (!iso) return;
		c.dateISO = iso;
		c.dayOfWeek = dateValues(iso).values.DAY_OF_WEEK ?? c.dayOfWeek;
	};

	const onPickTime = (e: Event & { currentTarget: HTMLInputElement }) => {
		const time = e.currentTarget.value;
		if (!time) return;
		const [h, m] = time.split(':').map((s) => parseInt(s, 10));
		c.secondsOfDay = h * 3600 + m * 60;
	};
</script>

<main>
	<section class="stage">
		<div class="face">{@html frame.svg}</div>
		<p class="caveat">450&times;450 pixel design canvas.</p>
	</section>

	<aside>
		<fieldset class="wide">
			<legend>Presets</legend>
			<label class="row">
				<span>Load state</span>
				<select value="" onchange={onPickPreset}>
					<option value="" disabled>Pick a state&hellip;</option>
					<option value={CURRENT}>current</option>
					{#each STATE_NAMES as name (name)}<option value={name}>{name}</option>{/each}
				</select>
			</label>
			<div class="gallery">
				<button class="thumb" onclick={() => applyPreset(CURRENT)} title="Return to now">
					<span class="thumb-face thumb-current">
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6" />
							<path
								d="M12 7v5.2l3.6 2"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</span>
					<span class="thumb-label">current</span>
				</button>
				{#each GALLERY as g (g.name)}
					<button class="thumb" onclick={() => applyPreset(g.name)} title={g.name}>
						<span class="thumb-face">{@html g.svg}</span>
						<span class="thumb-label">{g.name}</span>
					</button>
				{/each}
			</div>
			<p class="hint">Click on a state to load its values into every control here.</p>
		</fieldset>

		{#snippet fieldRow(spec: (typeof FIELD_SPECS)[number])}
			<label class="row">
				<span>{spec.label}</span>
				{#if spec.kind === 'slider'}
					<input
						type="range"
						min={spec.min}
						max={spec.max}
						step={spec.step}
						bind:value={c.fields[spec.key]}
					/>
					<span class="value">{c.fields[spec.key]}</span>
				{:else if spec.kind === 'number'}
					<input type="number" min={spec.min} step={spec.step} bind:value={c.fields[spec.key]} />
				{:else if spec.kind === 'toggle'}
					<input
						type="checkbox"
						checked={c.fields[spec.key] === 1}
						onchange={(e) => onToggleField(e, spec.key)}
					/>
				{:else if spec.kind === 'select'}
					<select bind:value={c.fields[spec.key]}>
						{#each spec.options as opt (opt.value)}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				{/if}
			</label>
		{/snippet}

		<fieldset class="wide">
			<legend>General</legend>
			<div class="row">
				<span>Mode</span>
			</div>
			<div class="row">
				<button onclick={() => (c.ambient = 0)} class:on={c.ambient === 0}>Interactive</button>
				<button onclick={() => (c.ambient = 1)} class:on={c.ambient === 1}>Ambient</button>
			</div>
			<div class="fields-grid">
				{#each FIELD_SPECS.filter((spec) => !spec.key.startsWith('WEATHER.')) as spec (spec.key)}
					{@render fieldRow(spec)}
				{/each}
			</div>
		</fieldset>

		<fieldset class="wide">
			<legend>Weather</legend>
			<div class="fields-grid">
				{#each FIELD_SPECS.filter((spec) => spec.key.startsWith('WEATHER.')) as spec (spec.key)}
					{@render fieldRow(spec)}
				{/each}
			</div>
		</fieldset>

		<fieldset>
			<legend>Time &amp; Date</legend>
			<label class="row">
				<span>Day</span>
				<input type="date" value={c.dateISO} onchange={onPickDate} />
			</label>
			<label class="row">
				<span>Weekday</span>
				<input type="text" value={frame.display.weekday} disabled />
			</label>
			<label class="row">
				<span>Time</span>
				<input type="time" value={frame.display.time} onchange={onPickTime} />
			</label>
			<div class="row">
				<button
					class="icon-btn"
					onclick={() => (playing = !playing)}
					aria-pressed={playing}
					aria-label={playing ? 'Pause' : 'Play'}
					title={playing ? 'Pause' : 'Play'}
				>
					{#if playing}
						<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
							<rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
							<rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
						</svg>
					{:else}
						<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
							<path
								d="M4 2.2v11.6a.6.6 0 0 0 .92.51l9.2-5.8a.6.6 0 0 0 0-1.02l-9.2-5.8A.6.6 0 0 0 4 2.2z"
								fill="currentColor"
							/>
						</svg>
					{/if}
				</button>
				<span class="rate-label">&times;</span>
				<input type="number" class="rate" min="0" step="0.25" bind:value={rate} />
			</div>
			<input type="range" min="0" max={DAY_SECONDS - 1} step="0.05" bind:value={c.secondsOfDay} />
			<p class="hint">
				The day/night and holiday predicates and the animations are derived from these.
			</p>
		</fieldset>

		<fieldset>
			<legend>Tilt</legend>
			<div
				class="pad"
				onpointerdown={onPad}
				onpointermove={onPad}
				onpointerup={releasePad}
				onpointercancel={releasePad}
				role="slider"
				tabindex="0"
				aria-label="wrist tilt"
				aria-valuenow={c.tiltX}
			>
				<span
					style="left:{(c.tiltX / TILT_RANGE + 1) * 50}%; top:{(c.tiltY / TILT_RANGE + 1) * 50}%"
				></span>
			</div>
			<label class="row">
				<span>X</span>
				<input type="number" value={c.tiltX} disabled />
			</label>
			<label class="row">
				<span>Y</span>
				<input type="number" value={c.tiltY} disabled />
			</label>
			<button
				onclick={() => {
					c.tiltX = 0;
					c.tiltY = 0;
				}}>Reset tilt</button
			>
			<p class="hint">The tilt is used for a parallax effect.</p>
		</fieldset>

		<fieldset>
			<legend> Sources </legend>
			<table>
				<tbody>
					{#each SOURCE_NAMES as s (s)}
						<tr class:changed={changed.has(s)}>
							<td>{s}</td><td>{Math.round(frame.values[s] * 100) / 100}</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<p class="hint">
				<span class="key changed"></span> differs from the baseline defaults
			</p>
		</fieldset>
	</aside>
</main>

<style>
	/*
   * THE PAGE ITSELF NEVER SCROLLS - only `aside` does, in its own box. Earlier
   * this was a sticky `.stage` on an ordinary scrolling page, which worked
   * two-column but broke stacked: once `aside` fell into normal flow below
   * `.stage`, scrolling the page meant scrolling `aside` PAST/UNDER the still-
   * pinned stage, which read as broken regardless of whether the stage had a
   * background. Fixing the viewport height instead removes the page scroll
   * entirely, so there is nothing left for `aside` to pass behind.
   */
	:global(html, body) {
		height: 100%;
	}
	:global(body) {
		margin: 0;
		overflow: hidden;
		background: #16161a;
		color: #d8d6cc;
		font:
			13px/1.5 system-ui,
			sans-serif;
		/* One accent family, teal, so a slider thumb and a hover border read as the
       same "this is interactive/active" signal instead of two unrelated ones. */
		--accent: #6aa88a;
		--accent-strong: #5a8a6a;
	}
	:global(#app) {
		height: 100%;
	}
	/* Widths here are set on elements that also carry padding and a border (every
     fieldset and input), so border-box is what makes those widths mean what they
     say at any viewport size. */
	:global(*),
	:global(*::before),
	:global(*::after) {
		box-sizing: border-box;
	}
	/*
	 * MOBILE-FIRST COLUMN, ROW ABOVE THE BREAKPOINT. Stacked, `.stage` sizes to
	 * its own content and `aside` (`flex: 1 1 auto` + `min-height: 0` below)
	 * takes the rest of the 100vh and scrolls internally. Side-by-side, both
	 * columns span the full height and `aside` scrolls in its own box instead.
	 * Either way `.stage` never moves and is never scrolled behind.
	 */
	main {
		display: flex;
		flex-direction: column;
		height: 100vh;
		height: 100dvh;
		gap: 1.5rem;
		padding: 1rem 1.5rem;
		box-sizing: border-box;
	}
	@media (min-width: 900px) {
		main {
			flex-direction: row;
			align-items: stretch;
		}
	}
	/*
	 * SHRINKS, BUT NEVER GROWS PAST THE DESIGN CANVAS. 450px is what the face is
	 * authored at, so drawing it larger would invite reading detail the watch
	 * cannot show - `max-width` caps that. Shrinking is harmless, since the SVG
	 * has a viewBox and scales.
	 */
	.stage {
		flex: 0 0 auto;
		width: 100%;
		max-width: 450px;
	}
	@media (min-width: 900px) {
		.stage {
			flex: 1 1 320px;
			min-width: min(280px, 100%);
			align-self: flex-start;
		}
	}
	/* A round bezel, because the face is designed for one and a square crop hides
     what falls off the edge. `aspect-ratio` keeps it circular at every width. */
	.face {
		width: 100%;
		aspect-ratio: 1;
		border-radius: 50%;
		overflow: hidden;
		background: #000;
		box-shadow: 0 0 0 6px #2a2a30;
	}
	/* The SVG carries width="450" height="450" attributes; these override them so
     it scales with its container instead of fixing the stage at 450px. */
	.face :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}
	.caveat {
		max-width: 100%;
		color: #8a8880;
		font-size: 11px;
	}
	/*
   * A PLAIN GRID, DELIBERATELY NOT `columns`. A CSS multi-column flow packed the
   * short fieldsets into whichever column was shortest, but it also forced the
   * 13-row Data points fieldset into a single narrow track (a multicol track
   * never grows to fit content) and fought `break-inside: avoid` on that same
   * tall block for which column got the leftover blank space - the "so much
   * empty space, and it looks broken" a reader sees when a browser resolves that
   * fight differently than expected. A grid's rows can size to the tallest cell
   * in a row, but giving the two content-heavy sections (Preset's gallery, Data
   * points) `.wide` - a full-width row of their own - means the only fieldsets
   * left to share a row are Date/Clock/Ambient/Tilt/Show sources, which are all
   * close enough in height that the mismatch barely shows.
   */
	aside {
		flex: 1 1 auto;
		/* The default flex-item min-height/min-width is its content's, which is
	     taller/wider than the 100vh main gives it - so without this, aside
	     refuses to shrink to fit and just grows main (and the page) past the
	     viewport instead of scrolling internally. */
		min-height: 0;
		min-width: 0;
		overflow-y: auto;
		padding-right: 0.25rem;
		display: grid;
		/* `min(16rem, 100%)`, not a bare 16rem: below a 16rem-wide container a bare
       minimum is larger than the track it sits in, and the grid overflows rather
       than collapsing to one column. This is the idiom that makes auto-fit safe
       at any width. Same for .fields-grid below. */
		grid-template-columns: repeat(auto-fit, minmax(min(16rem, 100%), 1fr));
		grid-auto-rows: min-content;
		align-items: start;
		align-content: start;
		gap: 1rem;
	}
	@media (min-width: 900px) {
		aside {
			flex-basis: 480px;
		}
	}
	.wide {
		grid-column: 1 / -1;
	}
	fieldset {
		/* A grid item's default min-width is its content's, not its column's - so a
       fieldset with a wide, unconstrained child (the rate number input used to
       be exactly this) refused to shrink to its column and spilled into the
       fieldset next to it instead of wrapping. This is what makes it shrink. */
		min-width: 0;
		border: 1px solid #33333a;
		border-radius: 6px;
		padding: 0.6rem 0.75rem;
		margin: 0;
	}
	legend {
		color: #a8a69c;
		padding: 0 0.4rem;
	}
	.row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		margin-bottom: 0.4rem;
		min-width: 0;
	}
	.row > span:first-child {
		flex: 0 0 auto;
		min-width: 6rem;
	}
	.row .value {
		min-width: 3rem;
		text-align: right;
		font-family: ui-monospace, monospace;
	}
	.row .rate-label {
		flex: 0 0 auto;
	}
	input[type='range'] {
		flex: 1 1 auto;
		width: 100%;
		min-width: 4rem;
	}
	/* As many columns as fit at >=17rem each - wide enough for the worst-case row
     (a 6rem label, a slider and a 3rem value), which 12rem was not: rows that
     didn't fit their column still occupied it at full content width and spilled
     into the next one, reading as "everything overlaps". */
	.fields-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(17rem, 100%), 1fr));
		gap: 0.3rem 1rem;
	}
	.fields-grid .row {
		margin-bottom: 0;
	}
	input[type='date'],
	input[type='number'],
	input[type='text'],
	input[type='time'] {
		background: #22222a;
		color: inherit;
		border: 1px solid #3a3a44;
		border-radius: 4px;
		padding: 0.25rem 0.6rem;
		font: inherit;
	}
	/* Unconstrained, a number/text/time input sizes to a browser default that is
     wider than almost every value this UI ever puts in one - the same overflow
     the rate input used to cause. Each gets just enough room for what it holds. */
	input[type='number'] {
		width: 6rem;
	}
	input[type='number'].rate {
		width: 4rem;
	}
	input[type='text'] {
		width: 4rem;
	}
	input[type='time'] {
		width: 5.5rem;
	}
	/* A disabled input is a READOUT, not a dimmed control - no border glow, no
     pointer cursor, no hover lift, and text quiet enough to read as "reporting a
     value" rather than "waiting to be clicked". */
	input:disabled {
		color: #8a8880;
		border-color: #2a2a30;
		background: #1c1c20;
		cursor: default;
	}
	select,
	button {
		background: #22222a;
		color: inherit;
		border: 1px solid #3a3a44;
		border-radius: 4px;
		padding: 0.25rem 0.6rem;
		font: inherit;
		cursor: pointer;
	}
	button.on {
		background: #3f5f4a;
		border-color: var(--accent-strong);
	}
	.icon-btn {
		width: 2rem;
		padding: 0.25rem 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	/* Every clickable/editable control gets the same lift on hover, so the eye can
     tell what's interactive without reading the whole legend - excluding disabled
     inputs, which aren't editable and shouldn't invite a click that does nothing. */
	select:hover,
	button:not(:disabled):hover,
	input[type='date']:not(:disabled):hover,
	input[type='number']:not(:disabled):hover,
	input[type='text']:not(:disabled):hover,
	input[type='time']:not(:disabled):hover {
		border-color: var(--accent-strong);
		background: #282830;
	}
	button.on:hover {
		background: #4a704f;
	}
	input[type='checkbox'] {
		cursor: pointer;
		accent-color: var(--accent);
	}
	input[type='range'] {
		accent-color: var(--accent);
		cursor: pointer;
	}
	.hint {
		color: #77756e;
		font-size: 11px;
		margin: 0.5rem 0 0;
	}
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
		user-select: none;
		-webkit-user-select: none;
		cursor: crosshair;
		margin-bottom: 0.5rem;
	}
	.pad:hover {
		border-color: var(--accent-strong);
	}
	.pad span {
		position: absolute;
		width: 10px;
		height: 10px;
		margin: -5px 0 0 -5px;
		border-radius: 50%;
		background: var(--accent);
	}
	.gallery {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		max-height: 16rem;
		overflow-y: auto;
		padding-top: 0.25rem;
	}
	.thumb {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		width: 3.4rem;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		color: inherit;
	}
	.thumb-face {
		display: block;
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		overflow: hidden;
		background: #000;
		border: 1px solid #3a3a44;
	}
	.thumb-face :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}
	.thumb:hover .thumb-face {
		border-color: var(--accent-strong);
	}
	/* The one thumb with no rendered face - a live reading has no fixed frame to
	   snapshot - so it gets an icon instead, coloured like the rest of the chrome
	   rather than the watch-black every other thumb-face sits on. */
	.thumb-current {
		display: flex;
		align-items: center;
		justify-content: center;
		background: #1c1c20;
		color: #8a8880;
	}
	.thumb:hover .thumb-current {
		color: var(--accent);
	}
	.thumb-label {
		font-size: 9px;
		color: #8a8880;
		max-width: 3.4rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-family: ui-monospace, monospace;
		font-size: 11px;
	}
	td {
		padding: 1px 4px;
		border-bottom: 1px solid #26262c;
	}
	td:last-child {
		text-align: right;
	}
	tr.changed td {
		color: var(--accent);
	}
	.key {
		display: inline-block;
		width: 9px;
		height: 9px;
		border-radius: 2px;
		margin: 0 0.2rem 0 0.6rem;
	}
	.key.changed {
		background: var(--accent);
	}
</style>
