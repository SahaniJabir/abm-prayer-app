import fs from "fs";
import path from "path";
import { DateTime } from "luxon";

const TZ = "Europe/London";

export function getTodayTimes() {
    const today = DateTime.now().setZone(TZ);
    const dateKey = today.toISODate(); // YYYY-MM-DD
    const monthKey = today.toFormat("yyyy-MM"); // YYYY-MM

    const filePath = path.join("data", `${monthKey}.json`);
    if (!fs.existsSync(filePath)) {
        throw new Error(`No timetable file found for month ${monthKey}: ${filePath}`);
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const times = data.days[dateKey];

    if (!times) {
        throw new Error(`No prayer times found for ${dateKey} in ${monthKey}.json`);
    }

    // Return in a consistent order
    return {
        date: dateKey,
        timezone: data.timezone || TZ,
        fajr: times.fajr,
        sunrise: times.sunrise,
        zuhr: times.zuhr,
        asr: times.asr,
        maghrib: times.maghrib,
        isha: times.isha,
    };
}