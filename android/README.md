# android/

Placeholder for the Android app. Intentionally empty.

Same plan as `ios/`: one Expo / React Native codebase sharing the Convex
backend, the Zod schemas and the `messages/` catalogue with the web app.

Before scaffolding anything here, decide:

- Expo managed vs. bare workflow
- Play Console account ownership and the release track strategy
- Whether FCM push is needed at launch or later

Nothing generated (`build/`, `.gradle/`, `*.apk`, `*.aab`) is ever committed —
see `.gitignore`.
