import React, { useState } from 'react';
import s from '../../styles/Sheet.module.css';
import { showToast } from '../../lib/toast';

const AddSupplementSheet = ({ open, onClose, onSave, loggedFetch }) => {
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [form, setForm] = useState('capsule');
  const [timing, setTiming] = useState([]);
  const [frequency, setFrequency] = useState('daily');
  const [showCustomDays, setShowCustomDays] = useState(false);
  const [customDays, setCustomDays] = useState([]);
  const [note, setNote] = useState('');
  const [preferredTime, setPreferredTime] = useState('');

  const C = {
    coal: '#211A14',
    char: '#3E3228',
    ash: '#F0EAD6',
    hot: '#FF6644',
    ember: '#E8321A',
    green: '#4CAF50',
    blue: '#3B8BD4',
    dim: 'rgba(240,234,214,0.36)',
    ghost: 'rgba(240,234,214,0.22)',
    micro: 'rgba(240,234,214,0.14)',
    border: 'rgba(240,234,214,0.08)',
  };

  const forms = ['Powder', 'Capsule', 'Tablet', 'Liquid', 'Gummy'];
  const timingOptions = ['Morning', 'Pre-workout', 'Post-workout', 'Evening', 'Night', 'With meals'];
  const days = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'];

  const toggleTiming = (option) => {
    setTiming((prev) =>
      prev.includes(option) ? prev.filter((t) => t !== option) : [...prev, option]
    );
  };

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
    setName('');
    setDose('');
    setForm('capsule');
    setTiming([]);
    setFrequency('daily');
    setShowCustomDays(false);
    setCustomDays([]);
    setNote('');
    setPreferredTime('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      showToast('Please enter supplement name', 'error');
      return;
    }

    if (!dose.trim()) {
      showToast('Please enter dose', 'error');
      return;
    }

    const payload = {
      name: name.trim(),
      dose: dose.trim(),
      form,
      timing_groups: timing.length > 0 ? timing : ['Morning'],
      frequency: frequency === 'custom' ? 'custom' : frequency,
      frequency_days: frequency === 'custom' ? customDays : null,
      preferred_time: preferredTime || null,
      note: note.trim() || null,
    };

    try {
      const response = await loggedFetch('/api/nutrition/supplements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to add supplement');
      }

      showToast('Supplement added to stack', 'success');
      resetForm();
      onSave();
      onClose();
    } catch (error) {
      showToast(error.message || 'Error adding supplement', 'error');
    }
  };

  if (!open) return null;

  return (
    <>
      <div className={s.overlay} onClick={handleClose} />
      <div className={s.sheet}>
        <div className={s.handle} />

        <div className={s.header}>
          <h2 className={s.title}>Add Supplement</h2>
          <button className={s.cancel} onClick={handleClose}>
            ✕
          </button>
        </div>

        <div style={{ padding: '0 16px 20px' }}>
          {/* Name */}
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              className={s.input}
              placeholder="Supplement name (e.g. Creatine Monohydrate)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Dose */}
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              className={s.input}
              placeholder="Dose (e.g. 5g, 1 scoop)"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              style={{ marginBottom: '0' }}
            />
          </div>

          {/* Form pills fallback */}
          <div style={{ marginBottom: '20px' }}>
            <div className={s.secLabel}>Form</div>
            <div className={s.pills}>
              {forms.map((f) => (
                <button
                  key={f}
                  onClick={() => setForm(f.toLowerCase())}
                  className={s.pill}
                  style={{
                    background: form === f.toLowerCase() ? C.hot : 'rgba(240,234,214,0.05)',
                    color: form === f.toLowerCase() ? '#fff' : 'inherit',
                    border:
                      form === f.toLowerCase()
                        ? `1.5px solid ${C.hot}`
                        : '1px solid rgba(240,234,214,0.08)',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Timing (multi-select) */}
          <div style={{ marginBottom: '20px' }}>
            <div className={s.secLabel}>Timing (multi-select)</div>
            <div className={s.pills}>
              {timingOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => toggleTiming(option)}
                  className={s.pill}
                  style={{
                    background: timing.includes(option)
                      ? C.blue
                      : 'rgba(240,234,214,0.05)',
                    color: timing.includes(option) ? '#fff' : 'inherit',
                    border: timing.includes(option)
                      ? `1.5px solid ${C.blue}`
                      : '1px solid rgba(240,234,214,0.08)',
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div style={{ marginBottom: '20px' }}>
            <div className={s.secLabel}>Frequency</div>
            <div className={s.pills}>
              {['Daily', 'Training days', 'Weekdays', 'Custom'].map((freq) => {
                const freqKey = freq.toLowerCase().replace(' ', '');
                return (
                  <button
                    key={freq}
                    onClick={() => {
                      setFrequency(freqKey);
                      if (freqKey === 'custom') {
                        setShowCustomDays(true);
                      } else {
                        setShowCustomDays(false);
                      }
                    }}
                    className={s.pill}
                    style={{
                      background:
                        frequency === freqKey ? C.hot : 'rgba(240,234,214,0.05)',
                      color: frequency === freqKey ? '#fff' : 'inherit',
                      border:
                        frequency === freqKey
                          ? `1.5px solid ${C.hot}`
                          : '1px solid rgba(240,234,214,0.08)',
                    }}
                  >
                    {freq}
                  </button>
                );
              })}
            </div>

            {/* Custom day picker */}
            {showCustomDays && (
              <div className={s.fadeSection} style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {days.map((day) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={s.dayBtn}
                      style={{
                        width: '36px',
                        height: '36px',
                        background: customDays.includes(day)
                          ? C.hot
                          : 'rgba(240,234,214,0.05)',
                        color: customDays.includes(day) ? '#fff' : 'inherit',
                        border: customDays.includes(day)
                          ? `1.5px solid ${C.hot}`
                          : '1px solid rgba(240,234,214,0.08)',
                      }}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Preferred time (optional) */}
          <div style={{ marginBottom: '20px' }}>
            <div className={s.secLabel}>Preferred time <span style={{ color: C.dim, fontWeight: 400 }}>(optional)</span></div>
            <input
              type="time"
              className={s.input}
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              style={{ marginBottom: '0', colorScheme: 'dark' }}
            />
          </div>

          {/* Note */}
          <div style={{ marginBottom: '0' }}>
            <textarea
              className={s.textarea}
              placeholder="Note (optional — e.g. Take with food)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows="2"
              style={{ minHeight: '60px' }}
            />
          </div>
        </div>

        {/* Submit button */}
        <div style={{ padding: '16px', borderTop: `1px solid ${C.border}` }}>
          <button
            onClick={handleSubmit}
            className={s.submitBtn}
            style={{
              background: C.hot,
              color: '#fff',
            }}
          >
            Add to stack
          </button>
        </div>
      </div>
    </>
  );
};

export default AddSupplementSheet;
