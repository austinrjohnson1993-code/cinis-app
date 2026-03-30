import React, { useState, useEffect, useRef } from 'react';
import s from '../../styles/Sheet.module.css';
import { showToast } from '../../lib/toast';

const CreateSavedMealSheet = ({ open, onClose, onSave, loggedFetch }) => {
  const [mealName, setMealName] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [aiEstimate, setAiEstimate] = useState(null);
  const [useManualOverride, setUseManualOverride] = useState(false);
  const [manualMacros, setManualMacros] = useState({
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  });
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef(null);

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

  // Debounced AI macro estimate
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (ingredients.trim()) {
      setLoading(true);
      debounceTimer.current = setTimeout(() => {
        fetchMacroEstimate(ingredients);
      }, 800);
    } else {
      setAiEstimate(null);
      setLoading(false);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [ingredients]);

  const fetchMacroEstimate = async (text) => {
    try {
      const response = await loggedFetch('/api/nutrition/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: text,
          meal_type: 'custom',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiEstimate(data);
      }
    } catch (error) {
      console.error('Failed to estimate macros:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setMealName('');
    setIngredients('');
    setAiEstimate(null);
    setUseManualOverride(false);
    setManualMacros({
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
    });
  };

  const handleSubmit = async () => {
    if (!mealName.trim()) {
      showToast('Please enter a meal name', 'error');
      return;
    }

    if (!ingredients.trim()) {
      showToast('Please enter ingredients', 'error');
      return;
    }

    let finalMacros = aiEstimate || {};

    if (useManualOverride) {
      const { calories, protein, carbs, fat } = manualMacros;
      if (!calories || !protein || !carbs || !fat) {
        showToast('Please fill in all macro values', 'error');
        return;
      }
      finalMacros = {
        calories: parseFloat(calories),
        protein: parseFloat(protein),
        carbs: parseFloat(carbs),
        fat: parseFloat(fat),
      };
    }

    if (!finalMacros.calories) {
      showToast('Could not estimate macros. Please enter manually.', 'error');
      return;
    }

    const payload = {
      name: mealName.trim(),
      ingredients: ingredients.trim(),
      calories: finalMacros.calories || 0,
      protein: finalMacros.protein || 0,
      carbs: finalMacros.carbs || 0,
      fat: finalMacros.fat || 0,
    };

    try {
      const response = await loggedFetch('/api/nutrition/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save meal');
      }

      showToast('Meal saved', 'success');
      resetForm();
      onSave();
      onClose();
    } catch (error) {
      showToast(error.message || 'Error saving meal', 'error');
    }
  };

  if (!open) return null;

  const finalMacros = useManualOverride
    ? manualMacros
    : aiEstimate || {};

  return (
    <>
      <div className={s.overlay} onClick={handleClose} />
      <div className={s.sheet}>
        <div className={s.handle} />

        <div className={s.header}>
          <h2 className={s.title}>Save Meal</h2>
          <button className={s.cancel} onClick={handleClose}>
            ✕
          </button>
        </div>

        <div style={{ padding: '0 16px 20px' }}>
          {/* Meal name */}
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              className={s.input}
              placeholder="Meal name (e.g. Chicken & Rice Bowls)"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
            />
          </div>

          {/* Ingredients textarea */}
          <div style={{ marginBottom: '16px' }}>
            <div className={s.secLabel}>Ingredients</div>
            <textarea
              className={s.textarea}
              placeholder="List ingredients (e.g. 200g chicken breast, 150g rice, 100g broccoli)"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              rows="3"
              style={{ minHeight: '80px' }}
            />
          </div>

          {/* AI macro estimate preview */}
          {loading && (
            <div
              className={s.fadeSection}
              style={{
                padding: '12px',
                background: 'rgba(240,234,214,0.05)',
                borderRadius: '8px',
                marginBottom: '16px',
                textAlign: 'center',
                color: 'rgba(240,234,214,0.5)',
                fontSize: '12px',
              }}
            >
              Calculating macros...
            </div>
          )}

          {aiEstimate && !useManualOverride && (
            <div
              className={s.fadeSection}
              style={{
                marginBottom: '16px',
                padding: '12px',
                background: 'rgba(240,234,214,0.05)',
                border: `1px solid ${C.border}`,
                borderRadius: '8px',
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '10px', color: 'rgba(240,234,214,0.5)', marginBottom: '4px' }}>
                  AI ESTIMATE
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {[
                    { label: 'Cal', value: aiEstimate.calories },
                    { label: 'Protein', value: aiEstimate.protein },
                    { label: 'Carbs', value: aiEstimate.carbs },
                    { label: 'Fat', value: aiEstimate.fat },
                  ].map((macro) => (
                    <div
                      key={macro.label}
                      style={{
                        padding: '6px 8px',
                        background: 'rgba(240,234,214,0.05)',
                        borderRadius: '6px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '9px', color: 'rgba(240,234,214,0.4)' }}>
                        {macro.label}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: C.ash }}>
                        {macro.value || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {aiEstimate.note && (
                <div style={{ fontSize: '10px', color: 'rgba(240,234,214,0.4)', marginTop: '8px' }}>
                  💡 {aiEstimate.note}
                </div>
              )}
            </div>
          )}

          {/* Manual override toggle */}
          <div className={s.toggleCard} style={{ marginBottom: '16px' }}>
            <div>
              <div className={s.toggleLabel}>Override macros</div>
              <div className={s.toggleSub}>Enter values manually</div>
            </div>
            <button
              onClick={() => setUseManualOverride(!useManualOverride)}
              className={s.toggle}
              style={{
                background: useManualOverride ? C.hot : 'rgba(240,234,214,0.1)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '3px',
                  left: useManualOverride ? '20px' : '3px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                }}
              />
            </button>
          </div>

          {/* Manual macro inputs */}
          {useManualOverride && (
            <div className={s.fadeSection} style={{ marginBottom: '0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <div>
                  <div className={s.secLabel} style={{ marginBottom: '6px' }}>Calories</div>
                  <input
                    type="number"
                    className={s.input}
                    placeholder="0"
                    value={manualMacros.calories}
                    onChange={(e) =>
                      setManualMacros({ ...manualMacros, calories: e.target.value })
                    }
                    style={{ marginBottom: '0' }}
                  />
                </div>
                <div>
                  <div className={s.secLabel} style={{ marginBottom: '6px' }}>Protein (g)</div>
                  <input
                    type="number"
                    className={s.input}
                    placeholder="0"
                    value={manualMacros.protein}
                    onChange={(e) =>
                      setManualMacros({ ...manualMacros, protein: e.target.value })
                    }
                    style={{ marginBottom: '0' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '0' }}>
                <div>
                  <div className={s.secLabel} style={{ marginBottom: '6px' }}>Carbs (g)</div>
                  <input
                    type="number"
                    className={s.input}
                    placeholder="0"
                    value={manualMacros.carbs}
                    onChange={(e) =>
                      setManualMacros({ ...manualMacros, carbs: e.target.value })
                    }
                    style={{ marginBottom: '0' }}
                  />
                </div>
                <div>
                  <div className={s.secLabel} style={{ marginBottom: '6px' }}>Fat (g)</div>
                  <input
                    type="number"
                    className={s.input}
                    placeholder="0"
                    value={manualMacros.fat}
                    onChange={(e) =>
                      setManualMacros({ ...manualMacros, fat: e.target.value })
                    }
                    style={{ marginBottom: '0' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit button */}
        <div style={{ padding: '16px', borderTop: `1px solid ${C.border}` }}>
          <button
            onClick={handleSubmit}
            disabled={!mealName.trim() || !ingredients.trim()}
            className={s.submitBtn}
            style={{
              background:
                mealName.trim() && ingredients.trim()
                  ? C.hot
                  : 'rgba(240,234,214,0.1)',
              color: '#fff',
              opacity:
                mealName.trim() && ingredients.trim() ? 1 : 0.5,
              cursor:
                mealName.trim() && ingredients.trim()
                  ? 'pointer'
                  : 'default',
            }}
          >
            Save meal
          </button>
        </div>
      </div>
    </>
  );
};

export default CreateSavedMealSheet;
