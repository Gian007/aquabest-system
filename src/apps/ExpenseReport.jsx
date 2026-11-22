import { useState } from 'react';
import { FiPlus, FiEdit2, FiCheck, FiX, FiFileText, FiAlertCircle } from 'react-icons/fi';
import { formatMoney } from '../data/managerDemo.js';
import { getTodayLocalStr } from '../utils/dateUtils.js';

const categories = ['Fuel', 'Electricity', 'Supplies', 'Maintenance', 'Wages', 'Other'];
const paymentStatuses = ['Paid', 'Unpaid'];
const paymentMethods = ['Cash', 'GCash', 'Bank Transfer', 'Other'];

export default function ExpenseReport({ expenses = [], setExpenses, onEvent = () => {}, defaultDate }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [voidConfirmId, setVoidConfirmId] = useState(null);

  const initialForm = {
    category: 'Fuel',
    description: '',
    amount: '',
    date: defaultDate || getTodayLocalStr(),
    paymentStatus: '',
    paymentMethod: '',
    reference: ''
  };

  const [form, setForm] = useState(initialForm);

  const activeExpenses = expenses.filter(x => x.active !== false);
  const totalRecorded = activeExpenses.reduce((n, x) => n + (Number(x.amount) || 0), 0);
  const totalPaid = activeExpenses
    .filter(x => x.paymentStatus === 'Paid')
    .reduce((n, x) => n + (Number(x.amount) || 0), 0);
  const totalUnpaid = activeExpenses
    .filter(x => x.paymentStatus === 'Unpaid')
    .reduce((n, x) => n + (Number(x.amount) || 0), 0);

  const edit = (e) => {
    setEditing(e.id);
    setForm({
      category: e.category || 'Fuel',
      description: e.description || '',
      amount: String(e.amount || ''),
      date: e.date || getTodayLocalStr(),
      paymentStatus: e.paymentStatus || '',
      paymentMethod: e.paymentMethod || '',
      reference: e.reference || ''
    });
    setOpen(true);
    setVoidConfirmId(null);
  };

  const save = () => {
    const amount = Number(form.amount);
    if (!form.description.trim()) {
      onEvent('Please enter an expense description.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      onEvent('Please enter a valid positive amount.');
      return;
    }
    if (!form.date) {
      onEvent('Please select an expense date.');
      return;
    }
    if (!form.paymentStatus && !editing) {
      onEvent('Please select whether this expense is Paid or Unpaid.');
      return;
    }
    if (form.paymentStatus === 'Paid' && !form.paymentMethod) {
      onEvent('Select the payment method for an expense marked Paid.');
      return;
    }

    if (editing) {
      setExpenses(old => old.map(x => (x.id === editing ? { ...x, ...form, amount } : x)));
      onEvent(`Updated expense: ${form.description}`);
    } else {
      setExpenses(old => [
        {
          ...form,
          id: `EXP-${Date.now()}`,
          amount,
          active: true
        },
        ...old
      ]);
      onEvent(`Recorded expense: ${form.description} (${formatMoney(amount)})`);
    }

    setOpen(false);
    setEditing(null);
    setForm({
      category: 'Fuel',
      description: '',
      amount: '',
      date: defaultDate || getTodayLocalStr(),
      paymentStatus: '',
      paymentMethod: '',
      reference: ''
    });
  };

  const confirmVoid = (e) => {
    setExpenses(old => old.map(x => (x.id === e.id ? { ...x, active: false } : x)));
    setVoidConfirmId(null);
    onEvent(`Voided expense: ${e.description}`);
  };

  const change = (key, v) => setForm(old => ({ ...old, [key]: v }));

  return (
    <section className="expense-report" aria-label="Expense report">
      <div className="mgmt-section-title">
        <h2>Station Operating Expenses</h2>
        <button
          type="button"
          className="mgmt-link"
          onClick={() => {
            const nextOpen = !open;
            setEditing(null);
            if (nextOpen) {
              setForm({
                category: 'Fuel',
                description: '',
                amount: '',
                date: defaultDate || getTodayLocalStr(),
                paymentStatus: '',
                paymentMethod: '',
                reference: ''
              });
            }
            setOpen(nextOpen);
            setVoidConfirmId(null);
          }}
        >
          <FiPlus /> {open ? 'Close' : 'Add Expense'}
        </button>
      </div>

      <div className="mgmt-card">
        <div className="mgmt-row">
          <strong>Recorded Expenses</strong>
          <strong>{formatMoney(totalRecorded)}</strong>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', margin: '4px 0 8px', fontSize: 11, color: '#64748d' }}>
          <span>Paid: <b style={{ color: '#138358' }}>{formatMoney(totalPaid)}</b></span>
          <span>Unpaid: <b style={{ color: '#c47d0b' }}>{formatMoney(totalUnpaid)}</b></span>
        </div>
        <p className="mgmt-sub">
          Fuel, electricity, delivery maintenance, wages, and operating consumables. Deducted from collections in reporting and excluded from gross revenue.
        </p>

        {open && (
          <div className="owner-form" style={{ marginTop: 14 }}>
            <div className="mgmt-formgrid">
              <div className="mgmt-field">
                <label>Category</label>
                <select value={form.category} onChange={e => change('category', e.target.value)}>
                  {categories.map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="mgmt-field">
                <label>Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => change('date', e.target.value)}
                  required
                />
              </div>

              <div className="mgmt-field">
                <label>Description</label>
                <input
                  value={form.description}
                  onChange={e => change('description', e.target.value)}
                  placeholder="e.g., Delivery motorcycle gasoline"
                  required
                />
              </div>

              <div className="mgmt-field">
                <label>Amount (₱)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={e => change('amount', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="mgmt-field">
                <label>Payment Status</label>
                <select
                  value={form.paymentStatus}
                  onChange={e => change('paymentStatus', e.target.value)}
                  required
                >
                  <option value="">Select payment status</option>
                  {paymentStatuses.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="mgmt-field">
                <label>Payment Method</label>
                <select
                  value={form.paymentMethod}
                  onChange={e => change('paymentMethod', e.target.value)}
                  required={form.paymentStatus === 'Paid'}
                >
                  <option value="">Select payment method</option>
                  {paymentMethods.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="mgmt-field" style={{ gridColumn: '1 / -1' }}>
                <label>Receipt / Reference Number (Optional)</label>
                <input
                  value={form.reference}
                  onChange={e => change('reference', e.target.value)}
                  placeholder="Official receipt #, invoice, or voucher code"
                />
              </div>
            </div>

            <div className="owner-actions" style={{ marginTop: 12 }}>
              <button type="button" className="mgmt-btn" onClick={save}>
                <FiCheck /> {editing ? 'Save Changes' : 'Save Expense'}
              </button>
              <button
                type="button"
                className="mgmt-btn secondary"
                onClick={() => {
                  setOpen(false);
                  setEditing(null);
                  setForm({
                    category: 'Fuel',
                    description: '',
                    amount: '',
                    date: defaultDate || getTodayLocalStr(),
                    paymentStatus: '',
                    paymentMethod: '',
                    reference: ''
                  });
                }}
              >
                <FiX /> Cancel
              </button>
            </div>
          </div>
        )}

        {expenses.length ? (
          expenses.map(e => (
            <div className="mgmt-row" key={e.id} style={{ alignItems: 'flex-start' }}>
              <div>
                <strong className="mgmt-row-title">{e.description}</strong>
                <p className="mgmt-sub" style={{ margin: '2px 0 0' }}>
                  {e.category} · {e.date}
                  {' · '}
                  <span
                    style={{
                      fontWeight: 700,
                      color: e.active === false ? '#99a6b8' : e.paymentStatus === 'Paid' ? '#138358' : e.paymentStatus === 'Unpaid' ? '#c47d0b' : '#64748d'
                    }}
                  >
                    {e.active === false
                      ? 'VOIDED'
                      : e.paymentStatus === 'Paid'
                      ? 'Paid'
                      : e.paymentStatus === 'Unpaid'
                      ? 'Unpaid'
                      : 'Payment status not recorded'}
                  </span>
                  {e.paymentMethod ? ` · ${e.paymentMethod}` : ''}
                  {e.reference ? ` (Ref: ${e.reference})` : ''}
                </p>
              </div>

              <div className="owner-row-actions">
                <strong style={{ color: e.active !== false ? '#1b2f63' : '#99a6b8', textDecoration: e.active !== false ? 'none' : 'line-through' }}>
                  {formatMoney(e.amount)}
                </strong>

                {e.active !== false && (
                  <>
                    <button
                      type="button"
                      className="mgmt-link"
                      onClick={() => edit(e)}
                      aria-label={`Edit ${e.description}`}
                      title="Edit expense"
                    >
                      <FiEdit2 />
                    </button>

                    {voidConfirmId === e.id ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff2f0', padding: '2px 6px', borderRadius: 6 }}>
                        <span style={{ fontSize: 10, color: '#d13032' }}>Void?</span>
                        <button
                          type="button"
                          className="mgmt-link"
                          style={{ color: '#d13032', fontWeight: 800 }}
                          onClick={() => confirmVoid(e)}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          className="mgmt-link"
                          onClick={() => setVoidConfirmId(null)}
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="mgmt-link"
                        style={{ color: '#d13032' }}
                        onClick={() => setVoidConfirmId(e.id)}
                      >
                        Void
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="owner-empty">
            <FiFileText />
            <p>No expenses recorded in this demo session.</p>
          </div>
        )}
      </div>
    </section>
  );
}
