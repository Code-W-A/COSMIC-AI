import { LEGAL_OPERATOR } from "@/lib/legal/operator"
import type { LegalDocumentMap } from "@/lib/legal/types"

const { name, email } = LEGAL_OPERATOR

export const cookiePolicy: LegalDocumentMap = {
  en: {
    title: "Cookie Policy",
    lastUpdated: "June 2026",
    sections: [
      {
        id: "what-are-cookies",
        title: "1. What Are Cookies",
        paragraphs: [
          "Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences and improve your experience.",
          "We also use similar browser storage technologies such as session storage for specific features.",
        ],
      },
      {
        id: "cookies-we-use",
        title: "2. Cookies We Use",
        paragraphs: [
          "cosmic_locale — Stores your language preference (Romanian or English). Duration: 1 year. Type: Essential. Purpose: Remember your selected language across visits.",
          "sidebar_state — Stores whether the chat sidebar is open or closed. Duration: 7 days. Type: Functional. Purpose: Preserve your UI preference.",
          "cosmic_analytics_landing_view (session storage) — Prevents duplicate landing page analytics events within the same browser session. Duration: Session. Type: Analytics. Purpose: Accurate first-party event counting.",
        ],
      },
      {
        id: "third-party",
        title: "3. Third-Party Cookies",
        paragraphs: [
          "Vercel Analytics — In production, we use Vercel Analytics to collect aggregated, anonymous page view data. This helps us understand how the platform is used.",
          "Third-party authentication (Google OAuth) may set cookies when you choose to sign in with Google. These are governed by Google's cookie policy.",
        ],
      },
      {
        id: "manage-cookies",
        title: "4. How to Manage Cookies",
        paragraphs: [
          "You can control and delete cookies through your browser settings. Most browsers allow you to block all cookies or only third-party cookies.",
          "Please note that blocking essential cookies (such as cosmic_locale) may affect your experience, for example by resetting your language preference on each visit.",
        ],
      },
      {
        id: "contact",
        title: "5. Contact",
        paragraphs: [
          `If you have questions about our use of cookies, contact us at ${email}.`,
          `For more information about how we handle personal data, see our Privacy Policy.`,
        ],
      },
    ],
  },
  ro: {
    title: "Politica de cookies",
    lastUpdated: "iunie 2026",
    sections: [
      {
        id: "what-are-cookies",
        title: "1. Ce sunt cookie-urile",
        paragraphs: [
          "Cookie-urile sunt fișiere text mici stocate pe dispozitivul tău când vizitezi un site web. Ajută site-ul să-ți rețină preferințele și să-ți îmbunătățească experiența.",
          "Folosim și tehnologii similare de stocare în browser, precum session storage, pentru anumite funcții.",
        ],
      },
      {
        id: "cookies-we-use",
        title: "2. Cookie-uri pe care le folosim",
        paragraphs: [
          "cosmic_locale — Stochează preferința de limbă (română sau engleză). Durată: 1 an. Tip: Esențial. Scop: Reține limba selectată între vizite.",
          "sidebar_state — Stochează dacă sidebar-ul de chat este deschis sau închis. Durată: 7 zile. Tip: Funcțional. Scop: Păstrează preferința ta de interfață.",
          "cosmic_analytics_landing_view (session storage) — Previne evenimente analytics duplicate pe pagina principală în aceeași sesiune de browser. Durată: Sesiune. Tip: Analytics. Scop: Numărare corectă a evenimentelor first-party.",
        ],
      },
      {
        id: "third-party",
        title: "3. Cookie-uri terțe",
        paragraphs: [
          "Vercel Analytics — În producție, folosim Vercel Analytics pentru a colecta date agregate și anonime despre vizualizările paginilor. Ne ajută să înțelegem cum este utilizată platforma.",
          "Autentificarea terță (Google OAuth) poate seta cookie-uri când alegi să te autentifici cu Google. Acestea sunt guvernate de politica de cookies Google.",
        ],
      },
      {
        id: "manage-cookies",
        title: "4. Cum poți gestiona cookie-urile",
        paragraphs: [
          "Poți controla și șterge cookie-urile din setările browserului. Majoritatea browserelor permit blocarea tuturor cookie-urilor sau doar a celor terțe.",
          "Reține că blocarea cookie-urilor esențiale (precum cosmic_locale) poate afecta experiența ta, de exemplu prin resetarea preferinței de limbă la fiecare vizită.",
        ],
      },
      {
        id: "contact",
        title: "5. Contact",
        paragraphs: [
          `Dacă ai întrebări despre utilizarea cookie-urilor, contactează-ne la ${email}.`,
          `Pentru mai multe informații despre prelucrarea datelor personale, consultă Politica de confidențialitate.`,
        ],
      },
    ],
  },
}
