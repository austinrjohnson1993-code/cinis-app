import React, { useState, useEffect } from 'react';
import s from '../../styles/Sheet.module.css';
import { showToast } from '../../lib/toast';

// Client-side local date formatter. On the client, `new Date()` already reads
// the device's local wall clock, so this mirrors the mobile `getLocalDateString`
// without the server-side tz lookup dance.
const localDateStr = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const LogWeightSheet = ({ open, onClose, onSave, loggedFetch }) => {
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState('lbs');
  const [date, setDate] = useState(localDateStr());
  const [note, setNote] = useState('');
  const [lastWeight, setLastWeight] = useState(null);
  const [loading, setLoading] = useState(false);

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

  // Fetch last weight on mount
  useEffect(() => {
    if (open) {
      fetchLastWeight();
    }
  }, [open]);

  const fetchLastWeight = async () => {
    setLoading(true);
    try {
      const response = await loggedFetch('/api/nutrition/weight?limit=1');
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setLastWeight(data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch last weight:', error);
    }
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setWeight('');
    setUnit('lbs');
    setDate(localDateStr());
    setNote('');
  };

  const calculateDelta = () => {
    if (!lastWeight || !weight) return null;
    const current = parseFloat(weight);
    const last = parseFloat(lastWeight.weight);
    const delta = current - last;
    return delta !== 0 ? delta : null;
  };

  const getDeltaColor = () => {
    const delta = calculateDelta();
    if (!delta) return C.ash;
    return delta > 0 ? C.ember : C.green;
  };

  const handleSubmit = async () => {
    if (!weight.trim()) {
      showToast('Please enter your weight', 'error');
      return;
    }

    const weightValue = parseFloat(weight);
    if (isNaN(weightValue) || weightValue <= 0) {
      showToast('Please enter a valid weight', 'error');
      return;
    }

    // Convert to lbs for DB storage if needed
    const weightInLbs = unit === 'kg' ? weightValue * 2.20462 : weightValue;

    const payload = {
      weight: weightInLbs,
      date,
      unit: 'lbs',
      note: note.trim() || null,
    };

    try {
      const response = await loggedFetch('/api/nutrition/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to log weight');
      }

      showToast('Weight logged', 'success');
      resetForm();
      onSave();
      onClose();
    } catch (error) {
      showToast(error.message || 'Error logging weight', 'error');
    }
  };

  if (!open) return null;

  const delta = calculateDelta();
  const deltaColor = getDeltaColor();

  return (
    <>
      <div className={s.overlay} onClick={handleClose} />
      <div className={s.sheet}>
        <div className={s.handle} />

        <div className={s.header}>
          <h2 className={s.title}>Log Weight</h2>
          <button className={s.cancel} onClick={handleClose}>
            ✕
          </button>
        </div>

        <div style={{ padding: '0 16px 20px' }}>
          {/* Hero weight input */}
          <div
            style={{
              marginBottom: '20px',
              padding: '20px 0',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                gap: '12px',
              }}
            >
              <input
                type="number"
                step="0.1"
                placeholder="0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                style={{
                  fontSize: '48px',
                  fontWeight: '700',
                  fontFamily: "'Sora', sans-serif",
                  color: C.ash,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  width: '180px',
                  textAlign: 'right',
                }}
              />
              <div style={{ paddingTop: '8px' }}>
                <div
                  style={{
                    display: 'flex',
                    gap: '6px',
                    marginBottom: '8px',
                  }}
                >
                  {['lbs', 'kg'].map((u) => (
                    <button
                      key={u}
                      onClick={() => setUnit(u)}
                      className={s.pill}
                      style={{
                        padding: '6px 10px',
                        fontSize: '11px',
                        background:
                          unit === u ? C.green : 'rgba(240,234,214,0.05)',
                        color: unit === u ? '#fff' : 'inherit',
                        border:
                          unit === u
                            ? `1.5px solid ${C.green}`
                            : '1px solid rgba(240,234,214,0.08)',
                      }}
                    >
                      {u}
                    </button>
                  ))}
                </div>
                {delta && (
                  <div style={{ fontSize: '12px', color: deltaColor, fontWeight: '600' }}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(1)} {unit}
                  </div>
                )}
              </div>
            </div>

            {/* Last weight info */}
            {lastWeight && !loading && (
              <div
                style={{
                  fontSize: '12px',
                  color: 'rgba(240,234,214,0.5)',
                  marginTop: '12px',
                }}
              >
                Last: {lastWeight.weight} lbs ({new Date(lastWeight.date).toLocaleDateString()})
              </div>
            )}
          </div>

          {/* Date input */}
          <div style={{ marginBottom: '16px' }}>
            <div className={s.secLabel}>Date</div>
            <input
              type="date"
              className={s.dateInput}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Note */}
          <div style={{ marginBottom: '0' }}>
            <textarea
              className={s.textarea}
              placeholder="Note (optional — e.g. Morning weight, after workout)"
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
            disabled={!weight.trim()}
            className={s.submitBtn}
            style={{
              background: weight.trim() ? C.green : 'rgba(240,234,214,0.1)',
              color: '#fff',
              opacity: weight.trim() ? 1 : 0.5,
              cursor: weight.trim() ? 'pointer' : 'default',
            }}
          >
            Log weight
          </button>
        </div>
      </div>
    </>
  );
};

export default LogWeightSheet;
