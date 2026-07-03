import { LEGAL_OPERATOR } from "@/lib/legal/operator"
import type { LegalDocumentMap } from "@/lib/legal/types"

const { name, email } = LEGAL_OPERATOR

export const termsOfService: LegalDocumentMap = {
  en: {
    title: "Terms and Conditions",
    lastUpdated: "June 2026",
    sections: [
      {
        id: "acceptance",
        title: "1. Acceptance of Terms",
        paragraphs: [
          `By creating an account or using ${name}, you agree to these Terms and Conditions and our Privacy Policy. If you do not agree, do not use the service.`,
        ],
      },
      {
        id: "service",
        title: "2. Description of Service",
        paragraphs: [
          `${name} provides AI-powered astrology guidance based on birth chart data, planetary calculations, and conversational AI interpretation.`,
          "The service is for entertainment, self-reflection, and personal guidance purposes only. It does not provide medical, legal, financial, or psychological diagnosis or advice. Always consult qualified professionals for such matters.",
        ],
      },
      {
        id: "account",
        title: "3. Account Registration and Data Accuracy",
        paragraphs: [
          "You must provide accurate information when creating your account and completing your cosmic profile. Birth date, time, and location directly affect the accuracy of astrological readings.",
          "You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account.",
          "You must be at least 16 years old to use the service.",
        ],
      },
      {
        id: "subscriptions",
        title: "4. Subscriptions and Payments",
        paragraphs: [
          "We offer free and premium subscription plans. Premium plans include a monthly question limit and access to specialized agents.",
          "Payments are processed securely through Stripe. By subscribing, you authorize recurring charges according to your selected plan and billing interval.",
          "You can manage or cancel your subscription from your Account settings. Cancellation takes effect at the end of the current billing period unless otherwise stated.",
          "Refunds are handled according to applicable consumer protection laws and our billing policies.",
        ],
      },
      {
        id: "acceptable-use",
        title: "5. Acceptable Use",
        paragraphs: [
          "You agree not to: misuse the service, attempt unauthorized access, scrape or reverse-engineer the platform, upload harmful content, harass others, or use the service for unlawful purposes.",
          "We reserve the right to suspend or terminate accounts that violate these terms.",
        ],
      },
      {
        id: "ip",
        title: "6. Intellectual Property",
        paragraphs: [
          "All platform content, branding, software, and AI-generated responses are owned by or licensed to us. You receive a limited, personal, non-transferable license to use the service for your own purposes.",
          "You retain ownership of the content you submit (questions, profile data) but grant us a license to process it as needed to provide the service.",
        ],
      },
      {
        id: "liability",
        title: "7. Limitation of Liability and Astrology Disclaimer",
        paragraphs: [
          "Astrological interpretations are subjective and for informational purposes. We do not guarantee the accuracy, completeness, or outcomes of any reading or guidance.",
          "To the maximum extent permitted by law, we are not liable for indirect, incidental, or consequential damages arising from your use of the service.",
          "Our total liability for any claim shall not exceed the amount you paid us in the twelve months preceding the claim.",
        ],
      },
      {
        id: "termination",
        title: "8. Suspension and Account Deletion",
        paragraphs: [
          "You may delete your account at any time from Account settings. Upon deletion, your personal data will be removed subject to legal retention requirements.",
          "We may suspend or terminate your access if you breach these terms or if required by law.",
        ],
      },
      {
        id: "law",
        title: "9. Governing Law and Contact",
        paragraphs: [
          "These Terms are governed by the laws of Romania. Any disputes shall be subject to the competent courts in Romania.",
          `For questions about these Terms, contact us at ${email}.`,
        ],
      },
      {
        id: "changes",
        title: "10. Changes to Terms",
        paragraphs: [
          "We may update these Terms from time to time. Material changes will be communicated through the platform. Continued use after changes constitutes acceptance of the updated Terms.",
        ],
      },
    ],
  },
  ro: {
    title: "Termeni și condiții",
    lastUpdated: "iunie 2026",
    sections: [
      {
        id: "acceptance",
        title: "1. Acceptarea termenilor",
        paragraphs: [
          `Prin crearea unui cont sau utilizarea ${name}, accepți acești Termeni și condiții și Politica noastră de confidențialitate. Dacă nu ești de acord, nu utiliza serviciul.`,
        ],
      },
      {
        id: "service",
        title: "2. Descrierea serviciului",
        paragraphs: [
          `${name} oferă ghidaj astrologic bazat pe AI, pe baza datelor hărții natale, calculelor planetare și interpretării conversaționale AI.`,
          "Serviciul este destinat exclusiv divertismentului, auto-reflecției și ghidajului personal. Nu oferă diagnostic sau sfaturi medicale, juridice, financiare sau psihologice. Consultă întotdeauna profesioniști calificați pentru astfel de situații.",
        ],
      },
      {
        id: "account",
        title: "3. Crearea contului și acuratețea datelor",
        paragraphs: [
          "Trebuie să furnizezi informații corecte la crearea contului și completarea profilului cosmic. Data, ora și locul nașterii influențează direct acuratețea interpretărilor astrologice.",
          "Ești responsabil pentru confidențialitatea credențialelor de autentificare și pentru toată activitatea din contul tău.",
          "Trebuie să ai minimum 16 ani pentru a utiliza serviciul.",
        ],
      },
      {
        id: "subscriptions",
        title: "4. Abonamente și plăți",
        paragraphs: [
          "Oferim planuri gratuite și premium. Planurile premium includ o limită lunară de întrebări și acces la agenți specializați.",
          "Plățile sunt procesate securizat prin Stripe. Prin abonare, autorizezi plăți recurente conform planului și intervalului de facturare selectat.",
          "Poți gestiona sau anula abonamentul din setările Contului. Anularea produce efect la sfârșitul perioadei curente de facturare, dacă nu se specifică altfel.",
          "Rambursările sunt gestionate conform legislației de protecție a consumatorilor și politicilor noastre de facturare.",
        ],
      },
      {
        id: "acceptable-use",
        title: "5. Utilizare acceptabilă",
        paragraphs: [
          "Te obligi să nu: abuzezi de serviciu, încerci acces neautorizat, extragi date sau reverse-engineer platforma, încarci conținut dăunător, hărțuiești alte persoane sau folosești serviciul în scopuri ilegale.",
          "Ne rezervăm dreptul de a suspenda sau închide conturile care încalcă acești termeni.",
        ],
      },
      {
        id: "ip",
        title: "6. Proprietate intelectuală",
        paragraphs: [
          "Tot conținutul platformei, brandingul, software-ul și răspunsurile generate de AI ne aparțin sau sunt licențiate nouă. Primești o licență limitată, personală și netransferabilă de utilizare a serviciului.",
          "Păstrezi proprietatea asupra conținutului pe care îl trimiți (întrebări, date profil), dar ne acorzi o licență de prelucrare necesară furnizării serviciului.",
        ],
      },
      {
        id: "liability",
        title: "7. Limitarea răspunderii și disclaimer astrologic",
        paragraphs: [
          "Interpretările astrologice sunt subiective și au scop informativ. Nu garantăm acuratețea, completitudinea sau rezultatele vreunei interpretări sau ghidări.",
          "În măsura maximă permisă de lege, nu răspundem pentru daune indirecte, incidentale sau consecvente rezultate din utilizarea serviciului.",
          "Răspunderea noastră totală pentru orice reclamație nu va depăși suma plătită nouă în cele douăsprezece luni anterioare reclamației.",
        ],
      },
      {
        id: "termination",
        title: "8. Suspendare și ștergere cont",
        paragraphs: [
          "Poți șterge contul oricând din setările Contului. La ștergere, datele tale personale vor fi eliminate, sub rezerva cerințelor legale de retenție.",
          "Putem suspenda sau închide accesul dacă încalci acești termeni sau dacă legea o impune.",
        ],
      },
      {
        id: "law",
        title: "9. Lege aplicabilă și contact",
        paragraphs: [
          "Acești Termeni sunt guvernați de legislația României. Orice dispute vor fi supuse instanțelor competente din România.",
          `Pentru întrebări despre acești Termeni, contactează-ne la ${email}.`,
        ],
      },
      {
        id: "changes",
        title: "10. Modificări ale termenilor",
        paragraphs: [
          "Putem actualiza acești Termeni periodic. Modificările semnificative vor fi comunicate prin platformă. Utilizarea continuă după modificări constituie acceptarea Termenilor actualizați.",
        ],
      },
    ],
  },
}
