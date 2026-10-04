# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously at ShoeSafari. If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Report security concerns privately through the repository owner or GitHub Security Advisories. Do not disclose exploitable details in a public issue.
3. Include a detailed description of the vulnerability
4. Provide steps to reproduce if possible

### What to Expect

- Acknowledgment within 48 hours
- Regular updates on our progress
- Credit in the security advisory (if desired)

## Security Best Practices

### Environment Variables

All sensitive configuration is stored in environment variables. **Never commit secrets to the repository.**

Required environment variables are documented in `.env.local.example`. Copy this file to `.env.local` and fill in your values.

```bash
cp .env.local.example .env.local
```

### Sensitive Data Handling

| Data Type            | Storage               | Notes                                     |
| -------------------- | --------------------- | ----------------------------------------- |
| API Keys             | Environment variables | Never hardcode                            |
| Firebase Config      | Environment variables | Client-side safe but keep secure          |
| EmailJS Credentials  | Environment variables | Required for email functionality          |
| Stellar Contract IDs | Environment variables | Public but environment-specific           |
| User Passwords       | Firebase Auth         | Handled by Firebase, never stored locally |
| Payment Data         | On-chain (Stellar)    | Non-custodial, no card data stored        |

### Smart Contract Security

The Soroban escrow contract follows security best practices:

1. **Non-custodial**: Funds flow directly from buyer to contract to merchant
2. **Access Control**: Only authorized parties can dispatch/refund orders
3. **Token Whitelist**: Only approved tokens can be used for payment
4. **Event Emission**: All state changes emit events for transparency
5. **Error Handling**: Typed errors prevent unexpected failures

### Frontend Security

1. **Input Validation**: All user inputs are validated and sanitized
2. **XSS Prevention**: HTML entities are escaped before rendering
3. **HTTPS Only**: All API calls use HTTPS
4. **No Sensitive Data in URLs**: Sensitive data is sent via POST body
5. **Content Security Policy**: Configured in Next.js headers

### Authentication

- Firebase Authentication handles user sessions
- Admin access is controlled via email whitelist (`NEXT_PUBLIC_ADMIN_EMAILS`)
- No passwords are stored in the application

### Dependencies

- Dependencies are regularly updated for security patches
- Use `npm audit` to check for vulnerabilities
- CI pipeline fails on high-severity vulnerabilities

## Security Checklist for Contributors

Before submitting a PR, ensure:

- [ ] No secrets or API keys are committed
- [ ] User inputs are validated and sanitized
- [ ] No `eval()` or `dangerouslySetInnerHTML` usage
- [ ] Error messages don't expose sensitive information
- [ ] Dependencies are from trusted sources
- [ ] No console.log with sensitive data

## Known Security Considerations

### Client-Side OTP Generation

The current email OTP flow generates and verifies codes in the browser, so it is
not secure proof of identity. Do not rely on it for account security. A
production-grade flow must generate and verify expiring codes on a trusted
server and protect them from replay. In production:

- Move OTP generation to a server-side API route
- Implement rate limiting on OTP requests
- Add OTP expiration (recommended: 5 minutes)

### Card Payment Fields

The card payment form fields are UI-only placeholders. In production:

- Integrate with a PCI-compliant payment processor (Stripe, etc.)
- Never handle raw card data on your servers
- Use tokenization for card storage

### Firebase Security Rules

Ensure your Firestore security rules restrict:

- Read/write access based on authentication
- Admin operations to authorized users only
- Data validation at the database level

Example rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /ShoeSafariProducts/{productId} {
      allow read: if true;
      allow write: if request.auth != null &&
        request.auth.token.email in ['admin@example.com'];
    }
  }
}
```

## Stellar/Soroban Security

### Testnet vs Mainnet

- **Testnet**: Used for development, tokens have no real value
- **Mainnet**: Real value transactions, requires additional auditing

Before mainnet deployment:

1. Smart contract security audit
2. Penetration testing
3. Rate limiting implementation
4. Monitoring and alerting setup

### Wallet Security

- Users connect their own Freighter wallet
- Private keys never leave the user's browser
- Transactions require explicit user approval

## Contact

For security-related inquiries, use a private GitHub Security Advisory or contact the repository maintainers directly. We aim to acknowledge reports within 48 hours.
