import { useState, useMemo, useRef, useEffect } from 'react';
import {
  FiBarChart2, FiDollarSign, FiClock, FiCreditCard, FiTrendingUp,
  FiZoomIn, FiZoomOut, FiRefreshCw, FiCalendar, FiChevronLeft,
  FiChevronRight, FiPieChart, FiShoppingBag, FiSearch, FiFileText,
  FiCheckCircle, FiChevronDown, FiChevronUp, FiInfo
} from 'react-icons/fi';
import { DEMO_PRODUCTS, formatMoney } from '../data/managerDemo.js';
import ExpenseReport from './ExpenseReport.jsx';
import './salesReports.css';

const PERIODS = ['Daily', 'Weekly', 'Monthly', 'Yearly', 'All Time'];

// Format date strings for clean presentation
function formatDateLabel(dateStr) {
  if (!dateStr) return 'Unspecified';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Get ISO week range for an anchor date (Sunday to Saturday or Monday to Sunday)
function getWeekRange(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  // Sunday start to Saturday end
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  return {
    startStr: sunday.toISOString().slice(0, 10),
    endStr: saturday.toISOString().slice(0, 10),
    startDate: sunday,
    endDate: saturday
  };
}

// Accurate Payment Method Classification
function classifyPaymentMethod(order) {
  const m = (order.paymentMethod || order.method || '').trim().toLowerCase();
  if (m === 'cash') return 'Cash';
  if (m === 'gcash') return 'GCash';
  if (m === 'bank transfer' || m.includes('bank') || m.includes('transfer')) return 'Bank Transfer';
  if (!m && order.source === 'Walk-in') return 'Cash';
  if (!m) return 'Not Specified';
  return 'Other';
}

export default function SalesReports({
  orders = [],
  expenses = [],
  setExpenses,
  onNotice = () => {}
}) {
  // Determine anchor date defaulting to latest order date or today
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

  // Accordion state (collapsed on mobile by default, expanded on desktop)
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [expensesOpen, setExpensesOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 850) {
      setBreakdownOpen(true);
      setTransactionsOpen(true);
      setExpensesOpen(true);
    }
  }, []);

  // Format active period label
  const periodLabel = useMemo(() => {
    if (period === 'All Time') return 'All Recorded Time';
    if (period === 'Daily') return formatDateLabel(anchorDate);
    if (period === 'Weekly') {
      const { startStr, endStr } = getWeekRange(anchorDate);
      return `${formatDateLabel(startStr)} – ${formatDateLabel(endStr)}`;
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

  // Navigate date range
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

  // Filter orders by period
  const periodOrders = useMemo(() => {
    if (period === 'All Time') return orders;
    if (period === 'Daily') {
      return orders.filter(o => o.date === anchorDate);
    }
    if (period === 'Weekly') {
      const { startStr, endStr } = getWeekRange(anchorDate);
      return orders.filter(o => o.date && o.date >= startStr && o.date <= endStr);
    }
    if (period === 'Monthly') {
      const prefix = anchorDate.slice(0, 7);
      return orders.filter(o => o.date && o.date.startsWith(prefix));
    }
    if (period === 'Yearly') {
      const year = anchorDate.slice(0, 4);
      return orders.filter(o => o.date && o.date.startsWith(year));
    }
    return orders;
  }, [orders, period, anchorDate]);

  // Filter active expenses by period
  const periodExpenses = useMemo(() => {
    if (period === 'All Time') return expenses.filter(e => e.active);
    if (period === 'Daily') {
      return expenses.filter(e => e.active && e.date === anchorDate);
    }
    if (period === 'Weekly') {
      const { startStr, endStr } = getWeekRange(anchorDate);
      return expenses.filter(e => e.active && e.date && e.date >= startStr && e.date <= endStr);
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

  // Financial Statistics
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

  // Accurate Payment Breakdown (distinguish recorded vs verified)
  const paymentBreakdown = useMemo(() => {
    const buckets = {
      Cash: { recorded: 0, verified: 0, count: 0, paidCount: 0 },
      GCash: { recorded: 0, verified: 0, count: 0, paidCount: 0 },
      'Bank Transfer': { recorded: 0, verified: 0, count: 0, paidCount: 0 },
      'Not Specified': { recorded: 0, verified: 0, count: 0, paidCount: 0 }
    };

    periodOrders.forEach(o => {
      if (o.status === 'Cancelled') return;
      const cat = classifyPaymentMethod(o);
      const target = buckets[cat] || buckets['Not Specified'];
      const amt = Number(o.amount) || 0;
      target.recorded += amt;
      target.count += 1;
      if (o.paymentStatus === 'Paid') {
        target.verified += amt;
        target.paidCount += 1;
      }
    });

    return buckets;
  }, [periodOrders]);

  // Best-Selling Container counts & relative progress
  const productBreakdown = useMemo(() => {
    const counts = { round5: 0, slim25: 0, slim5: 0 };
    periodOrders.forEach(o => {
      if (o.status === 'Cancelled') return;
      (o.items || []).forEach(item => {
        if (counts[item.sizeId] !== undefined) {
          counts[item.sizeId] += Number(item.quantity) || 0;
        }
      });
    });

    const list = DEMO_PRODUCTS.map(p => ({
      ...p,
      quantity: counts[p.id] || 0
    }));

    const maxQty = Math.max(0, ...list.map(p => p.quantity));
    return { list, maxQty };
  }, [periodOrders]);

  // Sales by Order Source
  const sourceBreakdown = useMemo(() => {
    const sources = ['Walk-in', 'Online', 'Messenger', 'Phone'];
    return sources.map(src => {
      const match = periodOrders.filter(o => o.source === src && o.status !== 'Cancelled');
      const total = match.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
      const paid = match.filter(o => o.paymentStatus === 'Paid').reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
      return {
        source: src,
        total,
        paid,
        count: match.length
      };
    });
  }, [periodOrders]);

  // Honest Chart Data Aggregation (No invented hours!)
  const chartPoints = useMemo(() => {
    if (period === 'Daily') {
      // Do not invent fake hourly timestamps.
      // Show the selected day's actual recorded total, and surrounding days of that week for context.
      const { startDate } = getWeekRange(anchorDate);
      const days = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      for (let i = 0; i < 7; i++) {
        const cur = new Date(startDate);
        cur.setDate(startDate.getDate() + i);
        const curStr = cur.toISOString().slice(0, 10);
        const dayOrders = orders.filter(o => o.date === curStr && o.status !== 'Cancelled');
        const daySales = dayOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
        const isCurrent = curStr === anchorDate;
        days.push({
          date: curStr,
          label: dayNames[i],
          fullLabel: `${dayNames[i]}, ${cur.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}${isCurrent ? ' (Selected)' : ''}`,
          sales: daySales,
          orders: dayOrders.length,
          isSelectedDay: isCurrent
        });
      }
      return days;
    }

    if (period === 'Weekly') {
      // Sunday to Saturday
      const { startDate } = getWeekRange(anchorDate);
      const days = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      for (let i = 0; i < 7; i++) {
        const cur = new Date(startDate);
        cur.setDate(startDate.getDate() + i);
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
          fullLabel: formatDateLabel(dayStr),
          sales: daySales,
          orders: dayOrders.length
        });
      }
      return points;
    }

    if (period === 'Yearly') {
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

    // All Time
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
  }, [period, anchorDate, orders]);

  // Zoom Handlers
  const handleZoomIn = () => setZoomLevel(prev => Math.min(3, prev + 1));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(1, prev - 1));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setActivePoint(null);
    if (chartViewportRef.current) chartViewportRef.current.scrollLeft = 0;
  };

  // SVG Chart Geometry
  const chartHeight = 195;
  const paddingLeft = 45;
  const paddingRight = 25;
  const paddingTop = 20;
  const paddingBottom = 28;

  const maxVal = Math.max(100, ...chartPoints.map(p => p.sales));
  const niceMax = Math.ceil(maxVal / 50) * 50;

  const basePointGap = Math.max(48, 480 / Math.max(1, chartPoints.length - 1));
  const effectiveWidth = Math.max(540, (chartPoints.length - 1) * basePointGap * zoomLevel + paddingLeft + paddingRight);

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

  // Filtered Transactions
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
      {/* 1. Compact Report Heading */}
      <div className="sales-header">
        <div className="overline">BUSINESS INTELLIGENCE</div>
        <h1>Sales & Financial Reports</h1>
        <p>Unified business analytics, transaction history, and operating expense tracking.</p>
      </div>

      {/* 2. Period Selector & Date Navigation */}
      <div className="sales-filter-row">
        <div className="sales-period-pillbar" role="tablist" aria-label="Reporting period">
          {PERIODS.map(p => (
            <button
              key={p}
              type="button"
              className={`sales-period-pill ${period === p ? 'active' : ''}`}
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
          <div className="sales-date-toolbar">
            <div className="sales-range-nav">
              <button
                type="button"
                className="sales-nav-arrow"
                onClick={() => shiftAnchor(-1)}
                aria-label="Previous period"
              >
                <FiChevronLeft />
              </button>
              <div className="sales-range-label">
                <FiCalendar />
                <span>{periodLabel}</span>
              </div>
              <button
                type="button"
                className="sales-nav-arrow"
                onClick={() => shiftAnchor(1)}
                aria-label="Next period"
              >
                <FiChevronRight />
              </button>
            </div>

            <label className="sales-pick-btn" title="Pick specific date">
              <FiCalendar />
              <span>Pick Date</span>
              <input
                type="date"
                className="sales-pick-input"
                value={anchorDate}
                onChange={e => {
                  if (e.target.value) setAnchorDate(e.target.value);
                }}
              />
            </label>
          </div>
        )}
      </div>

      {/* 3. Four Primary KPI Cards (2x2 Grid) */}
      <div className="sales-kpi-grid">
        <div className="sales-kpi-card">
          <div className="sales-kpi-icon blue">
            <FiBarChart2 />
          </div>
          <div className="sales-kpi-content">
            <span className="sales-kpi-label">Gross Sales</span>
            <strong className="sales-kpi-amount">{formatMoney(grossSales)}</strong>
          </div>
        </div>

        <div className="sales-kpi-card">
          <div className="sales-kpi-icon green">
            <FiCheckCircle />
          </div>
          <div className="sales-kpi-content">
            <span className="sales-kpi-label">Verified Collected</span>
            <strong className="sales-kpi-amount">{formatMoney(verifiedCollected)}</strong>
          </div>
        </div>

        <div className="sales-kpi-card">
          <div className="sales-kpi-icon amber">
            <FiClock />
          </div>
          <div className="sales-kpi-content">
            <span className="sales-kpi-label">Outstanding Balance</span>
            <strong className="sales-kpi-amount">{formatMoney(outstandingBalance)}</strong>
          </div>
        </div>

        <div className="sales-kpi-card">
          <div className="sales-kpi-icon cyan">
            <FiCreditCard />
          </div>
          <div className="sales-kpi-content">
            <span className="sales-kpi-label">Expenses Recorded</span>
            <strong className="sales-kpi-amount">{formatMoney(expensesRecorded)}</strong>
          </div>
        </div>
      </div>

      {/* 4. Compact Estimated Margin Banner */}
      <div className="sales-margin-banner">
        <div className="sales-margin-left">
          <div className="sales-margin-kicker">
            <FiTrendingUp /> ESTIMATED MARGIN
          </div>
          <strong className="sales-margin-amount">
            {formatMoney(estimatedMargin)}
          </strong>
        </div>

        <div className="sales-margin-center">
          <span>Verified collections minus recorded expenses.</span>
          <em>Not verified actual net profit.</em>
        </div>

        <div
          className={`sales-margin-badge ${
            estimatedMargin > 0 ? 'positive' : estimatedMargin < 0 ? 'negative' : 'neutral'
          }`}
        >
          <span className="sales-status-dot" />
          <span>{estimatedMargin > 0 ? 'Positive' : estimatedMargin < 0 ? 'Negative' : 'Neutral'}</span>
        </div>
      </div>

      {/* 5. Sales Trend Line Chart (Centerpiece) */}
      <div className="sales-chart-card">
        <div className="sales-chart-header">
          <div>
            <div className="sales-chart-title">
              <FiTrendingUp />
              <span>Sales Trend Analytics</span>
            </div>
            <div className="sales-chart-subtitle">
              {period === 'Daily' ? 'Daily View' : period === 'Weekly' ? 'Weekly Sales' : period} • {periodLabel}
            </div>
          </div>

          <div className="sales-zoom-actions">
            <button
              type="button"
              className="sales-zoom-pill"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 3}
              title="Zoom in timeline"
            >
              <FiZoomIn /> Zoom In
            </button>
            <button
              type="button"
              className="sales-zoom-pill"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1}
              title="Zoom out timeline"
            >
              <FiZoomOut /> Zoom Out
            </button>
            {zoomLevel > 1 && (
              <button
                type="button"
                className="sales-zoom-pill"
                onClick={handleResetZoom}
                title="Reset zoom to 1x"
              >
                <FiRefreshCw /> Reset
              </button>
            )}
          </div>
        </div>

        {period === 'Daily' && (
          <div style={{ fontSize: 11, color: '#667788', marginBottom: 8, fontStyle: 'italic' }}>
            Note: Order records store calendar dates without hourly timestamps. Displaying daily sales total ({formatMoney(grossSales)}).
          </div>
        )}

        {/* Chart Viewport */}
        {chartPoints.length > 0 && maxVal > 0 ? (
          <div className="sales-chart-viewport" ref={chartViewportRef}>
            <svg
              className="sales-svg-chart"
              width={effectiveWidth}
              height={chartHeight}
              viewBox={`0 0 ${effectiveWidth} ${chartHeight}`}
            >
              <defs>
                <linearGradient id="chartGradMobile" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#2aa9c5" stopOpacity="0.25" />
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

              {/* Gradient Area under line */}
              {areaPath && (
                <path d={areaPath} fill="url(#chartGradMobile)" />
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

              {/* Data points, labels, and generous touch targets */}
              {chartPoints.map((pt, i) => {
                const { x, y } = getCoordinates(i, pt.sales);
                const isSelected = activePoint === i;
                return (
                  <g key={i}>
                    <text
                      x={x}
                      y={chartHeight - 8}
                      textAnchor="middle"
                      className="chart-axis-text"
                    >
                      {pt.label}
                    </text>
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? 6 : 3.5}
                      className={`chart-point ${isSelected ? 'active' : ''}`}
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={24}
                      className="chart-hit-point"
                      onMouseEnter={() => setActivePoint(i)}
                      onClick={() => setActivePoint(i)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Tooltip */}
            {activePoint !== null && chartPoints[activePoint] && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
                <div className="sales-tooltip-bubble">
                  <div className="sales-tooltip-date">
                    {chartPoints[activePoint].fullLabel}
                  </div>
                  <div className="sales-tooltip-val">
                    {formatMoney(chartPoints[activePoint].sales)}
                  </div>
                  <div className="sales-tooltip-meta">
                    {chartPoints[activePoint].orders === 1 ? '1 order' : `${chartPoints[activePoint].orders} orders`}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: '#8899a6', fontSize: 12 }}>
            No sales recorded for this period ({periodLabel}).
          </div>
        )}
      </div>

      {/* 6. Expandable Accordion A: Sales Breakdown */}
      <div className={`sales-accordion ${breakdownOpen ? 'open' : ''}`}>
        <button
          type="button"
          className="sales-accordion-header"
          onClick={() => setBreakdownOpen(prev => !prev)}
          aria-expanded={breakdownOpen}
        >
          <div className="sales-accordion-left">
            <div className="sales-acc-icon">
              <FiPieChart />
            </div>
            <div className="sales-accordion-text">
              <strong>Sales Breakdown</strong>
              <small>Payment methods, containers, and order sources</small>
            </div>
          </div>
          <div className="sales-accordion-chevron">
            {breakdownOpen ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </button>

        {breakdownOpen && (
          <div className="sales-accordion-body">
            {/* Payment Methods */}
            <div className="sales-inner-card">
              <div className="sales-inner-title">
                <span>Payment Methods</span>
                <FiCreditCard />
              </div>
              {Object.entries(paymentBreakdown).map(([method, data]) => {
                if (data.recorded === 0 && method === 'Bank Transfer') return null;
                const pct = grossSales > 0 ? (data.recorded / grossSales) * 100 : 0;
                return (
                  <div key={method} style={{ marginBottom: 8 }}>
                    <div className="mgmt-row">
                      <span className="mgmt-sub">
                        {method} ({data.count === 1 ? '1 order' : `${data.count} orders`})
                      </span>
                      <strong>
                        {formatMoney(data.verified)}{' '}
                        <small style={{ color: '#667788', fontWeight: 500 }}>
                          ({formatMoney(data.recorded)} recorded)
                        </small>
                      </strong>
                    </div>
                    <div className="sales-progress-bar">
                      <div className="sales-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Best-Selling Containers */}
            <div className="sales-inner-card">
              <div className="sales-inner-title">
                <span>Best-Selling Containers</span>
                <FiShoppingBag />
              </div>
              {productBreakdown.maxQty > 0 ? (
                productBreakdown.list.map(prod => {
                  const pct = (prod.quantity / productBreakdown.maxQty) * 100;
                  const countLabel = prod.quantity === 1 ? '1 container' : `${prod.quantity} containers`;
                  return (
                    <div key={prod.id} style={{ marginBottom: 8 }}>
                      <div className="mgmt-row">
                        <span className="mgmt-sub">{prod.label} · {prod.shape}</span>
                        <strong>{countLabel}</strong>
                      </div>
                      <div className="sales-progress-bar">
                        <div className="sales-progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="mgmt-sub" style={{ margin: 0 }}>No containers sold in this period.</p>
              )}
            </div>

            {/* Sales by Source */}
            <div className="sales-inner-card">
              <div className="sales-inner-title">
                <span>Sales by Order Source</span>
                <FiPieChart />
              </div>
              <div className="mgmt-grid" style={{ gap: 8 }}>
                {sourceBreakdown.map(item => (
                  <div key={item.source} className="mgmt-card" style={{ padding: 10, borderRadius: 12 }}>
                    <div className="mgmt-row-title">{item.source}</div>
                    <div style={{ margin: '4px 0', fontSize: 16, fontWeight: 800, color: '#1b2f63' }}>
                      {formatMoney(item.total)}
                    </div>
                    <div className="mgmt-sub" style={{ fontSize: 10 }}>
                      {item.count === 1 ? '1 order' : `${item.count} orders`} ({formatMoney(item.paid)} verified)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 7. Expandable Accordion B: Transactions */}
      <div className={`sales-accordion ${transactionsOpen ? 'open' : ''}`}>
        <button
          type="button"
          className="sales-accordion-header"
          onClick={() => setTransactionsOpen(prev => !prev)}
          aria-expanded={transactionsOpen}
        >
          <div className="sales-accordion-left">
            <div className="sales-acc-icon">
              <FiFileText />
            </div>
            <div className="sales-accordion-text">
              <strong>Transactions ({periodOrders.length})</strong>
              <small>View order history and payment status</small>
            </div>
          </div>
          <div className="sales-accordion-chevron">
            {transactionsOpen ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </button>

        {transactionsOpen && (
          <div className="sales-accordion-body">
            <div className="sales-tx-toolbar">
              <FiSearch color="#64748d" />
              <input
                type="text"
                placeholder="Search orders..."
                className="sales-tx-search-input"
                value={searchTx}
                onChange={e => setSearchTx(e.target.value)}
              />
            </div>

            <div>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map(o => (
                  <div key={o.id} className="sales-tx-row">
                    <div className="sales-tx-row-info">
                      <strong>{o.id} · {o.customer || 'Walk-in'}</strong>
                      <small>{o.source} • {o.service} • {formatDateLabel(o.date)}</small>
                    </div>
                    <div className="sales-tx-row-amount">
                      <strong>{formatMoney(o.amount)}</strong>
                      <span className={`mgmt-pill ${o.paymentStatus === 'Paid' ? 'ok' : 'warn'}`}>
                        {o.paymentStatus}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="mgmt-sub" style={{ textAlign: 'center', padding: '12px 0', margin: 0 }}>
                  No transactions match your search filter.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 8. Expandable Accordion C: Expenses */}
      <div className={`sales-accordion ${expensesOpen ? 'open' : ''}`}>
        <button
          type="button"
          className="sales-accordion-header"
          onClick={() => setExpensesOpen(prev => !prev)}
          aria-expanded={expensesOpen}
        >
          <div className="sales-accordion-left">
            <div className="sales-acc-icon">
              <FiCreditCard />
            </div>
            <div className="sales-accordion-text">
              <strong>Expenses</strong>
              <small>Recorded station expenses ({formatMoney(expensesRecorded)} active)</small>
            </div>
          </div>
          <div className="sales-accordion-chevron">
            {expensesOpen ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </button>

        {expensesOpen && (
          <div className="sales-accordion-body" style={{ background: 'white' }}>
            <ExpenseReport
              expenses={expenses}
              setExpenses={setExpenses}
              onEvent={onNotice}
            />
          </div>
        )}
      </div>

      {/* 9. Financial Integrity Notice */}
      <div className="sales-notice-card">
        <FiInfo />
        <div>
          <strong>AquaBest Financial Integrity Notice:</strong> All metrics, margins and charts are calculated in real time from current session orders and recorded station expenses. Production deployment requires persistent database timestamps and server-validated payments.
        </div>
      </div>
    </div>
  );
}
