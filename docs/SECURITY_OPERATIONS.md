# Production credential rotation and incident response

This runbook is for ShoeSafari maintainers responding to suspected production
credential exposure, unauthorized use, or compromise of a provider account. It
contains no live credentials. Keep incident-specific evidence, customer details,
and replacement values in approved private systems; never put them in GitHub
issues, pull requests, chat, or deployment logs.

## Credentials and provider consoles

Use the `.env.local.example` variable names to identify affected configuration.
Values prefixed with `NEXT_PUBLIC_` are delivered to browsers and must never be
treated as private credentials.

| Category | Configuration in this repository | Provider rotation or restriction |
| --- | --- | --- |
| Firebase client configuration | `NEXT_PUBLIC_FIREBASE_*` | Firebase Console → Project settings → General for project/app configuration. The API key is visible to clients by design: restrict it to the required APIs and website referrers in [Google Cloud API Credentials](https://console.cloud.google.com/apis/credentials). If abuse is suspected, restrict or replace the key there and update the deployed value. |
| Firebase server credentials | `FIREBASE_SERVICE_ACCOUNT_JSON` | In [Google Cloud Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts), disable/delete the compromised service-account key, then create a replacement key only if the application still needs one. Prefer workload identity or another keyless deployment identity where available. Review the account's IAM roles and remove excess access. |
| EmailJS | `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY`, `NEXT_PUBLIC_EMAILJS_SERVICE_ID`, `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID` | In the [EmailJS dashboard](https://dashboard.emailjs.com/admin), review Account → API Keys and rotate/revoke a key if abused. The public key, service ID, and template ID are client-visible identifiers, not server secrets. Restrict allowed origins, enable provider rate limits and CAPTCHA, and review templates and service connections. |
| Checkout quote signing | `CHECKOUT_QUOTE_SECRET` | Generate a fresh random value of at least 32 characters in the deployment platform's secret manager. This value signs short-lived checkout quotes; never expose it with a `NEXT_PUBLIC_` name. Changing it invalidates outstanding quotes, which expire after 10 minutes. |
| Deployment access | Deployment platform environment variables and deployment/API tokens | In the deployment provider's account/team security settings, revoke the exposed token or session, remove unknown users/integrations, and issue a least-privilege replacement. For Vercel, review [team settings](https://vercel.com/account) and the project's environment variables/deployment settings. Revoke any related GitHub Actions or source-control token at its issuing provider as well. |

## Response sequence

1. **Contain and record privately.** Notify the maintainers responsible for the affected service. Record when and how the incident was detected, affected project/environment, and relevant time range in the private incident record. Do not copy credential values into the record. If active abuse affects checkout or customer data, pause the affected feature or deployment while investigating.
2. **Identify exposure.** Check the repository and its history, build/deployment logs, CI logs, provider audit logs, and access history. Identify the exact credential category, environments, service accounts, projects, and time window. Treat a value as compromised once it has entered a public repository or untrusted log, even if later removed.
3. **Revoke first.** Revoke, disable, or restrict the compromised credential at its issuing provider before redeploying. For a public Firebase API key or EmailJS browser identifier, which is not confidential by design, immediately apply provider restrictions and disable/rotate it if there is evidence of abuse. Do not wait for a code change to invalidate a credential.
4. **Reduce access.** Remove unexpected users, service-account grants, OAuth apps, integrations, sessions, and API keys. Apply least privilege and origin/API restrictions. Preserve relevant audit evidence privately before its retention window expires.
5. **Issue replacements.** Create replacement credentials only after the compromised values are revoked or restricted. Store them in the production deployment's secret/environment settings; do not commit them or paste them into source, tickets, or chat. Update only the affected environments and keep server-only variables server-only.
6. **Redeploy and verify.** Redeploy the affected production environment so it no longer depends on the old values. Check deployment health, authentication, trusted checkout quote creation/verification, order persistence, and EmailJS behavior as applicable. Confirm the revoked credential can no longer authenticate or perform its former actions. Avoid placing credential values in verification output.
7. **Review activity and impact.** Examine Firebase/Google Cloud audit logs, EmailJS usage and delivery history, deployment logs, and GitHub/CI activity for the exposure window. Identify unauthorized reads, writes, sends, deployments, or changes. Follow applicable privacy, contractual, and legal notification requirements; have maintainers communicate confirmed impact through the appropriate private channels.
8. **Close out.** Remove exposed values from current files and logs where possible, but do not treat deletion or history rewriting as a substitute for revocation. Record the affected systems, actions, impact, and recovery time privately. Track remediation work and assign an owner and due date.

## Post-incident checklist

- [ ] Compromised credentials were revoked or restricted at the provider, and replacement credentials are active only where needed.
- [ ] Production was redeployed and the affected customer and admin flows were checked.
- [ ] Provider and deployment audit logs were reviewed for the incident window; suspicious activity was contained and recorded privately.
- [ ] Unneeded users, service accounts, permissions, integrations, keys, and sessions were removed.
- [ ] No replacement credential or customer-sensitive evidence was added to Git, public issues/PRs, chat, or logs.
- [ ] Relevant customers, providers, and stakeholders were notified when required, using approved channels.
- [ ] Follow-up actions have owners and due dates; this runbook and monitoring were updated for lessons learned.

## Safe handling reminders

- Keep `.env.local` and production secret values outside version control. The
  repository ignores local environment files; verify with `git status` before
  committing configuration changes.
- Firebase client configuration and EmailJS identifiers are public-facing
  values. Protect them with provider-side restrictions, not by assuming they
  remain secret.
- Never ask a contributor to send a production credential in an issue or pull
  request. Use the provider's secure secret manager and private incident
  channels.
