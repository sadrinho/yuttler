import styles from "./Splash.module.css";
import { FEEDBACK_EMAIL } from "./contact";

// full-screen yale blue "couldn't reach the server" screen, shown only if stops + routes fail to load.
// (there's no loading splash anymore: on fast loads it just flickered, so the app shows straight away)
function Splash({ error }) {
  const code = error?.status ? `Error ${error.status}` : "Network error"; // no status = the request never got an answer
  // prefilled so the email says what went wrong without the user having to explain it
  const bugReport = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(`yuttler. bug report (${code})`)}`;

  return (
    <div className={styles.splash} role="alert">
      <div className={styles.brand}>
        <div className={styles.iconSlot} aria-hidden="true" />{" "}
        {/* reserved for the real logo */}
        <div className={styles.wordmark}>yuttler.</div>
      </div>

      <div className={styles.failed}>
          <div className={styles.message}>
            <p className={styles.title}>Couldn't reach Yuttler's server.</p>
            <p className={styles.code}>{code}</p>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.retry}
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
            <a className={styles.report} href={bugReport}>
              Report a bug
            </a>
          </div>
      </div>
    </div>
  );
}

export default Splash;
