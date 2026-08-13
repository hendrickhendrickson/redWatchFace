/**
 * Real time and weather, for the previewer's initial defaults.
 *
 * DÜSSELDORF, HARDWIRED. The previewer runs in a browser with no reliable device
 * location, and prompting for one just to show today's weather is a worse first
 * run than a fixed, known city - Open-Meteo takes coordinates, not a place name,
 * so this is the input to that one call and nothing else reads it.
 *
 * A BEST-EFFORT PATCH, NOT A REQUIREMENT. The clock half is free - `new Date()`
 * on the machine already running this page - and always applies. The weather
 * half is one network call that can fail (offline, blocked, Open-Meteo down),
 * and a previewer that refused to start over a failed fetch would be worse than
 * one that quietly keeps its mocked weather defaults instead.
 */

import type { Controls } from './frame.ts';
import { dateValues } from './calendar.ts';

const DUSSELDORF = { latitude: 51.2277, longitude: 6.7735 };

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * The LOCAL date and time-of-day, not UTC.
 *
 * `Date#toISOString()` is UTC, so anyone east of Greenwich in the evening would
 * see tomorrow's date - and `HOUR_0_23` would disagree with it, the exact
 * fault calendar.ts and clock.ts both exist to make impossible for the mocked
 * controls.
 */
const localISODate = (d: Date): string =>
	`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const localSecondsOfDay = (d: Date): number =>
	d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;

/** The date, weekday and time-of-day this machine's clock reads right now. */
export const currentClock = (): Pick<Controls, 'dateISO' | 'dayOfWeek' | 'secondsOfDay'> => {
	const now = new Date();
	const dateISO = localISODate(now);
	return {
		dateISO,
		dayOfWeek: dateValues(dateISO).values.DAY_OF_WEEK ?? 0,
		secondsOfDay: localSecondsOfDay(now)
	};
};

/**
 * WMO weather codes (Open-Meteo's `weather_code`) collapsed onto the three
 * `WEATHER.CONDITION` values the face treats specially - see states.ts's own
 * comment on why there is no exhaustive list there: an unverified code is meant
 * to fall through to a generic cloud icon, and 14 (partly cloudy) is the
 * closest of the three to that fallback.
 */
const conditionFromWmo = (code: number): number => {
	if (code === 0) {
		return 1; // clear
	}
	if ((code >= 51 && code <= 67) || (code >= 80 && code <= 99)) {
		return 12; // drizzle, rain, showers, thunderstorm
	}
	return 14; // partly cloudy, overcast, fog, snow - no closer match among the three
};

/**
 * Düsseldorf's current weather from Open-Meteo, as a `fields` patch.
 *
 * READ DEFENSIVELY, NOT SCHEMA-VALIDATED. This crosses a trust boundary - a
 * third-party API - and /hhson-validation's answer is normally a zod schema at
 * the edge, but tools/preview deliberately carries no dependency beyond its own
 * devDependencies (see CLAUDE.md). A malformed or missing field here is meant
 * to be no worse than a fetch that failed outright: this returns `undefined`
 * rather than throwing, and the caller keeps whatever mocked weather it had.
 */
export const fetchWeatherFields = async (): Promise<Partial<Controls['fields']> | undefined> => {
	const url =
		`https://api.open-meteo.com/v1/forecast?latitude=${DUSSELDORF.latitude}` +
		`&longitude=${DUSSELDORF.longitude}&current=temperature_2m,weather_code,is_day,precipitation` +
		`&timezone=auto`;
	try {
		const response = await fetch(url);
		if (!response.ok) {
			return undefined;
		}
		const body: unknown = await response.json();
		if (typeof body !== 'object' || body === null || !('current' in body)) {
			return undefined;
		}
		const current = (body as { current: unknown }).current;
		if (typeof current !== 'object' || current === null) {
			return undefined;
		}
		const {
			temperature_2m: temperature,
			weather_code: code,
			is_day: isDay,
			precipitation
		} = current as Record<string, unknown>;
		if (
			typeof temperature !== 'number' ||
			typeof code !== 'number' ||
			typeof isDay !== 'number' ||
			typeof precipitation !== 'number'
		) {
			return undefined;
		}
		return {
			'WEATHER.IS_AVAILABLE': 1,
			'WEATHER.TEMPERATURE': Math.round(temperature),
			'WEATHER.CONDITION': conditionFromWmo(code),
			'WEATHER.IS_DAY': isDay,
			// Open-Meteo's `current` block has no precipitation PROBABILITY, only an
			// observed amount - a rough stand-in, not the forecast field the mocked
			// states use, but enough to make the rain layer agree with what it's
			// raining on right now.
			'WEATHER.CHANCE_OF_PRECIPITATION': precipitation > 0 ? 80 : 0
		};
	} catch {
		return undefined;
	}
};
