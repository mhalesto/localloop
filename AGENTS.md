# Repository Guidelines for `/workspace/toilet`

## Project Overview
- This codebase contains a React Native application bootstrapped with Expo. The entry point is `App.js`, which mounts a native stack navigator for the primary screens found in `screens/`.
- Reusable UI elements and layout wrappers live under `components/`. Cross-screen state is shared through React context providers located in `contexts/`.
- Remote data access helpers (Firebase, subscriptions, etc.) reside in `api/`, while constants and utility helpers live in `constants/` and `utils/` respectively.

## Code Style & Conventions
- Follow the existing formatting conventions: two-space indentation, semicolons at the end of statements, and single quotes for strings unless a string literal requires interpolation.
- Prefer functional React components with hooks. Keep component props destructured in the parameter list where reasonable.
- When adding styles, compose them with `StyleSheet.create` (for React Native components) and keep palette/theme awareness by consuming the values provided by `useSettings` when available.
- Avoid introducing platform-specific code paths unless absolutely necessary; prefer cross-platform React Native primitives already used in the project.

## State Management & Data
- Use the context hooks exported from `contexts/PostsContext` and `contexts/SettingsContext` instead of reinventing state containers for posts, notifications, or settings.
- Any networking or persistence logic should go through the helpers already defined in `api/`. Extend those modules instead of adding ad-hoc fetch calls inside components.
- When mutating cached data (e.g., posts or notifications), make sure to keep the serialization helpers in `PostsContext` in sync so offline caching continues to work.

## Testing & Local Development
- Install dependencies with `npm install`.
- Launch the development server with `npm run web` (Expo web) or `npm run android` / `npm run ios` for platform-specific testing.
- There are currently no automated test scripts; manual testing via the Expo dev server is expected after significant UI or logic changes.

## Pull Request Expectations
- Summaries should call out the user-facing impact (new screens, UI changes, bug fixes) and any notable architectural updates.
- Include manual testing notes describing how the change was verified (e.g., "Opened Room screen, created post, verified notifications badge updated").
- If you modify assets or introduce new ones, mention them explicitly in the PR description for reviewer visibility.
