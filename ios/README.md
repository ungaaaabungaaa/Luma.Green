# ios/

Placeholder for the iOS app. Intentionally empty.

The plan is one Expo / React Native codebase that shares the Convex backend, the
Zod schemas and the `messages/` catalogue with the web app. Business logic stays
in Convex so both clients stay thin.

Before scaffolding anything here, decide:

- Expo managed vs. bare workflow (managed unless a native module forces bare)
- Whether ios/ and android/ hold one shared Expo project or two native shells
- EAS Build for CI, and who owns the Apple Developer account

Nothing generated (`Pods/`, `build/`, `*.ipa`) is ever committed — see
`.gitignore`.
