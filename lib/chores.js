export const CHORE_PRESETS = [
  {
    id: 'light',
    name: 'Light Touch',
    description: 'Minimum viable clean. For busy weeks or low-energy periods.',
    frequency: 'weekly',
    chores: [
      { title: 'Wash dishes / run dishwasher', recurrence: 'daily' },
      { title: 'Wipe down kitchen counters', recurrence: 'daily' },
      { title: 'Take out trash', recurrence: 'weekly' },
      { title: 'Vacuum main areas', recurrence: 'weekly' },
      { title: 'Clean toilet', recurrence: 'weekly' },
      { title: 'Do laundry', recurrence: 'weekly' },
      { title: 'Mop kitchen floor', recurrence: 'biweekly' },
      { title: 'Change bed sheets', recurrence: 'biweekly' },
    ]
  },
  {
    id: 'standard',
    name: 'Standard Routine',
    description: 'Balanced upkeep. A clean home without it taking over your week.',
    frequency: 'weekly',
    chores: [
      { title: 'Wash dishes / run dishwasher', recurrence: 'daily' },
      { title: 'Wipe down kitchen counters', recurrence: 'daily' },
      { title: 'Sweep kitchen floor', recurrence: 'daily' },
      { title: 'Take out trash', recurrence: 'weekly' },
      { title: 'Vacuum all rooms', recurrence: 'weekly' },
      { title: 'Mop floors', recurrence: 'weekly' },
      { title: 'Clean toilet and sink', recurrence: 'weekly' },
      { title: 'Do laundry', recurrence: 'weekly' },
      { title: 'Clean shower / tub', recurrence: 'biweekly' },
      { title: 'Change bed sheets', recurrence: 'weekly' },
      { title: 'Wipe down bathroom surfaces', recurrence: 'weekly' },
      { title: 'Dust surfaces', recurrence: 'biweekly' },
      { title: 'Clean microwave', recurrence: 'biweekly' },
      { title: 'Wipe down appliances', recurrence: 'monthly' },
    ]
  },
  {
    id: 'thorough',
    name: 'Thorough Clean',
    description: 'Full coverage. For people who want nothing slipping through the cracks.',
    frequency: 'weekly',
    chores: [
      { title: 'Wash dishes / run dishwasher', recurrence: 'daily' },
      { title: 'Wipe down kitchen counters', recurrence: 'daily' },
      { title: 'Sweep kitchen floor', recurrence: 'daily' },
      { title: 'Wipe stovetop', recurrence: 'daily' },
      { title: 'Take out trash', recurrence: 'twice-weekly' },
      { title: 'Vacuum all rooms', recurrence: 'twice-weekly' },
      { title: 'Mop all floors', recurrence: 'weekly' },
      { title: 'Clean toilet', recurrence: 'weekly' },
      { title: 'Scrub shower / tub', recurrence: 'weekly' },
      { title: 'Wipe bathroom sink and mirrors', recurrence: 'weekly' },
      { title: 'Do laundry', recurrence: 'twice-weekly' },
      { title: 'Change bed sheets', recurrence: 'weekly' },
      { title: 'Dust all surfaces', recurrence: 'weekly' },
      { title: 'Clean microwave inside', recurrence: 'weekly' },
      { title: 'Wipe down appliances', recurrence: 'weekly' },
      { title: 'Clean oven', recurrence: 'monthly' },
      { title: 'Wipe baseboards', recurrence: 'monthly' },
      { title: 'Clean windows inside', recurrence: 'monthly' },
      { title: 'Organize a drawer or cabinet', recurrence: 'monthly' },
    ]
  }
];

export function getChoresByPreset(presetId) {
  return CHORE_PRESETS.find(p => p.id === presetId) || null;
}

export function buildChoreTasks(preset, userId) {
  const today = new Date();
  const scheduledFor = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0, 0).toISOString();

  // Map biweekly/twice-weekly to the closest supported recurrence value
  const normalizeRecurrence = (r) => {
    if (r === 'daily') return 'daily';
    if (r === 'twice-weekly') return 'weekly';
    if (r === 'biweekly') return 'weekly';
    if (r === 'monthly') return 'monthly';
    return 'weekly';
  };

  return preset.chores.map(chore => ({
    user_id: userId,
    title: chore.title,
    recurrence: normalizeRecurrence(chore.recurrence),
    consequence_level: 'self',
    completed: false,
    archived: false,
    rollover_count: 0,
    priority_score: 0,
    notes: null,
    due_time: null,
    scheduled_for: scheduledFor,
    created_at: today.toISOString(),
  }));
}
