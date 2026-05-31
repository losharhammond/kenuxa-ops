import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ChevronRight } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — KENUXA Business Network",
  description: "How KENUXA collects, uses, and protects your personal information.",
};

const SECTIONS = [
  {
    title: "1. Information We Collect",
    body: [
      "**Account Information:** When you register, we collect your name, email address, phone number, and password. Business owners additionally provide their business name, registration details, and location.",
      "**Identity Verification (KYC):** To comply with financial regulations, we may collect government-issued ID documents, selfies, and proof of address. These are processed securely and used only for identity verification.",
      "**Transaction Data:** We record wallet transactions, payments, invoices, and KENUX activity to maintain accurate financial records.",
      "**Usage Data:** We collect information about how you use the platform — pages visited, features used, search queries, and device information — to improve the service.",
      "**Location Data:** With your permission, we collect your location to provide local business recommendations and delivery services.",
    ],
  },
  {
    title: "2. How We Use Your Information",
    body: [
      "**Service Delivery:** To provide, operate, and improve the KENUXA Business Network platform and all its features.",
      "**Payments & Wallets:** To process transactions, manage your KENUXA Wallet, and credit KENUX rewards.",
      "**Compliance:** To meet our obligations under Ghanaian financial regulations, including KYC/AML requirements.",
      "**Communications:** To send you transactional emails, SMS notifications, and platform updates. You can unsubscribe from marketing communications at any time.",
      "**Security:** To detect fraud, prevent abuse, and protect the integrity of our platform.",
    ],
  },
  {
    title: "3. Information Sharing",
    body: [
      "**Service Providers:** We share data with trusted third-party service providers (Supabase, Paystack, Arkesel, Resend) who process data on our behalf under strict confidentiality agreements.",
      "**Financial Partners:** If you apply for financing, we share relevant financial and identity data with the lending institution with your explicit consent.",
      "**Legal Requirements:** We may disclose information to comply with applicable laws, court orders, or regulatory requests.",
      "**Business Transfers:** If KENUXA is acquired or merges, your data may be transferred to the acquiring entity with equivalent privacy protections.",
      "We never sell your personal information to third parties.",
    ],
  },
  {
    title: "4. KENUX & Wallet Data",
    body: [
      "KENUX is KENUXA's internal utility currency. It is not a cryptocurrency or financial instrument. KENUX balances and transaction history are maintained in our ledger system.",
      "Wallet balances in GHS are held in segregated accounts managed by licensed payment processors. KENUXA does not hold your funds directly.",
      "All financial transactions are logged in an immutable audit trail for regulatory compliance.",
    ],
  },
  {
    title: "5. Data Security",
    body: [
      "We use AES-256 encryption for data at rest and TLS 1.3 for data in transit.",
      "Access to your data is restricted to authorised personnel and protected by multi-factor authentication.",
      "We conduct regular security audits and penetration testing.",
      "In the event of a data breach, we will notify affected users within 72 hours as required by applicable law.",
    ],
  },
  {
    title: "6. Data Retention",
    body: [
      "We retain your account data for as long as your account is active or as required by law.",
      "Financial transaction records are retained for a minimum of 7 years to comply with Ghanaian tax and financial regulations.",
      "You may request deletion of non-regulated personal data by contacting us at privacy@kenuxa.com.",
    ],
  },
  {
    title: "7. Your Rights",
    body: [
      "**Access:** You have the right to access the personal information we hold about you.",
      "**Correction:** You may update or correct inaccurate information through your account settings.",
      "**Deletion:** You may request deletion of your account and personal data, subject to legal retention requirements.",
      "**Portability:** You may request an export of your data in a machine-readable format.",
      "**Objection:** You may object to processing of your data for marketing purposes.",
      "To exercise any of these rights, contact us at privacy@kenuxa.com.",
    ],
  },
  {
    title: "8. Cookies",
    body: [
      "We use cookies and similar tracking technologies to maintain your session, remember your preferences, and analyse platform usage.",
      "Essential cookies are required for the platform to function. You may disable analytics cookies through your browser settings, though this may affect functionality.",
    ],
  },
  {
    title: "9. Children's Privacy",
    body: [
      "KENUXA is intended for users aged 18 and above. We do not knowingly collect personal information from minors. If you believe a minor has created an account, contact us immediately at privacy@kenuxa.com.",
    ],
  },
  {
    title: "10. Changes to This Policy",
    body: [
      "We may update this Privacy Policy from time to time. We will notify you of material changes via email or in-platform notification at least 14 days before they take effect.",
      "Your continued use of KENUXA after changes are effective constitutes your acceptance of the updated policy.",
    ],
  },
  {
    title: "11. Contact Us",
    body: [
      "KENUXA Technologies Ltd.",
      "Accra, Ghana",
      "Email: privacy@kenuxa.com",
      "For data protection inquiries, contact our Data Protection Officer at dpo@kenuxa.com.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#04050b] text-white">
      {/* Nav */}
      <header className="border-b border-white/[0.05] px-6 h-16 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/">
          <Logo variant="full" size="sm" />
        </Link>
        <div className="flex items-center gap-4 text-sm text-[#64748b]">
          <Link href="/terms" className="hover:text-[#f1f5f9] transition-colors">Terms</Link>
          <Link href="/dashboard" className="flex items-center gap-1 text-[#FF6524] hover:text-[#FF8B5E] transition-colors">
            Dashboard <ChevronRight size={14} />
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Title */}
        <div className="mb-12">
          <p className="text-xs font-semibold text-[#FF6524] tracking-widest uppercase mb-3">Legal</p>
          <h1 className="text-4xl font-black text-white mb-4">Privacy Policy</h1>
          <p className="text-[#64748b]">Last updated: 1 January 2026 · Effective: 1 January 2026</p>
          <div className="mt-6 p-4 bg-[rgba(255,101,36,0.06)] border border-[rgba(255,101,36,0.15)] rounded-xl">
            <p className="text-sm text-[#94a3b8]">
              KENUXA Technologies Ltd. (&ldquo;KENUXA&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is committed to protecting your privacy.
              This policy explains how we collect, use, share, and protect your personal information when you use the KENUXA Business Network.
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-bold text-[#f1f5f9] mb-4 pb-2 border-b border-white/[0.06]">
                {section.title}
              </h2>
              <div className="space-y-3">
                {section.body.map((para, i) => {
                  const parts = para.split(/\*\*(.*?)\*\*/g);
                  return (
                    <p key={i} className="text-sm text-[#94a3b8] leading-relaxed">
                      {parts.map((part, j) =>
                        j % 2 === 1 ? (
                          <strong key={j} className="text-[#cbd5e1] font-semibold">{part}</strong>
                        ) : (
                          part
                        )
                      )}
                    </p>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#374151]">
          <span>© 2026 KENUXA Technologies Ltd.</span>
          <div className="flex gap-5">
            <Link href="/terms" className="hover:text-[#64748b] transition-colors">Terms of Service</Link>
            <Link href="/" className="hover:text-[#64748b] transition-colors">Home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
