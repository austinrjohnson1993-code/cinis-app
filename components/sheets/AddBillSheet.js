import React, { useState } from 'react';
import s from '../../styles/Sheet.module.css';
import showToast from '../../lib/toast';

const AddBillSheet = ({ open, onClose, onSave, loggedFetch }) => {
  const [type, setType] = useState('bill');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [category, setCategory] = useState('housing');
  const [balance, setBalance] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [loanType, setLoanType] = useState('auto');
  const [currentBalance, setCurrentBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [apr, setApr] = useState('');
  const [minPayment, setMinPayment] = useState('');
  const [statementDueDay, setStatementDueDay] = useState('');
  const [lastFour, setLastFour] = useState('');
  const [autopay, setAutopay] = useState(false);
  const [createTask, setCreateTask] = useState(true);
  const [firstDueDate, setFirstDueDate] = useState('');
  const [customRepeatDays, setCustomRepeatDays] = useState('');
  const [customRepeatUnit, setCustomRepeatUnit] = useState('weeks');
  const [customStartDate, setCustomStartDate] = useState('');
  const [billMonth, setBillMonth] = useState('');
  const [billDay, setBillDay] = useState('');

  const typeConfig = {
    bill: {
      emoji: '🧾',
      title: 'Bill',
      sub: 'Recurring payment',
      color: '#E8321A',
      rgba: 'rgba(232,50,26,0.12)',
      border: 'rgba(232,50,26,0.35)',
      buttonLabel: 'Add bill'
    },
    loan: {
      emoji: '🏦',
      title: 'Loan',
      sub: 'Fixed payments',
      color: '#3B8BD4',
      rgba: 'rgba(59,139,212,0.12)',
      border: 'rgba(59,139,212,0.35)',
      buttonLabel: 'Add loan'
    },
    cc: {
      emoji: '💳',
      title: 'Credit Card',
      sub: 'Revolving balance',
      color: '#A47BDB',
      rgba: 'rgba(164,123,219,0.12)',
      border: 'rgba(164,123,219,0.35)',
      buttonLabel: 'Add card'
    }
  };

  const handleTypeChange = (newType) => {
    setType(newType);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      showToast('Please enter a name', 'error');
      return;
    }

    let payload = {
      name,
      bill_type: type,
      autopay,
      create_task: createTask && !autopay
    };

    if (type === 'bill') {
      if (!amount || !dueDay) {
        showToast('Please fill in amount and due day', 'error');
        return;
      }
      payload = {
        ...payload,
        amount: parseFloat(amount),
        due_day: parseInt(dueDay),
        frequency,
        category
      };
      if (frequency === 'biweekly' && !firstDueDate) {
        showToast('Please enter first due date for biweekly bills', 'error');
        return;
      }
      if (frequency === 'biweekly') {
        payload.first_due_date = firstDueDate;
      }
      if (frequency === 'yearly' && !billMonth && !billDay) {
        showToast('Please select month and day for yearly bills', 'error');
        return;
      }
      if (frequency === 'yearly') {
        payload.bill_month = billMonth;
        payload.bill_day = billDay;
      }
      if (frequency === 'custom') {
        if (!customRepeatDays || !customStartDate) {
          showToast('Please fill in custom repeat details', 'error');
          return;
        }
        payload.repeat_every = parseInt(customRepeatDays);
        payload.repeat_unit = customRepeatUnit;
        payload.start_date = customStartDate;
      }
    } else if (type === 'loan') {
      if (!balance || !monthlyPayment || !interestRate || !dueDay) {
        showToast('Please fill in all loan fields', 'error');
        return;
      }
      payload = {
        ...payload,
        balance: parseFloat(balance),
        monthly_payment: parseFloat(monthlyPayment),
        interest_rate: parseFloat(interestRate),
        due_day: parseInt(dueDay),
        loan_type: loanType
      };
    } else if (type === 'cc') {
      if (!currentBalance || !creditLimit || !apr || !minPayment || !statementDueDay || !lastFour) {
        showToast('Please fill in all credit card fields', 'error');
        return;
      }
      payload = {
        ...payload,
        current_balance: parseFloat(currentBalance),
        credit_limit: parseFloat(creditLimit),
        apr: parseFloat(apr),
        min_payment: parseFloat(minPayment),
        statement_due_day: parseInt(statementDueDay),
        last_four: lastFour
      };
    }

    try {
      const response = await loggedFetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to create bill');
      }

      showToast(`${typeConfig[type].title} added successfully`, 'success');
      resetForm();
      onSave();
      onClose();
    } catch (error) {
      showToast(error.message || 'Error adding bill', 'error');
    }
  };

  const resetForm = () => {
    setType('bill');
    setName('');
    setAmount('');
    setDueDay('');
    setFrequency('monthly');
    setCategory('housing');
    setBalance('');
    setMonthlyPayment('');
    setInterestRate('');
    setLoanType('auto');
    setCurrentBalance('');
    setCreditLimit('');
    setApr('');
    setMinPayment('');
    setStatementDueDay('');
    setLastFour('');
    setAutopay(false);
    setCreateTask(true);
    setFirstDueDate('');
    setCustomRepeatDays('');
    setCustomRepeatUnit('weeks');
    setCustomStartDate('');
    setBillMonth('');
    setBillDay('');
  };

  if (!open) return null;

  const config = typeConfig[type];

  const PillButton = ({ label, isActive, onClick, color }) => (
    <button
      className={s.pill}
      onClick={onClick}
      style={
        isActive
          ? {
              backgroundColor: color === 'ember' ? 'rgba(232,50,26,0.2)' : color === 'blue' ? 'rgba(59,139,212,0.2)' : 'rgba(164,123,219,0.2)',
              color: color === 'ember' ? '#E8321A' : color === 'blue' ? '#3B8BD4' : '#A47BDB',
              borderColor: color === 'ember' ? 'rgba(232,50,26,0.5)' : color === 'blue' ? 'rgba(59,139,212,0.5)' : 'rgba(164,123,219,0.5)',
              borderWidth: '1.5px'
            }
          : {}
      }
    >
      {label}
    </button>
  );

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={s.handle} />

        <div className={s.header}>
          <h2 className={s.title}>Add Financial Account</h2>
          <button className={s.cancel} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={s.typeCards}>
          {Object.entries(typeConfig).map(([key, cfg]) => (
            <div
              key={key}
              className={s.typeCard}
              onClick={() => handleTypeChange(key)}
              style={
                type === key
                  ? {
                      backgroundColor: cfg.rgba,
                      border: `1.5px solid ${cfg.border}`
                    }
                  : {}
              }
            >
              <div className={s.typeEmoji}>{cfg.emoji}</div>
              <div className={s.typeTitle} style={type === key ? { color: cfg.color } : {}}>
                {cfg.title}
              </div>
              <div className={s.typeSub} style={type === key ? { color: cfg.color } : {}}>
                {cfg.sub}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '0 20px' }}>
          <label className={s.secLabel}>Name</label>
          <input
            className={s.input}
            type="text"
            placeholder="Name (e.g. Rent, Chase Sapphire, Student Loan)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {type === 'bill' && (
          <div style={{ padding: '0 20px' }}>
            <div className={s.fadeSection}>
              <div className={s.twoCol}>
                <div>
                  <label className={s.secLabel}>Amount</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="$0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step="0.01"
                  />
                </div>
                <div>
                  <label className={s.secLabel}>Due Day</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="1, 15"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    min="1"
                    max="31"
                  />
                </div>
              </div>

              <label className={s.secLabel}>Frequency</label>
              <div className={s.pills}>
                <PillButton
                  label="Monthly"
                  isActive={frequency === 'monthly'}
                  onClick={() => setFrequency('monthly')}
                  color="ember"
                />
                <PillButton
                  label="Biweekly"
                  isActive={frequency === 'biweekly'}
                  onClick={() => setFrequency('biweekly')}
                  color="ember"
                />
                <PillButton
                  label="Yearly"
                  isActive={frequency === 'yearly'}
                  onClick={() => setFrequency('yearly')}
                  color="ember"
                />
                <PillButton
                  label="Custom"
                  isActive={frequency === 'custom'}
                  onClick={() => setFrequency('custom')}
                  color="ember"
                />
              </div>

              {frequency === 'biweekly' && (
                <div>
                  <label className={s.secLabel}>First Due Date</label>
                  <input
                    className={s.dateInput}
                    type="date"
                    value={firstDueDate}
                    onChange={(e) => setFirstDueDate(e.target.value)}
                  />
                  <div className={s.infoCard} style={{ color: '#E8321A', borderColor: 'rgba(232,50,26,0.3)' }}>
                    Payment will repeat every 2 weeks from this date
                  </div>
                </div>
              )}

              {frequency === 'yearly' && (
                <div>
                  <label className={s.secLabel}>Month</label>
                  <div className={s.pills} style={{ flexWrap: 'wrap' }}>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                      <PillButton
                        key={m}
                        label={m}
                        isActive={billMonth === String(i + 1)}
                        onClick={() => setBillMonth(String(i + 1))}
                        color="ember"
                      />
                    ))}
                  </div>
                  <label className={s.secLabel}>Day</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="1-31"
                    value={billDay}
                    onChange={(e) => setBillDay(e.target.value)}
                    min="1"
                    max="31"
                  />
                </div>
              )}

              {frequency === 'custom' && (
                <div>
                  <label className={s.secLabel}>Repeats Every</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="Number"
                    value={customRepeatDays}
                    onChange={(e) => setCustomRepeatDays(e.target.value)}
                    min="1"
                  />
                  <label className={s.secLabel}>Unit</label>
                  <div className={s.pills}>
                    <PillButton
                      label="Days"
                      isActive={customRepeatUnit === 'days'}
                      onClick={() => setCustomRepeatUnit('days')}
                      color="ember"
                    />
                    <PillButton
                      label="Weeks"
                      isActive={customRepeatUnit === 'weeks'}
                      onClick={() => setCustomRepeatUnit('weeks')}
                      color="ember"
                    />
                    <PillButton
                      label="Months"
                      isActive={customRepeatUnit === 'months'}
                      onClick={() => setCustomRepeatUnit('months')}
                      color="ember"
                    />
                  </div>
                  <label className={s.secLabel}>Starting Date</label>
                  <input
                    className={s.dateInput}
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
              )}

              <label className={s.secLabel}>Category</label>
              <div className={s.pills}>
                <PillButton
                  label="Housing"
                  isActive={category === 'housing'}
                  onClick={() => setCategory('housing')}
                  color="ember"
                />
                <PillButton
                  label="Subscription"
                  isActive={category === 'subscription'}
                  onClick={() => setCategory('subscription')}
                  color="ember"
                />
                <PillButton
                  label="Utilities"
                  isActive={category === 'utilities'}
                  onClick={() => setCategory('utilities')}
                  color="ember"
                />
                <PillButton
                  label="Insurance"
                  isActive={category === 'insurance'}
                  onClick={() => setCategory('insurance')}
                  color="ember"
                />
                <PillButton
                  label="Debt"
                  isActive={category === 'debt'}
                  onClick={() => setCategory('debt')}
                  color="ember"
                />
                <PillButton
                  label="Other"
                  isActive={category === 'other'}
                  onClick={() => setCategory('other')}
                  color="ember"
                />
              </div>
            </div>
          </div>
        )}

        {type === 'loan' && (
          <div style={{ padding: '0 20px' }}>
            <div className={s.fadeSection}>
              <div className={s.twoCol}>
                <div>
                  <label className={s.secLabel}>Balance Owed</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="$0.00"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    step="0.01"
                  />
                </div>
                <div>
                  <label className={s.secLabel}>Monthly Payment</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="$0.00"
                    value={monthlyPayment}
                    onChange={(e) => setMonthlyPayment(e.target.value)}
                    step="0.01"
                  />
                </div>
              </div>

              <div className={s.twoCol}>
                <div>
                  <label className={s.secLabel}>Interest Rate (APR)</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="6.5"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    step="0.01"
                  />
                </div>
                <div>
                  <label className={s.secLabel}>Due Day</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="15"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    min="1"
                    max="31"
                  />
                </div>
              </div>

              <label className={s.secLabel}>Loan Type</label>
              <div className={s.pills}>
                <PillButton
                  label="Auto"
                  isActive={loanType === 'auto'}
                  onClick={() => setLoanType('auto')}
                  color="blue"
                />
                <PillButton
                  label="Student"
                  isActive={loanType === 'student'}
                  onClick={() => setLoanType('student')}
                  color="blue"
                />
                <PillButton
                  label="Personal"
                  isActive={loanType === 'personal'}
                  onClick={() => setLoanType('personal')}
                  color="blue"
                />
                <PillButton
                  label="Mortgage"
                  isActive={loanType === 'mortgage'}
                  onClick={() => setLoanType('mortgage')}
                  color="blue"
                />
                <PillButton
                  label="Other"
                  isActive={loanType === 'other'}
                  onClick={() => setLoanType('other')}
                  color="blue"
                />
              </div>

              <div className={s.infoCard} style={{ color: '#3B8BD4', borderColor: 'rgba(59,139,212,0.3)' }}>
                Tracks your payoff timeline based on balance, rate, and payment
              </div>
            </div>
          </div>
        )}

        {type === 'cc' && (
          <div style={{ padding: '0 20px' }}>
            <div className={s.fadeSection}>
              <div className={s.twoCol}>
                <div>
                  <label className={s.secLabel}>Current Balance</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="$0.00"
                    value={currentBalance}
                    onChange={(e) => setCurrentBalance(e.target.value)}
                    step="0.01"
                  />
                </div>
                <div>
                  <label className={s.secLabel}>Credit Limit</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="$0.00"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    step="0.01"
                  />
                </div>
              </div>

              <div className={s.twoCol}>
                <div>
                  <label className={s.secLabel}>APR</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="24.99"
                    value={apr}
                    onChange={(e) => setApr(e.target.value)}
                    step="0.01"
                  />
                </div>
                <div>
                  <label className={s.secLabel}>Min. Payment</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="$0.00"
                    value={minPayment}
                    onChange={(e) => setMinPayment(e.target.value)}
                    step="0.01"
                  />
                </div>
              </div>

              <div className={s.twoCol}>
                <div>
                  <label className={s.secLabel}>Statement Due Day</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="22"
                    value={statementDueDay}
                    onChange={(e) => setStatementDueDay(e.target.value)}
                    min="1"
                    max="31"
                  />
                </div>
                <div>
                  <label className={s.secLabel}>Last 4 Digits</label>
                  <input
                    className={s.input}
                    type="text"
                    placeholder="4242"
                    value={lastFour}
                    onChange={(e) => setLastFour(e.target.value.slice(0, 4))}
                    maxLength="4"
                  />
                </div>
              </div>

              <div className={s.infoCard} style={{ color: '#A47BDB', borderColor: 'rgba(164,123,219,0.3)' }}>
                Monitors your credit utilization and payment deadlines
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: '0 20px' }}>
          <div className={s.toggleCard}>
            <div>
              <div className={s.toggleLabel}>Autopay</div>
              <div className={s.toggleSub}>Automatically pay on due date</div>
            </div>
            <label className={s.toggle}>
              <input type="checkbox" checked={autopay} onChange={(e) => setAutopay(e.target.checked)} />
              <span className={s.toggleThumb} />
            </label>
          </div>

          <div className={autopay ? s.toggleCardDisabled : s.toggleCard}>
            <div>
              <div className={s.toggleLabel}>Create task</div>
              <div className={s.toggleSub}>Adds a task 2 days before due date</div>
            </div>
            <label className={s.toggle}>
              <input
                type="checkbox"
                checked={createTask}
                onChange={(e) => setCreateTask(e.target.checked)}
                disabled={autopay}
              />
              <span className={s.toggleThumb} />
            </label>
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          <button
            className={s.submitBtn}
            onClick={handleSubmit}
            style={{ backgroundColor: config.color }}
          >
            {config.buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddBillSheet;
