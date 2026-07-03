import { LEGAL_OPERATOR } from "@/lib/legal/operator"
import type { LegalDocumentMap } from "@/lib/legal/types"

const { name, email, cui, address } = LEGAL_OPERATOR

export const privacyPolicy: LegalDocumentMap = {
  en: {
    title: "Privacy Policy",
    lastUpdated: "June 2026",
    sections: [
      {
        id: "operator",
        title: "1. Data Controller",
        paragraphs: [
          `${name} ("we", "us") operates the AstroAI 24/7 platform. For privacy-related requests, contact us at ${email}.`,
          `Legal entity: ${name}. CUI: ${cui}. Registered address: ${address}.`,
        ],
      },
      {
        id: "data-collected",
        title: "2. What Data We Collect",
        paragraphs: [
          "Account data: email address, password (stored securely by Firebase Authentication, not in our database), display name, and profile photo when you sign in with Google.",
          "Cosmic profile: name, birth date, birth time, birth place, sex at birth, main focus area, geographic coordinates, timezone information, and derived natal chart data (sun, moon, rising signs, chart summaries).",
          "Partner data (compatibility feature): partner name and the same birth-related fields as your profile, plus derived chart data.",
          "Chat and readings: your questions, AI responses, conversation titles, message metadata, agent type, token usage, and astrology context used for each response.",
          "Billing profile: full name, email, phone number, and postal address (address line, city, county, country, postal code) collected before checkout.",
          "Payment data: subscription status, plan, Stripe customer and subscription IDs, payment session IDs, amounts, and currency. Card details are processed by Stripe Checkout and are not stored on our servers.",
          "Support messages: topic, message content, and your account email, name, and user ID.",
          "Usage data: monthly question count, subscription limits, and first-party analytics events (e.g. registration, checkout, chat activity) with metadata such as locale and plan.",
          "Technical data: server logs, error reports (scrubbed of passwords and tokens), and locale preference.",
        ],
      },
      {
        id: "purposes",
        title: "3. Purposes and Legal Basis",
        paragraphs: [
          "We process your data to provide the AstroAI 24/7 service, generate personalized astrology guidance, manage your account and subscriptions, process payments, respond to support requests, and improve the platform.",
          "Legal bases under GDPR: performance of a contract (account, profile, chat, billing), consent (account creation and optional features), and legitimate interest (analytics, security, fraud prevention, service improvement).",
        ],
      },
      {
        id: "processors",
        title: "4. Third-Party Processors",
        paragraphs: [
          "We share data with trusted service providers only as needed to operate the platform:",
          "Firebase (Google) — authentication and database hosting.",
          "Google — OAuth sign-in and Places API for birth location autocomplete.",
          "Stripe — payment processing and subscription management.",
          "Divine API — natal chart calculations.",
          "Sentry — error monitoring (sensitive headers and credentials are scrubbed).",
          "Vercel Analytics — aggregated page view analytics in production.",
          "Each provider processes data under their own privacy policies and applicable data processing agreements.",
        ],
      },
      {
        id: "cookies",
        title: "5. Cookies",
        paragraphs: [
          "We use essential cookies to remember your language preference (cosmic_locale) and sidebar UI state (sidebar_state). We also use session storage for analytics deduplication.",
          "For full details, see our Cookie Policy at /cookies.",
        ],
      },
      {
        id: "retention",
        title: "6. Data Retention",
        paragraphs: [
          "Account and profile data are retained while your account is active. Chat history and readings are retained to provide conversation continuity.",
          "Billing and payment records are retained as required for accounting, tax, and legal obligations.",
          "When you delete your account, we remove your personal data from our systems, subject to legal retention requirements.",
        ],
      },
      {
        id: "rights",
        title: "7. Your Rights",
        paragraphs: [
          "Under GDPR, you have the right to access, rectify, erase, restrict processing, data portability, and object to processing of your personal data.",
          "You can update your profile in the Account section and delete your account at any time from Account settings.",
          "To exercise other rights or submit a privacy request, contact us at " + email + ". We will respond within the timeframe required by applicable law.",
          "You also have the right to lodge a complaint with your local data protection authority.",
        ],
      },
      {
        id: "transfers",
        title: "8. International Transfers",
        paragraphs: [
          "Some of our service providers (Firebase, Google, Stripe, Sentry, Vercel) may process data outside the European Economic Area. Where applicable, we rely on appropriate safeguards such as Standard Contractual Clauses.",
        ],
      },
      {
        id: "security",
        title: "9. Security",
        paragraphs: [
          "We implement technical and organizational measures to protect your data, including encrypted connections, access controls, and scrubbing of sensitive data in error logs.",
          "No method of transmission or storage is 100% secure. Please use a strong password and keep your credentials confidential.",
        ],
      },
      {
        id: "minors",
        title: "10. Minors",
        paragraphs: [
          "AstroAI 24/7 is not intended for users under 16 years of age. We do not knowingly collect personal data from children. If you believe a child has provided us data, contact us at " + email + ".",
        ],
      },
      {
        id: "changes",
        title: "11. Changes to This Policy",
        paragraphs: [
          "We may update this Privacy Policy from time to time. The \"Last updated\" date at the top reflects the latest revision. Continued use of the service after changes constitutes acceptance of the updated policy.",
        ],
      },
    ],
  },
  ro: {
    title: "Politica de confidențialitate",
    lastUpdated: "iunie 2026",
    sections: [
      {
        id: "operator",
        title: "1. Operatorul de date",
        paragraphs: [
          `${name} („noi”) operează platforma AstroAI 24/7. Pentru solicitări legate de confidențialitate, ne poți contacta la ${email}.`,
          `Entitate juridică: ${name}. CUI: ${cui}. Adresă sediu social: ${address}.`,
        ],
      },
      {
        id: "data-collected",
        title: "2. Ce date colectăm",
        paragraphs: [
          "Date de cont: adresă de email, parolă (stocată securizat de Firebase Authentication, nu în baza noastră de date), nume afișat și fotografie de profil când te autentifici cu Google.",
          "Profil cosmic: nume, data nașterii, ora nașterii, locul nașterii, sexul la naștere, aria principală de interes, coordonate geografice, informații de fus orar și date derivate din harta natală (semne Soare, Lună, Ascendent, rezumate).",
          "Date partener (funcția de compatibilitate): numele partenerului și aceleași câmpuri legate de naștere ca la profilul tău, plus date derivate din harta natală.",
          "Chat și interpretări: întrebările tale, răspunsurile AI, titlurile conversațiilor, metadata mesajelor, tipul agentului, consumul de tokeni și contextul astrologic folosit pentru fiecare răspuns.",
          "Profil de facturare: nume complet, email, telefon și adresă poștală (adresă, oraș, județ, țară, cod poștal) colectate înainte de checkout.",
          "Date de plată: status abonament, plan, ID-uri Stripe client și abonament, ID-uri sesiune plată, sume și monedă. Datele cardului sunt procesate de Stripe Checkout și nu sunt stocate pe serverele noastre.",
          "Mesaje suport: subiect, conținut mesaj și emailul, numele și ID-ul contului tău.",
          "Date de utilizare: număr întrebări lunare, limite abonament și evenimente analytics first-party (ex. înregistrare, checkout, activitate chat) cu metadata precum limba și planul.",
          "Date tehnice: loguri server, rapoarte de erori (fără parole și tokeni) și preferința de limbă.",
        ],
      },
      {
        id: "purposes",
        title: "3. Scopuri și temei legal",
        paragraphs: [
          "Prelucrăm datele tale pentru a furniza serviciul AstroAI 24/7, a genera ghidaj astrologic personalizat, a gestiona contul și abonamentele, a procesa plățile, a răspunde solicitărilor de suport și a îmbunătăți platforma.",
          "Temeiuri legale conform GDPR: executarea contractului (cont, profil, chat, facturare), consimțământul (crearea contului și funcții opționale) și interesul legitim (analytics, securitate, prevenirea fraudei, îmbunătățirea serviciului).",
        ],
      },
      {
        id: "processors",
        title: "4. Procesatori terți",
        paragraphs: [
          "Partajăm date cu furnizori de servicii de încredere doar cât este necesar pentru operarea platformei:",
          "Firebase (Google) — autentificare și găzduire bază de date.",
          "Google — autentificare OAuth și Places API pentru autocomplete loc naștere.",
          "Stripe — procesare plăți și gestionare abonamente.",
          "Divine API — calcule hartă natală.",
          "Sentry — monitorizare erori (headere sensibile și credențiale sunt eliminate).",
          "Vercel Analytics — analytics agregat de vizualizări pagină în producție.",
          "Fiecare furnizor prelucrează date conform propriei politici de confidențialitate și acordurilor de prelucrare aplicabile.",
        ],
      },
      {
        id: "cookies",
        title: "5. Cookie-uri",
        paragraphs: [
          "Folosim cookie-uri esențiale pentru a reține preferința de limbă (cosmic_locale) și starea sidebar-ului (sidebar_state). Folosim și session storage pentru deduplicarea analytics.",
          "Pentru detalii complete, consultă Politica de cookies la /cookies.",
        ],
      },
      {
        id: "retention",
        title: "6. Perioade de retenție",
        paragraphs: [
          "Datele de cont și profil sunt păstrate cât timp contul tău este activ. Istoricul chat și interpretările sunt păstrate pentru continuitatea conversațiilor.",
          "Înregistrările de facturare și plată sunt păstrate conform obligațiilor contabile, fiscale și legale.",
          "Când îți ștergi contul, eliminăm datele tale personale din sistemele noastre, sub rezerva cerințelor legale de retenție.",
        ],
      },
      {
        id: "rights",
        title: "7. Drepturile tale",
        paragraphs: [
          "Conform GDPR, ai dreptul de acces, rectificare, ștergere, restricționare a prelucrării, portabilitate a datelor și opoziție față de prelucrare.",
          "Poți actualiza profilul din secțiunea Cont și poți șterge contul oricând din setările Contului.",
          "Pentru exercitarea altor drepturi sau trimiterea unei solicitări de confidențialitate, contactează-ne la " + email + ". Vom răspunde în termenul prevăzut de lege.",
          "Ai dreptul să depui o plângere la autoritatea locală de protecție a datelor.",
        ],
      },
      {
        id: "transfers",
        title: "8. Transferuri internaționale",
        paragraphs: [
          "Unii dintre furnizorii noștri (Firebase, Google, Stripe, Sentry, Vercel) pot prelucra date în afara Spațiului Economic European. Acolo unde este cazul, ne bazăm pe garanții adecvate, precum Clauzele Contractuale Standard.",
        ],
      },
      {
        id: "security",
        title: "9. Securitate",
        paragraphs: [
          "Implementăm măsuri tehnice și organizatorice pentru protejarea datelor tale, inclusiv conexiuni criptate, controale de acces și eliminarea datelor sensibile din logurile de erori.",
          "Nicio metodă de transmitere sau stocare nu este 100% sigură. Te rugăm să folosești o parolă puternică și să păstrezi confidențialitatea credențialelor.",
        ],
      },
      {
        id: "minors",
        title: "10. Minori",
        paragraphs: [
          "AstroAI 24/7 nu este destinat utilizatorilor sub 16 ani. Nu colectăm în mod conștient date personale de la copii. Dacă consideri că un minor ne-a furnizat date, contactează-ne la " + email + ".",
        ],
      },
      {
        id: "changes",
        title: "11. Modificări ale politicii",
        paragraphs: [
          "Putem actualiza această Politică de confidențialitate periodic. Data „Ultima actualizare” de sus reflectă cea mai recentă revizie. Utilizarea continuă a serviciului după modificări constituie acceptarea politicii actualizate.",
        ],
      },
    ],
  },
}
