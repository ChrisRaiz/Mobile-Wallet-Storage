<p align="center">
  <img src="docs/assets/logo.svg" alt="Mobile Wallet Storage logo" width="96">
</p>

<h1 align="center">Mobile Wallet Storage</h1>

<p align="center">
  An example website that lets visitors save digital cards, such as membership, loyalty, or event passes, straight to their phone's wallet.<br>
  It's designed around the official Apple Wallet and Google Wallet APIs, with one "Add to Wallet" flow for each platform.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Early%20Stage-orange" alt="Status: Early Stage">
  <img src="https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white" alt="Next.js 14">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React 18">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT">
</p>

<p align="center">
  📖 <a href="https://chrisraiz.github.io/Mobile-Wallet-Storage/"><b>Documentation</b></a>: how wallet passes work, the planned design, and setup.
</p>

---

> [!IMPORTANT]
> **Mobile Wallet Storage is in an early stage.**
> So far the repository contains the Next.js app scaffold only. The Apple Wallet and Google Wallet integrations described below are the planned design and have not been built yet.

---

## Overview

Businesses often give customers cards they need to carry: memberships, loyalty cards, tickets, and gift cards. Phones can store these in Apple Wallet or Google Wallet, where they're always one tap away and can show a barcode or QR code at the counter.

Getting a card into a wallet takes different work on each platform:

1. **The visitor picks a card** on the website and taps "Add to Apple Wallet" or "Add to Google Wallet".
2. **The server builds the pass.** It fills in the visitor's details, such as name, member number, and barcode.
3. **Apple Wallet:** the server packages the pass as a signed `.pkpass` file, and iPhone opens it with an "Add" prompt.
4. **Google Wallet:** the server signs the pass details into a token, and the visitor is sent to a Google "Save to Wallet" link.
5. **The card is saved** in the phone's wallet app.

---

## Project Status

| Area                                              | Status                 |
| ------------------------------------------------- | ---------------------- |
| Next.js app scaffold (App Router, TypeScript)     | ✅ Set up              |
| Card selection page                               | ❌ Not started         |
| Apple Wallet pass generation (`.pkpass`)          | ❌ Not started         |
| Google Wallet pass generation (signed save link)  | ❌ Not started         |
| Deployment                                        | ❌ Not started         |

---

## Tech Stack

| Layer          | Technology                                                    | Status   |
| -------------- | ------------------------------------------------------------- | -------- |
| Framework      | Next.js 14 (App Router), React 18                             | In place |
| Language       | TypeScript                                                    | In place |
| Linting        | ESLint with `eslint-config-next`                              | In place |
| Apple Wallet   | PassKit pass files, signed with an Apple Pass Type ID certificate | Planned  |
| Google Wallet  | Google Wallet API, with save links signed by a Google Cloud service account | Planned  |

---

## Project Structure

```
.
├── docs/                         # Documentation site (GitHub Pages)
├── LICENSE
├── README.md
└── mobile-wallet-storage/        # Next.js app
    ├── public/                   # Static files
    ├── src/app/
    │   ├── layout.tsx            # Root layout
    │   ├── page.tsx              # Home page
    │   └── globals.css
    ├── next.config.js
    ├── package.json
    └── tsconfig.json
```

---

## Running It Locally

**Requirements:** Node.js 18.17 or later and npm.

```bash
git clone https://github.com/ChrisRaiz/Mobile-Wallet-Storage.git
cd Mobile-Wallet-Storage/mobile-wallet-storage
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000). Other scripts: `npm run build`, `npm start`, and `npm run lint`.

### What the Wallet Integrations Will Need

Issuing real passes requires accounts with both platforms:

- **Apple Wallet:** an Apple Developer Program membership, a Pass Type ID, and its signing certificate
- **Google Wallet:** a Google Wallet API issuer account and a Google Cloud service account

---

## License

Released under the [MIT License](LICENSE).
