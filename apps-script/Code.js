// Pill Tracker backend. Paste into Extensions → Apps Script of the sheet,
// set a TOKEN under Project Settings → Script Properties, then deploy as a
// web app (Execute as: Me, Who has access: Anyone).
//
// The sheet is only a database: the app writes every row, nothing is meant to
// be edited by hand.

// Day is the local date on the phone when the dose was logged, e.g. 2026-10-10.
// It decides which day a dose counts for, so travelling never moves it.
const LOG = {
	name: "Log",
	headers: ["Id", "Taken at", "Day"],
	setup: (sheet) => {
		sheet.getRange("B:B").setNumberFormat("yyyy-mm-dd hh:mm");
		sheet.getRange("C:C").setNumberFormat("@");
	},
};

// Stock ledger: Amount is what the entry says (pills in the box, or pills
// counted), Change is how much it moved the stock. Pills left = the sum of
// Change minus the number of doses, worked out in the app. Price is what a
// box cost in kr, optional and only for refills.
const STOCK = {
	name: "Stock",
	headers: ["Id", "At", "Type", "Amount", "Change", "Price"],
	setup: (sheet) => {
		sheet.getRange("B:B").setNumberFormat("yyyy-mm-dd hh:mm");
		sheet.getRange("F:F").setNumberFormat("#,##0.00");
	},
};

const STOCK_TYPES = ["refill", "count"];

// App settings, set from the app. Values are stored as plain text.
const SETTINGS = {
	name: "Settings",
	headers: ["Key", "Value"],
	setup: (sheet) => {
		sheet.getRange("B:B").setNumberFormat("@");
	},
};

// startDay: first day of tracking (YYYY-MM-DD); earlier days aren't "missed"
const SETTING_KEYS = ["startDay"];

function doGet(e) {
	if (!isAuthorized(e.parameter.token)) return json({ error: "unauthorized" });

	const doses = readRows(LOG).map(([id, takenAt, day]) => ({
		id: String(id),
		takenAt: new Date(takenAt).toISOString(),
		day: String(day),
	}));
	const stock = readRows(STOCK).map(
		([id, at, type, amount, change, price]) => ({
			id: String(id),
			at: new Date(at).toISOString(),
			type: String(type),
			amount: Number(amount),
			// Rows from before the Change column: a box simply added its amount
			change:
				change === ""
					? type === "refill"
						? Number(amount)
						: 0
					: Number(change),
			price: price === "" ? null : Number(price),
		}),
	);

	const settings = Object.fromEntries(
		readRows(SETTINGS).map(([key, value]) => [String(key), String(value)]),
	);

	return json({ doses, stock, settings });
}

function doPost(e) {
	const body = JSON.parse(e.postData.contents);
	// The token can also be in the URL, for callers like Home Assistant that
	// keep the whole URL as one secret
	if (!isAuthorized(body.token || e.parameter.token)) {
		return json({ error: "unauthorized" });
	}
	// Shows up under Executions in the Apps Script editor, for debugging
	// callers like the NFC shortcut
	const { token: _token, ...logged } = body;
	console.log(JSON.stringify(logged));

	const lock = LockService.getScriptLock();
	lock.waitLock(10000);
	try {
		switch (body.action) {
			case "log": {
				// Simple callers like the NFC shortcut send only takenAt, in local
				// time with its offset; the day and id are worked out from it
				const takenAt = new Date(body.takenAt);
				if (!body.takenAt || Number.isNaN(takenAt.getTime())) {
					return json({
						error: `takenAt is missing or not a time: "${body.takenAt ?? ""}"`,
					});
				}
				const day = body.day || localDay(body.takenAt);
				if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
					return json({
						error: body.day
							? `invalid day: "${body.day}"`
							: `takenAt needs a UTC offset to tell the day, e.g. 2026-10-10T21:03:00+02:00: "${body.takenAt}"`,
					});
				}
				// One dose per day: a retried request or a tap on another device is ignored
				if (!hasDoseOn(day)) {
					const sheet = getSheet(LOG);
					const row = sheet.getLastRow() + 1;
					// Plain text, or Sheets turns it into a midnight datetime
					sheet.getRange(row, 3).setNumberFormat("@");
					sheet
						.getRange(row, 1, 1, LOG.headers.length)
						.setValues([[body.id || Utilities.getUuid(), takenAt, day]]);
				}
				break;
			}
			case "updateDose": {
				// Only the time changes; the day a dose counts for stays the same
				const row = findRow(LOG, body.id);
				if (row === -1) return json({ error: `not found: ${body.id}` });
				getSheet(LOG).getRange(row, 2).setValue(new Date(body.takenAt));
				break;
			}
			case "delete":
				deleteRow(LOG, body.id);
				break;
			case "addStock": {
				if (!STOCK_TYPES.includes(body.type)) {
					return json({ error: `invalid type: ${body.type}` });
				}
				if (!isValidStock(body)) {
					return json({
						error: `invalid stock entry: ${JSON.stringify(logged)}`,
					});
				}
				// Ids come from the client, so a retried request doesn't add a duplicate
				if (findRow(STOCK, body.id) === -1) {
					getSheet(STOCK).appendRow([
						body.id,
						new Date(body.at),
						body.type,
						body.amount,
						body.change,
						body.price ?? "",
					]);
				}
				break;
			}
			case "updateStock": {
				const row = findRow(STOCK, body.id);
				if (row === -1) return json({ error: `not found: ${body.id}` });
				if (!isValidStock(body)) {
					return json({
						error: `invalid stock entry: ${JSON.stringify(logged)}`,
					});
				}
				getSheet(STOCK).getRange(row, 2).setValue(new Date(body.at));
				getSheet(STOCK)
					.getRange(row, 4, 1, 3)
					.setValues([[body.amount, body.change, body.price ?? ""]]);
				break;
			}
			case "setSetting": {
				if (
					!SETTING_KEYS.includes(body.key) ||
					typeof body.value !== "string"
				) {
					return json({ error: `invalid setting: ${body.key}` });
				}
				// An empty value removes the setting
				deleteRow(SETTINGS, body.key);
				if (body.value) getSheet(SETTINGS).appendRow([body.key, body.value]);
				break;
			}
			case "deleteStock":
				deleteRow(STOCK, body.id);
				break;
			default:
				return json({ error: `unknown action: ${body.action}` });
		}
	} finally {
		lock.releaseLock();
	}

	return json({ ok: true });
}

function isAuthorized(token) {
	const expected = PropertiesService.getScriptProperties().getProperty("TOKEN");
	return Boolean(expected) && token === expected;
}

// Sheets already looked up in this request
const sheets = {};

function getSheet(definition) {
	if (sheets[definition.name]) return sheets[definition.name];

	const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
	let sheet = spreadsheet.getSheetByName(definition.name);
	if (!sheet) {
		sheet = spreadsheet.insertSheet(definition.name);
		sheet.appendRow(definition.headers);
		sheet.setFrozenRows(1);
		definition.setup(sheet);
	}

	// Keep the header row in sync when columns are added
	const header = sheet.getRange(1, 1, 1, definition.headers.length);
	if (header.getValues()[0].join() !== definition.headers.join()) {
		header.setValues([definition.headers]);
	}
	sheets[definition.name] = sheet;
	return sheet;
}

function isValidStock(body) {
	return (
		STOCK_TYPES.includes(body.type) &&
		Number.isInteger(body.amount) &&
		body.amount >= 0 &&
		Number.isInteger(body.change) &&
		(body.price == null || (Number.isFinite(body.price) && body.price >= 0))
	);
}

/** All data rows that have an id, without the header row. */
function readRows(definition) {
	const sheet = getSheet(definition);
	const lastRow = sheet.getLastRow();
	if (lastRow < 2) return [];
	return sheet
		.getRange(2, 1, lastRow - 1, definition.headers.length)
		.getValues()
		.filter(([id]) => id);
}

/** 1-based row number of the row with this id, or -1. */
function findRow(definition, id) {
	const sheet = getSheet(definition);
	const lastRow = sheet.getLastRow();
	if (lastRow < 2) return -1;

	const ids = sheet
		.getRange(2, 1, lastRow - 1, 1)
		.getValues()
		.flat();
	const index = ids.indexOf(id);
	return index === -1 ? -1 : index + 2;
}

function deleteRow(definition, id) {
	const row = findRow(definition, id);
	if (row !== -1) getSheet(definition).deleteRow(row);
}

/**
 * The local day of a timestamp written with its UTC offset, e.g.
 * "2026-10-10T21:03:00+02:00" → "2026-10-10". A UTC time ("…Z") doesn't say
 * which day it was locally, so it gives undefined.
 */
function localDay(takenAt) {
	const match = /^(\d{4}-\d{2}-\d{2})T[^Z]*[+-]\d{2}:?\d{2}$/.exec(
		String(takenAt),
	);
	return match ? match[1] : undefined;
}

function hasDoseOn(day) {
	return readRows(LOG).some(([, , rowDay]) => String(rowDay) === day);
}

function json(value) {
	return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
		ContentService.MimeType.JSON,
	);
}
