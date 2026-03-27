import styles from '../../styles/Landing.module.css'
import CinisMark from '../../lib/CinisMark'

export default function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerLeft}>
          <a href="#" className={styles.footerLogo}>
            <CinisMark size={18} />
            CINIS
          </a>
          <p className={styles.footerTagline}>Where start meets finished.</p>
        </div>
        <div className={styles.footerRight}>
          <div className={styles.footerLinks}>
            <a href="https://twitter.com/cinis_app" className={styles.footerLink} target="_blank" rel="noopener noreferrer">Twitter</a>
            <a href="https://instagram.com/cinis_app" className={styles.footerLink} target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="/privacy" className={styles.footerLink}>Privacy</a>
            <a href="/terms" className={styles.footerLink}>Terms</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
