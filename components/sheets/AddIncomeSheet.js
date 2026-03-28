import React, { useState } from 'react';
import s from '../../styles/Sheet.module.css';
import { showToast } from '../../lib/toast';

export default function AddIncomeSheet({ open, onClose, onSave, loggedFetch }) {
  const [name, setName] = useState('');
  const [incomeType, setIncomeType] = useState('Salary');
  const [annualSalary, setAnnualSalary] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('40');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [payFrequency, setPayFrequency] = useState('Biweekly');
  const [nextPayDate, setNextPayDate] = useState('');
  const [isNet, setIsNet] = useState(true);
  const [loading, setLoading] = useState(false);

  const getMonthlyEstimate = () => {
    if (incomeType === 'Salary' && annualSalary) {
      return Math.round(parseFloat(annualSalary) / 12);
    }
    if (incomeType === 'Hourly' && hourlyRate && hoursPerWeek) {
      return Math.round(parseFloat(hourlyRate) * parseFloat(hoursPerWeek) * 52 / 12);
    }
    if ((incomeType === 'Self-employed' || incomeType === 'Other') && monthlyAmount) {
      return Math.round(parseFloat(monthlyAmount));
    }
    return 0;
  };

  const monthlyEst = getMonthlyEstimate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter a name', 'error');
      return;
    }

    const payload = {
      name: name.trim(),
      income_type: incomeType,
      pay_frequency: payFrequency,
      next_pay_date: nextPayDate || null,
      is_net: isNet,
    };

    if (incomeType === 'Salary') {
      if (!annualSalary) {
        showToast('Please enter annual salary', 'error');
        return;
      }
      payload.annual_salary = parseFloat(annualSalary);
      payload.monthly_amount = Math.round(parseFloat(annualSalary) / 12);
    } else if (incomeType === 'Hourly') {
      if (!hourlyRate || !hoursPerWeek) {
        showToast('Please enter hourly rate and hours per week', 'error');
        return;
      }
      payload.hourly_rate = parseFloat(hourlyRate);
      payload.hours_per_week = parseFloat(hoursPerWeek);
      payload.monthly_amount = Math.round(parseFloat(hourlyRate) * parseFloat(hoursPerWeek) * 52 / 12);
    } else if (incomeType === 'Self-employed' || incomeType === 'Other') {
      if (!monthlyAmount) {
        showToast('Please enter monthly amount', 'error');
        return;
      }
      payload.monthly_amount = parseFloat(monthlyAmount);
    }

    setLoading(true);
    try {
      const res = await loggedFetch('/api/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to add income source');
      }

      showToast('Income source added', 'success');
      onSave();
      handleClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setIncomeType('Salary');
    setAnnualSalary('');
    setHourlyRate('');
    setHoursPerWeek('40');
    setMonthlyAmount('');
    setPayFrequency('Biweekly');
    setNextPayDate('');
    setIsNet(true);
    onClose();
  };

  if (!open) return null;

  return (
    <div className={s.overlay} onClick={handleClose}>
      <div className={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={s.handle} />

        <div className={s.header}>
          <h2 className={s.title}>Add income source</h2>
          <button className={s.cancel} onClick={handleClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name Input */}
          <div style={{ padding: '0 16px 20px' }}>
            <input
              type="text"
              className={s.input}
              placeholder="Name (e.g. Day job, Freelance, Rental income)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Income Type Pills */}
          <div style={{ padding: '0 16px 20px' }}>
            <div className={s.secLabel}>TYPE</div>
            <div className={s.pills}>
              {['Salary', 'Hourly', 'Self-employed', 'Other'].map((type) => (
                <button
                  key={type}
                  type="button"
                  className={s.pill}
                  style={{
                    backgroundColor: incomeType === type ? 'rgba(76,175,80,0.14)' : 'transparent',
                    borderColor: incomeType === type ? 'rgba(76,175,80,0.30)' : '#ccc',
                    color: incomeType === type ? '#4CAF50' : '#666',
                  }}
                  onClick={() => setIncomeType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Salary Section */}
          {incomeType === 'Salary' && (
            <div className={s.fadeSection}>
              <div style={{ padding: '0 16px 20px' }}>
                <div className={s.secLabel}>ANNUAL SALARY</div>
                <input
                  type="number"
                  className={s.input}
                  placeholder="$0"
                  value={annualSalary}
                  onChange={(e) => setAnnualSalary(e.target.value)}
                />
              </div>
              {monthlyEst > 0 && (
                <div style={{ padding: '0 16px 20px' }}>
                  <div className={s.calcCard} style={{
                    backgroundColor: 'rgba(76,175,80,0.1)',
                    borderLeft: '4px solid #4CAF50',
                  }}>
                    <div>Monthly take-home est.: <strong>${monthlyEst.toLocaleString()}/mo</strong></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hourly Section */}
          {incomeType === 'Hourly' && (
            <div className={s.fadeSection}>
              <div style={{ padding: '0 16px 20px' }}>
                <div className={s.twoCol}>
                  <div>
                    <div className={s.secLabel}>HOURLY RATE</div>
                    <input
                      type="number"
                      step="0.01"
                      className={s.input}
                      placeholder="$0.00/hr"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className={s.secLabel}>HOURS/WEEK</div>
                    <input
                      type="number"
                      className={s.input}
                      placeholder="40"
                      value={hoursPerWeek}
                      onChange={(e) => setHoursPerWeek(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              {monthlyEst > 0 && (
                <div style={{ padding: '0 16px 20px' }}>
                  <div className={s.calcCard} style={{
                    backgroundColor: 'rgba(76,175,80,0.1)',
                    borderLeft: '4px solid #4CAF50',
                  }}>
                    <div>Monthly est.: <strong>${monthlyEst.toLocaleString()}/mo</strong></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Self-employed Section */}
          {incomeType === 'Self-employed' && (
            <div className={s.fadeSection}>
              <div style={{ padding: '0 16px 20px' }}>
                <div className={s.secLabel}>AVERAGE MONTHLY INCOME</div>
                <input
                  type="number"
                  className={s.input}
                  placeholder="$0"
                  value={monthlyAmount}
                  onChange={(e) => setMonthlyAmount(e.target.value)}
                />
              </div>
              <div style={{ padding: '0 16px 20px' }}>
                <div className={s.infoCard} style={{
                  backgroundColor: 'rgba(255,193,7,0.1)',
                  borderLeft: '4px solid #FFC107',
                }}>
                  <div>Variable income is averaged. Update this anytime when your income changes.</div>
                </div>
              </div>
            </div>
          )}

          {/* Other Section */}
          {incomeType === 'Other' && (
            <div className={s.fadeSection}>
              <div style={{ padding: '0 16px 20px' }}>
                <div className={s.secLabel}>MONTHLY AMOUNT</div>
                <input
                  type="number"
                  className={s.input}
                  placeholder="$0"
                  value={monthlyAmount}
                  onChange={(e) => setMonthlyAmount(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Pay Frequency & Next Pay Date (Salary/Hourly only) */}
          {(incomeType === 'Salary' || incomeType === 'Hourly') && (
            <>
              <div style={{ padding: '0 16px 20px' }}>
                <div className={s.secLabel}>PAY FREQUENCY</div>
                <div className={s.pills}>
                  {['Weekly', 'Biweekly', 'Semi-monthly', 'Monthly'].map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      className={s.pill}
                      style={{
                        backgroundColor: payFrequency === freq ? 'rgba(76,175,80,0.14)' : 'transparent',
                        borderColor: payFrequency === freq ? 'rgba(76,175,80,0.30)' : '#ccc',
                        color: payFrequency === freq ? '#4CAF50' : '#666',
                      }}
                      onClick={() => setPayFrequency(freq)}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ padding: '0 16px 20px' }}>
                <div className={s.secLabel}>NEXT PAY DATE</div>
                <input
                  type="date"
                  className={s.dateInput}
                  value={nextPayDate}
                  onChange={(e) => setNextPayDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                />
                <div className={s.subNote}>Used for cash flow timing — when money actually hits your account.</div>
              </div>
            </>
          )}

          {/* Net/Gross Toggle */}
          <div style={{ padding: '0 16px 20px' }}>
            <div className={s.toggleCard}>
              <div>
                <div className={s.toggleLabel}>Amount is after taxes (net)</div>
                <div className={s.toggleSub}>Toggle off if entering gross / pre-tax</div>
              </div>
              <button
                type="button"
                className={s.toggle}
                style={{
                  backgroundColor: isNet ? '#4CAF50' : '#ccc',
                }}
                onClick={() => setIsNet(!isNet)}
              >
                <div
                  className={s.toggleThumb}
                  style={{
                    transform: isNet ? 'translateX(20px)' : 'translateX(0)',
                  }}
                />
              </button>
            </div>
            {!isNet && (
              <div className={s.infoCard} style={{
                backgroundColor: 'rgba(76,175,80,0.08)',
                borderLeft: '4px solid #4CAF50',
                marginTop: '12px',
              }}>
                <div>Gross amount entered. Cinis will estimate net based on typical rates — you can adjust.</div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div style={{ padding: '0 16px 20px' }}>
            <button
              type="submit"
              className={s.submitBtn}
              style={{ backgroundColor: '#4CAF50' }}
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add income source'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
