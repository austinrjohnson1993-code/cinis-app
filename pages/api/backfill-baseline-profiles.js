import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Secret check
  if (req.body.secret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Query profiles table for users who need baseline profiles
    const { data: profiles, error: queryError } = await supabase
      .from('profiles')
      .select('id')
      .eq('onboarded', true)
      .is('baseline_profile', null);

    if (queryError) {
      return res.status(500).json({ error: queryError.message });
    }

    if (!profiles || profiles.length === 0) {
      return res.status(200).json({ success: true, processed: 0 });
    }

    let processed = 0;

    // Process each user with 500ms delay
    for (const profile of profiles) {
      try {
        // Call generate-baseline-profile API
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/api/generate-baseline-profile`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: profile.id }),
          }
        );

        if (response.ok) {
          processed++;
        }
      } catch (error) {
        console.error(`Failed to generate baseline for user ${profile.id}:`, error);
      }

      // 500ms delay between calls
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return res.status(200).json({ success: true, processed });
  } catch (error) {
    console.error('Backfill error:', error);
    return res.status(500).json({ error: error.message });
  }
}
