const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:ryan@cinis.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Send a push notification to a single subscription
 * @param {object} subscription - PushSubscription object from DB
 * @param {object} payload - { title, body, tag, url }
 */
async function sendPushNotification(subscription, payload) {
  if (!subscription || !subscription.endpoint) return { success: false, reason: 'no_subscription' };
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true };
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired/invalid — caller should clear it from DB
      return { success: false, reason: 'subscription_expired', statusCode: err.statusCode };
    }
    console.error('[push] sendPushNotification error:', err.message);
    return { success: false, reason: 'send_error', error: err.message };
  }
}

/**
 * Send push notifications to multiple users by user_id array
 * Fetches their subscriptions from Supabase, skips those without push enabled
 * @param {object} supabase - service role Supabase client
 * @param {string[]} userIds
 * @param {object} payload - { title, body, tag, url }
 */
async function sendPushToUsers(supabase, userIds, payload) {
  if (!userIds || userIds.length === 0) return;
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, push_subscription, push_notifications_enabled')
    .in('id', userIds)
    .eq('push_notifications_enabled', true);

  if (!profiles || profiles.length === 0) return;

  const results = await Promise.allSettled(
    profiles.map(async (profile) => {
      if (!profile.push_subscription) return;
      const result = await sendPushNotification(profile.push_subscription, payload);
      if (result.reason === 'subscription_expired') {
        // Clear dead subscription
        await supabase
          .from('profiles')
          .update({ push_subscription: null, push_notifications_enabled: false })
          .eq('id', profile.id);
      }
      return result;
    })
  );
  return results;
}

module.exports = { sendPushNotification, sendPushToUsers };
