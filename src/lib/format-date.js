/**
 * Format a catalog timestamp (or YYYY-MM-DD) as a calendar day in UTC.
 * Same instant → same day string for every viewer / prerender host.
 *
 * @param {string | number | null | undefined} value
 * @param {{
 *   locale?: string,
 *   year?: 'numeric' | '2-digit',
 *   month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow',
 *   day?: 'numeric' | '2-digit'
 * }} [opts]
 * @returns {string | null}
 */
export function formatCatalogDate(value, opts = {}) {
	if (value == null || value === '') return null;
	const raw = String(value);
	const { locale = 'en-US', ...dateOpts } = opts;
	/** @type {Date} */
	let d;
	if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
		const [y, m, day] = raw.split('-').map(Number);
		d = new Date(Date.UTC(y, m - 1, day));
	} else {
		d = new Date(value);
	}
	if (Number.isNaN(d.getTime())) return null;
	/** @type {Intl.DateTimeFormatOptions} */
	const options = {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		...dateOpts,
		timeZone: 'UTC'
	};
	for (const key of Object.keys(options)) {
		if (options[/** @type {keyof Intl.DateTimeFormatOptions} */ (key)] === undefined) {
			delete options[/** @type {keyof Intl.DateTimeFormatOptions} */ (key)];
		}
	}
	return d.toLocaleDateString(locale, options);
}

/**
 * YYYY-MM-DD for a Date in UTC (matches release `day` keys from ISO timestamps).
 * @param {Date} [dt=new Date()]
 * @returns {string}
 */
export function utcDayKey(dt = new Date()) {
	const y = dt.getUTCFullYear();
	const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
	const d = String(dt.getUTCDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/**
 * Convert the viewer's local calendar date to UTC midnight for day arithmetic.
 * @param {Date} date
 * @returns {number}
 */
function localDayStart(date) {
	const day = new Date(0);
	return day.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Format recent dates using the viewer's calendar day. Date-only values keep
 * their written day. Return null when the caller should use an absolute date.
 * @param {string | number | null | undefined} value
 * @param {Date} [now]
 * @returns {string | null}
 */
export function formatRelativeDay(value, now = new Date()) {
	if (value == null || value === '' || Number.isNaN(now.getTime())) return null;

	const dateOnly = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
	const date = new Date(dateOnly ? value + 'T00:00:00Z' : value);
	if (Number.isNaN(date.getTime())) return null;
	if (dateOnly && date.toISOString().slice(0, 10) !== value) return null;

	const publishedDay = dateOnly ? date.getTime() : localDayStart(date);
	const days = (localDayStart(now) - publishedDay) / 86_400_000;
	if (days <= 0) return 'Today';
	if (days === 1) return '1 day ago';
	if (days <= 30) return days + ' days ago';
	return null;
}
