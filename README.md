<p align="center">
  <img src="docs/assets/logo.svg" alt="Mobile Wallet Storage logo" width="96">
</p>

<h1 align="center">Mobile Wallet Storage</h1>

<p align="center">
  An example website that lets visitors save digital cards, such as membership, loyalty, or event passes, straight to their phone's wallet.<br>
  It builds and signs real Apple Wallet and Google Wallet passes on the server, using each platform's official pass format.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Working%20Example-3FC7A8" alt="Status: Working Example">
  <img src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white" alt="Next.js 16">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tests-Vitest-6E9F18?logo=vitest&logoColor=white" alt="Tested with Vitest">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT">
</p>

<p align="center">
  📖 <a href="https://chrisraiz.github.io/Mobile-Wallet-Storage/"><b>Documentation</b></a>: how wallet passes work, how the app is built, and setup.
</p>

---

> [!NOTE]
> **Signing real passes needs your own Apple and Google credentials.**
> To try everything on your own computer, run `npm run demo:setup`: it creates throwaway test credentials so both "Add to Wallet" buttons work locally (see [Run the Local Demo](#run-the-local-demo)). Passes signed with test credentials are complete, but phones only accept passes signed with credentials from Apple or Google.

---

## Overview

Businesses often give customers cards they need to carry: memberships, loyalty cards, tickets, and gift cards. Phones can store these in Apple Wallet or Google Wallet, where they're always one tap away and can show a QR code at the counter.

1. **The visitor picks a card** (membership, loyalty, or event ticket), types their name, and sees a live preview.
2. **They tap "Add to Apple Wallet" or "Add to Google Wallet".**
3. **Apple Wallet:** the server builds `pass.json`, bundles it with images, writes a manifest of SHA-1 hashes, signs the manifest with the Pass Type ID certificate, and returns a `.pkpass` file that iPhone opens with an "Add" prompt.
4. **Google Wallet:** the server builds a pass class and object, signs them into a JSON Web Token with a Google Cloud service account key, and redirects to Google's "Save to Wallet" page.

The preview, the Apple pass, and the Google pass are all built from the same card data, so they always match.

---

## Features

- **Three example cards:** a membership card, a coffee shop loyalty card, and an event ticket, each with its own colors and fields
- **Live preview** that updates as the visitor types, with name validation in the browser and again on the server
- **Apple Wallet passes:** signed `.pkpass` files, using the `storeCard` or `eventTicket` style
- **Google Wallet passes:** signed "Save to Google Wallet" links using generic passes
- **Local demo:** `npm run demo:setup` creates test credentials so the whole flow runs on your computer
- **Demo mode:** with no credentials at all, still shows the preview and the exact pass data each platform would receive
- **Secrets stay on the server:** keys are read from environment variables, and the browser is only told whether each platform is set up
- **Automated tests** that check the signed output with independent tools: OpenSSL verifies the Apple signature, and Node's crypto verifies the Google token

---

## Project Status

| Area                                                 | Status                                   |
| ---------------------------------------------------- | ---------------------------------------- |
| Card selection page with live preview                | ✅ Implemented                           |
| Apple Wallet pass generation (`.pkpass`)             | ✅ Implemented, verified with test certificates |
| Google Wallet pass generation (signed save link)     | ✅ Implemented, verified with a test key |
| Local demo with one-command setup                    | ✅ Implemented                           |
| Automated tests                                      | ✅ 40 tests                              |
| Tested on a real phone with production credentials   | ⏳ Needs Apple and Google accounts       |
| Hosted deployment                                    | ❌ Not deployed                          |

---

## Tech Stack

| Layer          | Technology                                                                  |
| -------------- | --------------------------------------------------------------------------- |
| Framework      | Next.js 16 (App Router, route handlers), React 19                           |
| Language       | TypeScript                                                                  |
| Apple Wallet   | [passkit-generator](https://github.com/alexandercerutti/passkit-generator) for packaging and PKCS #7 signing |
| Google Wallet  | Google Wallet generic passes, with RS256 JWTs signed by Node's built-in `crypto` |
| Testing        | Vitest, OpenSSL                                                             |
| Linting        | ESLint with `eslint-config-next`                                            |

---

## Project Structure

```
.
├── docs/                           # Documentation site (GitHub Pages)
├── LICENSE
├── README.md
└── mobile-wallet-storage/          # Next.js app
    ├── .env.example                # Every setting the app reads
    ├── pass-assets/                # Icon and logo images bundled into Apple passes
    ├── public/pass-logo.png        # Logo Google Wallet loads from your site
    ├── scripts/
    │   ├── setup-demo.mjs          # Creates local demo credentials
    │   └── embed-pass-images.mjs
    └── src/
        ├── app/
        │   ├── page.tsx            # Checks which platforms are set up
        │   ├── WalletDemo.tsx      # Card picker, name field, and wallet buttons
        │   ├── PassPreview.tsx     # Live pass preview
        │   └── api/passes/
        │       ├── apple/route.ts  # Returns a signed .pkpass file
        │       └── google/route.ts # Redirects to a signed Save to Google Wallet link
        ├── lib/
        │   ├── cards.ts            # Card catalog, validation, and pass details
        │   ├── apple-pass.ts       # pass.json and .pkpass signing
        │   ├── google-pass.ts      # Pass class, object, and JWT signing
        │   ├── config.ts           # Reads credentials from the environment
        │   └── http.ts             # Shared request parsing and responses
        └── test/fixtures.ts        # Throwaway test certificates and keys
```

---

## Run the Local Demo

**Requirements:** Node.js 20.9 or later, plus `openssl` and `unzip`, which come with macOS and most Linux systems. On Windows, use Git Bash or WSL.

```bash
git clone https://github.com/ChrisRaiz/Mobile-Wallet-Storage.git
cd Mobile-Wallet-Storage/mobile-wallet-storage
npm install
npm run demo:setup   # creates throwaway test credentials in .env.local
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000), pick a card, type a name, and try both buttons:

| Part                  | In the local demo                                                         |
| --------------------- | ------------------------------------------------------------------------- |
| Add to Apple Wallet   | Downloads a complete, signed `.pkpass` file                               |
| Add to Google Wallet  | Shows the signed Save to Google Wallet link and the pass data inside it   |
| Pass data links       | Show the unsigned data each pass is built from                            |

A `.pkpass` file is a zip archive, so you can unzip the downloaded pass to see `pass.json`, the images, the manifest, and the signature. A phone or Mac will refuse to add it, because wallet apps only accept passes signed with credentials from Apple or Google.

Without `.env.local`, the app runs in demo mode instead: the preview and data links work, and the wallet buttons show "Not configured". Delete `.env.local` and restart to go back to it.

| Script                  | What it does                                               |
| ----------------------- | ---------------------------------------------------------- |
| `npm run dev`           | Starts the development server                              |
| `npm run demo:setup`    | Creates throwaway test credentials for the local demo     |
| `npm test`              | Runs the test suite                                        |
| `npm run build`         | Builds the app for production                              |
| `npm start`             | Serves the production build                                |
| `npm run lint`          | Checks the code with ESLint                                |
| `npm run embed-images`  | Re-embeds the Apple pass images after you change `pass-assets/` |

### Configuration

To save passes for real, copy `.env.example` to `.env.local` (replacing the demo file) and fill in the values. Each platform turns on as soon as its values are set. `npm run demo:setup` won't overwrite a `.env.local` holding real credentials unless you add `-- --force`.

| Platform      | You need                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------ |
| Apple Wallet  | An Apple Developer Program membership, a Pass Type ID, its certificate and private key, and Apple's WWDR intermediate certificate |
| Google Wallet | A Google Wallet API issuer account and a Google Cloud service account key linked to it   |

Certificates and keys can be pasted as PEM text with `\n` line breaks, or as base64. Never commit `.env.local` or any key files.

### API

| Route                                                  | Returns                                                         |
| ------------------------------------------------------ | --------------------------------------------------------------- |
| `GET /api/passes/apple?card=membership&name=Jordan%20Lee` | A signed `.pkpass` file                                      |
| `GET /api/passes/google?card=membership&name=Jordan%20Lee` | A redirect to the signed Save to Google Wallet link (in the local demo, the link is shown instead) |
| Either route with `&format=json`                       | The unsigned pass data, even in demo mode                       |

`card` is `membership`, `loyalty`, or `event`. Invalid input returns `400`, and a platform without credentials returns `503` with a list of the missing settings.

### Hosting

The pass routes sign on the server, so the app needs a Node.js host such as Vercel, rather than static hosting like GitHub Pages. Set the same environment variables in your host's settings, and set `PUBLIC_SITE_URL` so Google Wallet can show the card logo.
