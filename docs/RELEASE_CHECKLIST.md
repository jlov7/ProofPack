# Release Checklist

Use this checklist before pushing to GitHub or cutting a release tag.

## 1. Environment

- [ ] Node version matches `.nvmrc` (`node -v`)
- [ ] Dependencies installed (`pnpm install`)

## 2. Local Quality Gates

- [ ] `pnpm check`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm e2e`
- [ ] `pnpm verify -- ./examples/sample_runs/latest.proofpack`
- [ ] `pnpm stress:core`
- [ ] `pnpm repro:check`
- [ ] `pnpm release:artifacts`
- [ ] `pnpm release:attest`
- [ ] `pnpm release:attest:verify`
- [ ] `pnpm policy:deps`
- [ ] `pnpm sbom:generate`

Or run all core gates in one shot:

```bash
pnpm release:check
```

## 3. Repository Hygiene

- [ ] `git status` contains only intentional changes
- [ ] No secrets, credentials, or environment files included
- [ ] Docs updated for any behavior or interface change

## 4. CI/Security

- [ ] CI workflow passes on branch (`.github/workflows/ci.yml`)
- [ ] Security workflow passes (`.github/workflows/security.yml`)
- [ ] No unresolved high/critical dependency advisories

## 5. Pull Request Readiness

- [ ] PR description explains what changed and why
- [ ] Verification commands and results are included in PR notes
- [ ] Risky/behavior-changing paths are called out explicitly
