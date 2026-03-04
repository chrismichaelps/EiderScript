# Contributing

Hey! Glad you're looking to help out with EiderScript. We're still in the experimental phase, so any help making this framework more solid is awesome.

## How to jump in

### 1. Found a bug?
- Check the open issues first to see if someone else already caught it.
- If not, open a new issue. Be sure to include steps on how to reproduce the problem and what you expected to happen.

### 2. Got a cool idea?
- Please open an issue to discuss it before you start coding. It saves everyone time if we're on the same page first.

### 3. Submitting a Pull Request
- Create a new branch from `main`.
- Try to keep your code style consistent with what's already there.
- Always add or update tests for your changes.
- **Double-check that everything passes** before you send over the PR:
  ```bash
  pnpm install
  pnpm test
  pnpm typecheck
  ```

## Development heads-up

- **Stack:** We use TypeScript and Vue 3 (Composition API).
- **Core Logic:** We use `Effect.ts` to keep error handling and async stuff clean.
- **Docs:** Keep comments simple and only where you really need them.

## Questions?

Just open an issue if you're stuck or have a question!

---

*Thanks for helping out!*
