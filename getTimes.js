import fs from "fs";
import path from "path";
import { DateTime } from "luxon";

const TZ = "Europe/London";

export function getTimesForDate(dateISO) {
    const dt = DateTime.fromISO(dateISO, { zone: TZ });
    if (!dt.isValid) throw new Error(`Invalid date: ${dateISO}`);

    const monthKey = dt.toFormat("yyyy-MM");
    const filePath = path.join("data", `${monthKey}.json`);
    if (!fs.existsSync(filePath)) throw new Error(`No timetable file for ${monthKey}`);

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const times = data.days[dateISO];
    if (!times) throw new Error(`No prayer times for ${dateISO}`);

    return { date: dateISO, ...times };
}

export function getTodayTimes() {
    const todayISO = DateTime.now().setZone(TZ).toISODate();
    return getTimesForDate(todayISO);
}

export function getTomorrowTimes() {
    const tomorrowISO = DateTime.now().setZone(TZ).plus({ days: 1 }).toISODate();
    return getTimesForDate(tomorrowISO);
}