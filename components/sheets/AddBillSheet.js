import React, { useState } from 'react';
import s from '../../styles/Sheet.module.css';
import showToast from '../../lib/toast';

const AddBillSheet = ({ open, onClose, onSave, loggedFetch }) => {
  const [type, setType] = useState('bill');
  const [paymentAccount, setPaymentAccount] = useState('');

  // BILL fields
  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billFrequency, setBillFrequency] = useState('monthly');
  const [billDueDay, setBillDueDay] = useState('');
  const [billDueDay2, setBillDueDay2] = useState('');
  const [billAutopay, setBillAutopay] = useState(false);
  const [billNotes, setBillNotes] = useState('');

  // LOAN fields
  const [loanName, setLoanName] = useState('');
  const [loanType, setLoanType] = useState('auto');
  const [lenderName, setLenderName] = useState('');
  const [loanCurrentBalance, setLoanCurrentBalance] = useState('');
  const [loanOriginalAmount, setLoanOriginalAmount] = useState('');
  const [loanApr, setLoanApr] = useState('');
  const [loanMonthlyPayment, setLoanMonthlyPayment] = useState('');
  const [loanDueDay, setLoanDueDay] = useState('');
  const [loanTermRemaining, setLoanTermRemaining] = useState('');

  // CREDIT CARD fields
  const [ccName, setCcName] = useState('');
  const [ccNetwork, setCcNetwork] = useState('visa');
  const [ccCurrentBalance, setCcCurrentBalance] = useState('');
  const [ccCreditLimit, setCcCreditLimit] = useState('');
  const [ccApr, setCcApr] = useState('');
  const [ccMinPayment, setCcMinPayment] = useState('');
  const [ccDueDay, setCcDueDay] = useState('');
  const [ccStatementCloses, setCcStatementCloses] = useState('');

  const typeConfig = {
    bill: {
      emoji: '🧾',
      title: 'Bill',
      color: '#E8321A',
      rgba: 'rgba(232,50,26,0.12)',
      border: 'rgba(232,50,26,0.35)'
    },
    loan: {
      emoji: '🏦',
      title: 'Loan',
      color: '#3B8BD4',
      rgba: 'rgba(59,139,212,0.12)',
      border: 'rgba(59,139,212,0.35)'
    },
    cc: {
      emoji: '💳',
      title: 'Credit Card',
      color: '#A47BDB',
      rgba: 'rgba(164,123,219,0.12)',
      border: 'rgba(164,123,219,0.35)'
    }
  };

  const handleTypeChange = (newType) => {
    setType(newType);
  };

  const calculateUtilization = () => {
    const balance = parseFloat(ccCurrentBalance) || 0;
    const limit = parseFloat(ccCreditLimit) || 0;
    if (limit === 0) return 0;
    return Math.round((balance / limit) * 100);
  };

  const getUtilizationColor = () => {
    const util = calculateUtilization();
    if (util <= 30) return '#A47BDB';
    if (util <= 50) return '#FFB800';
    return '#E8321A';
  };

  const getUtilizationStatus = () => {
    const util = calculateUtilization();
    if (util <= 30) return 'Healthy';
    if (util <= 50) return 'Watch';
    return 'High';
  };

  const calculatePayoffProgress = () => {
    const current = parseFloat(loanCurrentBalance) || 0;
    const original = parseFloat(loanOriginalAmount) || 0;
    if (original === 0) return 0;
    return Math.round(((original - current) / original) * 100);
  };

  const handleSubmit = async () => {
    let name, payload;

    if (type === 'bill') {
      name = billName;
      if (!name.trim() || !billAmount || !billDueDay) {
        showToast('Please fill in name, amount, and due day', 'error');
        return;
      }
      if (billFrequency === 'bimonthly' && !billDueDay2) {
        showToast('Please fill in both due days for bimonthly', 'error');
        return;
      }

      payload = {
        name,
        billType: 'bill',
        paymentAccount,
        amount: parseFloat(billAmount),
        frequency: billFrequency,
        dueDay: parseInt(billDueDay),
        ...(billFrequency === 'bimonthly' && { dueDay2: parseInt(billDueDay2) }),
        autopay: billAutopay,
        notes: billNotes
      };
    } else if (type === 'loan') {
      name = loanName;
      if (!name.trim() || !lenderName || !loanCurrentBalance || !loanOriginalAmount || !loanApr || !loanMonthlyPayment || !loanDueDay) {
        showToast('Please fill in all required loan fields', 'error');
        return;
      }

      payload = {
        name,
        billType: 'loan',
        paymentAccount,
        loanType,
        lender: lenderName,
        currentBalance: parseFloat(loanCurrentBalance),
        originalAmount: parseFloat(loanOriginalAmount),
        apr: parseFloat(loanApr),
        monthlyPayment: parseFloat(loanMonthlyPayment),
        dueDay: parseInt(loanDueDay),
        termRemaining: loanTermRemaining ? parseInt(loanTermRemaining) : null
      };
    } else if (type === 'cc') {
      name = ccName;
      if (!name.trim() || !ccCurrentBalance || !ccCreditLimit || !ccApr || !ccMinPayment || !ccDueDay || !ccStatementCloses) {
        showToast('Please fill in all required credit card fields', 'error');
        return;
      }

      payload = {
        name,
        billType: 'cc',
        paymentAccount,
        cardNetwork: ccNetwork,
        currentBalance: parseFloat(ccCurrentBalance),
        creditLimit: parseFloat(ccCreditLimit),
        apr: parseFloat(ccApr),
        minimumPayment: parseFloat(ccMinPayment),
        dueDay: parseInt(ccDueDay),
        statementCloses: parseInt(ccStatementCloses)
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
    setPaymentAccount('');
    setBillName('');
    setBillAmount('');
    setBillFrequency('monthly');
    setBillDueDay('');
    setBillDueDay2('');
    setBillAutopay(false);
    setBillNotes('');
    setLoanName('');
    setLoanType('auto');
    setLenderName('');
    setLoanCurrentBalance('');
    setLoanOriginalAmount('');
    setLoanApr('');
    setLoanMonthlyPayment('');
    setLoanDueDay('');
    setLoanTermRemaining('');
    setCcName('');
    setCcNetwork('visa');
    setCcCurrentBalance('');
    setCcCreditLimit('');
    setCcApr('');
    setCcMinPayment('');
    setCcDueDay('');
    setCcStatementCloses('');
  };

  if (!open) return null;

  const config = typeConfig[type];

  const PillButton = ({ label, isActive, onClick, colorKey }) => {
    let bgColor, textColor, borderColor;

    if (colorKey === 'ember') {
      bgColor = 'rgba(232,50,26,0.2)';
      textColor = '#E8321A';
      borderColor = 'rgba(232,50,26,0.5)';
    } else if (colorKey === 'blue') {
      bgColor = 'rgba(59,139,212,0.2)';
      textColor = '#3B8BD4';
      borderColor = 'rgba(59,139,212,0.5)';
    } else if (colorKey === 'purple') {
      bgColor = 'rgba(164,123,219,0.2)';
      textColor = '#A47BDB';
      borderColor = 'rgba(164,123,219,0.5)';
    }

    return (
      <button
        className={s.pill}
        onClick={onClick}
        style={
          isActive
            ? {
                backgroundColor: bgColor,
                color: textColor,
                borderColor: borderColor,
                borderWidth: '1.5px'
              }
            : {}
        }
      >
        {label}
      </button>
    );
  };

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={s.handle} />

        <div className={s.header}>
          <h2 className={s.title}>Add to Finance</h2>
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
            </div>
          ))}
        </div>

        <div style={{ padding: '0 20px' }}>
          <label className={s.secLabel}>DRAWS FROM</label>
          <input
            className={s.input}
            type="text"
            placeholder="e.g. Chase Checking ••4521, Venmo, Cash"
            value={paymentAccount}
            onChange={(e) => setPaymentAccount(e.target.value)}
          />
        </div>

        {type === 'bill' && (
          <div style={{ padding: '0 20px' }}>
            <div className={s.fadeSection}>
              <label className={s.secLabel}>Name</label>
              <input
                className={s.input}
                type="text"
                placeholder="e.g. Rent, Internet, Insurance"
                value={billName}
                onChange={(e) => setBillName(e.target.value)}
              />

              <div className={s.twoCol}>
                <div>
                  <label className={s.secLabel}>Amount</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="$0.00"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    step="0.01"
                  />
                </div>
                <div>
                  <label className={s.secLabel}>Due Day</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="1-31"
                    value={billDueDay}
                    onChange={(e) => setBillDueDay(e.target.value)}
                    min="1"
                    max="31"
                  />
                </div>
              </div>

              <label className={s.secLabel}>Frequency</label>
              <div className={s.pills}>
                <PillButton
                  label="Monthly"
                  isActive={billFrequency === 'monthly'}
                  onClick={() => setBillFrequency('monthly')}
                  colorKey="ember"
                />
                <PillButton
                  label="Weekly"
                  isActive={billFrequency === 'weekly'}
                  onClick={() => setBillFrequency('weekly')}
                  colorKey="ember"
                />
                <PillButton
                  label="Bimonthly"
                  isActive={billFrequency === 'bimonthly'}
                  onClick={() => setBillFrequency('bimonthly')}
                  colorKey="ember"
                />
                <PillButton
                  label="Yearly"
                  isActive={billFrequency === 'yearly'}
                  onClick={() => setBillFrequency('yearly')}
                  colorKey="ember"
                />
              </div>

              {billFrequency === 'bimonthly' && (
                <div>
                  <label className={s.secLabel}>Second Due Day</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="15"
                    value={billDueDay2}
                    onChange={(e) => setBillDueDay2(e.target.value)}
                    min="1"
                    max="31"
                  />
                </div>
              )}

              <div className={s.toggleCard}>
                <div>
                  <div className={s.toggleLabel}>Autopay</div>
                  <div className={s.toggleSub}>Automatically pay on due date</div>
                </div>
                <label className={s.toggle}>
                  <input type="checkbox" checked={billAutopay} onChange={(e) => setBillAutopay(e.target.checked)} />
                  <span className={s.toggleThumb} />
                </label>
              </div>

              <label className={s.secLabel}>Notes (Optional)</label>
              <input
                className={s.input}
                type="text"
                placeholder="Additional details"
                value={billNotes}
                onChange={(e) => setBillNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        {type === 'loan' && (
          <div style={{ padding: '0 20px' }}>
            <div className={s.fadeSection}>
              <label className={s.secLabel}>Name</label>
              <input
                className={s.input}
                type="text"
                placeholder="e.g. Car Loan, Student Loan"
                value={loanName}
                onChange={(e) => setLoanName(e.target.value)}
              />

              <label className={s.secLabel}>Loan Type</label>
              <div className={s.pills}>
                <PillButton
                  label="Auto"
                  isActive={loanType === 'auto'}
                  onClick={() => setLoanType('auto')}
                  colorKey="blue"
                />
                <PillButton
                  label="Student"
                  isActive={loanType === 'student'}
                  onClick={() => setLoanType('student')}
                  colorKey="blue"
                />
                <PillButton
                  label="Personal"
                  isActive={loanType === 'personal'}
                  onClick={() => setLoanType('personal')}
                  colorKey="blue"
                />
                <PillButton
                  label="Medical"
                  isActive={loanType === 'medical'}
                  onClick={() => setLoanType('medical')}
                  colorKey="blue"
                />
                <PillButton
                  label="Other"
                  isActive={loanType === 'other'}
                  onClick={() => setLoanType('other')}
                  colorKey="blue"
                />
              </div>

              <label className={s.secLabel}>Lender/Servicer</label>
              <input
                className={s.input}
                type="text"
                placeholder="e.g. Chase, Sallie Mae, BMO"
                value={lenderName}
                onChange={(e) => setLenderName(e.target.value)}
              />

              <div className={s.twoCol}>
                <div>
                  <label className={s.secLabel}>Current Balance</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="$0.00"
                    value={loanCurrentBalance}
                    onChange={(e) => setLoanCurrentBalance(e.target.value)}
                    step="0.01"
                  />
                </div>
                <div>
                  <label className={s.secLabel}>Original Amount</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="$0.00"
                    value={loanOriginalAmount}
                    onChange={(e) => setLoanOriginalAmount(e.target.value)}
                    step="0.01"
                  />
                </div>
              </div>

              {loanCurrentBalance && loanOriginalAmount && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Payoff Progress</div>
                  <div style={{
                    height: '8px',
                    backgroundColor: 'rgba(0,0,0,0.08)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${calculatePayoffProgress()}%`,
                      backgroundColor: '#3B8BD4',
                      transition: 'width 0.2s ease'
                    }} />
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', textAlign: 'right' }}>
                    {calculatePayoffProgress()}% paid
                  </div>
                </div>
              )}

              <div className={s.twoCol}>
                <div>
                  <label className={s.secLabel}>APR</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="5.5"
                    value={loanApr}
                    onChange={(e) => setLoanApr(e.target.value)}
                    step="0.01"
                  />
                </div>
                <div>
                  <label className={s.secLabel}>Monthly Payment</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="$0.00"
                    value={loanMonthlyPayment}
                    onChange={(e) => setLoanMonthlyPayment(e.target.value)}
                    step="0.01"
                  />
                </div>
              </div>
              {!loanMonthlyPayment && (
                <p style={{ fontSize: '12px', color: 'rgba(240,234,214,0.4)', margin: '-4px 0 12px 0' }}>
                  What's the monthly payment amount?
                </p>
              )}

              <div className={s.twoCol}>
                <div>
                  <label className={s.secLabel}>Due Day</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="15"
                    value={loanDueDay}
                    onChange={(e) => setLoanDueDay(e.target.value)}
                    min="1"
                    max="31"
                  />
                </div>
                <div>
                  <label className={s.secLabel}>Term Remaining</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="Months (optional)"
                    value={loanTermRemaining}
                    onChange={(e) => setLoanTermRemaining(e.target.value)}
                    min="0"
                  />
                </div>
              </div>

              <div className={s.infoCard} style={{ color: '#3B8BD4', borderColor: 'rgba(59,139,212,0.3)' }}>
                Higher APR loans get priority in the debt avalanche strategy
              </div>
            </div>
          </div>
        )}

        {type === 'cc' && (
          <div style={{ padding: '0 20px' }}>
            <div className={s.fadeSection}>
              <label className={s.secLabel}>Name</label>
              <input
                className={s.input}
                type="text"
                placeholder="e.g. Chase Sapphire, Amex Business"
                value={ccName}
                onChange={(e) => setCcName(e.target.value)}
              />

              <label className={s.secLabel}>Card Network</label>
              <div className={s.pills}>
                <PillButton
                  label="Visa"
                  isActive={ccNetwork === 'visa'}
                  onClick={() => setCcNetwork('visa')}
                  colorKey="purple"
                />
                <PillButton
                  label="Mastercard"
                  isActive={ccNetwork === 'mastercard'}
                  onClick={() => setCcNetwork('mastercard')}
                  colorKey="purple"
                />
                <PillButton
                  label="Amex"
                  isActive={ccNetwork === 'amex'}
                  onClick={() => setCcNetwork('amex')}
                  colorKey="purple"
                />
                <PillButton
                  label="Other"
                  isActive={ccNetwork === 'other'}
                  onClick={() => setCcNetwork('other')}
                  colorKey="purple"
                />
              </div>

              <div className={s.twoCol}>
                <div>
                  <label className={s.secLabel}>Current Balance</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="$0.00"
                    value={ccCurrentBalance}
                    onChange={(e) => setCcCurrentBalance(e.target.value)}
                    step="0.01"
                  />
                </div>
                <div>
                  <label className={s.secLabel}>Credit Limit</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="$0.00"
                    value={ccCreditLimit}
                    onChange={(e) => setCcCreditLimit(e.target.value)}
                    step="0.01"
                  />
                </div>
              </div>

              {ccCurrentBalance && ccCreditLimit && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Utilization</div>
                  <div style={{
                    height: '8px',
                    backgroundColor: 'rgba(0,0,0,0.08)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(calculateUtilization(), 100)}%`,
                      backgroundColor: getUtilizationColor(),
                      transition: 'background-color 0.2s ease, width 0.2s ease'
                    }} />
                  </div>
                  <div style={{ fontSize: '12px', color: getUtilizationColor(), marginTop: '4px', textAlign: 'right', fontWeight: '500' }}>
                    {calculateUtilization()}% {getUtilizationStatus()}
                  </div>
                </div>
              )}

              <div className={s.twoCol}>
                <div>
                  <label className={s.secLabel}>APR</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="18.99"
                    value={ccApr}
                    onChange={(e) => setCcApr(e.target.value)}
                    step="0.01"
                  />
                </div>
                <div>
                  <label className={s.secLabel}>Minimum Payment</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="$0.00"
                    value={ccMinPayment}
                    onChange={(e) => setCcMinPayment(e.target.value)}
                    step="0.01"
                  />
                </div>
              </div>

              <div className={s.twoCol}>
                <div>
                  <label className={s.secLabel}>Due Day</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="22"
                    value={ccDueDay}
                    onChange={(e) => setCcDueDay(e.target.value)}
                    min="1"
                    max="31"
                  />
                </div>
                <div>
                  <label className={s.secLabel}>Statement Closes</label>
                  <input
                    className={s.input}
                    type="number"
                    placeholder="20"
                    value={ccStatementCloses}
                    onChange={(e) => setCcStatementCloses(e.target.value)}
                    min="1"
                    max="31"
                  />
                </div>
              </div>

              <div className={s.infoCard} style={{ color: '#FFB800', borderColor: 'rgba(255,184,0,0.3)' }}>
                Keep utilization below 30% for best credit impact
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: '20px' }}>
          <button
            className={s.submitBtn}
            onClick={handleSubmit}
            style={{ backgroundColor: config.color }}
          >
            Add {config.title}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddBillSheet;
