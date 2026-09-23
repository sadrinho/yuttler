import { useEffect, useRef } from "react";
import styles from "./Menu.module.css";
import { FEEDBACK_EMAIL } from "./contact";
import GetTheApp from "./GetTheApp";

const feedbackLink = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent("yuttler feedback")}`;

// the hamburger menu: theme toggle, feedback, credits and the stats line.
// always mounted (closed = slid off to the left and inert) so step 8 can animate it with plain css
function Menu({
  open,
  onClose,
  darkMode,
  onThemeChange,
  stopCount,
  routeCount,
  busCount,
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus({ preventScroll: true }); // keyboard/screen reader focus starts inside the menu
    function closeOnEscape(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  return (
    // inert while closed: nothing in it can be tapped, tabbed to, or read out
    <div className={`${styles.menu} ${open ? styles.open : ""}`} inert={!open}>
      <div className={styles.backdrop} onClick={onClose} />{" "}
      {/* tap outside the panel to close */}
      <nav
        className={styles.panel}
        ref={panelRef}
        tabIndex={-1}
        aria-label="Menu"
      >
        <div className={styles.header}>
          {/* the wordmark lockup (mark + "yuttler"), white on the yale blue band. 2x file for sharp retina screens */}
          <img
            className={styles.wordmark}
            src="/brand/yuttler-wordmark-white-32h.png"
            srcSet="/brand/yuttler-wordmark-white-32h.png 1x, /brand/yuttler-wordmark-white-64h.png 2x"
            alt="yuttler"
          />
        </div>

        <div className={styles.body}>
          <section className={styles.section}>
            <div className={styles.label} id="menu-theme-label">
              Theme
            </div>
            <div
              className={styles.segmented}
              role="group"
              aria-labelledby="menu-theme-label"
            >
              <button
                type="button"
                className={!darkMode ? styles.selected : ""}
                aria-pressed={!darkMode}
                onClick={() => onThemeChange(false)}
              >
                Light
              </button>
              <button
                type="button"
                className={darkMode ? styles.selected : ""}
                aria-pressed={darkMode}
                onClick={() => onThemeChange(true)}
              >
                Dark
              </button>
            </div>
          </section>

          {/* how to add yuttler to your home screen (plus chrome's one-tap install when it's offered) */}
          <GetTheApp />

          <section className={styles.section}>
            <div className={styles.label}>Feedback</div>
            <a className={styles.feedbackRow} href={feedbackLink}>
              <svg
                viewBox="0 0 24 24"
                width="19"
                height="19"
                aria-hidden="true"
              >
                <rect
                  x="3"
                  y="5.5"
                  width="18"
                  height="13"
                  rx="2.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <polyline
                  points="4,7 12,13 20,7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Bug reports or suggestions?</span>
            </a>
          </section>

          {/* pushed to the bottom. OSM + CARTO are credited on the map itself; LocationIQ (search) is credited here */}
          <footer className={styles.footer}>
            <div className={styles.divider} />
            <p className={styles.credit}>
              Search by{" "}
              <a
                href="https://www.locationiq.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                LocationIQ.com
              </a>
            </p>
            <p className={styles.credit}>
              Not affiliated with Yale University or Downtowner
            </p>
            <p className={styles.credit}>
              Made with love by Sadra Aliakbarpour &lt;3
            </p>
            <p className={styles.credit}>
              Visit the{" "}
              <a
                href="https://github.com/sadrinho/yuttler/"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub repository
              </a>
            </p>
            {/* deliberately small and gray so it doesn't read as tappable */}
            <p className={styles.stats}>
              Loaded {stopCount} stops, {routeCount} routes, {busCount} buses
            </p>
          </footer>
        </div>
      </nav>
    </div>
  );
}

export default Menu;
