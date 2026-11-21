# SignPath Foundation: free Windows code signing

Researched 13 November 2026, for the licence decision (MIT → AGPL-3.0 or FSL-1.1-MIT) and the week 17 signing plan.

## Question

Can mdgloss get free Windows code signing from the SignPath Foundation, and does the licence choice change that?

## Answer

- **Licence decides it.** SignPath requires an OSI-approved licence for every component, **"without commercial dual-licensing"**. MIT or plain AGPL-3.0 qualify; AGPL-3.0 **with a paid commercial licence** does not; FSL-1.1-MIT does not (not OSI).
- **mdgloss may be too young.** Executables need "a certain verifiable reputation", and the project must already be released. Apply after the alpha has users, not before.
- **It doesn't remove SmartScreen warnings.** Since 2024 no certificate (EV or OV) gives instant reputation; each new release builds it from downloads. Signing mainly changes "Unknown publisher" to a named one.

## Evidence

From the [SignPath Foundation terms](https://signpath.org/terms) (the page notes its code of conduct is still a draft):

- Licence: "OSI-approved Open Source license" for all components, no commercial dual-licensing. No proprietary components, especially from the maintainer.
- Maturity: actively maintained, already released in the form to be signed, verifiable reputation for executables.
- Build: binaries "built from source code in a verifiable way" by an automated build of the repository. Every release needs manual approval in SignPath.
- Team: named Authors, Reviewers and Approvers; MFA on SignPath and the repository for everyone.
- Website: a "Code signing policy" section on the home page (SignPath attribution, team roles, privacy statement).
- Software: data sent to other systems needs a privacy policy, notice at install and an opt-out. Relevant: the updater calls GitHub Releases once a day.
- Certificate: issued to **SignPath Foundation**, which becomes the legal publisher. Windows shows "SignPath Foundation", not mdgloss or you. Can be revoked without notice if rules are broken.
- Cost: free ([signpath.org](https://signpath.org/)). No approval time is published, and there is no appeal.

SmartScreen: [Microsoft: SmartScreen reputation](https://learn.microsoft.com/et-ee/windows/apps/package-and-deploy/smartscreen-reputation) and [ToDesktop: EV certs no longer grant instant reputation](https://www.todesktop.com/blog/posts/windows-apps-psa-ev-certs-do-not-grant-immediate-reputation-anymore). The Tauri v1 guide's claim that EV gives instant reputation is out of date ([Tauri v1 signing guide](https://v1.tauri.app/v1/guides/distribution/sign-windows)).

CI: SignPath signs through its own service. The usual setup uploads the unsigned artifact from GitHub Actions to SignPath and downloads the signed one, so `tauri-action`'s built-in signing step is replaced by an upload, approve and download step. Not checked in detail.

## Fallback: Azure Artifact Signing (formerly Trusted Signing)

- $9.99/month Basic plan, up to 5,000 signatures ([pricing](https://azure.microsoft.com/en-gb/pricing/details/artifact-signing/)).
- Public trust for organizations in the USA, Canada, EU and UK, but **individuals only in the USA and Canada** ([Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/2243504/trusted-signing-for-other-countries), [France thread](https://learn.microsoft.com/en-us/answers/questions/5810735/cant-create-a-new-trusted-signing-individual-ident)). No date for other countries. Some answers there are AI-generated; confirm before relying on it.
- Tauri supports it through a custom `signCommand`.

## Impact on the licence choice

| Licence                       | SignPath Foundation        |
| ----------------------------- | -------------------------- |
| MIT (today)                   | Eligible                   |
| AGPL-3.0, no paid licence     | Eligible                   |
| AGPL-3.0 + commercial licence | **Not eligible**           |
| FSL-1.1-MIT                   | **Not eligible** (not OSI) |
