from __future__ import annotations

import math
import os
import random
import sqlite3
import threading
import time
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

try:
    import spidev

    _spi = spidev.SpiDev()
    _spi.open(0, 0)
    _spi.max_speed_hz = 1350000
    _HAS_ADC = True
except (ImportError, OSError):
    _HAS_ADC = False
    _spi = None

ACCEL = float(os.getenv("ACCEL", "60"))
PORT = int(os.getenv("PORT", "8001"))
# Bigger default pack so a one-time "fixed" purchase (e.g. 5 kWh) is deliverable in a
# single transaction. Both are env-tunable for the real Pi / different demos.
BATTERY_CAPACITY_KWH = float(os.getenv("BATTERY_CAPACITY_KWH", "20"))
BATTERY_INITIAL_KWH = min(BATTERY_CAPACITY_KWH, float(os.getenv("BATTERY_INITIAL_KWH", "15")))
SELF_CONSUMPTION_KW = 1.0
# EV control. For a controlled fixed-mode demo, set EV_AUTO_TOGGLE=false and
# EV_PLUGGED_DEFAULT=true so the EV stays plugged instead of flipping randomly.
EV_AUTO_TOGGLE = os.getenv("EV_AUTO_TOGGLE", "true").lower() == "true"
EV_PLUGGED_DEFAULT = os.getenv("EV_PLUGGED_DEFAULT", "false").lower() == "true"
DB_PATH = Path(__file__).resolve().parent / "producer.db"


class ConsumeRequest(BaseModel):
    kwh: float = Field(gt=0)


class ProducerRuntime:
    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.start_ts = time.time()
        self.last_tick_ts = time.time()
        self.last_toggle_ts = 0.0
        self.battery_kwh = BATTERY_INITIAL_KWH
        self.ev_plugged = EV_PLUGGED_DEFAULT
        self.solar_kw = 2.0

    def _read_adc(self, channel: int = 0) -> int:
        if not _HAS_ADC:
            return -1
        r = _spi.xfer2([1, (8 + channel) << 4, 0])
        return ((r[1] & 3) << 8) + r[2]

    def _simulated_solar(self, now: float) -> float:
        # Smooth day-like wave plus small jitter for a live-looking chart.
        cycle = math.sin(((now - self.start_ts) / 30.0) * math.pi)
        base = 2.5 + 2.2 * cycle
        jitter = random.uniform(-0.2, 0.2)
        return max(0.0, min(5.0, base + jitter))

    def _solar_from_adc(self) -> float:
        raw = self._read_adc(0)
        if raw < 0:
            return self._simulated_solar(time.time())
        return (raw / 1023.0) * 5.0

    def _maybe_toggle_ev(self, now: float) -> None:
        # Flip EV plugged state occasionally so the agent can enter/exit charging.
        # Disabled when EV_AUTO_TOGGLE=false (stable EV for a controlled demo).
        if not EV_AUTO_TOGGLE:
            return
        if now - self.last_toggle_ts < 12:
            return
        self.last_toggle_ts = now
        if random.random() < 0.25:
            self.ev_plugged = not self.ev_plugged

    def tick(self) -> dict[str, float | bool]:
        with self.lock:
            now = time.time()
            dt = max(0.05, now - self.last_tick_ts)
            self.last_tick_ts = now

            self.solar_kw = self._solar_from_adc()
            self._maybe_toggle_ev(now)

            delta_kwh = (self.solar_kw - SELF_CONSUMPTION_KW) * (ACCEL * dt / 3600.0)
            self.battery_kwh = max(0.0, min(BATTERY_CAPACITY_KWH, self.battery_kwh + delta_kwh))

            return self.snapshot()

    def snapshot(self) -> dict[str, float | bool]:
        battery_pct = 0.0 if BATTERY_CAPACITY_KWH == 0 else self.battery_kwh / BATTERY_CAPACITY_KWH
        price = max(0.01, 0.30 - (battery_pct * 0.15) - (self.solar_kw * 0.02))
        return {
            "ts": time.time(),
            "solar_kw": round(self.solar_kw, 3),
            "battery_kwh": round(self.battery_kwh, 3),
            "battery_pct": round(battery_pct, 3),
            "price_per_kwh": round(price, 3),
            "ev_plugged": self.ev_plugged,
            "has_offer": self.battery_kwh > 0 or self.solar_kw >= 1.0,
            # How much can be sold in a single (e.g. one-time "fixed") purchase right now.
            "available_kwh": round(self.battery_kwh, 3),
        }

    def consume(self, kwh: float) -> dict[str, float]:
        with self.lock:
            if kwh > self.battery_kwh:
                raise ValueError("insufficient_battery")
            self.battery_kwh -= kwh
            self.battery_kwh = max(0.0, self.battery_kwh)
            battery_pct = 0.0 if BATTERY_CAPACITY_KWH == 0 else self.battery_kwh / BATTERY_CAPACITY_KWH
            return {
                "battery_kwh": round(self.battery_kwh, 3),
                "battery_pct": round(battery_pct, 3),
            }


runtime = ProducerRuntime()
app = FastAPI(title="Energy Producer Service")


def init_db() -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS readings (
              ts REAL NOT NULL,
              solar_kw REAL NOT NULL,
              battery_kwh REAL NOT NULL,
              battery_pct REAL NOT NULL,
              price_per_kwh REAL NOT NULL,
              ev_plugged INTEGER NOT NULL
            )
            """
        )
        conn.execute(
            """
            DELETE FROM readings WHERE ts < ?
            """,
            (time.time() - 1800,),
        )
        conn.commit()


def persist_snapshot(snapshot: dict[str, float | bool]) -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO readings (ts, solar_kw, battery_kwh, battery_pct, price_per_kwh, ev_plugged)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                float(snapshot["ts"]),
                float(snapshot["solar_kw"]),
                float(snapshot["battery_kwh"]),
                float(snapshot["battery_pct"]),
                float(snapshot["price_per_kwh"]),
                1 if bool(snapshot["ev_plugged"]) else 0,
            ),
        )
        conn.commit()


def simulation_loop() -> None:
    while True:
        snap = runtime.tick()
        persist_snapshot(snap)
        time.sleep(1)


@app.on_event("startup")
def startup() -> None:
    init_db()
    thread = threading.Thread(target=simulation_loop, daemon=True)
    thread.start()


@app.get("/status")
def get_status() -> dict[str, float | bool]:
    return runtime.snapshot()


@app.get("/history")
def get_history(minutes: int = 10) -> list[dict[str, float | bool]]:
    if minutes <= 0:
        raise HTTPException(status_code=400, detail="minutes must be positive")

    cutoff = time.time() - (minutes * 60)
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute(
            """
            SELECT ts, solar_kw, battery_kwh, battery_pct, price_per_kwh, ev_plugged
            FROM readings
            WHERE ts >= ?
            ORDER BY ts ASC
            """,
            (cutoff,),
        ).fetchall()

    return [
        {
            "ts": row[0],
            "solar_kw": row[1],
            "battery_kwh": row[2],
            "battery_pct": row[3],
            "price_per_kwh": row[4],
            "ev_plugged": bool(row[5]),
        }
        for row in rows
    ]


@app.post("/consume")
def post_consume(payload: ConsumeRequest) -> dict[str, float | bool]:
    try:
        updated = runtime.consume(payload.kwh)
    except ValueError:
        return JSONResponse(status_code=409, content={"ok": False, "error": "insufficient_battery"})

    return {
        "ok": True,
        "battery_kwh": updated["battery_kwh"],
        "battery_pct": updated["battery_pct"],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=False)
