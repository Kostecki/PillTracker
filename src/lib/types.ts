// Shared by the app and the server

export type Dose = {
	id: string;
	/** ISO 8601 timestamp (UTC) */
	takenAt: string;
	/**
	 * Local date on the phone when it was logged (YYYY-MM-DD). This decides
	 * which day the dose counts for, wherever you are later.
	 */
	day: string;
};

export type StockEvent = {
	id: string;
	/** ISO 8601 timestamp (UTC) */
	at: string;
	/** A refill is a new box of `amount` pills, a count is `amount` pills counted */
	type: "refill" | "count";
	amount: number;
	/**
	 * How much this entry moved the stock. Pills left = the sum of all changes
	 * minus the number of doses, so nothing depends on when things happened.
	 */
	change: number;
	/** What a box cost in kr. Optional, and only for refills. */
	price: number | null;
};

export type Settings = {
	/** First day of tracking (YYYY-MM-DD). Earlier days don't count as missed. */
	startDay?: string;
};

export type AppData = {
	doses: Dose[];
	stock: StockEvent[];
	settings: Settings;
};
