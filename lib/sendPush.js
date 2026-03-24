import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:noreply@cinis.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

/**
 * Send a push notification to a stored subscription.
 * @param {object|string} subscription - push_subscription from profiles (JSON object or serialized string)
 * @param {string} title
 * @param {string} body
 * @param {string} [url='/dashboard']
 */
export async function sendPushNotification(subscription, title, body, url = '/dashboard') {
  if (!subscription) return

  const sub = typeof subscription === 'string' ? JSON.parse(subscription) : subscription
  if (!sub?.endpoint) return

  const payload = JSON.stringify({ title, body, url })
  await webpush.sendNotification(sub, payload)
}
