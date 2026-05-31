import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ChevronRight } from "lucide-react";

export const metadata = {
  title: "Terms of Service — KENUXA Business Network",
  description: "The terms and conditions governing use of the KENUXA Business Network platform.",
};

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: [
      "By creating an account or using the KENUXA Business Network, you agree to be bound by these Terms of Service and our Privacy Policy.",
      "If you are using KENUXA on behalf of a business, you represent that you have the authority to bind that business to these terms.",
      "If you do not agree to these terms, do not use KENUXA.",
    ],
  },
  {
    title: "2. Eligibility",
    body: [
      "You must be at least 18 years old to use KENUXA.",
      "You must provide accurate and complete registration information.",
      "You are responsible for maintaining the security of your account credentials.",
    ],
  },
  {
    title: "3. KENUXA Services",
    body: [
      "KENUXA provides a multi-sided economic network connecting businesses, customers, freelancers, suppliers, job seekers, delivery providers, and financial institutions.",
      "We reserve the right to modify, suspend, or discontinue any feature at any time with reasonable notice.",
      "Some features require payment or a subscription. Pricing is displayed clearly before you commit.",
    ],
  },
  {
    title: "4. KENUX Utility Currency",
    body: [
      "KENUX is KENUXA's internal platform utility currency. It is not a cryptocurrency, not a financial instrument, and not an investment product.",
      "KENUX has no monetary value outside the KENUXA platform. KENUX cannot be exchanged for cash.",
      "KENUX may be used to pay for platform services, subscriptions, advertising, AI credits, and featured listings.",
      "KENUX balances may expire if an account is inactive for 12 consecutive months.",
      "KENUXA reserves the right to modify KENUX earning rates, spending rates, and available uses with 30 days notice.",
    ],
  },
  {
    title: "5. Wallet & Payments",
    body: [
      "The KENUXA Wallet allows you to store GHS funds for use on the platform. Wallet balances are held by licensed payment processors, not by KENUXA directly.",
      "You authorise KENUXA to process payments on your behalf using your chosen payment method.",
      "Refunds are processed according to our Refund Policy. Transaction fees are non-refundable.",
      "You are responsible for ensuring you have sufficient funds for any transaction.",
      "KENUXA employs fraud detection. Suspicious activity may result in account suspension pending investigation.",
    ],
  },
  {
    title: "6. Business Listings & Marketplace",
    body: [
      "Businesses may list products and services on the KENUXA Marketplace subject to our listing guidelines.",
      "All listings must be accurate, lawful, and not misleading. KENUXA reserves the right to remove non-compliant listings.",
      "KENUXA charges a platform fee on marketplace transactions as disclosed in our pricing schedule.",
      "KENUXA is not a party to transactions between buyers and sellers. Disputes between parties are governed by our Dispute Resolution Policy.",
    ],
  },
  {
    title: "7. Freelancers & Talent",
    body: [
      "Freelancers may list services and accept projects through KENUXA.",
      "KENUXA facilitates connections between clients and freelancers but is not an employer of freelancers.",
      "Freelancers are responsible for their own tax obligations.",
      "KENUXA earns a platform fee on completed projects as disclosed in pricing.",
    ],
  },
  {
    title: "8. Financial Services",
    body: [
      "KENUXA may facilitate access to financing products offered by licensed financial institutions ('Financial Partners').",
      "KENUXA is not a lender. Financing decisions are made entirely by Financial Partners.",
      "Loan applications are subject to credit assessment. KENUXA scores are one input among many.",
      "You are solely responsible for repaying any loan or credit facility obtained through KENUXA.",
    ],
  },
  {
    title: "9. Prohibited Conduct",
    body: [
      "You may not use KENUXA to: (a) violate any applicable law or regulation; (b) commit fraud or impersonate another person; (c) transmit spam, malware, or harmful content; (d) manipulate ratings or reviews; (e) engage in money laundering or terrorist financing; (f) circumvent platform fees; (g) scrape or systematically extract platform data.",
      "Violation of these prohibitions may result in immediate account termination and referral to authorities.",
    ],
  },
  {
    title: "10. Intellectual Property",
    body: [
      "KENUXA owns all intellectual property rights in the platform, including software, design, trademarks, and content we produce.",
      "You retain ownership of content you submit (business listings, profile photos, etc.) and grant KENUXA a licence to display and use it on the platform.",
      "You may not reproduce, distribute, or create derivative works of KENUXA's proprietary content without written permission.",
    ],
  },
  {
    title: "11. Limitation of Liability",
    body: [
      "KENUXA provides its services 'as is' without warranties of any kind, express or implied.",
      "To the fullest extent permitted by law, KENUXA's liability to you for any claim is limited to the fees you paid to KENUXA in the 3 months preceding the claim.",
      "KENUXA is not liable for indirect, incidental, or consequential damages, including loss of profits or data.",
    ],
  },
  {
    title: "12. Termination",
    body: [
      "You may close your account at any time from your account settings.",
      "KENUXA may suspend or terminate your account if you violate these terms or for any other reason with reasonable notice.",
      "Upon termination, your KENUX balance is forfeited. Wallet balances (GHS) will be disbursed to your registered payment method within 30 days.",
    ],
  },
  {
    title: "13. Governing Law & Disputes",
    body: [
      "These Terms are governed by the laws of the Republic of Ghana.",
      "Any disputes shall first be subject to good-faith negotiation. If unresolved, disputes shall be settled by arbitration under the rules of the Ghana Arbitration Centre.",
    ],
  },
  {
    title: "14. Changes to Terms",
    body: [
      "We may update these Terms from time to time. We will notify you of material changes at least 14 days before they take effect via email or in-platform notice.",
      "Continued use of KENUXA after the effective date constitutes acceptance of the updated terms.",
    ],
  },
  {
    title: "15. Contact",
    body: [
      "KENUXA Technologies Ltd. · Accra, Ghana",
      "Legal enquiries: legal@kenuxa.com",
      "General support: support@kenuxa.com",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#04050b] text-white">
      {/* Nav */}
      <header className="border-b border-white/[0.05] px-6 h-16 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/">
          <Logo variant="full" size="sm" />
        </Link>
        <div className="flex items-center gap-4 text-sm text-[#64748b]">
          <Link href="/privacy" className="hover:text-[#f1f5f9] transition-colors">Privacy</Link>
          <Link href="/dashboard" className="flex items-center gap-1 text-[#FF6524] hover:text-[#FF8B5E] transition-colors">
            Dashboard <ChevronRight size={14} />
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Title */}
        <div className="mb-12">
          <p className="text-xs font-semibold text-[#FF6524] tracking-widest uppercase mb-3">Legal</p>
          <h1 className="text-4xl font-black text-white mb-4">Terms of Service</h1>
          <p className="text-[#64748b]">Last updated: 1 January 2026 · Effective: 1 January 2026</p>
          <div className="mt-6 p-4 bg-[rgba(255,101,36,0.06)] border border-[rgba(255,101,36,0.15)] rounded-xl">
            <p className="text-sm text-[#94a3b8]">
              These Terms of Service govern your use of the KENUXA Business Network operated by KENUXA Technologies Ltd.
              Please read them carefully before using the platform.
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
            <Link href="/privacy" className="hover:text-[#64748b] transition-colors">Privacy Policy</Link>
            <Link href="/" className="hover:text-[#64748b] transition-colors">Home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
