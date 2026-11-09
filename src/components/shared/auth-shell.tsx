"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MotionConfig, motion } from "motion/react";
import {
  ArrowUpRight,
  Check,
  Heart,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { ColorModeToggle } from "@/components/shared/color-mode-toggle";
import styles from "./auth-shell.module.css";
export function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onboarding = pathname === "/register" || pathname === "/subscription";
  return (
    <MotionConfig reducedMotion="user">
      <div className={styles.shell} data-paper-root>
        <aside className={styles.story}>
          <Link href="/" aria-label="BelivrHQ home" className={styles.brand}>
            <BrandLogo
              variant="mark"
              emblemClassName="size-9 brightness-0 invert"
            />
            <span>
              BelivrHQ<span className={styles.brandDot}>.</span>
            </span>
          </Link>
          <div className={styles.storyContent}>
            <div className={styles.eyebrow}>
              <span /> MADE FOR YOUR MINISTRY
            </div>
            <h2>
              More connection.
              <br />
              <em>More possibility.</em>
            </h2>
            <p>
              A little less administration. A lot more room for the people who
              matter.
            </p>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className={styles.preview}
              aria-label="Illustration of a connected church workspace"
            >
              <div className={styles.previewTop}>
                <span className={styles.previewIcon}>
                  <Heart size={19} />
                </span>
                <div>
                  <strong>Your church, together</strong>
                  <span>One connected workspace</span>
                </div>
                <Sparkles size={18} />
              </div>
              <div className={styles.previewBody}>
                <div className={styles.previewLabel}>
                  <span>PEOPLE AT THE HEART</span>
                  <ArrowUpRight size={15} />
                </div>
                <div className={styles.people}>
                  <span>AO</span>
                  <span>JM</span>
                  <span>EK</span>
                  <span>
                    <Users size={18} />
                  </span>
                  <p>
                    A place for
                    <br />
                    <strong>everyone.</strong>
                  </p>
                </div>
                <div className={styles.barChart} aria-hidden="true">
                  {[35, 52, 42, 68, 57, 80, 72, 95, 84, 100].map(
                    (height, i) => (
                      <span key={i} style={{ height: `${height}%` }} />
                    ),
                  )}
                </div>
                <div className={styles.previewBottom}>
                  <span>
                    <Check size={13} /> People & care
                  </span>
                  <span>
                    <Check size={13} /> Teams & ministry
                  </span>
                </div>
              </div>
              <div className={styles.note}>
                <span>
                  <Check size={15} />
                </span>{" "}
                Less busywork. More ministry.
              </div>
            </motion.div>
          </div>
          <div className={styles.storyFooter}>
            <span>
              <ShieldCheck size={16} /> Your community. Your workspace.
            </span>
            <span>Built to grow with you ↗</span>
          </div>
        </aside>
        <main className={styles.main}>
          <header className={styles.topbar}>
            <Link href="/" className={styles.backLink}>
              ← Back to BelivrHQ
            </Link>
            <div className="flex items-center gap-3">
              <span className={styles.topbarLabel}>
                {onboarding ? "YOUR NEXT CHAPTER" : "WELCOME TO YOUR WORKSPACE"}
              </span>
              <ColorModeToggle />
            </div>
          </header>
          <div className={styles.formArea}>{children}</div>
          <footer className={styles.mainFooter}>
            <span>Made for people. Built for ministry.</span>
            <span>© {new Date().getFullYear()} BelivrHQ</span>
          </footer>
        </main>
      </div>
    </MotionConfig>
  );
}
