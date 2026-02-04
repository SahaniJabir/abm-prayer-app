const TZ = "Europe/London";

function pad2(n) {
    return String(n).padStart(2, "0");
}

function to12h(hhmm) {
    // optional if you want AM/PM — currently we display HH:MM
    return hhmm;
}

function parseTodayTime(dateISO, hhmm) {
    // Create a Date object for local browser time using the date + hh:mm.
    // Since you’ll usually run this in the UK on your phone, it aligns well.
    // Later we can do a strict timezone conversion if needed.
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

    // Gregorian date
    const d = new Date(dateISO + "T00:00:00");
    gregEl.textContent = d.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    // Hijri date (built-in Intl, no library needed)
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
    // Order like your screenshot
    return [
        { key: "fajr", name: "FAJR", time: times.fajr },
        { key: "sunrise", name: "SUNRISE", time: times.sunrise },
        { key: "zuhr", name: "DHUHR", time: times.zuhr },
        { key: "asr", name: "ASR", time: times.asr },
        { key: "maghrib", name: "MAGHRIB", time: times.maghrib },
        { key: "isha", name: "ISHA", time: times.isha },
    ].map((p) => ({ ...p, when: parseTodayTime(dateISO, p.time) }));
}

function findNext(schedule, now) {
    for (const p of schedule) {
        if (p.when.getTime() > now.getTime()) return p;
    }
    // If all passed, next is tomorrow fajr (we’ll just show "Tomorrow Fajr")
    return null;
}

function renderList(schedule, now) {
    const list = document.getElementById("list");
    list.innerHTML = "";

    // Determine active (last passed)
    let activeIndex = -1;
    for (let i = 0; i < schedule.length; i++) {
        if (schedule[i].when.getTime() <= now.getTime()) activeIndex = i;
    }

    schedule.forEach((p, idx) => {
        const delta = p.when.getTime() - now.getTime(); // + future, - past
        const label = delta >= 0 ? `IN ${formatDelta(delta)}` : `${formatDelta(delta)} AGO`;

        const row = document.createElement("div");
        row.className = "row" + (idx === activeIndex ? " active" : "");

        row.innerHTML = `
      <div class="left">
        <div class="pname">${p.name}</div>
        <div class="ptime">${to12h(p.time)}</div>
      </div>
      <div class="pdelta">${label}</div>
    `;

        list.appendChild(row);
    });

    return activeIndex;
}

function setNextUI(next, now, schedule) {
    const nextName = document.getElementById("nextName");
    const nextIn = document.getElementById("nextIn");

    if (!next) {
        nextName.textContent = "FAJR";
        nextIn.textContent = "TOMORROW";
        return;
    }

    nextName.textContent = next.name;
    nextIn.textContent = `IN ${formatDelta(next.when.getTime() - now.getTime())}`;
}

function setRingProgress(now, schedule) {
    // Show progress from last prayer to next prayer
    const prog = document.getElementById("prog");
    const CIRC = 2 * Math.PI * 94; // r=94
    prog.setAttribute("stroke-dasharray", String(CIRC));

    // last passed and next
    let prev = null;
    let next = null;
    for (const p of schedule) {
        if (p.when.getTime() <= now.getTime()) prev = p;
        if (p.when.getTime() > now.getTime() && !next) next = p;
    }

    // If before fajr: prev is null. If after isha: next is null.
    if (!prev && next) {
        // progress from midnight to next
        const start = new Date(schedule[0].when);
        start.setHours(0, 0, 0, 0);
        const total = next.when - start;
        const done = now - start;
        const pct = Math.max(0, Math.min(1, done / total));
        prog.setAttribute("stroke-dashoffset", String(CIRC * (1 - pct)));
        return;
    }
    if (prev && !next) {
        // after isha: full ring
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

async function main() {
    const res = await fetch("/api/today");
    const data = await res.json();

    if (data.error) {
        document.body.innerHTML = `<div style="color:#ff6565;padding:20px;">${data.error}</div>`;
        return;
    }

    const dateISO = data.date;
    setClockAndDate(dateISO);

    let schedule = buildSchedule(dateISO, data);

    function tickUI() {
        const now = new Date();
        const next = findNext(schedule, now);
        setNextUI(next, now, schedule);
        renderList(schedule, now);
        setRingProgress(now, schedule);
    }

    tickUI();
    setInterval(tickUI, 1000);
}

main();