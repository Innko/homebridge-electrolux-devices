# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build      # compile TypeScript to dist/
npm run lint       # ESLint with zero warnings allowed
npm run watch      # build + link + nodemon (live reload against a real Homebridge instance)
```

There is no test suite beyond lint and build. CI (`tests.yml`) runs both on Node 18.x and 20.x.

## Architecture

This is a Homebridge dynamic platform plugin. The entry point (`src/index.ts`) registers `ElectroluxDevicesPlatform` as the platform handler.

### Auth flow

`ElectroluxDevicesPlatform` (`src/platform.ts`) authenticates against `https://api.developer.electrolux.one`. On first run it reads a `refreshToken` from the Homebridge config, exchanges it for an access token, and persists tokens to `homebridge_electrolux_device_persist.json` in Homebridge's storage path. On subsequent starts it reloads that file and auto-refreshes when the token has expired. An Axios request interceptor attaches the `Bearer` token to every non-refresh call.

### Device polling

After discovery, `pollStatus` runs on an interval (default 120 s, configurable via `pollingInterval`). It re-checks token expiry, then fetches the current state for every registered appliance and calls `controller.update(state)`.

### Adding a new device type

1. Create a class in `src/accessories/devices/<category>/` that extends `ElectroluxAccessoryController` (`src/accessories/controller.ts`).
2. Implement `update(state: ApplianceState): void` to push fresh state to HomeKit characteristics.
3. Use `getCharacteristicValueGuard` / `setCharacteristicValueGuard` wrappers from the base class — they throw `SERVICE_COMMUNICATION_FAILURE` automatically when the appliance is disconnected.
4. Register the new class in `src/const/devices.ts` using the `applianceType` string the Electrolux API returns (e.g. `WM` for washing machines).
5. Add any new state properties to `ApplianceState` in `src/definitions/applianceState.ts`.

### `src/obsolete/`

Contains the previous implementations of air purifiers (`AirPurifier`, `PureA9`, `WellA7`, `UltimateHome500`) and the Comfort 600 AC that were removed during a refactor. They are not compiled or imported anywhere — kept for reference when re-implementing those device types.

### Linting

ESLint enforces Prettier formatting (`prettier/prettier: 'error'`), bans `console` (use the Homebridge `log` object), and treats unused variables as errors unless prefixed with `_`. Max-warnings is 0.
