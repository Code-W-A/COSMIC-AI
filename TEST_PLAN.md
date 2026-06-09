# TEST_PLAN.md - Plan Complet de Testare (Pre-Production)

Context: aplicație Next.js (App Router) cu Firebase Auth/Firestore, OpenAI, DivineAPI, Google Maps, Stripe și Oblio.
Scop: validare end-to-end pentru lansare în producție.
Notă: Acest document definește planul de testare. Nu include implementare de teste automate.

## 1) Teste pentru autentificare

### AUTH-01 - Register cu email/parolă valid
Scop: verifică creare cont și bootstrap user document.
Pași de testare:
1. Accesează `/en/register`.
2. Completează nume, email nou, parolă validă.
3. Apasă submit.
Rezultat așteptat: autentificare reușită, redirect către onboarding/chat conform `resolvePostAuthRoute`, user creat în Firestore.
Prioritate: Critical
Tip: manual
Observații tehnice: validează `POST /api/auth/create-user` și `createUserDocumentIfMissing`.

### AUTH-02 - Login cu email/parolă valid
Scop: verifică autentificare user existent.
Pași de testare:
1. Accesează `/en/login`.
2. Introdu credențiale valide.
3. Apasă submit.
Rezultat așteptat: login reușit, redirect corect, sesiune activă Firebase.
Prioritate: Critical
Tip: automat
Observații tehnice: validează fallback `next` și token bearer în `apiFetch`.

### AUTH-03 - Login cu parolă greșită
Scop: verifică afișare eroare utilizator.
Pași de testare:
1. În `/en/login`, introdu email valid + parolă greșită.
2. Submit.
Rezultat așteptat: mesaj de eroare localizat, fără redirect.
Prioritate: High
Tip: automat
Observații tehnice: eroarea vine din Firebase Auth client.

### AUTH-04 - Google login (cont nou)
Scop: verifică flux OAuth pentru user nou.
Pași de testare:
1. În `/en/register`, click `Continue with Google`.
2. Completează OAuth.
Rezultat așteptat: user autentificat, document Firestore creat.
Prioritate: Critical
Tip: manual
Observații tehnice: verifică `loginWithGoogle` + `createBackendUserDocument`.

### AUTH-05 - Google login cu account linking necesar
Scop: verifică mesajele/fluxul pentru `account-exists-with-different-credential`.
Pași de testare:
1. Folosește email existent pe provider diferit.
2. Inițiază Google login.
Rezultat așteptat: mesaj clar pentru relogin cu metodă existentă sau link account.
Prioritate: High
Tip: manual
Observații tehnice: cod în `lib/firebase/auth.ts` cu `fetchSignInMethodsForEmail` și `linkWithCredential`.

### AUTH-06 - Logout
Scop: verifică invalidarea sesiunii și accesul restricționat.
Pași de testare:
1. Logat, accesează chat/account.
2. Apasă `Log out`.
3. Reîncearcă acces la `/en/chat`.
Rezultat așteptat: redirect la login prin `AuthGuard`.
Prioritate: High
Tip: automat
Observații tehnice: verifică `router.replace` din `AuthGuard`.

## 2) Teste pentru onboarding/profil utilizator

### ONB-01 - Onboarding complet valid
Scop: verifică salvarea profilului și tranziția în chat.
Pași de testare:
1. Completează Step 1 (name).
2. Step 2: birth date/time/place din autocomplete + sex.
3. Step 3: main focus.
4. Final submit.
Rezultat așteptat: `POST /api/user/profile` 200, redirect la `/chat`.
Prioritate: Critical
Tip: automat
Observații tehnice: `birth location` trebuie să fie resolved.

### ONB-02 - Onboarding cu locație nevalidată
Scop: blochează submit când locația nu e selectată din sugestii.
Pași de testare:
1. Introdu text manual la loc naștere, fără select din sugestii.
2. Final submit.
Rezultat așteptat: eroare `birth_location_unresolved`, fără salvare profil.
Prioritate: Critical
Tip: manual
Observații tehnice: validare explicită în `POST /api/user/profile`.

### ONB-03 - User cu profil complet intră pe onboarding
Scop: evită re-onboarding.
Pași de testare:
1. User cu profil complet accesează `/en/onboarding`.
Rezultat așteptat: redirect automat către `/en/chat`.
Prioritate: High
Tip: automat
Observații tehnice: guard în `onboarding/page.tsx` via `GET /api/user/profile`.

### ONB-04 - Persistența datelor draft la prefill
Scop: verifică preîncărcare valori dacă profilul există parțial.
Pași de testare:
1. Creează profil parțial.
2. Reintră în onboarding.
Rezultat așteptat: câmpurile existente sunt prepopulate.
Prioritate: Medium
Tip: manual
Observații tehnice: setare state din payload profile.

### ONB-05 - Validare sex la naștere
Scop: asigură acceptarea doar `male/female`.
Pași de testare:
1. Forțează payload invalid (ex. intercept request).
2. Trimite profil.
Rezultat așteptat: `invalid_profile` 400.
Prioritate: High
Tip: automat
Observații tehnice: `isSexAtBirth` în backend.

### ONB-06 - I18N onboarding
Scop: verifică texte și comportament pe `ro/en`.
Pași de testare:
1. Rulează onboarding complet pe `/ro/onboarding` și `/en/onboarding`.
Rezultat așteptat: texte localizate + flux identic.
Prioritate: Medium
Tip: manual
Observații tehnice: locale din path + cookie.

## 3) Teste pentru chat

### CHAT-01 - Prima intrare chat = stare conversație nouă
Scop: verifică UX de start fără auto-load conversație.
Pași de testare:
1. User cu conversații existente accesează `/en/chat`.
Rezultat așteptat: composer centered, fără mesaje afișate.
Prioritate: Critical
Tip: automat
Observații tehnice: `isNewChatState`.

### CHAT-02 - Trimitere mesaj text simplu
Scop: validează flux complet user->assistant.
Pași de testare:
1. În chat nou, trimite mesaj.
2. Așteaptă răspuns AI.
Rezultat așteptat: mesaj user + răspuns assistant + conversație salvată.
Prioritate: Critical
Tip: automat
Observații tehnice: `POST /api/agents/chat`.

### CHAT-03 - Prompt suggestions
Scop: verifică trigger rapid prin chip-uri.
Pași de testare:
1. Click pe un suggested prompt.
Rezultat așteptat: mesajul este trimis fără input manual.
Prioritate: Medium
Tip: automat
Observații tehnice: `handleSend(prompt)`.

### CHAT-04 - Eroare usage limit
Scop: verifică mesaj și CTA de upgrade/report.
Pași de testare:
1. Simulează user la limită.
2. Trimite mesaj.
Rezultat așteptat: bubble de eroare specifică + CTA-uri corecte.
Prioritate: Critical
Tip: manual
Observații tehnice: cod `usage_limit_reached`.

### CHAT-05 - CTA generate divine data din chat
Scop: verifică acțiunea contextuală.
Pași de testare:
1. Provoacă scenariu cu `natal_chart_missing_sun_sign`/`divineapi_unavailable`.
2. Click `generate now`.
Rezultat așteptat: apel `POST /api/astrology/generate-all`, mesaj succes/fail localizat.
Prioritate: High
Tip: manual
Observații tehnice: `handleGenerateDivineData`.

### CHAT-06 - Scroll + typing indicator
Scop: verifică UX conversație lungă.
Pași de testare:
1. Trimite multiple mesaje.
2. Observă scroll auto și indicator typing.
Rezultat așteptat: scroll la bottom și indicator vizibil în timpul request.
Prioritate: Medium
Tip: manual
Observații tehnice: `scrollToBottom`, `isTyping`.

## 4) Teste pentru creare chat nou

### NEWCHAT-01 - Buton `New` resetează contextul
Scop: trecere în stare conversație nouă.
Pași de testare:
1. Deschide conversație existentă.
2. Click `New`.
Rezultat așteptat: `activeConversationId=null`, messages gol, composer centered.
Prioritate: Critical
Tip: automat
Observații tehnice: `startNewConversation()`.

### NEWCHAT-02 - `New` urmat de primul mesaj
Scop: conversația nouă se creează la primul send.
Pași de testare:
1. Click `New`.
2. Trimite mesaj.
Rezultat așteptat: API returnează `conversationId` nou, istoric refresh.
Prioritate: Critical
Tip: automat
Observații tehnice: backend creează doc nou când lipsește `conversationId`.

### NEWCHAT-03 - `New` nu auto-redeschide conversație veche
Scop: prevenire regresie UX.
Pași de testare:
1. Cu istoric existent, click `New`.
2. Așteaptă câteva secunde fără acțiuni.
Rezultat așteptat: rămâne în starea new chat.
Prioritate: Critical
Tip: automat
Observații tehnice: efectul de auto-open al primei conversații trebuie să rămână inactiv.

### NEWCHAT-04 - Focus input în starea new chat
Scop: optimizează UX de start.
Pași de testare:
1. Intră în `/chat` sau click `New`.
Rezultat așteptat: textarea primește focus.
Prioritate: Medium
Tip: manual
Observații tehnice: efectul de focus depinde de `loadingConversations/loadingMessages`.

## 5) Teste pentru istoric conversații

### HIST-01 - Listare conversații
Scop: afișare istoric cu titluri.
Pași de testare:
1. Accesează chat cu conversații existente.
Rezultat așteptat: listă conversații încărcată corect, stare activă evidențiată.
Prioritate: High
Tip: automat
Observații tehnice: `GET /api/chat/conversations?limit=20`.

### HIST-02 - Deschidere conversație din istoric
Scop: încărcare mesaje conversație selectată.
Pași de testare:
1. Click pe o conversație din istoric.
Rezultat așteptat: mesaje încărcate în ordine ascendentă.
Prioritate: High
Tip: automat
Observații tehnice: `GET /api/chat/conversations/[id]/messages`.

### HIST-03 - Load more conversations
Scop: paginare istoric conversații.
Pași de testare:
1. Dacă există cursor, click `Load more`.
Rezultat așteptat: append fără duplicare vizibilă.
Prioritate: Medium
Tip: manual
Observații tehnice: risc timestamp collisions la cursor.

### HIST-04 - Conversație inexistentă
Scop: handling pentru `conversation_not_found`.
Pași de testare:
1. Forțează `openConversation` cu ID invalid.
Rezultat așteptat: fallback sigur (UI nu crash), messages gol.
Prioritate: High
Tip: manual
Observații tehnice: catch în `openConversation`.

### HIST-05 - Limită free conversations (pruning)
Scop: verifică enforcement free plan.
Pași de testare:
1. User free creează >10 conversații.
Rezultat așteptat: conversațiile vechi sunt eliminate backend conform policy.
Prioritate: High
Tip: manual
Observații tehnice: `enforceFreeConversationLimit`.

## 6) Teste pentru agenți AI

### AGENT-01 - Selectare agent din sidebar
Scop: schimbarea agentului activ.
Pași de testare:
1. Click pe mai mulți agenți.
2. Trimite mesaje după fiecare selecție.
Rezultat așteptat: răspunsurile reflectă agentul ales; `agentType` corect în backend.
Prioritate: High
Tip: automat
Observații tehnice: agent labels/persona din catalog.

### AGENT-02 - Agent compatibility cere date partener
Scop: validare policy de input.
Pași de testare:
1. Selectează compatibility agent.
2. Trimite mesaj fără partner details.
Rezultat așteptat: eroare/ghidaj specific partner data.
Prioritate: High
Tip: manual
Observații tehnice: `getPartnerInputCompleteness` în chat route.

### AGENT-03 - Agent daily guidance fără sun sign
Scop: comportament când precondiții lipsesc.
Pași de testare:
1. User fără natal valid trimite daily guidance prompt.
Rezultat așteptat: cod specific + CTA generate.
Prioritate: High
Tip: manual
Observații tehnice: `natal_chart_missing_sun_sign`.

### AGENT-04 - Agent cards/follow-up structure
Scop: conformitate output schema.
Pași de testare:
1. Trimite prompturi diverse.
2. Inspectează payload salvat în reading.
Rezultat așteptat: `answer`, `cards`, `followUpQuestions` valide.
Prioritate: High
Tip: automat
Observații tehnice: schema în `response-format.ts`.

### AGENT-05 - Localizare răspuns agent
Scop: răspuns în limba locale-ului curent.
Pași de testare:
1. Mesaj în `/ro/chat` și `/en/chat`.
Rezultat așteptat: output în limba corectă.
Prioritate: Medium
Tip: manual
Observații tehnice: `locale` transmis către OpenAI + prompt rules.

## 7) Teste pentru analize astrologice

### ASTRO-01 - Generate natal
Scop: generează și persistă natal summary.
Pași de testare:
1. Din account, click generate natal.
Rezultat așteptat: `POST /api/astrology/natal` succes, overview actualizat.
Prioritate: Critical
Tip: automat
Observații tehnice: verifică `natalSummary`, `sunSign`, `natalChartGeneratedAt`.

### ASTRO-02 - Regenerate natal (force)
Scop: reexecută generare când există deja date.
Pași de testare:
1. Click regenerate natal.
Rezultat așteptat: request cu `force=true`, timestamp nou.
Prioritate: High
Tip: manual
Observații tehnice: path fallback Divine trebuie validat.

### ASTRO-03 - Generate daily guidance
Scop: generează daily și cache-uiește.
Pași de testare:
1. Click generate daily.
2. Repetă fără force.
Rezultat așteptat: prima rulare generate, a doua cache hit.
Prioritate: High
Tip: manual
Observații tehnice: daily key în funcție de timezone/date.

### ASTRO-04 - Generate all
Scop: orchestrare natal + daily.
Pași de testare:
1. Click generate all.
Rezultat așteptat: payload cu `generated/cached` coerent.
Prioritate: High
Tip: automat
Observații tehnice: `compatibilitySupported=false` expected.

### ASTRO-05 - Divine overview
Scop: agregare stări astrologice pentru account.
Pași de testare:
1. După generări, reload account.
Rezultat așteptat: tab-uri populate corect (`natal/daily/synastry`).
Prioritate: High
Tip: automat
Observații tehnice: `GET /api/astrology/overview`.

### ASTRO-06 - Erori provider astrologie
Scop: fallback UX când Divine API e unavailable.
Pași de testare:
1. Simulează 401/403/5xx de la Divine.
Rezultat așteptat: coduri mapate (`divineapi_*`) și mesaj localizat.
Prioritate: Critical
Tip: manual
Observații tehnice: mapare în route handlers.

## 8) Teste pentru sinastrie/compatibilitate

### SYN-01 - Compatibilitate cu partener salvat
Scop: folosire partnerId existent.
Pași de testare:
1. Selectează partener din dropdown account.
2. Generate compatibility.
Rezultat așteptat: reading creat, summary actualizat.
Prioritate: High
Tip: automat
Observații tehnice: `POST /api/astrology/compatibility` cu `partnerId`.

### SYN-02 - Compatibilitate cu partener nou + save
Scop: create partner + reading.
Pași de testare:
1. Completează form partener nou.
2. `savePartner=true`, generate.
Rezultat așteptat: partner salvat în `partners`, reading nou.
Prioritate: High
Tip: manual
Observații tehnice: include location resolve.

### SYN-03 - Compatibilitate cu partener nou fără save
Scop: reading fără persistare partener.
Pași de testare:
1. Form partener nou.
2. `savePartner=false`, generate.
Rezultat așteptat: reading creat, partenerul nu apare în listă.
Prioritate: Medium
Tip: manual
Observații tehnice: verifică payload și query partners.

### SYN-04 - Partener incomplet
Scop: validare input obligatoriu.
Pași de testare:
1. Trimite payload fără câmpuri obligatorii.
Rezultat așteptat: 400 `compatibility_partner_incomplete`.
Prioritate: High
Tip: automat
Observații tehnice: aceeași regulă în `/api/partners` și `/api/astrology/compatibility`.

### SYN-05 - Fallback dual natal când synastry endpoint indisponibil
Scop: continuitate funcțională.
Pași de testare:
1. Simulează eșec pe SYNASTRY path candidates.
2. Rulează compatibilitate.
Rezultat așteptat: `mode=dual_natal_interpretation`.
Prioritate: Medium
Tip: manual
Observații tehnice: fallback în `lib/divineapi/compatibility.ts`.

## 9) Teste pentru generare răspunsuri OpenAI

### OAI-01 - Răspuns valid JSON schema
Scop: contract strict output.
Pași de testare:
1. Rulează chat pe mai multe agentType.
2. Inspectează parsing/validation.
Rezultat așteptat: fără excepții `validateAgentResponse`.
Prioritate: Critical
Tip: automat
Observații tehnice: schema strictă în Responses API.

### OAI-02 - Empty output handling
Scop: robusteză la răspuns gol OpenAI.
Pași de testare:
1. Simulează `output_text` gol.
Rezultat așteptat: eroare controlată `OpenAI returned an empty response`.
Prioritate: High
Tip: manual
Observații tehnice: verifică bubble de eroare în UI chat.

### OAI-03 - Translation pipeline RO
Scop: verifică traducerea segmentelor și cache-ul.
Pași de testare:
1. Rulează fluxuri cu locale `ro`.
2. Repetă aceeași cerere.
Rezultat așteptat: traduceri coerente, hit în `translationCache`.
Prioritate: High
Tip: manual
Observații tehnice: `lib/divineapi/localization.ts`.

### OAI-04 - Model config fallback
Scop: verifică fallback model dacă env lipsă.
Pași de testare:
1. Fără `OPENAI_MODEL` explicit.
2. Rulează chat.
Rezultat așteptat: folosește model default setat în cod.
Prioritate: Medium
Tip: manual
Observații tehnice: `gpt-5.4-mini` default.

### OAI-05 - Metadata tracing
Scop: verifică metadata pentru observabilitate.
Pași de testare:
1. Rulează chat.
2. Inspectează request metadata (logs/tracing).
Rezultat așteptat: include `scope` și `agentType`.
Prioritate: Low
Tip: manual
Observații tehnice: util pentru debugging producție.

## 10) Teste pentru Firebase Firestore

### FS-01 - Creare user document la first login
Scop: bootstrap date user.
Pași de testare:
1. Login/register user nou.
2. Verifică `users/{uid}`.
Rezultat așteptat: doc cu câmpuri implicite (plan free, usage limits).
Prioritate: Critical
Tip: automat
Observații tehnice: `createUserDocumentIfMissing`.

### FS-02 - Persist profile update
Scop: salvare corectă profile + timestamps.
Pași de testare:
1. Edit profile account.
2. Submit.
Rezultat așteptat: merge update în `cosmicProfile/main`.
Prioritate: High
Tip: automat
Observații tehnice: batch set profile + user updatedAt.

### FS-03 - Persist chat artifacts
Scop: verifică scriere conversație + mesaje + reading.
Pași de testare:
1. Trimite mesaj chat.
2. Inspectează colecțiile.
Rezultat așteptat: `conversations/{id}`, `messages/*`, `readings/*` create.
Prioritate: Critical
Tip: automat
Observații tehnice: batch commit în `/api/agents/chat`.

### FS-04 - Enforce free conversation limit
Scop: prune conversații vechi la user free.
Pași de testare:
1. Creează >10 conversații user free.
Rezultat așteptat: conversații în exces șterse cascade (inclusiv messages).
Prioritate: High
Tip: manual
Observații tehnice: `deleteConversationCascade`.

### FS-05 - Report purchase consume consistency
Scop: verifică tranziția `paid -> consumed`.
Pași de testare:
1. Simulează paid purchase.
2. Rulează consume.
Rezultat așteptat: status actualizat, `consumedAt` setat.
Prioritate: High
Tip: manual
Observații tehnice: lipsă tranzacție => test de concurență recomandat.

## 11) Teste pentru Firebase Auth

### FAUTH-01 - Token bearer obligatoriu pe API protejate
Scop: acces control.
Pași de testare:
1. Apelează API protejat fără Authorization.
Rezultat așteptat: 401 `unauthenticated`.
Prioritate: Critical
Tip: automat
Observații tehnice: `requireUser` + `verifyIdToken`.

### FAUTH-02 - Token invalid/expirat
Scop: hardening pe token checks.
Pași de testare:
1. Trimite token invalid.
Rezultat așteptat: 401, fără leak de detalii sensibile.
Prioritate: High
Tip: automat
Observații tehnice: `getCurrentUser` log warning.

### FAUTH-03 - AuthGuard client redirect
Scop: protecție UI.
Pași de testare:
1. User neautentificat accesează `/en/account`.
Rezultat așteptat: redirect login cu `next` corect.
Prioritate: High
Tip: automat
Observații tehnice: loading intermediar tolerat.

### FAUTH-04 - Schimbare stare auth în runtime
Scop: reacție UI la logout/session expiry.
Pași de testare:
1. Deschide pagină protejată.
2. Invalidează sesiunea.
Rezultat așteptat: redirect către login.
Prioritate: Medium
Tip: manual
Observații tehnice: `onAuthStateChanged`.

## 12) Teste pentru Firebase Storage (dacă este folosit)

### FSTOR-01 - Verificare utilizare Storage în aplicație
Scop: confirmă scope real pentru release.
Pași de testare:
1. Inspectează cod și fluxuri runtime pentru upload/download.
Rezultat așteptat: Storage nu este folosit funcțional; doar config prezent.
Prioritate: Medium
Tip: manual
Observații tehnice: numai `storageBucket` în config client.

### FSTOR-02 - Protecție împotriva dependențelor fantomă
Scop: evită presupuneri greșite în QA automation.
Pași de testare:
1. Rulează smoke E2E principal (auth/onboarding/chat/account).
Rezultat așteptat: nicio funcționalitate critică nu depinde de Storage.
Prioritate: Low
Tip: manual
Observații tehnice: documentează explicit în test strategy.

## 13) Teste pentru API routes din Next.js

### API-01 - Contract success shape
Scop: consistență `{ success: true, ... }`.
Pași de testare:
1. Apelează principalele endpoints happy path.
Rezultat așteptat: payload consistent cu contract.
Prioritate: High
Tip: automat
Observații tehnice: `successResponse` helper.

### API-02 - Contract error shape
Scop: consistență `{ success:false, error:{code,message} }`.
Pași de testare:
1. Forțează erori pentru endpoints cheie.
Rezultat așteptat: schema de eroare consistentă.
Prioritate: High
Tip: automat
Observații tehnice: unele endpoints returnează custom JSON (usage), include în assertions.

### API-03 - Method coverage
Scop: endpoint-urile acceptă doar metodele declarate.
Pași de testare:
1. Trimite metode nepermise (GET la POST routes etc).
Rezultat așteptat: 405 sau fallback sigur.
Prioritate: Medium
Tip: automat
Observații tehnice: `create-user` are GET explicit 405; altele trebuie validate.

### API-04 - Auth coverage pe toate routes protejate
Scop: niciun endpoint sensibil expus fără auth.
Pași de testare:
1. Rulează scan API fără token.
Rezultat așteptat: doar webhook+oblio retry neautentificate.
Prioritate: Critical
Tip: automat
Observații tehnice: compară cu inventar din audit.

### API-05 - Query params validation
Scop: robusteză la `limit/cursor/force/source`.
Pași de testare:
1. Trimite valori invalide, extreme.
Rezultat așteptat: clamping sau eroare controlată.
Prioritate: Medium
Tip: automat
Observații tehnice: `limit` clamp existent pe list endpoints.

### API-06 - Idempotency / duplicate request behavior
Scop: comportament stabil la retries.
Pași de testare:
1. Repetă rapid cereri de create/consume.
Rezultat așteptat: fără corupție de date; rezultate predictibile.
Prioritate: High
Tip: manual
Observații tehnice: relevant pentru report consume și webhook processing.

## 14) Teste pentru erori API

### ERR-01 - 401 unauthenticated
Scop: răspuns clar și localizat în client.
Pași de testare:
1. Simulează 401 pe `apiFetch`.
Rezultat așteptat: mesaj localizat și redirect unde e cazul.
Prioritate: Critical
Tip: automat
Observații tehnice: mapare în `api-errors.ts`.

### ERR-02 - 400 validation errors
Scop: afișare mesaje utile pentru user.
Pași de testare:
1. Trigger `invalid_profile`, `compatibility_partner_incomplete`.
Rezultat așteptat: mesaj clar în UI, fără crash.
Prioritate: High
Tip: automat
Observații tehnice: onboarding/account/chat/report flows.

### ERR-03 - 403 business rules
Scop: handling pentru limit/upgrade/report required.
Pași de testare:
1. Trigger `usage_limit_reached`, `report_purchase_required`.
Rezultat așteptat: CTA-uri adecvate și status UI corect.
Prioritate: Critical
Tip: manual
Observații tehnice: chat/report pages.

### ERR-04 - 5xx upstream failures
Scop: reziliență UI la provider failures.
Pași de testare:
1. Simulează 5xx Divine/OpenAI/Stripe API routes.
Rezultat așteptat: error banners, fără blocaj permanent.
Prioritate: Critical
Tip: manual
Observații tehnice: verifică retry manual user actions.

### ERR-05 - JSON invalid in request
Scop: verifică protecție parser backend.
Pași de testare:
1. Trimite body invalid JSON la POST routes.
Rezultat așteptat: `invalid_json` 400 consistent.
Prioritate: Medium
Tip: automat
Observații tehnice: prezent în majoritatea routes.

## 15) Teste pentru loading states

### LOAD-01 - AuthGuard loading
Scop: feedback în timp ce auth state se rezolvă.
Pași de testare:
1. Simulează latență Firebase Auth.
Rezultat așteptat: loading screen vizibil, apoi redirect sau content.
Prioritate: High
Tip: manual
Observații tehnice: componenta `CosmicAuthLoading`.

### LOAD-02 - Onboarding profile gate loading
Scop: prevenire flicker.
Pași de testare:
1. Intră onboarding cu rețea lentă.
Rezultat așteptat: mesaj `Checking your profile...` până la rezultat.
Prioritate: Medium
Tip: manual
Observații tehnice: `isProfileGateLoading`.

### LOAD-03 - Chat loading conversations/messages
Scop: skeleton UX.
Pași de testare:
1. Simulează latență pe conversații și mesaje.
Rezultat așteptat: skeleton lists afișate corect.
Prioritate: Medium
Tip: manual
Observații tehnice: `ConversationsSkeletonList`, `MessagesSkeletonList`.

### LOAD-04 - Action buttons loading states
Scop: prevenire dublu submit.
Pași de testare:
1. Trigger acțiuni async (checkout, generate, save).
Rezultat așteptat: butoane disabled + spinner/text loading.
Prioritate: High
Tip: automat
Observații tehnice: verify flags `saving`, `actionLoading`, `checkoutLoading`.

## 16) Teste pentru pagini protejate

### PROT-01 - Acces neautentificat la `/chat`
Scop: enforcement protecție.
Pași de testare:
1. Fără sesiune, accesează `/en/chat`.
Rezultat așteptat: redirect login cu param `next`.
Prioritate: Critical
Tip: automat
Observații tehnice: `AuthGuard`.

### PROT-02 - Acces neautentificat la `/account`
Scop: protecție dashboard.
Pași de testare:
1. Fără sesiune, accesează `/en/account`.
Rezultat așteptat: redirect login.
Prioritate: Critical
Tip: automat
Observații tehnice: idem.

### PROT-03 - Acces neautentificat la `/report`
Scop: protecție one-off report.
Pași de testare:
1. Fără sesiune, accesează `/en/report`.
Rezultat așteptat: redirect login.
Prioritate: Critical
Tip: automat
Observații tehnice: plus fallback în `startCheckout` la 401.

### PROT-04 - API route access matrix
Scop: confirmă protecții backend.
Pași de testare:
1. Rulează acces neautentificat pe toate API routes.
Rezultat așteptat: 401 pe cele protejate; excepții doar webhook + oblio retry.
Prioritate: Critical
Tip: automat
Observații tehnice: documentează explicit excepțiile.

## 17) Teste pentru responsive pe mobil

### MOB-01 - Layout chat pe mobil
Scop: usability chat sub 768px.
Pași de testare:
1. Emulează device mobil.
2. Testează sidebar overlay, send flow.
Rezultat așteptat: meniu mobil funcțional, fără overflow critic.
Prioritate: High
Tip: manual
Observații tehnice: `mobileSidebarOpen` overlay + close actions.

### MOB-02 - Onboarding mobil
Scop: completare wizard pe ecran mic.
Pași de testare:
1. Rulează onboarding complet pe mobil.
Rezultat așteptat: câmpuri accesibile, CTA vizibil, fără blocaje.
Prioritate: High
Tip: manual
Observații tehnice: verifică input date/time picker behavior.

### MOB-03 - Account page mobil
Scop: navigare secțiuni și formulare pe mobil.
Pași de testare:
1. Accesează account, schimbă tab-uri, editează profile/compatibility.
Rezultat așteptat: layout stabil, controls clickable.
Prioritate: Medium
Tip: manual
Observații tehnice: pagina este mare și densă; verifică scroll anchoring.

### MOB-04 - Pricing + checkout CTA mobil
Scop: conversie mobil.
Pași de testare:
1. Deschide pricing pe mobil.
2. Toggle monthly/annual și start premium/free.
Rezultat așteptat: butoane funcționale, text lizibil, fără overlap.
Prioritate: Medium
Tip: manual
Observații tehnice: framer-motion + cards responsive.

## 18) Teste pentru UX

### UX-01 - Claritatea mesajelor de eroare
Scop: utilizatorul înțelege acțiunea următoare.
Pași de testare:
1. Provoacă principalele erori (auth/profile/divine/checkout).
Rezultat așteptat: mesaj explicit + CTA de recuperare unde e cazul.
Prioritate: High
Tip: manual
Observații tehnice: localizare prin `api-errors.ts`.

### UX-02 - Coerența branding/terminologie
Scop: consistență pe tot flow-ul.
Pași de testare:
1. Traversează landing/auth/onboarding/chat/account.
Rezultat așteptat: `AstroAI 24/7` și termeni consistenți.
Prioritate: Medium
Tip: manual
Observații tehnice: verifică și metadata social.

### UX-03 - Dead links și CTA-uri inactive
Scop: eliminare capcane UX.
Pași de testare:
1. Click pe linkuri footer/social/legal și CTA cards agents.
Rezultat așteptat: toate acțiunile au destinație reală.
Prioritate: High
Tip: manual
Observații tehnice: în prezent există placeholders `#` și CTA fără acțiune.

### UX-04 - Continuitate flux după refresh
Scop: stabilitate stare după reload.
Pași de testare:
1. Refresh în mijlocul onboarding/chat/account/report.
Rezultat așteptat: stare recuperabilă fără blocaje.
Prioritate: Medium
Tip: manual
Observații tehnice: bazează pe fetch inițial și state derivat.

### UX-05 - Feedback temporizat al acțiunilor
Scop: confirmări de succes/fail vizibile suficient.
Pași de testare:
1. Rulează acțiuni account generate/save.
Rezultat așteptat: feedback toast/text apare și dispare controlat.
Prioritate: Low
Tip: manual
Observații tehnice: timeout 4.5s în account.

## 19) Teste pentru cazuri limită

### EDGE-01 - Input extrem de lung în chat
Scop: reziliență input UI/API.
Pași de testare:
1. Trimite mesaj foarte lung (>5k chars).
Rezultat așteptat: UI stabil, API gestionează eroare sau succes controlat.
Prioritate: Medium
Tip: manual
Observații tehnice: max output token AI poate limita răspunsul.

### EDGE-02 - Concurență click-uri multiple submit
Scop: prevenire duplicate operations.
Pași de testare:
1. Dublu click rapid pe butoane submit/generate/checkout.
Rezultat așteptat: o singură operație efectivă.
Prioritate: High
Tip: automat
Observații tehnice: rely on `disabled` states.

### EDGE-03 - Rețea instabilă în autocomplete
Scop: comportament fallback la suggestions.
Pași de testare:
1. Simulează timeout/failure la `/api/location/autocomplete`.
Rezultat așteptat: dropdown fără crash, mesaj fallback.
Prioritate: Medium
Tip: manual
Observații tehnice: componenta prinde erori și golește suggestions.

### EDGE-04 - Cursor invalid în endpoints listă
Scop: robusteză query parsing.
Pași de testare:
1. Trimite cursor invalid/non-date.
Rezultat așteptat: endpoint răspunde fără 500, fallback la query de bază.
Prioritate: Medium
Tip: automat
Observații tehnice: `Number.isNaN(cursorDate.valueOf())`.

### EDGE-05 - Locale necunoscut în URL
Scop: comportament route guard.
Pași de testare:
1. Accesează `/xx/chat`.
Rezultat așteptat: 404 prin `notFound()` în locale layout.
Prioritate: Medium
Tip: automat
Observații tehnice: `isLocale` guard.

### EDGE-06 - Stripe webhook duplicate event
Scop: idempotency la replay webhook.
Pași de testare:
1. Re-trimite același event.
Rezultat așteptat: fără corupție de stare; billing events upsert predictibil.
Prioritate: High
Tip: manual
Observații tehnice: se scrie cu `event.id` în `billingEvents`.

## 20) Teste pentru securitate minimă

### SEC-01 - API fără token pe rute protejate
Scop: confirmă blocarea accesului neautorizat.
Pași de testare:
1. Fă request fără Authorization.
Rezultat așteptat: 401 constant.
Prioritate: Critical
Tip: automat
Observații tehnice: matrice completă per endpoint.

### SEC-02 - Verificare semnătură Stripe webhook
Scop: acceptă doar payload semnat valid.
Pași de testare:
1. Trimite webhook cu semnătură invalidă.
Rezultat așteptat: 400 `stripe_webhook_verification_failed`.
Prioritate: Critical
Tip: automat
Observații tehnice: `constructEvent`.

### SEC-03 - Protecție endpoint intern Oblio retry
Scop: limitează acces la operații interne.
Pași de testare:
1. Apelează endpoint fără header secret.
2. Cu header greșit.
Rezultat așteptat: 403 în ambele cazuri.
Prioritate: High
Tip: automat
Observații tehnice: recomandat plus IP allowlist/rate limit în viitor.

### SEC-04 - Sanitizare input JSON
Scop: evită injection logic prin payload nevalid.
Pași de testare:
1. Trimite tipuri neașteptate în câmpuri critice.
Rezultat așteptat: 400/handling controlat, fără crash.
Prioritate: High
Tip: automat
Observații tehnice: parse/guards existente, dar incomplete pe formate date/time.

### SEC-05 - Control acces date user
Scop: izolarea datelor între utilizatori.
Pași de testare:
1. User A încearcă `readingId`/`conversationId` al user B.
Rezultat așteptat: 404/not found, fără leak.
Prioritate: Critical
Tip: manual
Observații tehnice: scoping prin `uid` collection path.

### SEC-06 - Expunere informații sensibile în erori
Scop: nu expune stack/internal secrets în production.
Pași de testare:
1. Rulează erori forțate cu `NODE_ENV=production`.
Rezultat așteptat: mesaje generic-safe.
Prioritate: High
Tip: manual
Observații tehnice: multe routes folosesc fallback production message.

### SEC-07 - Header locale spoofing
Scop: verifică impact minim de securitate pe `x-locale`.
Pași de testare:
1. Trimite `x-locale` valori invalide.
Rezultat așteptat: fallback la locale valid, fără efecte de auth/data scope.
Prioritate: Low
Tip: automat
Observații tehnice: locale afectează text, nu autorizare.

---

## Strategie de execuție recomandată (release)

Faza 1 (Critical): AUTH, ONB, CHAT, API, PROT, SEC.
Faza 2 (High): ASTRO, SYN, FIREBASE, ERR, NEWCHAT, HIST.
Faza 3 (Medium/Low): UX, responsive, edge long-tail.

Criteriu minim de go-live:
1. 0 defecte deschise Critical.
2. 0 defecte deschise High fără workaround aprobat.
3. Toate testele de securitate minimă și plăți trecute.
4. Smoke E2E complet pe `ro` și `en`.
