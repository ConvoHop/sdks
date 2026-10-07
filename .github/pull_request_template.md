<!--
Title: use Conventional Commits, for example `fix(client): keep the request ID on retry`.
Don't include credentials, tokens or personal data anywhere in this pull request.
Report security vulnerabilities privately instead. See SECURITY.md.
-->

## Summary

<!-- What does this change, and why? Link the issue it resolves, for example "Fixes #123". -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change to a public API or behavior
- [ ] Documentation
- [ ] Build, CI or tooling

## Verification

<!--
List exactly what you ran, and on which runtimes and platforms.
Say what you didn't verify, for example real network, WebRTC media,
database or hosted-service behavior.
-->

- [ ] `npm run check:annotations`
- [ ] `npm run check:graphql`
- [ ] `npm run build`
- [ ] `npm test`
- [ ] `npm run check:packages`

## Checklist

- [ ] The title follows Conventional Commits, with `!` or a `BREAKING CHANGE:` footer for breaking changes.
- [ ] Tests are added or updated in the existing package suites.
- [ ] Docs, examples and generated files are updated with any public API change. Generated files are regenerated, not edited by hand.
- [ ] No credentials, tokens or personal data appear in code, tests, logs or examples.
