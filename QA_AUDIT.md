# QA Audit - COSMIC-AI

Data audit: 2026-05-26  
Scope: Next.js app (App Router) + Firebase + OpenAI + DivineAPI + Stripe + Oblio + Google Maps APIs.

## 1. Funcționalități Descoperite

### Rute UI (App Router)
- `/<locale>` și `/` pentru landing (`/ro`, `/en`), cu middleware de localizare automată.
- Landing sections: navigation, hero, how-it-works, agents, chat preview, cosmic data, pricing, testimonials, FAQ, final CTA, footer.
- Auth: `/login`, `/register` (și variante locale).
- Onboarding: `/onboarding` (și variantă locală), wizard în 3 pași.
- Chat: `/chat` și `/ask` (ask = alias către chat), plus variante locale.
- Account: `/account` + `/account/subscription` (și variante locale).
- Billing setup: `/billing/setup` (și variantă locală).
- Pricing: `/pricing` (și variantă locală).
- Report one-off: `/report` (și variantă locală).
- Subscription success: `/subscription/success` (și variantă locală).
- Redirect-uri dedicate: `/subscription` -> `/account/subscription`; `/<locale>/subscription` -> `/<locale>/account/subscription`.

### Rute API
- Auth user bootstrap: `POST /api/auth/create-user`.
- Profile: `GET/POST /api/user/profile`.
- Billing profile: `GET/POST /api/billing-profile`.
- Subscription: `GET /api/subscription/status`.
- Usage: `POST /api/usage/increment`.
- Chat:
- `POST /api/agents/chat`.
- `GET /api/chat/conversations`.
- `GET /api/chat/conversations/[conversationId]/messages`.
- Readings:
- `GET /api/readings`.
- `GET /api/readings/[readingId]`.
- Astrology:
- `POST /api/astrology/natal`.
- `GET /api/astrology/daily`.
- `POST /api/astrology/generate-all`.
- `POST /api/astrology/compatibility`.
- `GET /api/astrology/overview`.
- Partners:
- `GET/POST /api/partners`.
- Location:
- `GET /api/location/autocomplete`.
- `POST /api/location/resolve`.
- Stripe:
- `POST /api/stripe/create-checkout-session`.
- `POST /api/stripe/create-billing-portal-session`.
- `POST /api/stripe/webhook` (public webhook, semnătură obligatorie).
- Report purchase:
- `GET/POST /api/report/purchase`.
- Internal billing ops:
- `POST /api/internal/oblio/retry` (secret header-based).

### Pagini Protejate
- Protejate client-side cu `AuthGuard`: chat, onboarding, account, report, subscription success, subscription card, billing setup client.
- API-urile (aproape toate) folosesc `requireUser` + bearer token Firebase.
- Excepții fără `requireUser`: `POST /api/stripe/webhook`, `POST /api/internal/oblio/retry`.

### Integrări Externe
- OpenAI Responses API:
- Chat generation (`lib/agents/openai.ts`).
- Divine content translation cache/translation (`lib/divineapi/localization.ts`).
- DivineAPI:
- Natal, daily horoscope, synastry, fallback pe mai multe endpoint-uri (`lib/divineapi/*`).
- Google Maps APIs:
- Places autocomplete, place details, geocode, timezone (`lib/location/resolver.ts`).
- Stripe:
- Checkout sessions, billing portal, webhooks (`app/api/stripe/*`, `lib/stripe/*`).
- Oblio:
- Factură/credit note/cancel + retry pipeline (`lib/oblio/*`, `api/internal/oblio/retry`).

### Roluri/Permisiuni
- Nu există roluri de tip admin/user în UI/API.
- Model de acces actual: `unauthenticated` vs `authenticated` + gating pe `subscriptionPlan/subscriptionStatus`.

## 2. Fluxuri Utilizator Reale

1. Landing -> Login/Register -> Firebase auth -> `POST /api/auth/create-user` -> redirect către `next` sau onboarding/chat.
2. Prima intrare user autentificat fără profil complet -> onboarding wizard -> `POST /api/user/profile` -> redirect chat.
3. User cu profil complet intră în onboarding -> redirect automat către chat.
4. Intrare în chat -> încărcare listă conversații + status abonament + profil; dacă profil incomplet -> redirect onboarding.
5. Chat nou implicit la intrare (`/chat`) și la buton `New`; conversația se creează doar la primul mesaj trimis.
6. Trimitere mesaj chat -> `POST /api/agents/chat` -> increment usage -> verificări profil/input -> Divine data + OpenAI response -> persist conversație + mesaje + reading.
7. CTA din chat pentru `generate-all` -> `POST /api/astrology/generate-all` -> refresh context conversație.
8. Account dashboard:
- încărcare profil, istoric readings, divine overview, partners, subscription.
- acțiuni: regenerate natal/daily, generate-all, compatibility (saved/new partner), profile edit.
9. Billing setup flow:
- load/save billing profile.
- dacă vine din checkout flow, după save continuă direct către Stripe checkout.
10. Pricing flow:
- Free -> onboarding.
- Premium -> checkout session; dacă lipsesc billing details -> redirect billing setup.
11. Report one-off flow:
- status purchase check.
- dacă nu e paid -> Stripe one-off checkout.
- dacă e paid -> consume purchase pentru unlock.
12. Subscription management:
- page status + usage + billing details + open Stripe billing portal.
13. Stripe webhook backend:
- sync subscription state, grace logic, report purchase marking, billing events, Oblio invoice/corrections.
14. Oblio retry internal flow:
- trigger securizat cu header secret pentru joburi pending.

## 3. Acțiuni Care Trebuie Testate

- Login email/parolă și Google login.
- Register email/parolă și Google login.
- Fallback path `next` după autentificare.
- Onboarding step navigation (Back/Continue), validări pe fiecare step, submit final.
- Birth place autocomplete + resolve (cu și fără date complete de birth date/time).
- Chat:
- inițializare stare „new chat”.
- click `New`.
- selectare conversație istoric.
- trimitere prompt liber.
- trimitere suggested prompt.
- handling erori usage/profile/divine.
- CTA generate divine data din chat.
- Account:
- salvare profil.
- listare readings + load more + open reading detail.
- generate-all.
- natal generate/regenerate.
- daily generate/regenerate.
- compatibility pe saved partner.
- compatibility cu partner nou (save on/off).
- Billing:
- save profile cu țară România/non-România.
- Stripe checkout subscription.
- Stripe checkout one-off report.
- Stripe portal open.
- Report page: status loading, buy, consume.
- Language switcher pe toate paginile și persistența locale.
- Redirect-uri locale/non-locale.
- Webhook handling pentru evenimente Stripe principale.
- Oblio retry endpoint cu secret valid/invalid.

## 4. Riscuri Unde Pot Apărea Bug-uri

- Fluxuri cu dependențe externe multiple (OpenAI + Divine + Google + Stripe + Oblio) pot produce degradări în lanț.
- Cursor pagination bazat pe timestamp (`startAfter(Timestamp.fromDate(cursor))`) poate omite/duplica elemente dacă mai multe docs au același timestamp.
- Consum report purchase fără tranzacție (read+write separat) este vulnerabil la concurență/race.
- Free conversation auto-pruning poate șterge conversații vechi fără confirmare UX.
- AuthGuard e client-side; până la redirect utilizatorul vede loading screen și poate avea percepție de blocaj pe conexiuni lente.
- Validări de formă dată/oră sunt minimale în backend pentru profil/partener.
- Placeholder links (`#`) duc la dead-ends UX.
- Lipsă `data-testid` face dificilă stabilitatea testelor E2E la refactor UI.

## 5. Zone Unde Lipsesc Validări

- `POST /api/user/profile` validează prezența stringurilor, dar nu validează format strict pentru `birthDate`/`birthTime` ([app/api/user/profile/route.ts:31](/Users/code-with-a/Dev/COSMIC-AI/app/api/user/profile/route.ts:31)).
- `parsePartnerBirthDetails` verifică completitudine minimă, fără validare strictă format dată/oră ([lib/agents/context.ts:88](/Users/code-with-a/Dev/COSMIC-AI/lib/agents/context.ts:88)).
- `POST /api/partners` moștenește aceeași limitare de validare format ([app/api/partners/route.ts:90](/Users/code-with-a/Dev/COSMIC-AI/app/api/partners/route.ts:90)).
- `POST /api/report/purchase` nu folosește tranzacție pentru consume și poate permite concurență logică ([app/api/report/purchase/route.ts:66](/Users/code-with-a/Dev/COSMIC-AI/app/api/report/purchase/route.ts:66)).
- `GET /api/report/purchase` folosește `limit(1)` fără ordonare explicită pentru paid/consumed ([app/api/report/purchase/route.ts:18](/Users/code-with-a/Dev/COSMIC-AI/app/api/report/purchase/route.ts:18)).
- `POST /api/internal/oblio/retry` are securizare doar cu header secret static, fără auth user/role și fără rate limiting ([app/api/internal/oblio/retry/route.ts:30](/Users/code-with-a/Dev/COSMIC-AI/app/api/internal/oblio/retry/route.ts:30)).

## 6. Zone Unde Trebuie Adăugate `data-testid`

- Auth form:
- email input, password input, submit button, google button, error banner.
- Onboarding:
- step container, each step CTA (`continue`, `back`), birth place autocomplete input/list item, final submit.
- Chat:
- new button, conversation list item, message input, send button, suggested prompt chips, typing indicator, error bubble, divine CTA button.
- Account:
- section tabs, save profile button, generate-all/natal/daily/synastry buttons, partner form fields, reading row, load-more readings.
- Billing setup:
- all form fields, save button, success/error messages.
- Pricing/Report/Subscription:
- checkout buttons, portal button, consume report button, loading state wrappers.
- Landing CTA:
- top nav start/login, hero CTA, final CTA, pricing plan CTA.

## 7. Bug-uri Evidente Observate în Cod

- Butonul CTA din cardurile de agenți nu are acțiune reală (nu are `onClick` funcțional sau `href`), doar efecte hover ([components/landing/agents-section.tsx:364](/Users/code-with-a/Dev/COSMIC-AI/components/landing/agents-section.tsx:364)).
- Newsletter subscribe în footer este UI-only, fără submit handler/API call ([components/landing/footer.tsx:83](/Users/code-with-a/Dev/COSMIC-AI/components/landing/footer.tsx:83)).
- Multiple link-uri footer/social sunt placeholder `#`, fără destinații reale (dead links) ([components/landing/footer.tsx:100](/Users/code-with-a/Dev/COSMIC-AI/components/landing/footer.tsx:100), [components/landing/footer.tsx:122](/Users/code-with-a/Dev/COSMIC-AI/components/landing/footer.tsx:122)).

## 8. Scenarii Care Trebuie Testate Manual

1. User nou: register -> onboarding complet -> chat -> primul mesaj creează conversația.
2. User existent cu profil complet: intrare direct pe `/en/chat` -> new chat state fără auto-select conversație veche.
3. Click `New` din chat cu istoric existent -> rămâne în stare new până la trimitere mesaj.
4. Chat usage limit atins -> mesaj 403 și CTA-uri upgrade/report.
5. Chat daily_guidance fără sun sign -> eroare specifică + recuperare după generate natal.
6. Compatibility cu partener salvat și cu partener nou (cu/ fără savePartner).
7. Birth place autocomplete:
- query scurt (<2), query valid, no results, resolve fail, timezone fail.
8. Onboarding submit fără resolved location -> eroare corectă.
9. Account profile edit cu schimbare locație -> se invalidează resolved state până la reselecție.
10. Reading history pagination cu multe records și timestamp apropiat.
11. Pricing Premium fără billing profile -> redirect billing setup cu query params corecți.
12. Billing setup save + continue checkout subscription.
13. Report one-off:
- before purchase.
- after successful checkout (`checkout=success`).
- consume purchase și refresh status.
14. Subscription page:
- free plan.
- premium active.
- grace period.
- cancelAtPeriodEnd.
15. Stripe webhook end-to-end în sandbox:
- checkout.session.completed.
- subscription created/updated/deleted.
- invoice.payment_succeeded/failed.
- credit_note.created/voided.
- invoice.voided.
16. Oblio retry endpoint:
- fără secret.
- secret invalid.
- secret valid cu limit custom.
17. Language switching pe pagini și persist cookie locale la refresh/revisit.
18. Deep links locale: `/ro/...` și `/en/...` pentru login/onboarding/chat/account/report.
19. Browser refresh în mijlocul fluxurilor (chat/account/billing/report) pentru verificare recuperare stare.
20. Rețea lentă/offline intermitentă pentru toate stările `loading/error` critice.

