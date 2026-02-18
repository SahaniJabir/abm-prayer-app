function pad2(n) {
    return String(n).padStart(2, "0");
}

function dayName(dateISO) {
    const d = new Date(dateISO + "T00:00:00");
    return d.toLocaleDateString(undefined, { weekday: "long" });
}
function parseTime(dateISO, hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date(dateISO + "T00:00:00");
    d.setHours(h, m, 0, 0);
    return d;
}

function formatDelta(ms) {
    const s = Math.floor(Math.abs(ms) / 1000);
    const mins = Math.floor(s / 60);
    const hrs = Math.floor(mins / 60);
    const remM = mins % 60;
    if (hrs > 0) return `${pad2(hrs)}H ${pad2(remM)}M`;
    return `${pad2(remM)}M`;
}

function setClockAndDate(dateISO) {
    const clockEl = document.getElementById("clock");
    const gregEl = document.getElementById("greg");
    const hijriEl = document.getElementById("hijri");

    const d = new Date(dateISO + "T00:00:00");
    gregEl.textContent = d.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    try {
        const hijri = new Intl.DateTimeFormat("en-TN-u-ca-islamic", {
            day: "numeric",
            month: "long",
            year: "numeric",
        }).format(d);
        hijriEl.textContent = hijri.toUpperCase();
    } catch {
        hijriEl.textContent = "";
    }

    function tick() {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    tick();
    setInterval(tick, 1000);
}

function buildSchedule(dateISO, times) {
    return [
        { key: "fajr", name: "FAJR", time: times.fajr },
        { key: "sunrise", name: "SUNRISE", time: times.sunrise },
        { key: "zuhr", name: "DHUHR", time: times.zuhr },
        { key: "asr", name: "ASR", time: times.asr },
        { key: "maghrib", name: "MAGHRIB", time: times.maghrib },
        { key: "isha", name: "ISHA", time: times.isha },
    ].map((p) => ({ ...p, when: parseTime(dateISO, p.time) }));
}

function renderList(schedule, now) {
    const list = document.getElementById("list");
    list.innerHTML = "";

    let activeIndex = -1;
    for (let i = 0; i < schedule.length; i++) {
        if (schedule[i].when.getTime() <= now.getTime()) activeIndex = i;
    }

    schedule.forEach((p, idx) => {
        const delta = p.when.getTime() - now.getTime();
        const label = delta >= 0 ? `IN ${formatDelta(delta)}` : `${formatDelta(delta)} AGO`;

        const row = document.createElement("div");
        row.className = "row" + (idx === activeIndex ? " active" : "");
        row.innerHTML = `
      <div class="left">
        <div class="pname">${p.name}</div>
        <div class="ptime">${p.time}</div>
      </div>
      <div class="pdelta">${label}</div>
    `;
        list.appendChild(row);
    });
}

function setRingProgress(now, schedule) {
    const prog = document.getElementById("prog");
    const CIRC = 2 * Math.PI * 94;
    prog.setAttribute("stroke-dasharray", String(CIRC));

    let prev = null;
    let next = null;
    for (const p of schedule) {
        if (p.when.getTime() <= now.getTime()) prev = p;
        if (p.when.getTime() > now.getTime() && !next) next = p;
    }

    if (!prev && next) {
        const start = new Date(schedule[0].when);
        start.setHours(0, 0, 0, 0);
        const total = next.when - start;
        const done = now - start;
        const pct = Math.max(0, Math.min(1, done / total));
        prog.setAttribute("stroke-dashoffset", String(CIRC * (1 - pct)));
        return;
    }

    if (prev && !next) {
        prog.setAttribute("stroke-dashoffset", "0");
        return;
    }

    if (!prev || !next) {
        prog.setAttribute("stroke-dashoffset", String(CIRC));
        return;
    }

    const total = next.when.getTime() - prev.when.getTime();
    const done = now.getTime() - prev.when.getTime();
    const pct = Math.max(0, Math.min(1, done / total));
    prog.setAttribute("stroke-dashoffset", String(CIRC * (1 - pct)));
}

function setRingProgressAcrossMidnight(now, todaySchedule, tomorrowFajr) {
    const prog = document.getElementById("prog");
    const CIRC = 2 * Math.PI * 94;
    prog.setAttribute("stroke-dasharray", String(CIRC));

    const ishaToday = todaySchedule.find((x) => x.key === "isha");
    if (!ishaToday) {
        prog.setAttribute("stroke-dashoffset", String(CIRC));
        return;
    }

    const start = ishaToday.when.getTime();
    const end = tomorrowFajr.when.getTime();
    const total = end - start;
    const done = now.getTime() - start;

    const pct = Math.max(0, Math.min(1, done / total));
    prog.setAttribute("stroke-dashoffset", String(CIRC * (1 - pct)));
}

async function fetchDate(dateISO) {
    const r = await fetch(`/api/day?date=${dateISO}`);
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return j;
}

async function findNextSmart(todaySchedule, now, todayISO) {
    for (const p of todaySchedule) {
        if (p.when.getTime() > now.getTime()) {
            return { next: p, nextIsTomorrow: false, tomorrowFajr: null, tomorrowISO: null };
        }
    }

    // After Isha: get tomorrow and return tomorrow fajr
    const tmr = new Date(todayISO + "T00:00:00");
    tmr.setDate(tmr.getDate() + 1);
    const tomorrowISO = tmr.toISOString().slice(0, 10);

    const r = await fetch(`/api/day?date=${tomorrowISO}`);
    const tdata = await r.json();
    if (tdata.error) throw new Error(tdata.error);

    const tomorrowSchedule = buildSchedule(tomorrowISO, tdata);
    const fajrTomorrow = tomorrowSchedule.find((x) => x.key === "fajr");

    return { next: fajrTomorrow, nextIsTomorrow: true, tomorrowFajr: fajrTomorrow, tomorrowISO };
}

async function fetchDate(dateISO) {
    const r = await fetch(`/api/day?date=${dateISO}`);
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return j;
}

function weekdayUpper(dateISO) {
    const d = new Date(dateISO + "T00:00:00");
    return d.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase();
}

async function main() {
    let mode = "today"; // "today" | "date"
    let selectedISO = null;

    // Load today's data once
    const todayData = await (await fetch("/api/today")).json();
    if (todayData.error) throw new Error(todayData.error);

    setClockAndDate(todayData.date);

    // Setup date picker
    const datePicker = document.getElementById("datePicker");
    const btnToday = document.getElementById("btnToday");

    // default value = today
    const todayISO = todayData.date;
    datePicker.value = todayISO;

    // Cache for selected date data to avoid refetching every second
    const cache = new Map(); // dateISO -> data

    async function getDataForSelected() {
        if (!cache.has(selectedISO)) {
            cache.set(selectedISO, await fetchDate(selectedISO));
        }
        return cache.get(selectedISO);
    }

    async function render() {
        const now = new Date();

        // DATE MODE (selected date)
        if (mode === "date") {
            const data = await getDataForSelected();
            const schedule = buildSchedule(data.date, data);

            document.getElementById("nextName").textContent = weekdayUpper(data.date);
            document.getElementById("nextIn").textContent = data.date;

            // Show that date's list
            renderList(schedule, now);

            // Ring can just be a "static" progress for that day
            setRingProgress(new Date(data.date + "T00:00:00"), schedule);
            return;
        }

        // TODAY MODE (live countdown + smart next prayer)
        const schedule = buildSchedule(todayData.date, todayData);
        renderList(schedule, now);

        const { next, nextIsTomorrow, tomorrowFajr } = await findNextSmart(
            schedule,
            now,
            todayData.date
        );

        if (nextIsTomorrow) {
            document.getElementById("nextName").textContent = "FAJR";
            document.getElementById("nextIn").textContent =
                `IN ${formatDelta(next.when.getTime() - now.getTime())}`;
            setRingProgressAcrossMidnight(now, schedule, tomorrowFajr);
        } else {
            document.getElementById("nextName").textContent = next.name;
            document.getElementById("nextIn").textContent =
                `IN ${formatDelta(next.when.getTime() - now.getTime())}`;
            setRingProgress(now, schedule);
        }
    }

    // Today button
    btnToday.addEventListener("click", () => {
        mode = "today";
        selectedISO = null;
        // set picker back to today (optional)
        datePicker.value = todayISO;
    });

    // Date picker: load immediately on change
    datePicker.addEventListener("change", async () => {
        const picked = datePicker.value; // YYYY-MM-DD
        if (!picked) return;

        // If user picks today -> go back to today mode
        if (picked === todayISO) {
            mode = "today";
            selectedISO = null;
            return;
        }

        // IMPORTANT: don't switch UI yet.
        // First try to fetch & validate the data.
        try {
            // Try to fetch immediately
            const data = await fetchDate(picked);

            // If successful, NOW switch mode/date and cache it
            cache.set(picked, data);
            mode = "date";
            selectedISO = picked;

            // Render once immediately
            await render();
        } catch (e) {
            // If it fails: show message, then revert picker back to Today
            alert(e.message);

            // Revert picker to today
            datePicker.value = todayISO;

            // Keep today mode (circle/list remains today)
            mode = "today";
            selectedISO = null;

            // Optional: re-render today immediately (safe)
            await render().catch(() => { });
        }
    });

    // Initial render + keep updating (today mode updates every second)
    await render();
    setInterval(() => {
        // only auto-refresh continuously in TODAY mode
        if (mode === "today") {
            render().catch(() => { });
        }
    }, 1000);
}

main().catch((e) => {
    document.body.innerHTML = `<div style="color:#ff6565;padding:20px;">${e.message}</div>`;
});

