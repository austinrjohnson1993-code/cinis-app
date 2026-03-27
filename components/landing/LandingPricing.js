import styles from '../../styles/Landing.module.css'
import WaitlistForm from './WaitlistForm'

export default function LandingPricing() {
  return (
    <section className={styles.pricingSection} id="pricing">
      <div className={styles.pricingInner}>
        <div className={styles.pricingEyebrow}>Launching April 2026</div>
        <h2 className={styles.pricingHeadline}>Start free.</h2>
        <p className={styles.pricingSub}>Go Pro when it clicks.</p>

        <div className={styles.pricingTiers}>
          {/* Free */}
          <div className={styles.tierCard}>
            <div className={styles.tierLeft}>
              <div className={styles.tierName}>Free</div>
              <div className={styles.tierPrice}>$0</div>
            </div>
            <div className={styles.tierRight}>5 AI/day</div>
          </div>

          {/* Pro */}
          <div className={`${styles.tierCard} ${styles.tierCardPro}`}>
            <div className={styles.tierBadgePro}>POPULAR</div>
            <div className={styles.tierLeft}>
              <div className={styles.tierName}>Pro</div>
              <div className={styles.tierPrice}>
                $14<span className={styles.tierPriceSub}>/mo</span>
              </div>
            </div>
            <div className={styles.tierRight}>Unlimited AI</div>
          </div>

          {/* Annual */}
          <div className={`${styles.tierCard} ${styles.tierCardAnnual}`}>
            <div className={styles.tierLeft}>
              <div className={styles.tierName}>Annual</div>
              <div className={`${styles.tierPrice} ${styles.tierPriceGold}`}>
                $99<span className={styles.tierPriceSub}>/yr</span>
              </div>
            </div>
            <div className={styles.tierSavings}>Save $69</div>
          </div>
        </div>

        {/* Waitlist form */}
        <div className={styles.pricingFormWrap}>
          <WaitlistForm />
        </div>
      </div>
    </section>
  )
}
