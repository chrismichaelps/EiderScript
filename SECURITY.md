# Security Policy

Found a security bug? Let's fix it. Please don't open a public issue—let's keep it private until we have a patch ready.

## Supported Versions

We're currently focusing our security updates on the latest version.

| Version | Status             |
| ------- | ------------------ |
| current | :white_check_mark: |

## How we build things

### 1. Sandboxed Logic
We don't use `eval()` or `new Function()`. Instead, we use `expr-eval` to keep expression logic in a tight sandbox. That said, still be careful with where your YAML files are coming from!

### 2. Schema Guards
Everything the framework touches goes through `Zod` validation first. This helps us catch malformed data before it hits the runtime.

## Reporting a bug

If you find something major, please reach out privately:

-   **Maintainer:** Check the project maintainer's GitHub profile for contact info.
-   **GitHub:** Use the private security advisory feature if it's available.

We'll get back to you as soon as we can and work on a fix together.
