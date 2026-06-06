# Raspberry Pi Producer Plan

Source authority: `specs/plan.md` and `specs/backend-design-spec.md`.

## Role

Python/FastAPI producer service that emulates a household with solar, battery storage, and an EV plug
signal. It computes dynamic price and exposes state to the x402 server.

## Runtime

- Path: `src/raspberrypi`
- Port: `8001`
- Env: `ACCEL=60`
- Hardware target: Raspberry Pi 4 with MCP3008 ADC and GPIO17
- Dev fallback: laptop mock mode if SPI/GPIO imports fail

## Endpoints

- `GET /status`: current solar, battery, price, EV plug, offer state
- `GET /history?minutes=10`: recent SQLite readings
- `POST /consume`: decrement battery after settled x402 payment

## Deliverables

- MCP3008 ADC mapping to `solar_kw` from 0 to 5
- GPIO EV-plug signal
- Battery simulation with `ACCEL`
- Pricing formula from `specs/plan.md`
- SQLite history rows
- `409` response when requested kWh exceeds available battery

## Boundary

This service does not know wallet keys and does not verify payments. It only changes battery state
when `src/x402/server` calls `/consume` after settlement.
