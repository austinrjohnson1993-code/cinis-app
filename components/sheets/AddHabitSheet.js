import React, { useState } from 'react';
import s from '../../styles/Sheet.module.css';
import { showToast } from '../../lib/toast';

const AddHabitSheet = ({ open, onClose, onSave, loggedFetch }) => {
  const [habitType, setHabitType] = useState('build'); // 'build' or 'break'
  const [habitName, setHabitName] = useState('');
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [customDays, setCustomDays] = useState([]);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [reminder, setReminder] = useState('morning');
  const [customTime, setCustomTime] = useState('');
  const [showTimeInput, setShowTimeInput] = useState(false);
  const [habitStack, setHabitStack] = useState('');
  const [effortLevel, setEffortLevel] = useState('medium');
  const [trackRelapses, setTrackRelapses] = useState(true);

  const days = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'];
  const isBreak = habitType === 'break';
  const activeColor = isBreak ? '#E8321A' : '#4CAF50';
  const activeColorRgba = isBreak ? 'rgba(232,50,26,' : 'rgba(76,175,80,';

  const toggleDay = (day) => {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setHabitType('build');
    setHabitName('');
    setTarget('');
    setNote('');
    setFrequency('daily');
    setCustomDays([]);
    setShowDayPicker(false);
    setReminder('morning');
    setCustomTime('');
    setShowTimeInput(false);
    setHabitStack('');
    setEffortLevel('medium');
    setTrackRelapses(true);
  };

  const handleSubmit = async () => {
    if (!habitName.trim()) {
      showToast('Please enter a habit name', 'error');
      return;
    }

    const payload = {
      name: habitName.trim(),
      type: habitType,
      target: target.trim() || null,
      note: note.trim() || null,
      frequency: frequency === 'custom' ? customDays : frequency,
      reminder:
        reminder === 'custom'
          ? { type: 'custom', time: customTime }
          : reminder,
      habitStack: habitStack.trim() || null,
      effortLevel,
      trackRelapses: isBreak ? trackRelapses : false,
    };

    try {
      const response = await loggedFetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to add habit');
      }

      showToast('Habit added successfully', 'success');
      resetForm();
      onSave();
      onClose();
    } catch (error) {
      showToast(error.message || 'Error adding habit', 'error');
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className={s.overlay}
        onClick={handleClose}
      />
      <div className={s.sheet}>
        <div className={s.handle} />

        <div className={s.header}>
          <h2 className={s.title}>Add Habit</h2>
          <button
            className={s.cancel}
            onClick={handleClose}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '16px', overflowY: 'auto', maxHeight: 'calc(100vh - 120px)' }}>
          {/* Habit Name */}
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              className={s.input}
              placeholder="Habit name (e.g. Read 20 minutes, Take vitamins)"
              value={habitName}
              onChange={(e) => setHabitName(e.target.value)}
            />
          </div>

          {/* Build vs Break Picker */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {[
              {
                id: 'build',
                emoji: '🌱',
                label: 'Do this regularly',
                color: '#4CAF50',
                colorRgba: 'rgba(76,175,80,',
              },
              {
                id: 'break',
                emoji: '🚫',
                label: 'Stop doing this',
                color: '#E8321A',
                colorRgba: 'rgba(232,50,26,',
              },
            ].map((card) => {
              const isActive = habitType === card.id;
              return (
                <button
                  key={card.id}
                  onClick={() => setHabitType(card.id)}
                  className={s.toggleCard}
                  style={{
                    flex: 1,
                    background: isActive
                      ? `${card.colorRgba}0.12)`
                      : 'rgba(240,234,214,0.05)',
                    border: isActive
                      ? `1.5px solid ${card.colorRgba}0.35)`
                      : '1px solid rgba(240,234,214,0.08)',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div
                    style={{
                      fontSize: '24px',
                      marginBottom: '8px',
                    }}
                  >
                    {card.emoji}
                  </div>
                  <div
                    style={{
                      fontWeight: '600',
                      fontSize: '14px',
                      color: isActive ? card.color : 'inherit',
                      marginBottom: '4px',
                    }}
                  >
                    {card.id === 'build' ? 'Build' : 'Break'}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: isActive
                        ? `${card.colorRgba}0.55)`
                        : 'rgba(240,234,214,0.4)',
                    }}
                  >
                    {card.label}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Target/Metric */}
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              className={s.input}
              placeholder="Target or metric (optional — e.g. 20 pages, 30 min, 8 glasses)"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <div className={s.subNote} style={{ marginTop: '6px', fontSize: '12px', color: 'rgba(240,234,214,0.6)' }}>
              Makes completion measurable and trackable over time.
            </div>
          </div>

          {/* Note */}
          <div style={{ marginBottom: '20px' }}>
            <textarea
              className={s.textarea}
              placeholder="Note (optional — e.g. Before bed, Creatine + fish oil)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows="2"
            />
          </div>

          {/* Frequency */}
          <div style={{ marginBottom: '20px' }}>
            <div className={s.secLabel}>Frequency</div>
            <div className={s.pills} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {['Daily', 'Weekdays', 'Weekly', 'Custom'].map((freq) => {
                const freqKey = freq.toLowerCase();
                const isActive = frequency === freqKey;
                return (
                  <button
                    key={freq}
                    onClick={() => {
                      setFrequency(freqKey);
                      if (freqKey === 'custom') {
                        setShowDayPicker(true);
                      } else {
                        setShowDayPicker(false);
                      }
                    }}
                    className={s.pill}
                    style={{
                      background: isActive ? activeColor : 'rgba(240,234,214,0.1)',
                      color: isActive ? '#fff' : 'inherit',
                      border: isActive ? `1.5px solid ${activeColor}` : '1px solid rgba(240,234,214,0.2)',
                      borderRadius: '20px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                    }}
                  >
                    {freq}
                  </button>
                );
              })}
            </div>

            {/* Day Picker */}
            {showDayPicker && (
              <div className={s.dayPicker} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid rgba(240,234,214,0.15)' }}>
                {days.map((day) => {
                  const isSelected = customDays.includes(day);
                  return (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={s.dayBtn}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: isSelected ? activeColor : 'rgba(240,234,214,0.1)',
                        color: isSelected ? '#fff' : 'inherit',
                        border: isSelected ? `1.5px solid ${activeColor}` : '1px solid rgba(240,234,214,0.2)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reminder */}
          <div style={{ marginBottom: '20px' }}>
            <div className={s.secLabel}>Remind me</div>
            <div className={s.pills} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {['No reminder', 'Morning', 'Afternoon', 'Evening', 'Custom time'].map((rem) => {
                const remKey = rem.toLowerCase().replace(' ', '');
                const isActive = reminder === remKey;
                return (
                  <button
                    key={rem}
                    onClick={() => {
                      setReminder(remKey);
                      if (remKey === 'customtime') {
                        setShowTimeInput(true);
                      } else {
                        setShowTimeInput(false);
                      }
                    }}
                    className={s.pill}
                    style={{
                      background: isActive ? activeColor : 'rgba(240,234,214,0.1)',
                      color: isActive ? '#fff' : 'inherit',
                      border: isActive ? `1.5px solid ${activeColor}` : '1px solid rgba(240,234,214,0.2)',
                      borderRadius: '20px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                    }}
                  >
                    {rem}
                  </button>
                );
              })}
            </div>

            {/* Time Input */}
            {showTimeInput && (
              <input
                type="text"
                className={s.input}
                placeholder="e.g. 7:30 PM"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                style={{ marginTop: '12px' }}
              />
            )}
          </div>

          {/* Habit Stack */}
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              className={s.input}
              placeholder="After I ___, I will do this (e.g. After I make coffee)"
              value={habitStack}
              onChange={(e) => setHabitStack(e.target.value)}
            />
            <div className={s.subNote} style={{ marginTop: '6px', fontSize: '12px', color: 'rgba(240,234,214,0.6)' }}>
              Anchoring to an existing habit improves follow-through.
            </div>
          </div>

          {/* Effort Level */}
          <div style={{ marginBottom: '20px' }}>
            <div className={s.secLabel}>Effort level</div>
            <div className={s.pills} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['Easy', 'Medium', 'Hard'].map((effort) => {
                const effortKey = effort.toLowerCase();
                const isActive = effortLevel === effortKey;
                return (
                  <button
                    key={effort}
                    onClick={() => setEffortLevel(effortKey)}
                    className={s.pill}
                    style={{
                      background: isActive ? activeColor : 'rgba(240,234,214,0.1)',
                      color: isActive ? '#fff' : 'inherit',
                      border: isActive ? `1.5px solid ${activeColor}` : '1px solid rgba(240,234,214,0.2)',
                      borderRadius: '20px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                    }}
                  >
                    {effort}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Track Relapses (Break only) */}
          {isBreak && (
            <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(240,234,214,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className={s.toggleLabel}>Track relapses</div>
                  <div className={s.toggleSub}>Log slips without resetting your streak to zero</div>
                </div>
                <button
                  onClick={() => setTrackRelapses(!trackRelapses)}
                  className={s.toggle}
                  style={{
                    position: 'relative',
                    width: '48px',
                    height: '28px',
                    borderRadius: '14px',
                    background: trackRelapses ? activeColor : 'rgba(240,234,214,0.15)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                >
                  <div
                    className={trackRelapses ? s.toggleThumbOn : s.toggleThumb}
                    style={{
                      position: 'absolute',
                      width: '24px',
                      height: '24px',
                      borderRadius: '12px',
                      background: '#fff',
                      top: '2px',
                      left: trackRelapses ? '22px' : '2px',
                      transition: 'left 0.3s',
                    }}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(240,234,214,0.1)' }}>
          <button
            onClick={handleSubmit}
            className={s.submitBtn}
            style={{
              width: '100%',
              padding: '14px',
              background: activeColor,
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            Add habit
          </button>
        </div>
      </div>
    </>
  );
};

export default AddHabitSheet;
