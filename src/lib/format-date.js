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
