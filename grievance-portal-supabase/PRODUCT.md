# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + TypeScript + Vite, Supabase Auth, PostgreSQL and Realtime, deployed as a Vite app (for example on Vercel).

## Users

Two people in a relationship. Either person can file a grievance to the other, and the named recipient can send an official response.

## Product Purpose

A private-feeling, playful relationship grievance portal. Each person signs in, files a complaint to the other person, reads the responses on their own cases, and can close the matter when satisfied.

## Positioning

A deliberately affectionate mock civic office: relationship complaints are treated like official case files, but the response is caring and a little silly. The mechanism is two-way filing with recipient-specific replies and private case links.

## Operating Context

A personal, mobile-first web experience. Accounts are authenticated with Supabase Auth. Profiles populate the complaint recipient picker. The register shows only cases in which the signed-in person is the sender or recipient. WhatsApp sharing sends a deep link to a specific case.

## Capabilities and Constraints

- Full-screen hero and sticky top navigation with a New rant action.
- Authenticated sign-in/sign-up with display name and unique username.
- Complaint register with category filters, keyword search, sender/recipient context and live updates.
- A sender can create a complaint addressed to another registered user.
- A recipient can submit one official reply to a case.
- Complaint states: `awaiting_response`, `awaiting_acknowledgement`, and `closed`.
- The original sender can close a complaint after a reply or share its deep link over WhatsApp.
- Deep links preserve the case reference through login and deny access to accounts that are neither sender nor recipient.
- Supabase PostgreSQL is the source of truth; there is no app-level localStorage complaint store.
- Database access is enforced through Supabase Row Level Security. The browser uses only the Supabase publishable key.
- Supabase project credentials are provided by the deployer through environment variables.

## Brand Commitments

The product should feel warm, affectionate, playful, and personal. Avoid generic AI-generated dashboard styling and overused pink-gradient romance visuals. The exact phrase “Your voice will be heard, love.” is required in the submission confirmation.

## Evidence on Hand

A custom watercolor/crayon mailbox illustration and a custom watercolor correspondence-desk illustration are included under `src/assets/`. No real couple names, photos, or personal details are hard-coded.

## Product Principles

- Listen without judgement.
- Make small annoyances feel safe to express.
- Treat every entry like a keepsake, not a ticket in a corporate queue.
- Keep the interaction obvious and effortless on a phone.
- Protect each case at the database layer so a URL alone never grants access.
