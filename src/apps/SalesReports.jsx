import { useState, useMemo, useRef, useEffect } from 'react';
import {
  FiBarChart2, FiClock, FiCreditCard, FiTrendingUp,
  FiZoomIn, FiZoomOut, FiRefreshCw, FiCalendar, FiChevronLeft,
  FiChevronRight, FiPieChart, FiShoppingBag, FiSearch, FiFileText,
  FiCheckCircle, FiChevronDown, FiChevronUp, FiInfo, FiDownload,
  FiTruck, FiAlertCircle
} from 'react-icons/fi';
import { formatMoney } from '../data/managerDemo.js';
import { buildSalesReportData } from '../utils/buildSalesReportData.js';
import ExpenseReport from './ExpenseReport.jsx';
import { getTodayLocalDate, shiftAnchorDate, filterByDateRange } from '../utils/reportDateUtils.js';
import { getPeriodLabel, getPeriodFilename, getWeekRange, formatDateLabel, parseLocalDate } from '../utils/dateUtils.js';
import {
  generateFinancialSummaryPDF,
  generateCompleteFinancialReportPDF
} from '../utils/generateSalesReportPDF.js';
import './salesReports.css';

const PERIODS = ['Daily', 'Weekly', 'Monthly', 'Yearly', 'All Time', 'Custom'];

function getOrderHour(order) {
  const raw = order?.time || order?.createdAt || order?.created_at;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const value = raw.trim();
  const timeMatch = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (timeMatch) {
    let hour = Number(timeMatch[1]);
    const meridiem = (timeMatch[3] || '').toUpperCase();
    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    return hour >= 0 && hour <= 23 ? hour : null;
  }
  if (value.includes('T')) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      const hourStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        hour: 'numeric',
        hour12: false
      }).format(parsed);
      const hr = Number(hourStr) % 24;
      return Number.isFinite(hr) ? hr : null;
    }
  }
  return null;
}

export default function SalesReports({
  orders = [],
  expenses = [],
  setExpenses,
  onNotice = () => { },
  isOwner = false
}) {
  // Determine anchor date defaulting to latest order date or today
  const defaultDate = useMemo(() => {
    const dates = orders.map(o => o.date).filter(Boolean).sort();
    return dates.length ? dates[dates.length - 1] : getTodayLocalDate();
  }, [orders]);

  const todayStr = getTodayLocalDate();
  const [period, setPeriod] = useState('Weekly');
  const [anchorDate, setAnchorDate] = useState(defaultDate);
  const [customStart, setCustomStart] = useState(defaultDate);
  const [customEnd, setCustomEnd] = useState(defaultDate);
  const [chartMetric, setChartMetric] = useState('revenue');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activePoint, setActivePoint] = useState(null);
  const [searchTx, setSearchTx] = useState('');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(null);

  const chartViewportRef = useRef(null);
  const exportDropdownRef = useRef(null);

  // Accordion state (collapsed on mobile by default, expanded on desktop)
  const [breakdownOpen, setBreakdownOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 850);
  const [transactionsOpen, setTransactionsOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 850);
  const [expensesOpen, setExpensesOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 850);

  // Close export dropdown on outside click or Escape
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target)) {
        setExportMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setExportMenuOpen(false);
    };

    if (exportMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [exportMenuOpen]);

  // Period label for display
  const periodLabel = useMemo(() => {
    if (period === 'Custom') {
      return customStart === customEnd ? formatDateLabel(customStart) : `${formatDateLabel(customStart)} – ${formatDateLabel(customEnd)}`;
    }
    return getPeriodLabel(period, anchorDate);
  }, [period, anchorDate, customStart, customEnd]);

  const periodFilename = useMemo(() => {
    if (period === 'Custom') return `${customStart}_to_${customEnd}`;
    return getPeriodFilename(period, anchorDate);
  }, [period, anchorDate, customStart, customEnd]);

  // Navigate date range safely (capped at todayStr to prevent future navigation)
  const shiftAnchor = (step) => {
    const nextDate = shiftAnchorDate(anchorDate, period, step);
    if (step > 0 && nextDate > todayStr) return;
    setAnchorDate(nextDate);
    setZoomLevel(1);
    setActivePoint(null);
    if (chartViewportRef.current) chartViewportRef.current.scrollLeft = 0;
  };

  // One shared calculation source powers the visible report and PDF payload.
  const reportData = useMemo(() => {
    const scopedOrders = period === 'Custom' ? filterByDateRange(orders, customStart, customEnd) : orders;
    const scopedExpenses = period === 'Custom' ? filterByDateRange(expenses, customStart, customEnd) : expenses;
    return buildSalesReportData({
      orders: scopedOrders,
      expenses: scopedExpenses,
      period: period === 'Custom' ? 'All Time' : period,
      anchorDate
    });
  }, [orders, expenses, period, anchorDate, customStart, customEnd]);

  const {
    periodOrders,
    activePeriodOrders,
    periodExpenses,
    grossSales,
    verifiedCollected,
    outstandingBalance,
    unknownPaymentBalance,
    recordedExpenses,
    paidExpenses,
    unpaidExpenses,
    unrecordedStatusExpenses,
    collectionsAfterPaidExpenses,
    totalOrders,
    cancelledOrdersCount,
    paidOrdersCount,
    unpaidOrdersCount,
    unknownPaymentOrdersCount,
    avgTicket,
    paymentBreakdown,
    serviceBreakdown,
    productBreakdown,
    sourceBreakdown,
    receivablesList,
    transactionsList,
    expensesList
  } = reportData;

  // Only display hourly data when the selected day has real transaction times.
  const hasHourlyTimestamps = useMemo(
    () => activePeriodOrders.some(order => getOrderHour(order) !== null),
    [activePeriodOrders]
  );

  const chartPoints = useMemo(() => {
    if (period === 'Daily') {
      if (!hasHourlyTimestamps) {
        if (activePeriodOrders.length === 0) return [];
        return [{
          label: 'Daily Total',
          fullLabel: `${formatDateLabel(anchorDate)} (Daily Total — no hourly timestamps)`,
          sales: grossSales,
          orders: activePeriodOrders.length
        }];
      }
      return Array.from({ length: 24 }, (_, hour) => {
        const label = hour === 0 ? '12 AM' : hour < 12 ? hour + ' AM' : hour === 12 ? '12 PM' : (hour - 12) + ' PM';
        const matchOrders = activePeriodOrders.filter(order => getOrderHour(order) === hour);
        return {
          label,
          fullLabel: label + ' (' + formatDateLabel(anchorDate) + ')',
          sales: matchOrders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0),
          orders: matchOrders.length
        };
      });
    }

    if (period === 'Weekly') {
      const week = getWeekRange(anchorDate);
      const days = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 0; i < 7; i++) {
        const current = new Date(week.startDate);
        current.setDate(current.getDate() + i);
        const dateString = [
          current.getFullYear(),
          String(current.getMonth() + 1).padStart(2, '0'),
          String(current.getDate()).padStart(2, '0')
        ].join('-');
        const dayOrders = activePeriodOrders.filter(order => order.date === dateString);
        days.push({
          date: dateString,
          label: dayNames[i],
          fullLabel: dayNames[i] + ', ' + formatDateLabel(dateString),
          sales: dayOrders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0),
          orders: dayOrders.length
        });
      }
      return days;
    }

    if (period === 'Monthly') {
      const parts = anchorDate.split('-');
      const year = Number(parts[0]);
      const month = Number(parts[1]);
      const dayCount = new Date(year, month, 0).getDate();
      return Array.from({ length: dayCount }, (_, index) => {
        const day = index + 1;
        const dateString = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        const dayOrders = activePeriodOrders.filter(order => order.date === dateString);
        return {
          date: dateString,
          label: String(day),
          fullLabel: formatDateLabel(dateString),
          sales: dayOrders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0),
          orders: dayOrders.length
        };
      });
    }

    if (period === 'Yearly') {
      const year = anchorDate.slice(0, 4);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months.map((monthName, index) => {
        const prefix = year + '-' + String(index + 1).padStart(2, '0');
        const monthOrders = activePeriodOrders.filter(order => order.date && order.date.startsWith(prefix));
        return {
          label: monthName,
          fullLabel: monthName + ' ' + year,
          sales: monthOrders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0),
          orders: monthOrders.length
        };
      });
    }

    // All Time is grouped by month so long-running histories remain readable.
    const months = Array.from(new Set(
      activePeriodOrders
        .map(order => String(order.date || '').slice(0, 7))
        .filter(value => /^\d{4}-\d{2}$/.test(value))
    )).sort();

    if (!months.length) return [];

    const first = parseLocalDate(months[0] + '-01');
    const last = parseLocalDate(months[months.length - 1] + '-01');
    const points = [];
    const cursor = new Date(first);
    while (cursor <= last) {
      const prefix = cursor.getFullYear() + '-' + String(cursor.getMonth() + 1).padStart(2, '0');
      const monthOrders = activePeriodOrders.filter(order => order.date && order.date.startsWith(prefix));
      points.push({
        label: cursor.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' }),
        fullLabel: cursor.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }),
        sales: monthOrders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0),
        orders: monthOrders.length
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return points;
  }, [period, anchorDate, activePeriodOrders, hasHourlyTimestamps, grossSales]);

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

  const hasSales = useMemo(() => chartPoints.some(pt => pt.sales > 0), [chartPoints]);
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
    const usableHeight = chartHeight - paddingTop - paddingBottom;
    const spanX = effectiveWidth - paddingLeft - paddingRight;
    return chartPoints.map((pt, i) => {
      const x = paddingLeft + (i / Math.max(1, chartPoints.length - 1)) * spanX;
      const y = chartHeight - paddingBottom - (pt.sales / niceMax) * usableHeight;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [chartPoints, effectiveWidth, niceMax]);

  const areaPath = useMemo(() => {
    if (!linePath) return '';
    const lastIdx = chartPoints.length - 1;
    const spanX = effectiveWidth - paddingLeft - paddingRight;
    const firstX = paddingLeft;
    const lastX = paddingLeft + (lastIdx / Math.max(1, chartPoints.length - 1)) * spanX;
    const bottomY = chartHeight - paddingBottom;
    return `${linePath} L ${lastX.toFixed(1)} ${bottomY} L ${firstX.toFixed(1)} ${bottomY} Z`;
  }, [linePath, chartPoints.length, effectiveWidth]);

  // Filtered Transactions for UI list
  const filteredTransactions = useMemo(() => {
    return periodOrders.filter(o => {
      if (!searchTx.trim()) return true;
      const q = searchTx.toLowerCase();
      return (
        (o.id && o.id.toLowerCase().includes(q)) ||
        (o.customer && o.customer.toLowerCase().includes(q)) ||
        (o.source && o.source.toLowerCase().includes(q)) ||
        (o.service && o.service.toLowerCase().includes(q)) ||
        (o.paymentStatus && o.paymentStatus.toLowerCase().includes(q)) ||
        (o.status && o.status.toLowerCase().includes(q))
      );
    });
  }, [periodOrders, searchTx]);

  // Compatibility adapter for the existing PDF layout. All amounts originate in reportData.
  const buildReportPDFData = () => ({
    period,
    periodLabel,
    periodFilename,
    dateGenerated: reportData.dateGenerated,
    role: isOwner ? 'Super Admin' : 'Station Manager',
    grossSales,
    discounts: null,
    netSales: grossSales,
    verifiedCollected,
    outstandingBalance,
    unknownPaymentBalance,
    unknownPaymentOrdersCount,
    unknownPaymentOrders: reportData.unknownPaymentOrders,
    recordedExpenses,
    paidExpenses,
    unpaidExpenses,
    unrecordedStatusExpenses,
    collectionsAfterPaidExpenses,
    totalOrders,
    paidOrdersCount,
    unpaidOrdersCount,
    cancelledOrdersCount,
    avgTicket,
    sources: sourceBreakdown.map(source => ({
      source: source.source,
      orders: source.count,
      gross: source.total,
      verified: source.paid
    })),
    services: serviceBreakdown,
    paymentMethods: Object.entries(paymentBreakdown).map(([method, value]) => ({
      method,
      orders: value.count,
      recorded: value.recorded,
      verified: value.verified
    })),
    containers: productBreakdown.list.map(product => ({
      label: product.label + ' · ' + product.shape,
      quantity: product.quantity,
      share: product.share
    })),
    expensesList,
    receivablesList,
    transactionsList
  });

  // Trigger Financial Summary PDF
  const handleDownloadSummaryPDF = async () => {
    try {
      setIsGeneratingPDF('summary');
      setExportMenuOpen(false);
      const dataPayload = buildReportPDFData();
      const filename = await generateFinancialSummaryPDF(dataPayload);
      onNotice(`Financial Summary PDF downloaded: ${filename}`);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      onNotice('Could not generate Financial Summary PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(null);
    }
  };

  // Trigger Complete Financial Report PDF
  const handleDownloadCompletePDF = async () => {
    try {
      setIsGeneratingPDF('complete');
      setExportMenuOpen(false);
      const dataPayload = buildReportPDFData();
      const filename = await generateCompleteFinancialReportPDF(dataPayload);
      onNotice(`Complete Financial Report PDF downloaded: ${filename}`);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      onNotice('Could not generate Complete Financial Report PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(null);
    }
  };

  return (
    <div className="sales-analytics">
      {/* 1. Header Bar with Download Report Button */}
      <div className="sales-header-bar">
        <div className="sales-header">
          <div className="overline">BUSINESS INTELLIGENCE</div>
          <h1>Sales & Financial Reports</h1>
          <p>Unified business analytics, transaction history, and operating expense tracking.</p>
        </div>

        {/* Download Report Button & Dropdown */}
        <div className="sales-download-holder" ref={exportDropdownRef}>
          <button
            type="button"
            className="sales-download-btn"
            onClick={() => setExportMenuOpen(prev => !prev)}
            disabled={isGeneratingPDF !== null}
            aria-expanded={exportMenuOpen}
            aria-haspopup="true"
          >
            <FiDownload />
            <span>{isGeneratingPDF ? 'Preparing PDF...' : 'Download Report'}</span>
            <FiChevronDown />
          </button>

          {exportMenuOpen && (
            <div className="sales-download-dropdown" role="menu">
              <button
                type="button"
                className="sales-download-option"
                onClick={handleDownloadSummaryPDF}
                role="menuitem"
              >
                <strong><FiFileText /> Financial Summary PDF</strong>
                <small>One-page executive KPI & deductions overview</small>
              </button>

              <button
                type="button"
                className="sales-download-option"
                onClick={handleDownloadCompletePDF}
                role="menuitem"
              >
                <strong><FiBarChart2 /> Complete Financial Report PDF</strong>
                <small>Multi-page detailed ledger, receivables & register</small>
              </button>
            </div>
          )}
        </div>
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
                if (chartViewportRef.current) chartViewportRef.current.scrollLeft = 0;
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {period === 'Custom' ? (
          <div className="sales-date-toolbar" style={{ flexWrap: 'wrap' }}>
            <label className="sales-pick-btn" style={{ flex: 1 }}>
              <span>From</span>
              <input
                type="date"
                max={todayStr}
                value={customStart}
                onChange={e => setCustomStart(e.target.value || todayStr)}
                style={{ border: 0, background: 'transparent', fontSize: 12, fontWeight: 700, color: '#1b2f63' }}
              />
            </label>
            <label className="sales-pick-btn" style={{ flex: 1 }}>
              <span>To</span>
              <input
                type="date"
                max={todayStr}
                min={customStart}
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value || customStart)}
                style={{ border: 0, background: 'transparent', fontSize: 12, fontWeight: 700, color: '#1b2f63' }}
              />
            </label>
          </div>
        ) : period !== 'All Time' && (
          <div className="sales-date-toolbar">
            <div className="sales-range-nav">
              <button
                type="button"
                className="sales-nav-arrow"
                onClick={() => shiftAnchor(-1)}
                aria-label="Previous period"
                title="Previous period"
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
                disabled={shiftAnchorDate(anchorDate, period, 1) > todayStr}
                aria-label="Next period"
                title="Next period"
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
                max={todayStr}
                value={anchorDate}
                onChange={e => {
                  if (e.target.value) {
                    setAnchorDate(e.target.value > todayStr ? todayStr : e.target.value);
                    setActivePoint(null);
                    setZoomLevel(1);
                    if (chartViewportRef.current) chartViewportRef.current.scrollLeft = 0;
                  }
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
            <strong className="sales-kpi-amount">{formatMoney(recordedExpenses)}</strong>
          </div>
        </div>
      </div>

      {/* 4. Compact Estimated Margin Banner */}
      <div className="sales-margin-banner">
        <div className="sales-margin-left">
          <div className="sales-margin-kicker">
            <FiTrendingUp /> COLLECTIONS AFTER PAID EXPENSES
          </div>
          <strong className="sales-margin-amount">
            {formatMoney(collectionsAfterPaidExpenses)}
          </strong>
        </div>

        <div className="sales-margin-center">
          <span>Verified collections minus expenses explicitly marked Paid.</span>
          <em>Cash-flow indicator only — not verified net profit.</em>
        </div>

        <div
          className={`sales-margin-badge ${collectionsAfterPaidExpenses > 0 ? 'positive' : collectionsAfterPaidExpenses < 0 ? 'negative' : 'neutral'
            }`}
        >
          <span className="sales-status-dot" />
          <span>{collectionsAfterPaidExpenses > 0 ? 'Positive' : collectionsAfterPaidExpenses < 0 ? 'Negative' : 'Neutral'}</span>
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

          {/* Metric Toggle & Zoom controls */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="sales-zoom-actions">
              <button
                type="button"
                className={`sales-zoom-pill ${chartMetric === 'revenue' ? 'active' : ''}`}
                style={chartMetric === 'revenue' ? { background: '#244ea3', color: '#fff', borderColor: '#244ea3' } : undefined}
                onClick={() => { setChartMetric('revenue'); setActivePoint(null); }}
              >
                Revenue
              </button>
              <button
                type="button"
                className={`sales-zoom-pill ${chartMetric === 'orders' ? 'active' : ''}`}
                style={chartMetric === 'orders' ? { background: '#244ea3', color: '#fff', borderColor: '#244ea3' } : undefined}
                onClick={() => { setChartMetric('orders'); setActivePoint(null); }}
              >
                Orders
              </button>
            </div>
            {chartPoints.length > 1 && (
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
            )}
          </div>
        </div>

        {/* Daily view: Mode 2 Daily Total bar fallback if no hourly timestamps */}
        {period === 'Daily' && !hasHourlyTimestamps && chartPoints.length > 0 ? (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 12px 6px' }}>
              <div style={{ width: '100%', maxWidth: 220, background: '#f4f8ff', border: '1px solid #d9e2ec', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#52657d', marginBottom: 8 }}>Daily Total ({formatDateLabel(anchorDate)})</div>
                <div style={{ height: 74, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 8 }}>
                  <div
                    style={{
                      width: 64,
                      height: '100%',
                      background: 'linear-gradient(180deg, #2aa9c5 0%, #244ea3 100%)',
                      borderRadius: '8px 8px 3px 3px'
                    }}
                    aria-label="Daily Total Bar"
                  />
                </div>
                <strong style={{ fontSize: 18, color: '#1b2f63', display: 'block' }}>
                  {chartMetric === 'revenue' ? formatMoney(grossSales) : `${activePeriodOrders.length} ${activePeriodOrders.length === 1 ? 'order' : 'orders'}`}
                </strong>
                <span style={{ fontSize: 11, color: '#64748d' }}>
                  {chartMetric === 'revenue' ? `${activePeriodOrders.length} ${activePeriodOrders.length === 1 ? 'order' : 'orders'}` : formatMoney(grossSales)}
                </span>
              </div>
              <p style={{ margin: '10px 0 0', fontSize: 11, color: '#64748d', textAlign: 'center', maxWidth: 420 }}>
                Historical hourly breakdown unavailable — these records do not contain transaction timestamps.
              </p>
            </div>
          </div>
        ) : chartPoints.length > 0 && hasSales ? (
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
          <div style={{ padding: '22px 12px', textAlign: 'center', color: '#64748d', fontSize: 12 }}>
            <p style={{ margin: '0 0 10px' }}>No transactions recorded for this period ({periodLabel}).</p>
            {orders.length > 0 && defaultDate && defaultDate !== anchorDate && (
              <button
                type="button"
                className="sales-zoom-pill"
                onClick={() => {
                  setPeriod('Daily');
                  setAnchorDate(defaultDate);
                  setActivePoint(null);
                  setZoomLevel(1);
                }}
              >
                View latest recorded activity — {defaultDate}
              </button>
            )}
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
              <small>Payment methods, containers, fulfillment services, and order sources</small>
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
                if (data.recorded === 0 && (method === 'Bank Transfer' || method === 'Other')) return null;
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

            {/* Sales by Service Type */}
            <div className="sales-inner-card">
              <div className="sales-inner-title">
                <span>Fulfillment Services</span>
                <FiTruck />
              </div>
              {serviceBreakdown.length > 0 ? (
                serviceBreakdown.map(srv => {
                  const pct = grossSales > 0 ? (srv.gross / grossSales) * 100 : 0;
                  return (
                    <div key={srv.service} style={{ marginBottom: 8 }}>
                      <div className="mgmt-row">
                        <span className="mgmt-sub">
                          {srv.service} ({srv.orders === 1 ? '1 order' : `${srv.orders} orders`})
                        </span>
                        <strong>
                          {formatMoney(srv.gross)}{' '}
                          <small style={{ color: '#138358', fontWeight: 600 }}>
                            ({formatMoney(srv.verified)} paid)
                          </small>
                        </strong>
                      </div>
                      <div className="sales-progress-bar">
                        <div className="sales-progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="mgmt-sub" style={{ margin: 0 }}>No service records for this period.</p>
              )}
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
                placeholder="Search by ID, customer, source, service, status..."
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
                      <small>
                        {o.source} • {o.service} • {formatDateLabel(o.date)}
                        {o.status === 'Cancelled' ? ' • CANCELLED' : ''}
                      </small>
                    </div>
                    <div className="sales-tx-row-amount">
                      <strong style={{ textDecoration: o.status === 'Cancelled' ? 'line-through' : 'none' }}>
                        {formatMoney(o.amount)}
                      </strong>
                      <span className={`mgmt-pill ${o.status === 'Cancelled' ? 'warn' : o.paymentStatus === 'Paid' ? 'ok' : o.paymentStatus === 'Unpaid' ? 'warn' : ''}`}>
                        {o.status === 'Cancelled' ? 'Cancelled' : o.paymentStatus || 'Not Recorded'}
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
              <small>Recorded station expenses ({formatMoney(recordedExpenses)} active)</small>
            </div>
          </div>
          <div className="sales-accordion-chevron">
            {expensesOpen ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </button>

        {expensesOpen && (
          <div className="sales-accordion-body" style={{ background: 'white' }}>
            <ExpenseReport
              expenses={periodExpenses}
              setExpenses={setExpenses}
              onEvent={onNotice}
              defaultDate={anchorDate}
            />
          </div>
        )}
      </div>

      {unknownPaymentOrdersCount > 0 && (
        <div className="sales-notice-card" role="status">
          <FiAlertCircle />
          <div>
            <strong>Payment status needs review:</strong> {unknownPaymentOrdersCount} active order(s), totaling {formatMoney(unknownPaymentBalance)}, have no explicit Paid or Unpaid status. They are excluded from Outstanding Balance until their status is recorded.
          </div>
        </div>
      )}

      {/* 9. Financial Integrity Notice */}
      <div className="sales-notice-card">
        <FiInfo />
        <div>
          <strong>AquaBest Financial Integrity Notice:</strong> Report totals use the same period-filtered local records shown on this screen. Paid and Unpaid are recorded statuses, not server-verified payments. Production reporting requires persistent database timestamps, server-side payment validation, and synchronized expense records.
        </div>
      </div>
    </div>
  );
}
