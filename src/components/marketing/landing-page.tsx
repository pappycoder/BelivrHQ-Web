import { LEGAL_COMPANY } from "@/lib/legal/company";
import { LegalNavigation } from "@/components/legal/legal-navigation";
import { SubscriptionStartingPrice } from "@/components/billing/subscription-currency";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarCheck,
  Check,
  CircleCheck,
  Fingerprint,
  Heart,
  LockKeyhole,
  MessageCircle,
  Network,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import {
  LandingMotion,
  MarketingNavigation,
  PricingSection,
  ProductPreview,
} from "./landing-interactions";
import styles from "./landing.module.css";

const questions = [
  [
    "Is ChurchOS only for large churches?",
    "Not at all. The Essentials plan starts at $10 USD per month, with local currency options, while Community and Network add room for more members, staff and locations. Enterprise is designed around the needs of a wider church network. Essentials, Community and Network have yearly options with 10% savings compared with twelve monthly payments. Enterprise pricing and billing terms are negotiated with you.",
  ],
  [
    "Can each branch manage its own work?",
    "Yes. ChurchOS separates branch records and permissions, while authorised HQ users can work across their church's locations. A person's role and permissions still determine what they can see and change.",
  ],
  [
    "Can we bring our existing member records?",
    "ChurchOS supports member imports. You can prepare your data using the import template and review errors before correcting your records. Larger migration and onboarding needs can be discussed as part of an Enterprise rollout.",
  ],
  [
    "How do WhatsApp, SMS, email and payments work?",
    "Church administrators can connect supported provider accounts and choose providers for each channel. Email, SMS, WhatsApp, live calls and payment processing have their own provider requirements and usage charges; those charges are separate from the software plan.",
  ],
  [
    "Who gets access to financial records and analytics?",
    "Access follows permissions, not simply the plan a church chooses. Financial records have their own access controls. Analytics is reserved for church administrators and super administrators; HQ status on its own does not grant analytics access.",
  ],
  [
    "Can we subscribe to these plans today?",
    "Choose Essentials, Community or Network during registration, then sign in and complete secure checkout to activate your workspace. Yearly billing saves 10%. Renewals are manual. Enterprise pricing and onboarding scope are agreed with ChurchOS before payment.",
  ],
];

export function LandingPage() {
  return (
    <LandingMotion>
      <a href="#landing-content" className={styles.skipLink}>
        Skip to content
      </a>
      <MarketingNavigation />
      <main id="landing-content" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroAmbient} aria-hidden="true" />
          <div className={styles.heroCopy}>
            <span className={styles.heroLabel}>
              <span /> THE CHURCH OPERATING SYSTEM
            </span>
            <h1 id="hero-title">
              A little less admin.
              <br />A lot more <em>ministry.</em>
            </h1>
            <p>
              People, services, giving and every branch.
              <br className={styles.desktopBreak} /> One thoughtful platform for
              the work behind your calling.
            </p>
            <div className={styles.heroActions}>
              <Link href="/register" className={styles.primaryButton}>
                Bring your church together <ArrowUpRight size={18} />
              </Link>
              <a href="#product" className={styles.secondaryButton}>
                Take a look around <ArrowDownRight size={18} />
              </a>
            </div>
            <div className={styles.heroPromise}>
              <span>
                <Check size={14} /> <SubscriptionStartingPrice />
              </span>
              <span>
                <Check size={14} /> Built with Nigerian churches in mind
              </span>
            </div>
          </div>
          <div className={styles.heroScribble} aria-hidden="true">
            <Sparkles size={24} />
            <span>
              More human.
              <br />
              More connected.
            </span>
            <svg viewBox="0 0 95 52" fill="none">
              <path
                pathLength="1"
                d="M5 5c44-1 64 5 59 21-3 11-23 7-18-3 7-14 28-7 41 19m0 0-15-4m15 4-1-15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <ProductPreview />
          <div className={styles.platformStrip}>
            <span>ONE CONNECTED WORKSPACE</span>
            <div>
              <Users size={17} /> People
            </div>
            <div>
              <CalendarCheck size={17} /> Attendance
            </div>
            <div>
              <Wallet size={17} /> Giving
            </div>
            <div>
              <Heart size={17} /> Care
            </div>
            <div>
              <Network size={17} /> Every branch
            </div>
          </div>
        </section>

        <section
          id="product"
          className={styles.productSection}
          aria-labelledby="product-title"
        >
          <div className={styles.sectionIntro}>
            <div>
              <span className={styles.eyebrow}>
                LESS SCATTERED. MORE CONNECTED.
              </span>
              <h2 id="product-title">
                The whole picture.
                <br />
                <em>And every person in it.</em>
              </h2>
            </div>
            <p>
              Ministry happens between Sundays, too. Give your team a shared
              place to remember, organise and care without the spreadsheet
              shuffle.
            </p>
          </div>
          <div className={styles.featureBento}>
            <article className={styles.peopleFeature}>
              <span className={styles.featureIcon}>
                <Users size={23} />
              </span>
              <h3>
                People, never
                <br />
                just records.
              </h3>
              <p>
                Know who is here, welcome who is new, and stay close to those
                who need a little extra care.
              </p>
              <div className={styles.featureTags}>
                <span>Members & families</span>
                <span>Visitors & follow-up</span>
                <span>Pastoral care</span>
              </div>
              <div className={styles.peopleIllustration} aria-hidden="true">
                <div className={styles.peopleOrbit} />
                <span className={styles.personOne}>AO</span>
                <span className={styles.personTwo}>EM</span>
                <span className={styles.personThree}>JT</span>
                <div className={styles.personCard}>
                  <span>
                    <Heart size={15} />
                  </span>
                  <div>
                    A familiar face.<strong>A meaningful connection.</strong>
                  </div>
                  <CircleCheck size={16} />
                </div>
                <span className={styles.personFour}>KN</span>
                <div className={styles.personNote}>
                  Everyone belongs somewhere.
                </div>
              </div>
            </article>
            <article className={styles.attendanceFeature}>
              <span className={styles.featureIcon}>
                <CalendarCheck size={23} />
              </span>
              <h3>
                A calmer Sunday
                <br />
                starts here.
              </h3>
              <p>
                Search your roster, select the people present and record
                attendance together. General totals work, too.
              </p>
              <div className={styles.smallRoster} aria-hidden="true">
                <div>
                  <span className={styles.rosterCheck}>
                    <Check size={12} />
                  </span>
                  <span>Adult service</span>
                  <small>Ready</small>
                </div>
                <div>
                  <span className={styles.rosterCheck}>
                    <Check size={12} />
                  </span>
                  <span>Children&apos;s ministry</span>
                  <small>Ready</small>
                </div>
                <div>
                  <span className={styles.rosterCheck}>
                    <Check size={12} />
                  </span>
                  <span>Midweek fellowship</span>
                  <small>Ready</small>
                </div>
              </div>
            </article>
            <article className={styles.givingFeature}>
              <span className={styles.featureIcon}>
                <Wallet size={23} />
              </span>
              <h3>
                Good stewardship.
                <br />
                Clearer records.
              </h3>
              <p>
                Connect contributions, receipts and reports. Keep the people who
                need the details in the picture.
              </p>
              <div className={styles.givingIllustration} aria-hidden="true">
                <div>
                  <span>Giving, brought together</span>
                  <span>
                    <ShieldCheck size={16} />
                  </span>
                </div>
                <div className={styles.givingSegments}>
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <div className={styles.givingLegend}>
                  <span>
                    <i /> Tithes
                  </span>
                  <span>
                    <i /> Offerings
                  </span>
                  <span>
                    <i /> Projects
                  </span>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section
          id="enterprise"
          className={styles.enterpriseSection}
          aria-labelledby="enterprise-title"
        >
          <div className={styles.enterpriseInner}>
            <div className={styles.enterpriseCopy}>
              <span className={styles.darkEyebrow}>
                LOCAL HEART. SHARED DIRECTION.
              </span>
              <h2 id="enterprise-title">
                One ministry.
                <br />
                <em>Every location.</em>
              </h2>
              <p>
                Give local teams ownership of their work, and leadership a
                clearer view across the church.
              </p>
              <ul>
                <li>
                  <Check size={16} /> Branch-aware records and workspaces
                </li>
                <li>
                  <Check size={16} /> Permissions that follow responsibility
                </li>
                <li>
                  <Check size={16} /> Central oversight for authorised HQ users
                </li>
                <li>
                  <Check size={16} /> Analytics reserved for administrators
                </li>
              </ul>
              <a href="#pricing" className={styles.limeButton}>
                Find room for your network <ArrowUpRight size={17} />
              </a>
            </div>
            <div
              className={styles.networkIllustration}
              aria-label="Illustration of church HQ connected to three branch workspaces"
            >
              <div className={styles.networkGrid} />
              <svg
                viewBox="0 0 500 390"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M250 105V190M250 190H90V263M250 190H410V263M250 190V291"
                  stroke="#9cb692"
                  strokeOpacity=".55"
                  fill="none"
                  strokeDasharray="4 5"
                />
                <circle cx="250" cy="190" r="5" fill="#d1e98c" />
              </svg>
              <div className={styles.hqNode}>
                <span className={styles.nodeIcon}>
                  <Building2 size={23} />
                </span>
                <div>
                  Church HQ<strong>A shared view.</strong>
                </div>
                <span className={styles.nodePill}>Oversight</span>
              </div>
              <div className={`${styles.branchNode} ${styles.branchOne}`}>
                <span>
                  <Building2 size={18} />
                </span>
                <strong>Central</strong>
                <small>Local ownership</small>
              </div>
              <div className={`${styles.branchNode} ${styles.branchTwo}`}>
                <span>
                  <Building2 size={18} />
                </span>
                <strong>North</strong>
                <small>Local ownership</small>
              </div>
              <div className={`${styles.branchNode} ${styles.branchThree}`}>
                <span>
                  <Building2 size={18} />
                </span>
                <strong>West</strong>
                <small>Local ownership</small>
              </div>
              <div className={styles.networkCaption}>
                <LockKeyhole size={13} /> Connected doesn&apos;t mean open to
                everyone.
              </div>
            </div>
          </div>
          <div className={styles.securityStrip}>
            <span>
              <ShieldCheck size={18} /> Permission-based access
            </span>
            <span>
              <Network size={18} /> Branch-aware records
            </span>
            <span>
              <Fingerprint size={18} /> Account security controls
            </span>
            <span>
              <LockKeyhole size={18} /> Encrypted provider credentials
            </span>
          </div>
        </section>

        <section
          className={styles.integrationsSection}
          aria-labelledby="integrations-title"
        >
          <div>
            <span className={styles.eyebrow}>CONNECTED, ON YOUR TERMS</span>
            <h2 id="integrations-title">
              Your providers.
              <br />
              <em>Your choice.</em>
            </h2>
            <p>
              Bring your email, messaging and payment accounts together. Pick
              the providers that fit your church.
            </p>
          </div>
          <div className={styles.providerGrid}>
            <article>
              <span>
                <MessageCircle size={17} /> Reach your people
              </span>
              <div>
                Twilio <i /> Termii <i /> Meta
              </div>
              <small>WhatsApp, SMS & live calls</small>
            </article>
            <article>
              <span>
                <ArrowUpRight size={17} /> Send with intention
              </span>
              <div>
                Resend <i /> SendGrid <i /> Mailgun
              </div>
              <small>Email with your own sender identity</small>
            </article>
            <article>
              <span>
                <Wallet size={17} /> Make giving simpler
              </span>
              <div>
                Paystack <i /> Flutterwave
              </div>
              <small>Connect your payment provider</small>
            </article>
          </div>
        </section>

        <PricingSection />

        <section
          id="questions"
          className={styles.faqSection}
          aria-labelledby="faq-title"
        >
          <div>
            <span className={styles.eyebrow}>
              A FEW THINGS YOU MIGHT BE WONDERING
            </span>
            <h2 id="faq-title">
              Good questions.
              <br />
              <em>Straight answers.</em>
            </h2>
            <p>
              Choosing a home for your church&apos;s work matters.
              <br />
              Here&apos;s a little clarity before you begin.
            </p>
          </div>
          <div className={styles.faqList}>
            {questions.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span>
                    <span />
                    <span />
                  </span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className={styles.finalCta}>
          <div className={styles.ctaMark} aria-hidden="true">
            <Heart size={30} />
          </div>
          <span className={styles.eyebrow}>
            A LITTLE MORE SPACE FOR WHAT MATTERS
          </span>
          <h2>
            Make room for
            <br />
            <em>more ministry.</em>
          </h2>
          <p>The work behind the scenes deserves a better home.</p>
          <Link href="/register" className={styles.primaryButton}>
            Create your church workspace <ArrowUpRight size={18} />
          </Link>
          <span className={styles.ctaFootnote}>
            Start with your people. Grow from there.
          </span>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div className={styles.footerIdentity}>
            <Link href="/" className={styles.brand} aria-label="ChurchOS home">
              <Image
                src="/brand/churchos-emblem.png"
                alt=""
                width={32}
                height={32}
              />
              church<span>os</span>
              <span className={styles.brandDot} />
            </Link>
            <p>
              A thoughtful home for the work
              <br />
              behind your church.
            </p>
          </div>
          <div className={styles.footerGroup}>
            <h2>Explore</h2>
            <nav aria-label="Footer navigation">
              <a href="#product">The platform</a>
              <a href="#pricing">Pricing</a>
              <a href="#questions">FAQs</a>
              <Link href="/help">Help Centre</Link>
              <Link href="/login">
                Sign in <ArrowUpRight size={13} />
              </Link>
            </nav>
          </div>
          <div id="legal" className={styles.footerGroup}>
            <h2>Legal &amp; Privacy</h2>
            <LegalNavigation />
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>
            © {new Date().getFullYear()} {LEGAL_COMPANY.name}. ChurchOS, built for the people behind
            the ministry.
          </span>
          <a href="#hero-title">
            Back to top <ArrowUpRight size={13} />
          </a>
        </div>
      </footer>
    </LandingMotion>
  );
}
