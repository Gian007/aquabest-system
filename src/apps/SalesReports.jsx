import { useState, useMemo, useRef } from 'react';
import {
  FiBarChart2, FiDollarSign, FiClock, FiCreditCard, FiTrendingUp,
  FiZoomIn, FiZoomOut, FiRefreshCw, FiCalendar, FiChevronLeft,
  FiChevronRight, FiPieChart, FiShoppingBag, FiSearch, FiFileText
} from 'react-icons/fi';
import { DEMO_PRODUCTS, formatMoney } from '../data/managerDemo.js';
import ExpenseReport from './ExpenseReport.jsx';
import './salesReports.css';

const PERIODS = ['Daily', 'Weekly', 'Monthly', 'Yearly', 'All Time'];

// Helper to format date strings for presentation
function formatDateLabel(dateStr) {
  if (!dateStr) return 'Unspecified';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Get ISO week start (Monday) and end (Sunday) for a date string YYYY-MM-DD
function getWeekRange(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    monday: monday.toISOString().slice(0, 10),
    sunday: sunday.toISOString().slice(0, 10),
    mondayDate: monday,
    sundayDate: sunday
  };
}

export default function SalesReports({
  orders = [],
  expenses = [],
  setExpenses,
  onNotice = () => {}
}) {
  // Determine the default anchor date from the orders or today
  const defaultDate = useMemo(() => {
    const dates = orders.map(o => o.date).filter(Boolean).sort();
    return dates.length ? dates[dates.length - 1] : new Date().toISOString().slice(0, 10);
  }, [orders]);

  const [period, setPeriod] = useState('Weekly');
  const [anchorDate, setAnchorDate] = useState(defaultDate);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activePoint, setActivePoint] = useState(null);
  const [searchTx, setSearchTx] = useState('');
  const chartViewportRef = useRef(null);

  // Period label for display
  const periodLabel = useMemo(() => {
    if (period === 'All Time') return 'All Recorded Time';
    if (period === 'Daily') return formatDateLabel(anchorDate);
    if (period === 'Weekly') {
      const { monday, sunday } = getWeekRange(anchorDate);
      return `${formatDateLabel(monday)} – ${formatDateLabel(sunday)}`;
    }
    if (period === 'Monthly') {
      const [year, month] = anchorDate.split('-');
      const d = new Date(Number(year), Number(month) - 1, 1);
      return d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
    }
    if (period === 'Yearly') {
      return `Year ${anchorDate.slice(0, 4)}`;
    }
    return anchorDate;
  }, [period, anchorDate]);

  // Navigate anchor date backward or forward
  const shiftAnchor = (step) => {
    const d = new Date(anchorDate + 'T00:00:00');
    if (period === 'Daily') {
      d.setDate(d.getDate() + step);
    } else if (period === 'Weekly') {
      d.setDate(d.getDate() + step * 7);
    } else if (period === 'Monthly') {
      d.setMonth(d.getMonth() + step);
    } else if (period === 'Yearly') {
      d.setFullYear(d.getFullYear() + step);
    }
    setAnchorDate(d.toISOString().slice(0, 10));
    setActivePoint(null);
  };

  // Filter orders by active period
  const periodOrders = useMemo(() => {
    if (period === 'All Time') {
      return orders;
    }
    if (period === 'Daily') {
      return orders.filter(o => o.date === anchorDate);
    }
    if (period === 'Weekly') {
      const { monday, sunday } = getWeekRange(anchorDate);
      return orders.filter(o => o.date && o.date >= monday && o.date <= sunday);
    }
    if (period === 'Monthly') {
      const prefix = anchorDate.slice(0, 7); // YYYY-MM
      return orders.filter(o => o.date && o.date.startsWith(prefix));
    }
    if (period === 'Yearly') {
      const year = anchorDate.slice(0, 4); // YYYY
      return orders.filter(o => o.date && o.date.startsWith(year));
    }
    return orders;
  }, [orders, period, anchorDate]);

  // Filter expenses by active period
  const periodExpenses = useMemo(() => {
    if (period === 'All Time') {
      return expenses.filter(e => e.active);
    }
    if (period === 'Daily') {
      return expenses.filter(e => e.active && e.date === anchorDate);
    }
    if (period === 'Weekly') {
      const { monday, sunday } = getWeekRange(anchorDate);
      return expenses.filter(e => e.active && e.date && e.date >= monday && e.date <= sunday);
    }
    if (period === 'Monthly') {
      const prefix = anchorDate.slice(0, 7);
      return expenses.filter(e => e.active && e.date && e.date.startsWith(prefix));
    }
    if (period === 'Yearly') {
      const year = anchorDate.slice(0, 4);
      return expenses.filter(e => e.active && e.date && e.date.startsWith(year));
    }
    return expenses.filter(e => e.active);
  }, [expenses, period, anchorDate]);

  // Financial statistics
  const grossSales = useMemo(() => {
    return periodOrders
      .filter(o => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  }, [periodOrders]);

  const verifiedCollected = useMemo(() => {
    return periodOrders
      .filter(o => o.paymentStatus === 'Paid')
      .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  }, [periodOrders]);

  const outstandingBalance = useMemo(() => {
    return periodOrders
      .filter(o => o.paymentStatus !== 'Paid' && o.status !== 'Cancelled')
      .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  }, [periodOrders]);

  const expensesRecorded = useMemo(() => {
    return periodExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [periodExpenses]);

  const estimatedMargin = verifiedCollected - expensesRecorded;

  const totalCompletedTransactions = useMemo(() => {
    return periodOrders.filter(o => o.paymentStatus === 'Paid' || o.status === 'Completed').length;
  }, [periodOrders]);

  const avgSales = totalCompletedTransactions > 0 ? (verifiedCollected / totalCompletedTransactions) : 0;

  // Breakdown by payment methods
  const paymentBreakdown = useMemo(() => {
    let cash = 0;
    let gcash = 0;
    let other = 0;
    periodOrders.forEach(o => {
      if (o.status === 'Cancelled') return;
      const m = (o.paymentMethod || o.method || '').toLowerCase();
      const amt = Number(o.amount) || 0;
      if (m.includes('cash') || (!m && o.source === 'Walk-in')) {
        cash += amt;
      } else if (m.includes('gcash')) {
        gcash += amt;
      } else {
        other += amt;
      }
    });
    return { cash, gcash, other };
  }, [periodOrders]);

  // Breakdown by Sales Source
  const sourceBreakdown = useMemo(() => {
    const sources = ['Walk-in', 'Online', 'Messenger', 'Phone'];
    return sources.map(src => {
      const match = periodOrders.filter(o => o.source === src && o.status !== 'Cancelled');
      const total = match.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
      const paid = match.filter(o => o.paymentStatus === 'Paid').reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
      return { source: src, total, paid, count: match.length };
    });
  }, [periodOrders]);

  // Breakdown by Product / Container Sizes
  const productBreakdown = useMemo(() => {
    const counts = { round5: 0, slim25: 0, slim5: 0 };
    const revenues = { round5: 0, slim25: 0, slim5: 0 };

    periodOrders.forEach(o => {
      if (o.status === 'Cancelled') return;
      (o.items || []).forEach(item => {
        if (counts[item.sizeId] !== undefined) {
          counts[item.sizeId] += Number(item.quantity) || 0;
        }
      });
    });

    return DEMO_PRODUCTS.map(p => ({
      ...p,
      quantity: counts[p.id] || 0
    }));
  }, [periodOrders]);

  // Aggregate Chart Data Points based on selected period
  const chartPoints = useMemo(() => {
    if (period === 'Daily') {
      // 2-hour segments across the day
      const intervals = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
      return intervals.map((time, idx) => {
        // Distribute non-cancelled orders across day intervals for demonstration
        const assignedOrders = periodOrders.filter(o => o.status !== 'Cancelled');
        const count = assignedOrders.length;
        const total = count > 0 && idx === Math.min(idx, 2) ? grossSales : 0;
        return {
          label: time,
          fullLabel: `${formatDateLabel(anchorDate)} at ${time}`,
          sales: total,
          orders: total > 0 ? count : 0
        };
      });
    }

    if (period === 'Weekly') {
      // 7 days of the week: Mon through Sun
      const { mondayDate } = getWeekRange(anchorDate);
      const days = [];
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      for (let i = 0; i < 7; i++) {
        const cur = new Date(mondayDate);
        cur.setDate(mondayDate.getDate() + i);
        const curStr = cur.toISOString().slice(0, 10);
        const dayOrders = orders.filter(o => o.date === curStr && o.status !== 'Cancelled');
        const daySales = dayOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
        days.push({
          date: curStr,
          label: dayNames[i],
          fullLabel: `${dayNames[i]}, ${cur.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`,
          sales: daySales,
          orders: dayOrders.length
        });
      }
      return days;
    }

    if (period === 'Monthly') {
      // Days of the month
      const [year, month] = anchorDate.split('-');
      const numDays = new Date(Number(year), Number(month), 0).getDate();
      const points = [];

      for (let day = 1; day <= numDays; day++) {
        const dayStr = `${year}-${month}-${String(day).padStart(2, '0')}`;
        const dayOrders = orders.filter(o => o.date === dayStr && o.status !== 'Cancelled');
        const daySales = dayOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
        points.push({
          date: dayStr,
          label: String(day),
          fullLabel: `${formatDateLabel(dayStr)}`,
          sales: daySales,
          orders: dayOrders.length
        });
      }
      return points;
    }

    if (period === 'Yearly') {
      // 12 months
      const year = anchorDate.slice(0, 4);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months.map((mName, mIdx) => {
        const mPrefix = `${year}-${String(mIdx + 1).padStart(2, '0')}`;
        const mOrders = orders.filter(o => o.date && o.date.startsWith(mPrefix) && o.status !== 'Cancelled');
        const mSales = mOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
        return {
          label: mName,
          fullLabel: `${mName} ${year}`,
          sales: mSales,
          orders: mOrders.length
        };
      });
    }

    // All Time: chronological unique dates
    const uniqueDates = Array.from(new Set(orders.map(o => o.date).filter(Boolean))).sort();
    if (!uniqueDates.length) {
      return [{ label: 'No Data', fullLabel: 'No records', sales: 0, orders: 0 }];
    }
    return uniqueDates.map(dateStr => {
      const dOrders = orders.filter(o => o.date === dateStr && o.status !== 'Cancelled');
      const dSales = dOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
      return {
        date: dateStr,
        label: dateStr.slice(5),
        fullLabel: formatDateLabel(dateStr),
        sales: dSales,
        orders: dOrders.length
      };
    });
  }, [period, anchorDate, orders, periodOrders, grossSales]);

  // Zoom handlers
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(3, prev + 1));
  };
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(1, prev - 1));
  };
  const handleResetZoom = () => {
    setZoomLevel(1);
    setActivePoint(null);
    if (chartViewportRef.current) {
      chartViewportRef.current.scrollLeft = 0;
    }
  };

  // SVG Chart Geometry calculations
  const chartHeight = 220;
  const paddingLeft = 55;
  const paddingRight = 35;
  const paddingTop = 25;
  const paddingBottom = 35;

  const maxVal = Math.max(100, ...chartPoints.map(p => p.sales));
  // Round up max to nice integer
  const niceMax = Math.ceil(maxVal / 50) * 50;

  // Base width depends on points count and zoom level
  const basePointGap = Math.max(55, 600 / Math.max(1, chartPoints.length - 1));
  const effectiveWidth = Math.max(650, (chartPoints.length - 1) * basePointGap * zoomLevel + paddingLeft + paddingRight);

  const getCoordinates = (index, val) => {
    const x = paddingLeft + (index / Math.max(1, chartPoints.length - 1)) * (effectiveWidth - paddingLeft - paddingRight);
    const usableHeight = chartHeight - paddingTop - paddingBottom;
    const y = chartHeight - paddingBottom - (val / niceMax) * usableHeight;
    return { x, y };
  };

  const linePath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    return chartPoints.map((pt, i) => {
      const { x, y } = getCoordinates(i, pt.sales);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [chartPoints, effectiveWidth, niceMax]);

  const areaPath = useMemo(() => {
    if (!linePath) return '';
    const lastIdx = chartPoints.length - 1;
    const { x: firstX } = getCoordinates(0, 0);
    const { x: lastX } = getCoordinates(lastIdx, 0);
    const bottomY = chartHeight - paddingBottom;
    return `${linePath} L ${lastX.toFixed(1)} ${bottomY} L ${firstX.toFixed(1)} ${bottomY} Z`;
  }, [linePath, chartPoints, effectiveWidth]);

  // Filtered transactions for the selected period
  const filteredTransactions = useMemo(() => {
    return periodOrders.filter(o => {
      if (!searchTx.trim()) return true;
      const q = searchTx.toLowerCase();
      return (
        (o.id && o.id.toLowerCase().includes(q)) ||
        (o.customer && o.customer.toLowerCase().includes(q)) ||
        (o.source && o.source.toLowerCase().includes(q)) ||
        (o.paymentStatus && o.paymentStatus.toLowerCase().includes(q))
      );
    });
  }, [periodOrders, searchTx]);

  return (
    <div className="sales-analytics">
      {/* Top Header & Period Selector */}
      <div className="mgmt-heading" style={{ marginBottom: 12 }}>
        <div className="overline">Business intelligence</div>
        <h1>Sales & Financial Reports</h1>
        <p>Unified business analytics, transaction history, and operating expense tracking.</p>
      </div>

      {/* Filter and Date Bar */}
      <div className="sales-top-bar">
        <div className="sales-period-tabs" role="tablist" aria-label="Report period">
          {PERIODS.map(p => (
            <button
              key={p}
              type="button"
              className={`sales-period-btn ${period === p ? 'active' : ''}`}
              onClick={() => {
                setPeriod(p);
                setZoomLevel(1);
                setActivePoint(null);
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {period !== 'All Time' && (
          <div className="sales-date-nav">
            <button
              type="button"
              className="sales-nav-btn"
              onClick={() => shiftAnchor(-1)}
              title="Previous period"
              aria-label="Previous period"
            >
              <FiChevronLeft />
            </button>
            <span>{periodLabel}</span>
            <button
              type="button"
              className="sales-nav-btn"
              onClick={() => shiftAnchor(1)}
              title="Next period"
              aria-label="Next period"
            >
              <FiChevronRight />
            </button>
            <input
              type="date"
              className="sales-date-input"
              value={anchorDate}
              onChange={e => {
                if (e.target.value) setAnchorDate(e.target.value);
              }}
              title="Select reference date"
            />
          </div>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div className="mgmt-stats" style={{ margin: '4px 0 12px' }}>
        <div className="mgmt-stat">
          <div className="mgmt-stat-top">
            <span>Gross Sales</span>
            <FiBarChart2 size={17} />
          </div>
          <strong>{formatMoney(grossSales)}</strong>
        </div>
        <div className="mgmt-stat">
          <div className="mgmt-stat-top">
            <span>Verified Collected</span>
            <FiDollarSign size={17} />
          </div>
          <strong>{formatMoney(verifiedCollected)}</strong>
        </div>
        <div className="mgmt-stat">
          <div className="mgmt-stat-top">
            <span>Outstanding Balance</span>
            <FiClock size={17} />
          </div>
          <strong>{formatMoney(outstandingBalance)}</strong>
        </div>
        <div className="mgmt-stat">
          <div className="mgmt-stat-top">
            <span>Expenses Recorded</span>
            <FiCreditCard size={17} />
          </div>
          <strong>{formatMoney(expensesRecorded)}</strong>
        </div>
      </div>

      {/* Estimated Margin Hero Card */}
      <div className="sales-margin-card">
        <div className="sales-margin-head">
          <div>
            <div className="sales-margin-title">Estimated Margin (Demo)</div>
            <div className="sales-margin-value" style={{ color: estimatedMargin >= 0 ? '#1b2f63' : '#d9383a' }}>
              {formatMoney(estimatedMargin)}
            </div>
            <p className="mgmt-sub" style={{ margin: 0 }}>
              Calculated from verified collections ({formatMoney(verifiedCollected)}) minus active recorded expenses ({formatMoney(expensesRecorded)}). Not verified actual net profit.
            </p>
          </div>
          <span className={`mgmt-pill ${estimatedMargin >= 0 ? 'ok' : 'warn'}`}>
            {estimatedMargin >= 0 ? 'Positive Margin' : 'Negative Margin'}
          </span>
        </div>
        <div className="sales-margin-meta">
          <span><FiShoppingBag /> {totalCompletedTransactions} Paid / Completed Orders</span>
          <span><FiTrendingUp /> Avg. Ticket: {formatMoney(avgSales)}</span>
          <span><FiCalendar /> {periodLabel}</span>
        </div>
      </div>

      {/* Main Interactive Line Chart */}
      <div className="sales-chart-card">
        <div className="sales-chart-header">
          <div>
            <div className="sales-chart-kicker">Sales Trend Analytics</div>
            <div className="sales-chart-total">{formatMoney(grossSales)}</div>
            <div className="sales-chart-sub">
              <span>Period: {periodLabel}</span>
              {grossSales > 0 ? (
                <span className="trend-up"><FiTrendingUp /> {periodOrders.length} Recorded Orders</span>
              ) : (
                <span className="trend-neutral">0 Sales in Selected Period</span>
              )}
            </div>
          </div>

          {/* Interactive Zoom Controls */}
          <div className="sales-zoom-controls">
            <button
              type="button"
              className="sales-zoom-btn"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1}
              title="Zoom out timeline"
              aria-label="Zoom out"
            >
              <FiZoomOut />
            </button>
            <span className="sales-zoom-level">{zoomLevel}x</span>
            <button
              type="button"
              className="sales-zoom-btn"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 3}
              title="Zoom in timeline"
              aria-label="Zoom in"
            >
              <FiZoomIn />
            </button>
            {zoomLevel > 1 && (
              <button
                type="button"
                className="sales-zoom-reset"
                onClick={handleResetZoom}
                title="Reset zoom"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Chart Viewport with smooth SVG line visualization */}
        {chartPoints.length > 0 && maxVal > 0 ? (
          <div className="sales-chart-viewport" ref={chartViewportRef}>
            <svg
              className="sales-svg-chart"
              width={effectiveWidth}
              height={chartHeight}
              viewBox={`0 0 ${effectiveWidth} ${chartHeight}`}
            >
              <defs>
                <linearGradient id="salesLineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#2aa9c5" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#244ea3" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Y Gridlines and Labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                const usable = chartHeight - paddingTop - paddingBottom;
                const y = chartHeight - paddingBottom - pct * usable;
                const val = Math.round(niceMax * pct);
                return (
                  <g key={i}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={effectiveWidth - paddingRight}
                      y2={y}
                      className="chart-grid-line"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="chart-axis-text"
                    >
                      {formatMoney(val)}
                    </text>
                  </g>
                );
              })}

              {/* Area fill under curve */}
              {areaPath && (
                <path d={areaPath} fill="url(#salesLineGrad)" />
              )}

              {/* Line path */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#244ea3"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Points, X Labels and Interactive Hit Areas */}
              {chartPoints.map((pt, i) => {
                const { x, y } = getCoordinates(i, pt.sales);
                const isSelected = activePoint === i;
                return (
                  <g key={i}>
                    {/* X Axis Label */}
                    <text
                      x={x}
                      y={chartHeight - 12}
                      textAnchor="middle"
                      className="chart-axis-text"
                    >
                      {pt.label}
                    </text>

                    {/* Point Circle */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? 6.5 : 4}
                      className={`chart-point ${isSelected ? 'active' : ''}`}
                    />

                    {/* Generous hit area for mobile tap & desktop hover */}
                    <circle
                      cx={x}
                      cy={y}
                      r={20}
                      className="chart-hit-point"
                      onMouseEnter={() => setActivePoint(i)}
                      onClick={() => setActivePoint(i)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Interactive Tooltip Callout */}
            {activePoint !== null && chartPoints[activePoint] && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: 8
                }}
              >
                <div className="sales-tooltip-bubble">
                  <div className="sales-tooltip-date">
                    {chartPoints[activePoint].fullLabel}
                  </div>
                  <div className="sales-tooltip-val">
                    {formatMoney(chartPoints[activePoint].sales)}
                  </div>
                  <div className="sales-tooltip-meta">
                    {chartPoints[activePoint].orders} orders recorded
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="sales-chart-empty">
            <FiBarChart2 size={32} />
            <h3>No Sales Recorded for this Period</h3>
            <p>
              There are no transactions dated within this period ({periodLabel}). Switch period filter to "All Time" or navigate to an active date.
            </p>
          </div>
        )}
      </div>

      {/* Financial Breakdown & Additional Analytics */}
      <div className="sales-breakdown-grid">
        {/* Payment Methods Breakdown */}
        <div className="sales-breakdown-card">
          <h3>
            <span>Payment Methods</span>
            <FiCreditCard />
          </h3>
          <div className="mgmt-row">
            <span className="mgmt-sub">Cash Sales</span>
            <strong>{formatMoney(paymentBreakdown.cash)}</strong>
          </div>
          <div className="sales-progress-bar">
            <div
              className="sales-progress-fill"
              style={{
                width: `${grossSales > 0 ? (paymentBreakdown.cash / grossSales) * 100 : 0}%`
              }}
            />
          </div>

          <div className="mgmt-row" style={{ marginTop: 12 }}>
            <span className="mgmt-sub">GCash / Digital Payments</span>
            <strong>{formatMoney(paymentBreakdown.gcash)}</strong>
          </div>
          <div className="sales-progress-bar">
            <div
              className="sales-progress-fill"
              style={{
                width: `${grossSales > 0 ? (paymentBreakdown.gcash / grossSales) * 100 : 0}%`
              }}
            />
          </div>

          {paymentBreakdown.other > 0 && (
            <>
              <div className="mgmt-row" style={{ marginTop: 12 }}>
                <span className="mgmt-sub">Other / Bank Transfer</span>
                <strong>{formatMoney(paymentBreakdown.other)}</strong>
              </div>
              <div className="sales-progress-bar">
                <div
                  className="sales-progress-fill"
                  style={{
                    width: `${grossSales > 0 ? (paymentBreakdown.other / grossSales) * 100 : 0}%`
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* Best-selling Containers / Water Types */}
        <div className="sales-breakdown-card">
          <h3>
            <span>Best-Selling Containers</span>
            <FiShoppingBag />
          </h3>
          {productBreakdown.map(prod => (
            <div key={prod.id} style={{ marginBottom: 10 }}>
              <div className="mgmt-row">
                <span className="mgmt-sub">{prod.label} · {prod.shape}</span>
                <strong>{prod.quantity} containers</strong>
              </div>
              <div className="sales-progress-bar">
                <div
                  className="sales-progress-fill"
                  style={{
                    width: `${Math.min(100, prod.quantity * 15)}%`
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Sales by Source */}
        <div className="sales-breakdown-card" style={{ gridColumn: '1 / -1' }}>
          <h3>
            <span>Sales by Order Source</span>
            <FiPieChart />
          </h3>
          <div className="mgmt-grid">
            {sourceBreakdown.map(item => (
              <div key={item.source} className="mgmt-card" style={{ padding: 12 }}>
                <div className="mgmt-row-title">{item.source}</div>
                <div style={{ margin: '6px 0', fontSize: 18, fontWeight: 800, color: '#1b2f63' }}>
                  {formatMoney(item.total)}
                </div>
                <div className="mgmt-sub">
                  {item.count} orders ({formatMoney(item.paid)} verified)
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filtered Period Transactions */}
      <div className="sales-tx-card">
        <div className="sales-tx-header">
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1b2f63' }}>
              Transactions in this Period ({filteredTransactions.length})
            </h3>
            <p className="mgmt-sub" style={{ margin: '2px 0 0' }}>
              Non-cancelled orders included in gross sales and financial totals.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FiSearch color="#64748d" />
            <input
              type="text"
              placeholder="Search by ID, customer..."
              className="sales-tx-search"
              value={searchTx}
              onChange={e => setSearchTx(e.target.value)}
            />
          </div>
        </div>

        <div className="sales-tx-list">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map(o => (
              <div key={o.id} className="sales-tx-item">
                <div className="sales-tx-info">
                  <strong>{o.id} · {o.customer || 'Walk-in'}</strong>
                  <p>{o.source} · {o.service} · {formatDateLabel(o.date)}</p>
                </div>
                <div className="sales-tx-amount">
                  <strong>{formatMoney(o.amount)}</strong>
                  <span className={`mgmt-pill ${o.paymentStatus === 'Paid' ? 'ok' : 'warn'}`}>
                    {o.paymentStatus}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="owner-empty">
              <FiFileText size={20} />
              <p>No transactions match your search filter in this period.</p>
            </div>
          )}
        </div>
      </div>

      {/* Reused Station Expenses Component */}
      <ExpenseReport
        expenses={expenses}
        setExpenses={setExpenses}
        onEvent={onNotice}
      />

      <div className="mgmt-notice" style={{ marginTop: 14 }}>
        <strong>AquaBest Financial Integrity Notice:</strong> All metrics, margins and charts are calculated in real time from current session orders and recorded station expenses. Production deployment requires persistent database timestamps and server-validated payments.
      </div>
    </div>
  );
}
