import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { getTodayTimes } from "./getTodayTimes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve PWA assets
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/today", (req, res) => {
    try {
        res.json(getTodayTimes());
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/", (req, res) => {
    // Main app shell. Data is fetched client-side from /api/today.
    res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>ABM Prayer Times</title>

  <link rel="manifest" href="/manifest.webmanifest">
  <meta name="theme-color" content="#0f1115">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">

  <style>
    :root{
      --bg:#0f1115;
      --card:#161a20;
      --text:#e9edf3;
      --muted:#9aa3ad;
      --accent:#9ad14b;
      --divider:#222833;
      --danger:#ff6565;
    }
    *{box-sizing:border-box;}
    body{
      margin:0;
      background:var(--bg);
      color:var(--text);
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial;
      padding: 18px 16px 28px;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }
    .top{
      text-align:center;
      margin-top: 4px;
    }
    .hijri{color:var(--muted); font-size:13px; letter-spacing: .3px;}
    .greg{color:var(--muted); font-size:14px; margin-top:6px;}
    .clock{
      font-size: 34px;
      font-weight: 600;
      margin-top: 10px;
    }

    .ringWrap{
      margin: 18px auto 6px;
      width: 250px;
      height: 250px;
      display:flex;
      align-items:center;
      justify-content:center;
      position: relative;
    }
    .ringCenter{
      position:absolute;
      text-align:center;
      width: 210px;
      padding-top: 4px;
    }
    .nextLabel{
      color:var(--muted);
      font-size: 12px;
      letter-spacing: 1.2px;
      margin-bottom: 6px;
    }
    .nextName{
      font-size: 22px;
      font-weight: 700;
      letter-spacing: .5px;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .nextIn{
      color: var(--muted);
      font-size: 14px;
      letter-spacing: .4px;
    }

    .list{
      max-width: 430px;
      margin: 12px auto 0;
      display:flex;
      flex-direction:column;
      gap: 10px;
    }
    .row{
      background:var(--card);
      border: 1px solid var(--divider);
      border-radius: 14px;
      padding: 12px 12px;
      display:flex;
      align-items:center;
      justify-content: space-between;
    }
    .left{
      display:flex;
      align-items:baseline;
      gap: 10px;
    }
    .pname{
      width: 90px;
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 1px;
      color: var(--muted);
    }
    .ptime{
      font-size: 18px;
      font-weight: 700;
      letter-spacing: .2px;
    }
    .pdelta{
      font-size: 12px;
      color: var(--muted);
      letter-spacing: .3px;
    }
    .row.active{
      border-color: rgba(154,209,75,.55);
      box-shadow: 0 0 0 1px rgba(154,209,75,.18) inset;
    }
    .footer{
      text-align:center;
      margin-top: 18px;
      color: var(--muted);
      font-size: 12px;
    }
    .btn{
      display:inline-block;
      margin-top: 10px;
      padding: 10px 12px;
      background: transparent;
      color: var(--muted);
      border: 1px solid var(--divider);
      border-radius: 12px;
      text-decoration:none;
    }
  </style>
</head>

<body>
  <div class="top">
    <div class="hijri" id="hijri">—</div>
    <div class="greg" id="greg">—</div>
    <div class="clock" id="clock">--:--</div>
  </div>

  <div class="ringWrap">
    <svg width="250" height="250" viewBox="0 0 250 250" aria-hidden="true">
      <defs>
        <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- background ring -->
      <circle cx="125" cy="125" r="94" fill="none" stroke="#222833" stroke-width="10" />

      <!-- progress ring -->
      <circle id="prog"
        cx="125" cy="125" r="94" fill="none"
        stroke="#9ad14b" stroke-width="10"
        stroke-linecap="round"
        transform="rotate(-90 125 125)"
        stroke-dasharray="590"
        stroke-dashoffset="590"
        filter="url(#softGlow)"
      />
    </svg>

    <div class="ringCenter">
      <div class="nextLabel">UP NEXT</div>
      <div class="nextName" id="nextName">—</div>
      <div class="nextIn" id="nextIn">—</div>
    </div>
  </div>

  <div class="list" id="list"></div>

  <div class="footer">
    Abu Bakr Masjid Reading (manual timetable)
    <div><a class="btn" href="/api/today">View JSON</a></div>
  </div>

  <script src="/app.js"></script>
  <script>
    // Service Worker for PWA (safe to register even on localhost)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(()=>{});
    }
  </script>
</body>
</html>`);
});

app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});