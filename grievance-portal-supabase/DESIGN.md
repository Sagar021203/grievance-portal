# Design Direction — The Department of Us

## Visual concept

A small-town civic records office run by someone deeply in love. The visual language borrows from correspondence, archived case folders, printed stationery, and old-fashioned postal marks. It is intentionally tactile and editorial rather than glossy or dashboard-like.

## Palette

- Warm paper: `#f4f0e7`
- Light stationery: `#fbf8f1`
- Ledger paper: `#ebe4d8`
- Primary ink: `#292522`
- Oxblood seal: `#672e2b`
- Warm coral: `#b75c4e`
- Muted sage: `#63735a`
- Brass / butter accent: `#ead7ab`

## Typography

- Instrument Serif for expressive display headlines and complaint titles.
- DM Sans for controls, metadata, body copy, and navigation.
- Caveat for tiny personal asides and handwritten sign-offs.

## Materials and components

- Paper surfaces with thin warm rules and restrained shadows.
- Small capsule labels only for status/category metadata.
- Case references, file labels, postal seals, and document headings create the civic correspondence grammar.
- The mailbox illustration is the primary hero artwork; no generic icon tiles or stock illustrations.
- The sign-in screen extends the same correspondence world with a watercolor folder/envelope/pen illustration and a quiet private-records-room composition.
- Case details name the sender and recipient; statuses read as office correspondence rather than generic task states.

## Layout and motion

- Mobile-first, single-column register on narrow screens; two-column register on desktop.
- Hero occupies the available first viewport beneath the navigation.
- New rant and detail experiences use native `dialog` for focus handling and Escape behavior.
- Sign-in and registration use a two-column editorial composition on desktop and a stacked layout on mobile.
- Signature motion is restrained: a short form entrance, slow illustration float, and the existing envelope/wax-seal confirmation. Reduced-motion preferences are respected.
- Hover movement is reserved for pointer devices; tap targets remain comfortably sized.

## Interaction and privacy

- Sign-in and signup are through Supabase Auth.
- The recipient picker is driven by registered profiles.
- Complaints and replies are stored in Supabase; the browser does not cache case data in localStorage.
- PostgreSQL Row Level Security makes cases visible only to the sender and recipient.
- The recipient may reply once; the sender may close a replied case.
- WhatsApp links carry a case identifier only. They never grant access by themselves.
