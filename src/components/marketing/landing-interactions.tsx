"use client";

import { BRAND_NAME } from "@/lib/brand/identity";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowDown,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SubscriptionCurrencySwitcher, SubscriptionPrice } from "@/components/billing/subscription-currency";
import { useSubscriptionPricing } from "@/hooks/use-subscription-pricing";
import { launchPlans, type LaunchPlan } from "./plans";
import styles from "./landing.module.css";

/** Animate on entry without hiding content before hydration or when JS is unavailable. */
export function LandingMotion({ children }: { children: React.ReactNode }) {
  const root = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const element = root.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    const selectors = [
      `.${styles.heroCopy} > *`, `.${styles.heroScribble}`, `.${styles.productStage}`,
      `.${styles.platformStrip}`, `.${styles.sectionIntro}`,
      `.${styles.enterpriseCopy}`, `.${styles.networkIllustration}`, `.${styles.securityStrip}`,
      `.${styles.integrationsSection} > div:first-child`, `.${styles.providerGrid} > article`,
      `.${styles.sectionHeading}`, `.${styles.planCard}`, `.${styles.faqSection} > div:first-child`,
      `.${styles.faqList} > details`, `.${styles.finalCta} > *`, "h1 em", "h2 em",
    ];
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        if (preference.matches) continue;
        const cursive = entry.target.tagName === "EM";
        const siblings = Array.from(entry.target.parentElement?.children ?? []);
        const planCard = entry.target.classList.contains(styles.planCard);
        const delay = cursive ? 160 : Math.min(siblings.indexOf(entry.target), 3) * (planCard ? 110 : 65);
        const animation = entry.target.animate(
          cursive
            ? [{ opacity: 0, transform: "translateY(12px) rotate(-3deg)", clipPath: "inset(0 100% 0 0)" },
               { opacity: 1, transform: "translateY(0) rotate(0)", clipPath: "inset(0 -3% -12% -3%)" }]
            : [{ opacity: 0, transform: "translateY(22px)" }, { opacity: 1, transform: "translateY(0)" }],
          { duration: cursive ? 850 : 650, delay, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" },
        );
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      }
    }, { threshold: 0.08 });
    element.querySelectorAll(selectors.join(",")).forEach((target) => observer.observe(target));
    // Keep recurring motion local to the section currently on screen.
    const ambientObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        (entry.target as HTMLElement).dataset.motionVisible = String(entry.isIntersecting);
      }
    }, { threshold: 0.12 });
    const ambientTargets = element.querySelectorAll([
      `.${styles.providerGrid} > article`,
      `.${styles.planCard}`, `.${styles.heroScribble}`,
    ].join(","));
    ambientTargets.forEach((target) => ambientObserver.observe(target));
    const pauseWhenHidden = () => { element.dataset.motionPaused = String(document.hidden); };
    pauseWhenHidden();
    document.addEventListener("visibilitychange", pauseWhenHidden);
    const stopMotion = () => {
      if (preference.matches) animations.forEach((animation) => animation.cancel());
    };
    preference.addEventListener("change", stopMotion);
    return () => {
      observer.disconnect();
      ambientObserver.disconnect();
      ambientTargets.forEach((target) => target.removeAttribute("data-motion-visible"));
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      animations.forEach((animation) => animation.cancel());
      preference.removeEventListener("change", stopMotion);
    };
  }, []);
  return <div ref={root} className={styles.landing}>{children}</div>;
}

const featureNames = ["People & care", "Attendance", "Giving & records", "Communication", "Teams & groups"];

export function FeatureCarousel({ children }: { children: React.ReactNode }) {
  const cards = React.Children.toArray(children);
  const [selected, setSelected] = React.useState(0);
  const [ready, setReady] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const [motionAllowed, setMotionAllowed] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const root = React.useRef<HTMLDivElement>(null);
  const touchStart = React.useRef<number | null>(null);
  const move = (step: number) => setSelected(index => (index + step + cards.length) % cards.length);

  React.useEffect(() => {
    setReady(true);
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotionAllowed(!preference.matches);
    sync();
    preference.addEventListener("change", sync);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    if (root.current) observer.observe(root.current);
    return () => { observer.disconnect(); preference.removeEventListener("change", sync); };
  }, []);

  React.useEffect(() => {
    if (!visible || !motionAllowed || hovered || focused) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      if (!document.hidden) timer = setTimeout(() => setSelected(index => (index + 1) % cards.length), 3000);
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", schedule); };
  }, [selected, visible, motionAllowed, hovered, focused, cards.length]);

  return (
    <div
      ref={root}
      className={styles.featureCarousel}
      data-ready={ready}
      role="region"
      aria-roledescription="carousel"
      aria-label="Explore church features"
      tabIndex={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      onKeyDown={event => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          move(event.key === "ArrowRight" ? 1 : -1);
        }
      }}
    >
      <div
        className={`${styles.featureBento} ${styles.featureArc}`}
        onPointerDown={event => { if (event.pointerType === "touch") touchStart.current = event.clientX; }}
        onPointerUp={event => {
          if (touchStart.current === null) return;
          const distance = event.clientX - touchStart.current;
          touchStart.current = null;
          if (Math.abs(distance) > 45) move(distance < 0 ? 1 : -1);
        }}
        onPointerCancel={() => { touchStart.current = null; }}
      >
        {cards.map((card, index) => {
          const offset = (index - selected + cards.length + Math.floor(cards.length / 2)) % cards.length - Math.floor(cards.length / 2);
          const active = index === selected;
          return (
            <div key={index} className={styles.featureSlide} data-position={offset} data-active={active}
              role="group" aria-roledescription="slide" aria-label={`${featureNames[index]}, ${index + 1} of ${cards.length}`}
              aria-hidden={ready && Math.abs(offset) > 1 ? true : undefined}>
              <div className={styles.featureCardContent} inert={ready && !active} aria-hidden={ready && !active ? true : undefined}>
                {card}
              </div>
              {ready && !active && Math.abs(offset) === 1 && (
                <button type="button" className={styles.featureSelect} tabIndex={-1}
                  aria-label={`View ${featureNames[index]}`} onClick={event => { event.currentTarget.blur(); setSelected(index); }} />
              )}
            </div>
          );
        })}
      </div>
      <div className={styles.featureCarouselControls}>
        <div className={styles.featureDots} role="group" aria-label="Choose a feature">
          {cards.map((_, index) => <button type="button" key={index} aria-label={`Show ${featureNames[index]}`}
            aria-pressed={selected === index} onClick={() => setSelected(index)}><span /></button>)}
        </div>
      </div>
    </div>
  );
}

export function MarketingNavigation() {
  const [open, setOpen] = React.useState(false);
  const trigger = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    if (open) document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  return (
    <header className={styles.header}>
      <nav className={styles.navigation} aria-label="Main navigation">
        <Link href="/" className={styles.brand} aria-label="BelivrHQ home">
          <Image
            src="/brand/belivrhq-emblem.png"
            alt=""
            width={36}
            height={36}
            priority
          />
          {BRAND_NAME}
          <span className={styles.brandDot} />
        </Link>
        <div className={styles.desktopLinks}>
          <a href="#product">The platform</a>
          <a href="#enterprise">For your network</a>
          <a href="#pricing">Pricing</a>
          <a href="#questions">FAQs</a>
        </div>
        <div className={styles.navActions}>
          <Link href="/login" className={styles.signIn}>
            Sign in <ArrowRight size={14} />
          </Link>
          <Link href="/register" className={styles.smallButton}>
            Get started <ArrowRight size={15} />
          </Link>
        </div>
        <button
          ref={trigger}
          type="button"
          className={styles.menuButton}
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="marketing-mobile-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </nav>
      {open && (
        <div id="marketing-mobile-navigation" className={styles.mobileLinks}>
          {[
            ["#product", "The platform"],
            ["#enterprise", "For your network"],
            ["#pricing", "Pricing"],
            ["#questions", "FAQs"],
          ].map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>
              {label}
              <ArrowRight size={16} />
            </Link>
          ))}
          <div className={styles.mobileActions}>
            <Link href="/login" className={styles.secondaryButton} onClick={() => setOpen(false)}>
              Sign in <ArrowRight size={16} />
            </Link>
            <Link href="/register" className={styles.primaryButton} onClick={() => setOpen(false)}>
              Get started <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

const views = [
  {
    id: "overview",
    label: "Sunday overview",
    title: "A good Sunday starts here.",
    value: "612",
    metric: "People checked in",
    aside: "24",
    asideLabel: "First-time visitors",
    note: "A warm welcome, followed by a thoughtful follow-up.",
  },
  {
    id: "people",
    label: "People & care",
    title: "Every person has a place.",
    value: "1,284",
    metric: "People in your community",
    aside: "18",
    asideLabel: "Follow-ups to plan",
    note: "Keep the next conversation connected to the last one.",
  },
  {
    id: "giving",
    label: "Giving & reports",
    title: "Clarity for every contribution.",
    value: "₦845k",
    metric: "Giving recorded this month",
    aside: "128",
    asideLabel: "Recorded contributions",
    note: "Bring your giving records and reports into one view.",
  },
];
export function ProductPreview() {
  const [selected, setSelected] = React.useState(0);
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const [motionAllowed, setMotionAllowed] = React.useState(false);
  const stage = React.useRef<HTMLDivElement>(null);
  const view = views[selected];

  React.useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setMotionAllowed(!preference.matches);
    syncPreference();
    preference.addEventListener("change", syncPreference);
    const element = stage.current;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
    }, { threshold: 0.15 });
    if (element) observer.observe(element);
    return () => {
      preference.removeEventListener("change", syncPreference);
      observer.disconnect();
    };
  }, []);

  React.useEffect(() => {
    if (hovered || focused || !visible || !motionAllowed) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      if (!document.hidden) {
        timer = setTimeout(() => setSelected((index) => (index + 1) % views.length), 5000);
      }
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [hovered, focused, visible, motionAllowed, selected]);

  const tabs = React.useRef<(HTMLButtonElement | null)[]>([]);
  function moveTab(event: React.KeyboardEvent, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % views.length;
    else if (event.key === "ArrowLeft")
      next = (index + views.length - 1) % views.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = views.length - 1;
    else return;
    event.preventDefault();
    setSelected(next);
    tabs.current[next]?.focus();
  }
  return (
    <div
      ref={stage}
      className={styles.productStage}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocused(false);
        }
      }}
    >
      <div
        className={styles.previewTabs}
        style={{ "--preview-index": selected } as React.CSSProperties}
        role="tablist"
        aria-label="Explore the platform"
      >
        <span className={styles.previewTabGlass} aria-hidden="true" />
        {views.map((item, index) => (
          <button
            ref={(node) => {
              tabs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`preview-tab-${item.id}`}
            aria-controls={`preview-panel-${item.id}`}
            aria-selected={selected === index}
            tabIndex={selected === index ? 0 : -1}
            key={item.id}
            onKeyDown={(event) => moveTab(event, index)}
            onClick={() => setSelected(index)}
          >
            {item.label}
            {selected === index && <span className={styles.tabDot} />}
          </button>
        ))}
      </div>
      <div
        className={styles.productWindow}
        role="tabpanel"
        id={`preview-panel-${view.id}`}
        aria-labelledby={`preview-tab-${view.id}`}
        tabIndex={0}
      >
        <aside className={styles.mockSidebar} aria-hidden="true">
          <div className={styles.mockLogo}>
            b<span>hq</span>
            <span className={styles.mockLogoDot} />
          </div>
          <span className={styles.mockNavActive}>
            <LayoutDashboard size={18} />
          </span>
          <span>
            <Users size={18} />
          </span>
          <span>
            <CheckCheck size={18} />
          </span>
          <span>
            <Wallet size={18} />
          </span>
          <span className={styles.mockSidebarBottom}>
            <CircleHelp size={18} />
          </span>
          <div className={styles.miniAvatar}>GO</div>
        </aside>
        <div className={styles.mockMain}>
          <div className={styles.mockTopbar}>
            <span>
              Grace Community <ChevronDown size={13} />
            </span>
            <div>
              <span className={styles.exampleTag}>Illustrative workspace</span>
              <span className={styles.miniAvatar}>GO</span>
            </div>
          </div>
          <div key={view.id} className={`${styles.mockBody} ${styles.previewSlide}`}>
            <div className={styles.mockHeading}>
              <div>
                <span className={styles.mockEyebrow}>
                  YOUR MINISTRY, CONNECTED
                </span>
                <h3>{view.title}</h3>
                <p>A little clarity for the week ahead.</p>
              </div>
              <span className={styles.mockDate}>
                Sunday service <ChevronDown size={12} />
              </span>
            </div>
            <div className={styles.mockContent}>
              <div className={styles.chartCard}>
                <div className={styles.chartTop}>
                  <div>
                    <span>{view.metric}</span>
                    <strong>{view.value}</strong>
                  </div>
                  <span className={styles.metricBadge}>
                    This month <ArrowDown size={11} />
                  </span>
                </div>
                <div
                  className={styles.chartBars}
                  role="img"
                  aria-label="Illustrative attendance trend across eight weeks"
                >
                  {[35, 48, 42, 61, 54, 74, 65, 91].map((height, i) => (
                    <div key={i}>
                      <span
                        style={{ height: `${height}%` }}
                        className={i === 7 ? styles.lastBar : undefined}
                      />
                      <small>{i % 2 === 0 ? `W${i + 1}` : ""}</small>
                    </div>
                  ))}
                </div>
                <div className={styles.chartCaption}>
                  <span>
                    <i /> Together, week after week.
                  </span>
                  <small>Example data</small>
                </div>
              </div>
              <div className={styles.welcomeCard}>
                <span className={styles.welcomeIcon}>
                  <Users size={20} />
                </span>
                <strong>{view.aside}</strong>
                <h4>{view.asideLabel}</h4>
                <p>{view.note}</p>
                <div className={styles.avatarStack} aria-hidden="true">
                  <span>AO</span>
                  <span>EM</span>
                  <span>JT</span>
                  <span>+</span>
                </div>
                <span className={styles.mockTextLink}>
                  See the people behind the numbers <ArrowRight size={13} />
                </span>
              </div>
            </div>
            <div className={styles.mockList}>
              <div>
                <span className={styles.mockListTitle}>
                  The next right thing
                </span>
                <span className={styles.mockSearch}>
                  <Search size={12} /> Your team&apos;s week
                </span>
              </div>
              {[
                ["Welcome first-time visitors", "Follow-up team", "Today"],
                ["Prepare the next service", "Ushering team", "This week"],
              ].map(([task, team, when], index) => (
                <div key={task}>
                  <span className={styles.taskCheck}>
                    {index === 0 ? <Check size={11} /> : <Plus size={11} />}
                  </span>
                  <span>
                    {task}
                    <small>{team}</small>
                  </span>
                  <span className={styles.taskStatus}>{when}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.floatingNote}>
        <span>
          <Check size={15} />
        </span>
        <div>
          Less chasing updates.<strong>More showing up for people.</strong>
        </div>
      </div>
    </div>
  );
}

export function PricingSection() {
  const pricing = useSubscriptionPricing();
  const [annual, setAnnual] = React.useState(false);
  const [plan, setPlan] = React.useState<LaunchPlan | null>(null);
  const planTrigger = React.useRef<HTMLButtonElement | null>(null);
  return (
    <section
      id="pricing"
      className={styles.pricingSection}
      aria-labelledby="pricing-title"
    >
      <div className={styles.sectionHeading}>
        <span className={styles.eyebrow}>ROOM TO BEGIN. ROOM TO GROW.</span>
        <h2 id="pricing-title">
          Big possibilities.
          <br />
          <em>Small beginnings welcome.</em>
        </h2>
        <p>
          Start with what your church needs today.
          <br />
          Make space for what comes next.
        </p>
      </div>
      <div
        className={styles.billingToggle}
        role="group"
        aria-label="Billing period"
      >
        <button
          type="button"
          aria-pressed={!annual}
          onClick={() => setAnnual(false)}
        >
          Monthly
        </button>
        <button
          type="button"
          aria-pressed={annual}
          onClick={() => setAnnual(true)}
        >
          Yearly <span>Save 10%</span>
        </button>
      </div>
      <div className="mb-6">
        <SubscriptionCurrencySwitcher />
      </div>
      <div className={styles.pricingGrid}>
        {launchPlans.map((item) => {
          return (
            <article
              key={item.id}
              className={`${styles.planCard} ${"featured" in item && item.featured ? styles.featuredPlan : ""}`}
              onPointerMove={event => {
                if (event.pointerType !== "mouse") return;
                const rect = event.currentTarget.getBoundingClientRect();
                event.currentTarget.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
                event.currentTarget.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
              }}
              onPointerLeave={event => {
                event.currentTarget.style.removeProperty("--spot-x");
                event.currentTarget.style.removeProperty("--spot-y");
              }}
            >
              {"featured" in item && item.featured && (
                <div className={styles.popularBadge}>
                  A LITTLE MORE ROOM TO GROW <span>↗</span>
                </div>
              )}
              <span className={styles.planIndex}>
                0{launchPlans.indexOf(item) + 1}
              </span>
              <h3>{item.name}</h3>
              <p className={styles.planDescription}>{item.description}</p>
              <div
                key={item.id === "enterprise" ? item.id : `${pricing.currency}-${annual}-${pricing.price(item.id, annual ? "annual" : "monthly")}`}
                className={`${styles.planPrice} ${item.id !== "enterprise" ? styles.priceTransition : ""}`}
              >
                {item.id === "enterprise" ? (
                  <strong>Let’s talk</strong>
                ) : (
                  <>
                    <strong>
                      <SubscriptionPrice pricing={pricing} plan={item.id} cycle={annual ? "annual" : "monthly"} />
                    </strong>
                    <span>/ {annual ? "year" : "month"}</span>
                  </>
                )}
              </div>
              <p className={styles.billingNote}>
                {item.id === "enterprise"
                  ? "Pricing and billing terms agreed with you"
                  : annual
                    ? <><SubscriptionPrice pricing={pricing} plan={item.id} cycle="annual" /> billed yearly</>
                    : <><SubscriptionPrice pricing={pricing} plan={item.id} cycle="annual" /> when billed yearly</>}
              </p>
              <p className={styles.planCapacity}>{item.capacity}</p>
              <button
                type="button"
                className={styles.planButton}
                onClick={(event) => {
                  planTrigger.current = event.currentTarget;
                  setPlan(item);
                }}
                aria-label={`Explore ${item.name} plan`}
              >
                Explore {item.name}
                <ArrowRight size={16} />
              </button>
              <ul>
                {item.features.map((feature) => (
                  <li key={feature}>
                    <Check size={15} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
      <div className={styles.pricingFootnote}>
        <ShieldCheck size={18} />
        <p>
          Permission-based access is included in every plan. Messaging, calls
          and payment-provider charges are separate.
          <br />
          <span>
            Proposed launch plans. Final limits, availability and Enterprise
            scope are confirmed during onboarding.
          </span>
        </p>
      </div>
      <Dialog
        open={!!plan}
        onOpenChange={(open) => {
          if (!open) setPlan(null);
        }}
      >
        <DialogContent
          className={styles.planDialog}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            planTrigger.current?.focus();
          }}
        >
          <DialogHeader>
            <span className={styles.eyebrow}>YOUR NEXT CHAPTER</span>
            <DialogTitle className={styles.dialogTitle}>
              {plan?.name}, at your pace.
            </DialogTitle>
            <DialogDescription className={styles.dialogDescription}>
              {plan?.description}{" "}
              {plan?.id === "enterprise"
                ? "Pricing, billing terms and rollout scope are negotiated directly with the BelivrHQ team."
                : "Choose your plan during registration, then activate your workspace with secure checkout."}
            </DialogDescription>
          </DialogHeader>
          {plan && (
            <>
              <div className={styles.dialogPrice}>
                {plan.id === "enterprise" ? (
                  <strong>Let’s talk</strong>
                ) : (
                  <>
                    <strong>
                      <SubscriptionPrice pricing={pricing} plan={plan.id} cycle={annual ? "annual" : "monthly"} />
                    </strong>
                    <span>/ {annual ? "year" : "month"}</span>
                  </>
                )}
              </div>
              <p className={styles.planCapacity}>{plan.capacity}</p>
              <ul className={styles.dialogFeatures}>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={15} />
                    {feature}
                  </li>
                ))}
              </ul>
              {plan.id === "enterprise" ? (
                <p className={styles.dialogFinePrint}>
                  Contact the BelivrHQ team to discuss your needs and agree on a
                  tailored proposal.
                </p>
              ) : (
                <>
                  <Link
                    href={`/register?plan=${plan.id}&cycle=${annual ? "annual" : "monthly"}&currency=${pricing.currency}`}
                    className={styles.primaryButton}
                  >
                    Continue to registration <ArrowRight size={17} />
                  </Link>
                  <p className={styles.dialogFinePrint}>
                    Provider usage fees are separate. Renewals are manual.
                  </p>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
