import React, { useState, useEffect, useRef } from 'react';
import s from '../../styles/Sheet.module.css';
import { showToast } from '../../lib/toast';

const LogMealSheet = ({ open, onClose, onSave, defaultMealType = 'lunch', loggedFetch }) => {
  // States for state machine
  const [state, setState] = useState('input'); // input, listening, parsing, confirm, logged

  // Input state
  const [mealType, setMealType] = useState(defaultMealType);
  const [description, setDescription] = useState('');
  const [time, setTime] = useState(new Date().toISOString().slice(11, 16));
  const [savedMeals, setSavedMeals] = useState([]);

  // Listening state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  // Parsing state
  const [parsingProgress, setParsingProgress] = useState(0);

  // Confirm state
  const [parsed, setParsed] = useState(null);
  const [saveAsMeal, setSaveAsMeal] = useState(false);
  const [editingMacro, setEditingMacro] = useState(null);
  const [editValues, setEditValues] = useState({});

  // Logged state
  const [loggedMealType, setLoggedMealType] = useState('');

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

  const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-workout', 'Post-workout'];

  // Load saved meals
  useEffect(() => {
    if (open && state === 'input') {
      loadSavedMeals();
    }
  }, [open, state]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => {
          setIsListening(true);
          setTranscript('');
        };

        recognitionRef.current.onresult = (event) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptSegment = event.results[i][0].transcript;
            interim += transcriptSegment + ' ';
          }
          setTranscript(interim.trim());
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current.onerror = (event) => {
          showToast(`Speech error: ${event.error}`, 'error');
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const loadSavedMeals = async () => {
    try {
      const response = await loggedFetch('/api/nutrition/meals');
      if (response.ok) {
        const data = await response.json();
        setSavedMeals(data || []);
      }
    } catch (error) {
      console.error('Failed to load saved meals:', error);
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const parseDescription = async (text) => {
    setState('parsing');
    setParsingProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setParsingProgress((prev) => Math.min(prev + 15, 80));
      }, 200);

      const response = await loggedFetch('/api/nutrition/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: text,
          meal_type: mealType,
        }),
      });

      clearInterval(progressInterval);
      setParsingProgress(100);

      if (!response.ok) {
        throw new Error('Failed to parse meal');
      }

      const data = await response.json();
      setParsed(data);
      setEditValues({
        calories: data.calories || 0,
        protein: data.protein || 0,
        carbs: data.carbs || 0,
        fat: data.fat || 0,
      });
      setState('confirm');
    } catch (error) {
      showToast(error.message || 'Error parsing meal', 'error');
      setState('input');
    }
  };

  const handleLogMeal = async () => {
    try {
      const payload = {
        meal_type: mealType,
        description: description || transcript,
        time,
        calories: editValues.calories || parsed.calories,
        protein: editValues.protein || parsed.protein,
        carbs: editValues.carbs || parsed.carbs,
        fat: editValues.fat || parsed.fat,
        ingredients: parsed.ingredients || [],
      };

      let response = await loggedFetch('/api/nutrition/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to log meal');
      }

      // Save as meal if toggle is on
      if (saveAsMeal) {
        await loggedFetch('/api/nutrition/meals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: payload.description,
            calories: payload.calories,
            protein: payload.protein,
            carbs: payload.carbs,
            fat: payload.fat,
            ingredients: payload.ingredients,
          }),
        });
      }

      showToast(`${mealType} logged`, 'success');
      setLoggedMealType(mealType);
      setState('logged');
    } catch (error) {
      showToast(error.message || 'Error logging meal', 'error');
    }
  };

  const handleClose = () => {
    setState('input');
    setDescription('');
    setTranscript('');
    setParsed(null);
    setEditingMacro(null);
    onClose();
  };

  const handleLogAnother = () => {
    setState('input');
    setDescription('');
    setTranscript('');
    setParsed(null);
    setEditingMacro(null);
  };

  if (!open) return null;

  return (
    <>
      <div className={s.overlay} onClick={handleClose} />
      <div className={s.sheet}>
        <div className={s.handle} />

        <div className={s.header}>
          <h2 className={s.title}>
            {state === 'logged' ? 'Meal Logged' : 'Log Meal'}
          </h2>
          <button className={s.cancel} onClick={handleClose}>
            ✕
          </button>
        </div>

        <div style={{ padding: '0 16px 20px' }}>
          {/* STATE 1: INPUT */}
          {state === 'input' && (
            <div className={s.fadeSection}>
              {/* Meal type pills */}
              <div style={{ marginBottom: '20px' }}>
                <div className={s.secLabel}>Meal type</div>
                <div className={s.pills}>
                  {mealTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => setMealType(type.toLowerCase())}
                      className={s.pill}
                      style={{
                        background:
                          mealType === type.toLowerCase()
                            ? C.hot
                            : 'rgba(240,234,214,0.05)',
                        color:
                          mealType === type.toLowerCase()
                            ? '#fff'
                            : 'inherit',
                        border:
                          mealType === type.toLowerCase()
                            ? `1.5px solid ${C.hot}`
                            : '1px solid rgba(240,234,214,0.08)',
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description textarea */}
              <div style={{ marginBottom: '16px' }}>
                <textarea
                  className={s.textarea}
                  placeholder="Describe what you ate... (e.g. chicken breast with rice and broccoli)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ minHeight: '100px' }}
                />
              </div>

              {/* Voice button */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button
                  onClick={startListening}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: C.hot,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '9px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  🎤 Speak instead
                </button>
                <button
                  onClick={() => parseDescription(description || transcript)}
                  disabled={!description.trim() && !transcript.trim()}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background:
                      description.trim() || transcript.trim()
                        ? C.green
                        : 'rgba(240,234,214,0.1)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '9px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor:
                      description.trim() || transcript.trim()
                        ? 'pointer'
                        : 'default',
                    opacity:
                      description.trim() || transcript.trim() ? 1 : 0.5,
                  }}
                >
                  Parse →
                </button>
              </div>

              {/* Saved meals section */}
              {savedMeals.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div className={s.secLabel} style={{ marginBottom: '10px' }}>
                    Quick log
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {savedMeals.slice(0, 3).map((meal, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setDescription(meal.name);
                          parseDescription(meal.name);
                        }}
                        style={{
                          padding: '10px 12px',
                          background: 'rgba(240,234,214,0.05)',
                          border: '1px solid rgba(240,234,214,0.08)',
                          borderRadius: '8px',
                          color: 'rgba(240,234,214,0.8)',
                          fontSize: '12px',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        {meal.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Time row */}
              <div style={{ marginBottom: '0' }}>
                <div className={s.secLabel}>Time</div>
                <input
                  type="time"
                  className={s.dateInput}
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* STATE 2: LISTENING */}
          {state === 'listening' && (
            <div className={s.fadeSection} style={{ textAlign: 'center', padding: '24px 0' }}>
              <button
                onClick={stopListening}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: C.hot,
                  border: 'none',
                  cursor: 'pointer',
                  margin: '0 auto 20px',
                  animation: 'pulse 1.5s ease-in-out infinite',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                }}
              >
                🎤
              </button>
              <h3 style={{ color: C.ash, marginBottom: '14px', fontSize: '16px' }}>
                Listening...
              </h3>
              <div
                className={s.infoCard}
                style={{
                  background: 'rgba(240,234,214,0.05)',
                  color: C.ash,
                  marginBottom: '16px',
                  minHeight: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {transcript || 'Start speaking...'}
              </div>
              <button
                onClick={() => {
                  stopListening();
                  if (transcript.trim()) {
                    setDescription(transcript);
                    parseDescription(transcript);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: C.green,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '9px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Done — parse it
              </button>
            </div>
          )}

          {/* STATE 3: PARSING */}
          {state === 'parsing' && (
            <div className={s.fadeSection} style={{ textAlign: 'center', padding: '24px 0' }}>
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  border: '3px solid rgba(240,234,214,0.1)',
                  borderTop: `3px solid ${C.hot}`,
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 20px',
                }}
              />
              <h3 style={{ color: C.ash, marginBottom: '20px', fontSize: '16px' }}>
                Calculating macros...
              </h3>
              <div style={{ marginBottom: '20px' }}>
                {[
                  { label: 'Analyzing ingredients', progress: parsingProgress > 20 },
                  { label: 'Computing nutrition', progress: parsingProgress > 50 },
                  { label: 'Finalizing data', progress: parsingProgress > 80 },
                ].map((step, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '10px',
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: step.progress ? C.green : 'rgba(240,234,214,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    >
                      {step.progress ? '✓' : ''}
                    </div>
                    <span style={{ color: 'rgba(240,234,214,0.6)', fontSize: '12px' }}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setState('input')}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(240,234,214,0.05)',
                  color: 'rgba(240,234,214,0.6)',
                  border: '1px solid rgba(240,234,214,0.1)',
                  borderRadius: '9px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Skip
              </button>
            </div>
          )}

          {/* STATE 4: CONFIRM */}
          {state === 'confirm' && parsed && (
            <div className={s.fadeSection}>
              <h3 style={{ color: C.ash, marginBottom: '16px', fontSize: '14px', fontWeight: '600' }}>
                Does this look right?
              </h3>

              {/* Parsed input card */}
              <div
                className={s.infoCard}
                style={{
                  background: 'rgba(240,234,214,0.05)',
                  borderLeft: `4px solid ${C.hot}`,
                  marginBottom: '16px',
                }}
              >
                {description || transcript}
              </div>

              {/* 2x2 macro grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                {[
                  { label: 'Cal', value: 'calories', unit: '' },
                  { label: 'Protein', value: 'protein', unit: 'g' },
                  { label: 'Carbs', value: 'carbs', unit: 'g' },
                  { label: 'Fat', value: 'fat', unit: 'g' },
                ].map((macro) => (
                  <button
                    key={macro.value}
                    onClick={() => setEditingMacro(macro.value)}
                    style={{
                      padding: '12px',
                      background: 'rgba(240,234,214,0.05)',
                      border: '1px solid rgba(240,234,214,0.1)',
                      borderRadius: '9px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: '10px', color: 'rgba(240,234,214,0.5)', marginBottom: '4px' }}>
                      {macro.label}
                    </div>
                    <div style={{ fontSize: '18px', color: C.ash, fontWeight: '600' }}>
                      {editValues[macro.value] || parsed[macro.value] || 0}{macro.unit}
                    </div>
                  </button>
                ))}
              </div>

              {/* Inline macro edit */}
              {editingMacro && (
                <div className={s.fadeSection} style={{ marginBottom: '16px', padding: '12px', background: 'rgba(240,234,214,0.05)', borderRadius: '8px' }}>
                  <input
                    type="number"
                    value={editValues[editingMacro] || 0}
                    onChange={(e) =>
                      setEditValues({ ...editValues, [editingMacro]: parseFloat(e.target.value) || 0 })
                    }
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'rgba(240,234,214,0.08)',
                      border: '1px solid rgba(240,234,214,0.15)',
                      borderRadius: '6px',
                      color: C.ash,
                      marginBottom: '8px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    onClick={() => setEditingMacro(null)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: C.green,
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Done
                  </button>
                </div>
              )}

              {/* Per-ingredient breakdown */}
              {parsed.ingredients && parsed.ingredients.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div className={s.secLabel} style={{ marginBottom: '8px' }}>
                    Ingredients
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {parsed.ingredients.map((ing, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '8px 10px',
                          background: 'rgba(240,234,214,0.04)',
                          border: '1px solid rgba(240,234,214,0.06)',
                          borderRadius: '6px',
                          fontSize: '11px',
                          color: 'rgba(240,234,214,0.7)',
                        }}
                      >
                        {ing.name} • {ing.calories} cal
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence + note */}
              {parsed.note && (
                <div
                  className={s.infoCard}
                  style={{
                    background: 'rgba(240,234,214,0.04)',
                    fontSize: '11px',
                    marginBottom: '16px',
                  }}
                >
                  💡 {parsed.note}
                </div>
              )}

              {/* Save as meal toggle */}
              <div className={s.toggleCard} style={{ marginBottom: '16px' }}>
                <div>
                  <div className={s.toggleLabel}>Save as meal</div>
                  <div className={s.toggleSub}>Reuse this meal next time</div>
                </div>
                <button
                  onClick={() => setSaveAsMeal(!saveAsMeal)}
                  className={s.toggle}
                  style={{
                    background: saveAsMeal ? C.hot : 'rgba(240,234,214,0.1)',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: saveAsMeal ? '20px' : '3px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.2s',
                    }}
                  />
                </button>
              </div>

              {/* Log button */}
              <button
                onClick={handleLogMeal}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: C.green,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '9px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Log {mealType} ✓
              </button>
            </div>
          )}

          {/* STATE 5: LOGGED */}
          {state === 'logged' && (
            <div className={s.fadeSection} style={{ textAlign: 'center', padding: '24px 0' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: C.green,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  margin: '0 auto 20px',
                }}
              >
                ✓
              </div>
              <h3 style={{ color: C.ash, marginBottom: '8px', fontSize: '18px', fontWeight: '600' }}>
                {loggedMealType} logged.
              </h3>
              <div
                style={{
                  color: 'rgba(240,234,214,0.6)',
                  fontSize: '12px',
                  marginBottom: '24px',
                }}
              >
                {parsed && `${editValues.calories || parsed.calories} cal • ${editValues.protein || parsed.protein}g protein`}
              </div>
              <button
                onClick={handleLogAnother}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: C.hot,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '9px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                + Log another meal
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255, 102, 68, 0.4); }
          50% { box-shadow: 0 0 0 10px rgba(255, 102, 68, 0); }
        }
      `}</style>
    </>
  );
};

export default LogMealSheet;
