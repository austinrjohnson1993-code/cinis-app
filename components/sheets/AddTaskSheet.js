import React, { useState, useRef, useEffect } from 'react';
import s from '../../styles/Sheet.module.css';
import { showToast } from '../../lib/toast';

const ACTIVE_COLOR = '#FF6644';
const ACTIVE_BG = 'rgba(255,102,68,0.14)';
const ACTIVE_BORDER = '1px solid rgba(255,102,68,0.30)';
const INACTIVE_BG = 'rgba(240,234,214,0.05)';
const INACTIVE_COLOR = 'rgba(240,234,214,0.40)';
const INACTIVE_BORDER = '1px solid rgba(240,234,214,0.08)';

const MODE_TABS = ['Single', 'Bulk', 'Voice'];
const TASK_TYPES = ['Task', 'Errand', 'Call & Meeting', 'Appointment'];
const REPEAT_OPTIONS = ['Never', 'Daily', 'Weekdays', 'Weekly', 'Custom'];
const REMINDER_OPTIONS = ['At due time', '15 min before', '1 hr before', 'Day before'];
const DAYS_OF_WEEK = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'];

function AddTaskSheet({ open, onClose, defaultDate, onSave, loggedFetch }) {
  // Modes
  const [mode, setMode] = useState('Single');

  // Single mode state
  const [title, setTitle] = useState('');
  const [scheduleDate, setScheduleDate] = useState('Today');
  const [customDate, setCustomDate] = useState('');
  const [taskType, setTaskType] = useState('Task');
  const [repeatOption, setRepeatOption] = useState('Never');
  const [customRepeatDays, setCustomRepeatDays] = useState(new Set());
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [dueTime, setDueTime] = useState('');
  const [duration, setDuration] = useState('');
  const [reminder, setReminder] = useState('At due time');
  const [notes, setNotes] = useState('');

  // Bulk mode state
  const [bulkText, setBulkText] = useState('');
  const [bulkDefaultDate, setBulkDefaultDate] = useState('Today');

  // Voice mode state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onresult = async (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join('');
        await handleVoiceTranscript(transcript);
      };
    }
  }, []);

  const handleVoiceTranscript = async (transcript) => {
    try {
      // First, parse the transcript to get structured data
      const parseResponse = await loggedFetch('/api/parse-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });

      if (!parseResponse.ok) {
        showToast('Failed to parse voice input', 'error');
        return;
      }

      const parsed = await parseResponse.json();

      // Then, create the task using the parsed data
      const createResponse = await loggedFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: parsed.title,
          schedule_date: parsed.due_date || 'Today',
          due_time: parsed.due_time || null,
          task_type: 'Task',
          repeat_option: parsed.recurrence === 'none' ? 'Never' : (parsed.recurrence === 'daily' ? 'Daily' : (parsed.recurrence === 'weekly' ? 'Weekly' : 'Never')),
          notes: parsed.notes || null,
        }),
      });

      if (createResponse.ok) {
        showToast('Task created from voice', 'success');
        onSave();
        onClose();
      } else {
        showToast('Failed to create task', 'error');
      }
    } catch (error) {
      showToast('Error processing voice', 'error');
    }
  };

  const handleMicClick = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const toggleCustomRepeatDay = (day) => {
    const newDays = new Set(customRepeatDays);
    if (newDays.has(day)) {
      newDays.delete(day);
    } else {
      newDays.add(day);
    }
    setCustomRepeatDays(newDays);
  };

  const handleSingleModeSubmit = async () => {
    if (!title.trim()) {
      showToast('Please enter a task title', 'error');
      return;
    }

    // Parse duration to extract just the number (e.g., "30 min" -> 30)
    let estimatedMinutes = null;
    if (duration) {
      const match = duration.match(/(\d+)/);
      if (match) {
        estimatedMinutes = parseInt(match[1], 10);
      }
    }

    const payload = {
      title: title.trim(),
      schedule_date: scheduleDate === 'Pick date' ? customDate : scheduleDate,
      task_type: taskType,
      repeat_option: repeatOption,
      custom_repeat_days: repeatOption === 'Custom' ? Array.from(customRepeatDays) : [],
      due_time: dueTime || null,
      estimated_minutes: estimatedMinutes,
      reminder,
      notes: notes.trim() || null,
    };

    try {
      const response = await loggedFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        showToast('Task added', 'success');
        resetSingleMode();
        onSave();
        onClose();
      } else {
        showToast('Failed to add task', 'error');
      }
    } catch (error) {
      showToast('Error adding task', 'error');
    }
  };

  const handleBulkModeSubmit = async () => {
    if (!bulkText.trim()) {
      showToast('Please enter at least one task', 'error');
      return;
    }

    const lines = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      showToast('Please enter at least one task', 'error');
      return;
    }

    try {
      const response = await loggedFetch('/api/tasks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines,
          default_date: bulkDefaultDate,
        }),
      });

      if (response.ok) {
        showToast('Tasks added', 'success');
        resetBulkMode();
        onSave();
        onClose();
      } else {
        showToast('Failed to add tasks', 'error');
      }
    } catch (error) {
      showToast('Error adding tasks', 'error');
    }
  };

  const resetSingleMode = () => {
    setTitle('');
    setScheduleDate(defaultDate ? 'Pick date' : 'Today');
    setCustomDate(defaultDate || '');
    setTaskType('Task');
    setRepeatOption('Never');
    setCustomRepeatDays(new Set());
    setShowMoreOptions(false);
    setDueTime('');
    setDuration('');
    setReminder('At due time');
    setNotes('');
  };

  const resetBulkMode = () => {
    setBulkText('');
    setBulkDefaultDate('Today');
  };

  if (!open) return null;

  return (
    <>
      <div className={s.overlay} onClick={onClose} />
      <div className={s.sheet}>
        {/* Handle */}
        <div className={s.handle} />

        {/* Header */}
        <div className={s.header}>
          <h2 className={s.title}>Add a Task</h2>
          <button className={s.cancel} onClick={onClose}>
            Cancel
          </button>
        </div>

        {/* Mode tabs */}
        <div className={s.pills} style={{ justifyContent: 'flex-start', marginBottom: '20px' }}>
          {MODE_TABS.map((tab) => (
            <button
              key={tab}
              className={s.pill}
              onClick={() => setMode(tab)}
              style={{
                background: mode === tab ? ACTIVE_BG : INACTIVE_BG,
                color: mode === tab ? ACTIVE_COLOR : INACTIVE_COLOR,
                border: mode === tab ? ACTIVE_BORDER : INACTIVE_BORDER,
                fontWeight: mode === tab ? '600' : '400',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Single Mode */}
        {mode === 'Single' && (
          <div style={{ marginBottom: '20px' }}>
            {/* Title input */}
            <input
              type="text"
              className={s.input}
              placeholder="Task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ marginBottom: '16px' }}
            />

            {/* Schedule for */}
            <label className={s.secLabel}>Schedule for</label>
            <div className={s.pillsScroll} style={{ marginBottom: '16px' }}>
              {['Today', 'Tomorrow', 'This week', 'Pick date'].map((opt) => (
                <button
                  key={opt}
                  className={s.pill}
                  onClick={() => {
                    setScheduleDate(opt);
                    if (opt !== 'Pick date') {
                      setCustomDate('');
                    }
                  }}
                  style={{
                    background:
                      scheduleDate === opt ? ACTIVE_BG : INACTIVE_BG,
                    color: scheduleDate === opt ? ACTIVE_COLOR : INACTIVE_COLOR,
                    border: scheduleDate === opt ? ACTIVE_BORDER : INACTIVE_BORDER,
                    fontWeight: scheduleDate === opt ? '600' : '400',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>

            {/* Custom date picker */}
            {scheduleDate === 'Pick date' && (
              <input
                type="date"
                className={s.dateInput}
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                style={{ marginBottom: '16px' }}
              />
            )}

            {/* Type */}
            <label className={s.secLabel}>Type</label>
            <div className={s.pills} style={{ marginBottom: '16px' }}>
              {TASK_TYPES.map((type) => (
                <button
                  key={type}
                  className={s.pill}
                  onClick={() => setTaskType(type)}
                  style={{
                    background: taskType === type ? ACTIVE_BG : INACTIVE_BG,
                    color: taskType === type ? ACTIVE_COLOR : INACTIVE_COLOR,
                    border: taskType === type ? ACTIVE_BORDER : INACTIVE_BORDER,
                    fontWeight: taskType === type ? '600' : '400',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Repeats */}
            <label className={s.secLabel}>Repeats</label>
            <div className={s.pills} style={{ marginBottom: '16px' }}>
              {REPEAT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  className={s.pill}
                  onClick={() => setRepeatOption(opt)}
                  style={{
                    background: repeatOption === opt ? ACTIVE_BG : INACTIVE_BG,
                    color: repeatOption === opt ? ACTIVE_COLOR : INACTIVE_COLOR,
                    border: repeatOption === opt ? ACTIVE_BORDER : INACTIVE_BORDER,
                    fontWeight: repeatOption === opt ? '600' : '400',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>

            {/* Custom repeat days */}
            {repeatOption === 'Custom' && (
              <div className={s.dayPicker} style={{ marginBottom: '16px' }}>
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day}
                    className={s.dayBtn}
                    onClick={() => toggleCustomRepeatDay(day)}
                    style={{
                      background: customRepeatDays.has(day) ? ACTIVE_BG : INACTIVE_BG,
                      color: customRepeatDays.has(day)
                        ? ACTIVE_COLOR
                        : INACTIVE_COLOR,
                      border: customRepeatDays.has(day)
                        ? ACTIVE_BORDER
                        : INACTIVE_BORDER,
                      fontWeight: customRepeatDays.has(day) ? '600' : '400',
                    }}
                  >
                    {day}
                  </button>
                ))}
              </div>
            )}

            {/* More options */}
            <button
              className={s.moreLink}
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              style={{ marginBottom: '16px' }}
            >
              {showMoreOptions ? '- Less options' : '+ More options'}
            </button>

            {/* More options content */}
            {showMoreOptions && (
              <div className={s.fadeSection} style={{ marginBottom: '16px' }}>
                {/* Due time and duration row */}
                <div className={s.twoCol}>
                  <input
                    type="text"
                    className={s.input}
                    placeholder="e.g. 3:00 PM"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                  />
                  <input
                    type="text"
                    className={s.input}
                    placeholder="e.g. 30 min"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>

                {/* Remind me */}
                <label className={s.secLabel} style={{ marginTop: '16px' }}>
                  Remind me
                </label>
                <div className={s.pills} style={{ marginBottom: '16px' }}>
                  {REMINDER_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      className={s.pill}
                      onClick={() => setReminder(opt)}
                      style={{
                        background: reminder === opt ? ACTIVE_BG : INACTIVE_BG,
                        color: reminder === opt ? ACTIVE_COLOR : INACTIVE_COLOR,
                        border: reminder === opt ? ACTIVE_BORDER : INACTIVE_BORDER,
                        fontWeight: reminder === opt ? '600' : '400',
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {/* Notes */}
                <textarea
                  className={s.textarea}
                  rows="2"
                  placeholder="Notes (optional)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            )}

            {/* Submit button */}
            <button
              className={s.submitBtn}
              onClick={handleSingleModeSubmit}
              style={{ background: ACTIVE_COLOR, marginTop: '20px' }}
            >
              Add task
            </button>
          </div>
        )}

        {/* Bulk Mode */}
        {mode === 'Bulk' && (
          <div style={{ marginBottom: '20px' }}>
            <p className={s.desc} style={{ marginBottom: '12px' }}>
              One task per line. Cinis parses dates if you include them.
            </p>

            {/* Bulk textarea */}
            <textarea
              className={s.textarea}
              rows="6"
              placeholder="Buy groceries&#10;Call Mom tomorrow&#10;Project proposal next Tuesday&#10;Team meeting at 2pm Friday"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              style={{ marginBottom: '16px' }}
            />

            {/* Default date */}
            <label className={s.secLabel}>Default date</label>
            <div className={s.pills} style={{ marginBottom: '20px' }}>
              {['Today', 'Tomorrow', 'This week'].map((opt) => (
                <button
                  key={opt}
                  className={s.pill}
                  onClick={() => setBulkDefaultDate(opt)}
                  style={{
                    background: bulkDefaultDate === opt ? ACTIVE_BG : INACTIVE_BG,
                    color: bulkDefaultDate === opt ? ACTIVE_COLOR : INACTIVE_COLOR,
                    border: bulkDefaultDate === opt ? ACTIVE_BORDER : INACTIVE_BORDER,
                    fontWeight: bulkDefaultDate === opt ? '600' : '400',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>

            {/* Submit button */}
            <button
              className={s.submitBtn}
              onClick={handleBulkModeSubmit}
              style={{ background: ACTIVE_COLOR }}
            >
              Add all tasks
            </button>
          </div>
        )}

        {/* Voice Mode */}
        {mode === 'Voice' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px',
            }}
          >
            {/* Mic button */}
            <button
              className={s.micBtn}
              onClick={handleMicClick}
              style={{
                background: ACTIVE_COLOR,
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                boxShadow: isListening ? `0 0 20px ${ACTIVE_COLOR}80` : 'none',
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <path d="M12 1a3 3 0 0 0-3 3v12a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>

            {/* Label */}
            <label className={s.voiceLabel} style={{ marginBottom: '12px' }}>
              {isListening ? 'Listening...' : 'Tap to speak'}
            </label>

            {/* Example phrase */}
            <p className={s.voiceExample} style={{ marginBottom: '8px' }}>
              e.g. "Buy groceries tomorrow"
            </p>

            {/* Footnote */}
            <p className={s.voiceFootnote}>
              Say your task naturally. Cinis will parse the details.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export default AddTaskSheet;
