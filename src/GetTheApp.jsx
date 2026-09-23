import { useEffect, useState } from 'react'
import styles from './Menu.module.css'

// which phone's steps to show first. iPads report themselves as a Mac, so a Mac with a touchscreen counts as iOS.
// anything else (desktop) starts on iPhone; the switch is right there either way
function detectPlatform() {
  const ua = navigator.userAgent
  if (/android/i.test(ua)) return 'android'
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios'
  return 'ios'
}

const ShareIcon = () => ( // safari's share button: a box with an arrow coming out the top
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className={styles.inlineIcon}>
    <path d="M8 9H6.5A1.5 1.5 0 0 0 5 10.5v8A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17.5 9H16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M12 14V3.5M8.5 7 12 3.5 15.5 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const DotsIcon = () => ( // chrome's ⋮ menu
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className={styles.inlineIcon}>
    <circle cx="12" cy="5" r="1.8" fill="currentColor" />
    <circle cx="12" cy="12" r="1.8" fill="currentColor" />
    <circle cx="12" cy="19" r="1.8" fill="currentColor" />
  </svg>
)

// "get the app" section of the hamburger menu: how to add yuttler to your home screen on iPhone and Android.
// when the browser offers its own install prompt (chrome on android and desktop), there's a one-tap install button too
function GetTheApp() {
  const [expanded, setExpanded] = useState(false)
  const [platform, setPlatform] = useState(detectPlatform)
  const [installPrompt, setInstallPrompt] = useState(null) // chrome's saved install event, if it offered one

  useEffect(() => {
    function saveInstallPrompt(e) {
      e.preventDefault() // don't show chrome's own mini banner; our button uses the event instead
      setInstallPrompt(e)
    }
    function clearInstallPrompt() {
      setInstallPrompt(null) // installed: chrome won't offer it again
    }
    window.addEventListener('beforeinstallprompt', saveInstallPrompt)
    window.addEventListener('appinstalled', clearInstallPrompt)
    return () => {
      window.removeEventListener('beforeinstallprompt', saveInstallPrompt)
      window.removeEventListener('appinstalled', clearInstallPrompt)
    }
  }, [])

  async function install() {
    installPrompt.prompt() // chrome's install dialog
    await installPrompt.userChoice
    setInstallPrompt(null) // each saved event can only be used once
  }

  return (
    <section className={styles.section}>
      <div className={styles.label}>Get the app</div>

      <button
        type="button"
        className={styles.feedbackRow}
        aria-expanded={expanded}
        aria-controls="get-the-app-steps"
        onClick={() => setExpanded(!expanded)}
      >
        <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
          {/* phone with an arrow into it */}
          <rect x="6" y="2.5" width="12" height="19" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 7v7M9 11l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className={styles.rowText}>Add yuttler. to your home screen</span>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className={`${styles.rowChevron} ${expanded ? styles.rowChevronOpen : ''}`}>
          <polyline points="6,9 12,15 18,9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {expanded && (
        <div className={styles.appSteps} id="get-the-app-steps">
          {installPrompt && ( // android / desktop chrome offered to install: one tap instead of the steps
            <button type="button" className={styles.installButton} onClick={install}>
              Install yuttler.
            </button>
          )}

          <div className={styles.segmented} role="group" aria-label="Phone">
            <button type="button" className={platform === 'ios' ? styles.selected : ''} aria-pressed={platform === 'ios'} onClick={() => setPlatform('ios')}>
              iPhone
            </button>
            <button type="button" className={platform === 'android' ? styles.selected : ''} aria-pressed={platform === 'android'} onClick={() => setPlatform('android')}>
              Android
            </button>
          </div>

          {platform === 'ios' ? (
            <ol className={styles.stepList}>
              <li>Open yuttler.com in Safari.</li>
              <li>Tap the Share button <ShareIcon /> in the toolbar.</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong>.</li>
            </ol>
          ) : (
            <ol className={styles.stepList}>
              <li>Open yuttler.com in Chrome.</li>
              <li>Tap the menu <DotsIcon /> in the top-right corner.</li>
              <li>Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li>
              <li>Tap <strong>Install</strong>.</li>
            </ol>
          )}
        </div>
      )}
    </section>
  )
}

export default GetTheApp
