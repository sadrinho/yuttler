import styles from './Splash.module.css'

const BUG_EMAIL = 'sadra.aliakbarpour@yale.edu'

// full-screen yale blue splash while stops + routes load, and the "couldn't reach the server" screen if they fail.
// the wordmark stays in the same spot in both; only the slot under it changes
function Splash({ error }) {
  const code = error?.status ? `Error ${error.status}` : 'Network error' // no status = the request never got an answer
  // prefilled so the email says what went wrong without the user having to explain it
  const bugReport = `mailto:${BUG_EMAIL}?subject=${encodeURIComponent(`yuttler. bug report (${code})`)}`

  return (
    <div className={styles.splash} role={error ? 'alert' : 'status'}>
      <div className={styles.brand}>
        <div className={styles.iconSlot} aria-hidden="true" /> {/* reserved for the real logo */}
        <div className={styles.wordmark}>yuttler.</div>
      </div>

      {error ? (
        <div className={styles.failed}>
          <div className={styles.message}>
            <p className={styles.title}>Couldn't reach the yuttler. server.</p>
            <p className={styles.code}>{code}</p>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.retry} onClick={() => window.location.reload()}>Retry</button>
            <a className={styles.report} href={bugReport}>Report a bug</a>
          </div>
        </div>
      ) : (
        <div className={styles.spinner} aria-label="Loading" />
      )}
    </div>
  )
}

export default Splash
