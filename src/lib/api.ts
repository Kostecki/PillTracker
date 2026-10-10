// The app's calls to its server, with the signatures the queries use

import * as server from "~/server/functions";

import type { AppData, Dose, Settings, StockEvent } from "./types";

export function fetchData(): Promise<AppData> {
	return server.getData();
}

export function logDose(dose: Dose) {
	return server.logDose({ data: dose });
}

export function updateDose(dose: Dose) {
	return server.updateDoseTime({
		data: { id: dose.id, takenAt: dose.takenAt },
	});
}

export function deleteDose(id: string) {
	return server.deleteDose({ data: id });
}

export function addStock(event: StockEvent) {
	return server.addStock({ data: event });
}

export function updateStock(event: StockEvent) {
	return server.updateStock({ data: event });
}

export function deleteStock(id: string) {
	return server.deleteStock({ data: id });
}

export function setSetting(key: keyof Settings, value: string) {
	return server.setSetting({ data: { key, value } });
}
