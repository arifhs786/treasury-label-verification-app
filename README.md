# Treasury Take-Home Project: AI-Powered Alcohol Label Verification App

This is a standalone proof-of-concept web application for alcohol label verification. It is designed around the stakeholder notes in the take-home instructions: reviewers need a fast, simple tool that helps compare label artwork against application data without adding complexity to their workflow.

## Live Prototype

Add deployed URL here after deployment.

## Core Features

- Upload one alcohol label image and run OCR.
- Enter expected application fields:
  - Brand name
  - Class/type designation
  - Alcohol content
  - Net contents
  - Government health warning statement
- Compare OCR text against expected application values.
- Show pass, review, or fail results with confidence and notes.
- Support manual pasted text as a fallback when OCR fails or the environment blocks OCR resources.
- Batch upload support with per-file status summaries and detailed per-label results.
- Simple, accessible interface intended for users with varying levels of technical comfort.

## Technical Approach

The prototype uses:

- **Next.js + React + TypeScript** for the web application.
- **Tailwind CSS** for simple responsive styling.
- **Tesseract.js** for browser-compatible OCR.
- Rule-based verification logic for required label fields.
- Fuzzy matching for fields where harmless formatting differences should not automatically fail review, such as `STONE'S THROW` versus `Stone's Throw`. The matching logic normalizes punctuation, case, whitespace, and common OCR text variations.
- Stricter checks for the Government Health Warning because the instructions identify that wording, capitalization, and formatting are especially important.

## Why This Approach

The stakeholder notes emphasized several constraints:

1. Results need to be fast enough for agents to use.
2. The interface must be simple and obvious.
3. The prototype should be standalone and not integrate directly with COLA.
4. Government environments may block outbound calls to cloud ML endpoints.
5. A working core application with clean code is preferred over an ambitious incomplete system.

For that reason, this prototype avoids requiring an external AI API. It uses OCR plus deterministic verification logic so the application can still demonstrate value in restricted environments.


## Stakeholder-Driven Features

- **Fuzzy matching:** Added because the stakeholder notes describe real compliance judgment issues such as `STONE'S THROW` versus `Stone's Throw`. The app does not automatically fail harmless capitalization or punctuation differences.
- **Batch upload:** Added because the notes describe peak-season importer submissions with hundreds of labels. The prototype processes multiple files sequentially and displays a batch summary plus detailed results for each file.
- **Strict warning review:** Added because the Government Health Warning requirement was identified as a high-risk exact-wording check. OCR can detect the text, but bold formatting remains a human visual confirmation item.

## Assumptions

- The user supplies expected application data manually in this prototype.
- OCR quality depends on the uploaded image quality.
- The app does not store uploaded images or extracted text.
- Bold formatting detection for the warning statement is not fully reliable with OCR alone, so the app flags that as a human-review note.
- Batch upload is included as a lightweight prototype feature with sequential OCR processing and per-file review summaries rather than a full production queueing system.

## Limitations and Future Improvements

- Improve OCR preprocessing for glare, skew, rotation, and poor lighting.
- Add image cropping and label region selection.
- Add CSV export for batch review results.
- Add stronger validation rules by beverage type: beer, wine, and distilled spirits.
- Add audit logs, authentication, and document retention controls for production use.
- Add a server-side OCR option for environments where browser OCR is not appropriate.
- Add optional Azure-compatible deployment architecture for government cloud environments.

## Setup Instructions

### Prerequisites

- Node.js 20 or newer
- npm

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### Build

```bash
npm run build
```

### Start production build locally

```bash
npm start
```

## Deployment

This app can be deployed on Vercel or another Node-compatible hosting provider.

Suggested Vercel steps:

1. Push this repository to GitHub.
2. Log in to Vercel.
3. Import the GitHub repository.
4. Use the default Next.js settings.
5. Deploy.
6. Copy the deployed URL into the Treasury submission form and into the `Live Prototype` section above.

## Test Scenario

Use the default application fields shown in the UI:

- Brand Name: `OLD TOM DISTILLERY`
- Class/Type: `Kentucky Straight Bourbon Whiskey`
- Alcohol Content: `45% Alc./Vol. (90 Proof)`
- Net Contents: `750 mL`
- Government Warning: standard government warning text

Upload a sample label image containing those fields, or paste equivalent text into the manual OCR text box and click **Verify Pasted Text**.

## Security and Privacy Notes

This prototype does not intentionally store files, extracted label text, or application data. All review is performed during the active browser session. Production use would require formal review of authentication, authorization, audit logging, retention, accessibility, and federal security requirements.
