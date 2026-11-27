import { useState, useMemo, useRef, useEffect } from 'react';
import {
  FiBarChart2, FiClock, FiCreditCard, FiTrendingUp,
  FiZoomIn, FiZoomOut, FiRefreshCw,
  FiPieChart, FiShoppingBag, FiSearch, FiFileText,
  FiCheckCircle, FiChevronDown, FiChevronUp, FiInfo, FiDownload,
  FiTruck, FiAlertCircle
} from 'react-icons/fi';
import { formatMoney } from '../data/managerDemo.js';
import { buildSalesReportData } from '../utils/buildSalesReportData.js';
import { buildSalesChartData } from '../utils/buildSalesChartData.js';
import ExpenseReport from './ExpenseReport.jsx';
import DateRangeSelector from './DateRangeSelector.jsx';
import { getTodayLocalDate, filterByDateRange } from '../utils/reportDateUtils.js';
import { getPeriodFilename, formatDateLabel } from '../utils/dateUtils.js';
import { formatDateRangeDisplay, resolveDateRangePreset } from '../utils/dateRangePresets.js';
import {
  generateFinancialSummaryPDF,
  generateCompleteFinancialReportPDF
} from '../utils/generateSalesReportPDF.js';
import './salesReports.css';

export default function SalesReports({
  orders = [],
  expenses = [],
  setExpenses,
  onNotice = () => { },
  isOwner = false
}) {
  // Determine latest recorded order date for quick jump when current selection has no data
  const defaultDate = useMemo(() => {
    const dates = orders.map(o => o.date).filter(Boolean).sort();
    return dates.length ? dates[dates.length - 1] : getTodayLocalDate();
  }, [orders]);

  const todayStr = getTodayLocalDate();
  const [dateSelection, setDateSelection] = useState(() =>
    resolveDateRangePreset('today', { todayStr })
  );
  const period = dateSelection.period;
  const anchorDate = dateSelection.anchorDate;
  const customStart = dateSelection.startDate;
  const customEnd = dateSelection.endDate;

  const [chartMetric, setChartMetric] = useState('revenue');
  const [chartBreakdown, setChartBreakdown] = useState('source');
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

  const handleDateSelectionChange = (next) => {
    setDateSelection(next);
    setZoomLevel(1);
    setActivePoint(null);
    if (chartViewportRef.current) chartViewportRef.current.scrollLeft = 0;
  };

  // Period label for display
  const periodLabel = useMemo(() => formatDateRangeDisplay(dateSelection), [dateSelection]);

  const periodFilename = useMemo(() => {
    if (period === 'Custom') return `${customStart}_to_${customEnd}`;
    return getPeriodFilename(period, anchorDate);
  }, [period, anchorDate, customStart, customEnd]);

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
    periodExpenses,
    grossSales,
    completedSales,
    verifiedCollected,
    verifiedCollectedCompleted,
    unpaidCompletedSales,
    outstandingBalance,
    unknownPaymentBalance,
    recordedExpenses,
    paidExpenses,
    unpaidExpenses,
    unrecordedStatusExpenses,
    collectionsAfterPaidExpenses,
    recordedOperatingResult,
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

  // Multi-series completed sales chart engine (Asia/Manila, Source & Fulfillment breakdowns)
  const salesChart = useMemo(
    () => buildSalesChartData({
      orders,
      period,
      anchorDate,
      customStart,
      customEnd,
      breakdown: chartBreakdown,
      metric: chartMetric,
      todayStr
    }),
    [orders, period, anchorDate, customStart, customEnd, chartBreakdown, chartMetric, todayStr]
  );

  // Zoom Handlers
  const handleZoomIn = () => setZoomLevel(prev => Math.min(3, prev + 1));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(1, prev - 1));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setActivePoint(null);
    if (chartViewportRef.current) chartViewportRef.current.scrollLeft = 0;
  };

  // Multi-series SVG Chart Geometry
  const chartHeight = 205;
  const paddingLeft = 48;
  const paddingRight = 24;
  const paddingTop = 18;
  const paddingBottom = 30;
  const chartBuckets = salesChart.buckets;

  const seriesMaxVal = useMemo(() => {
    let max = 0;
    for (const b of chartBuckets) {
      for (const s of salesChart.series) {
        const val = chartMetric === 'revenue' ? (b.bySeries[s.key]?.revenue || 0) : (b.bySeries[s.key]?.orders || 0);
        if (val > max) max = val;
      }
    }
    return max;
  }, [chartBuckets, salesChart.series, chartMetric]);

  const niceMax = chartMetric === 'revenue'
    ? Math.max(100, Math.ceil(seriesMaxVal / 50) * 50)
    : Math.max(4, Math.ceil(seriesMaxVal));

  const minGap = period === 'Daily' ? 38 : 46;
  const basePointGap = Math.max(minGap, 480 / Math.max(1, chartBuckets.length - 1));
  const effectiveWidth = Math.max(540, (chartBuckets.length - 1) * basePointGap * zoomLevel + paddingLeft + paddingRight);

  const getCoordinates = (index, val) => {
    const spanX = effectiveWidth - paddingLeft - paddingRight;
    const x = chartBuckets.length <= 1
      ? paddingLeft + spanX / 2
      : paddingLeft + (index / Math.max(1, chartBuckets.length - 1)) * spanX;
    const usableHeight = chartHeight - paddingTop - paddingBottom;
    const y = chartHeight - paddingBottom - (val / niceMax) * usableHeight;
    return { x, y };
  };

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

      {/* 2. Single Compact Date Range Dropdown */}
      <div className="sales-filter-row">
        <DateRangeSelector
          value={dateSelection}
          onChange={handleDateSelectionChange}
          records={orders}
          todayStr={todayStr}
        />
      </div>

      {/* 3. Four Primary KPI Cards (2x2 Grid) */}
      <div className="sales-kpi-grid">
        <div className="sales-kpi-card">
          <div className="sales-kpi-icon blue">
            <FiBarChart2 />
          </div>
          <div className="sales-kpi-content">
            <span className="sales-kpi-label">Completed Sales</span>
            <strong className="sales-kpi-amount">{formatMoney(completedSales)}</strong>
          </div>
        </div>

        <div className="sales-kpi-card">
          <div className="sales-kpi-icon green">
            <FiCheckCircle />
          </div>
          <div className="sales-kpi-content">
            <span className="sales-kpi-label">Verified Collected</span>
            <strong className="sales-kpi-amount">{formatMoney(verifiedCollectedCompleted)}</strong>
          </div>
        </div>

        <div className="sales-kpi-card">
          <div className="sales-kpi-icon amber">
            <FiClock />
          </div>
          <div className="sales-kpi-content">
            <span className="sales-kpi-label">Unpaid Completed</span>
            <strong className="sales-kpi-amount">{formatMoney(unpaidCompletedSales)}</strong>
          </div>
        </div>

        <div className="sales-kpi-card">
          <div className="sales-kpi-icon cyan">
            <FiCreditCard />
          </div>
          <div className="sales-kpi-content">
            <span className="sales-kpi-label">Active Expenses</span>
            <strong className="sales-kpi-amount">{formatMoney(recordedExpenses)}</strong>
          </div>
        </div>
      </div>

      {/* 4. Recorded Operating Result (Demo) & Collections Cash-Flow Banner */}
      <div className="sales-margin-banner">
        <div className="sales-margin-left">
          <div className="sales-margin-kicker">
            <FiTrendingUp /> RECORDED OPERATING RESULT (DEMO)
          </div>
          <strong className="sales-margin-amount">
            {recordedOperatingResult > 0 ? '+' : recordedOperatingResult < 0 ? '-' : ''}{formatMoney(Math.abs(recordedOperatingResult))}
          </strong>
        </div>

        <div className="sales-margin-center">
          <span>Completed sales ({formatMoney(completedSales)}) minus active recorded expenses ({formatMoney(recordedExpenses)}).</span>
          <em>Operating indicator only — not an audited net profit calculation. Collections after paid expenses: {formatMoney(collectionsAfterPaidExpenses)}.</em>
        </div>

        <div
          className={`sales-margin-badge ${recordedOperatingResult > 0 ? 'positive' : recordedOperatingResult < 0 ? 'negative' : 'neutral'
            }`}
        >
          <span className="sales-status-dot" />
          <span>{recordedOperatingResult > 0 ? 'Positive' : recordedOperatingResult < 0 ? 'Loss Period' : 'Neutral'}</span>
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

          {/* Metric Toggle, Breakdown Selector & Zoom controls */}
          <div className="sales-chart-controls">
            <div className="sales-zoom-actions" role="group" aria-label="Chart breakdown dimension">
              <button
                type="button"
                className={`sales-zoom-pill ${chartBreakdown === 'source' ? 'active' : ''}`}
                onClick={() => { setChartBreakdown('source'); setActivePoint(null); }}
              >
                Order Source
              </button>
              <button
                type="button"
                className={`sales-zoom-pill ${chartBreakdown === 'fulfillment' ? 'active' : ''}`}
                onClick={() => { setChartBreakdown('fulfillment'); setActivePoint(null); }}
              >
                Fulfillment Mode
              </button>
            </div>

            <div className="sales-zoom-actions" role="group" aria-label="Chart metric">
              <button
                type="button"
                className={`sales-zoom-pill ${chartMetric === 'revenue' ? 'active' : ''}`}
                onClick={() => { setChartMetric('revenue'); setActivePoint(null); }}
              >
                Revenue
              </button>
              <button
                type="button"
                className={`sales-zoom-pill ${chartMetric === 'orders' ? 'active' : ''}`}
                onClick={() => { setChartMetric('orders'); setActivePoint(null); }}
              >
                Order Count
              </button>
            </div>

            {chartBuckets.length > 1 && (
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

        {/* Completed Sales Summary & Multi-Series Legend */}
        <div className="sales-completed-summary">
          <span>
            Completed Sales ({periodLabel}):{' '}
            <strong>{formatMoney(salesChart.totalRevenue)}</strong> ({salesChart.totalOrders} {salesChart.totalOrders === 1 ? 'completed sale' : 'completed sales'})
          </span>
          {salesChart.totalOrders === 0 && orders.length > 0 && defaultDate && defaultDate !== anchorDate && (
            <button
              type="button"
              className="sales-zoom-pill"
              onClick={() => handleDateSelectionChange(resolveDateRangePreset('custom', { todayStr, customStart: defaultDate, customEnd: defaultDate, records: orders }))}
            >
              View latest recorded activity — {defaultDate}
            </button>
          )}
        </div>

        <div className="sales-chart-legend" aria-label="Chart series legend">
          {salesChart.series.map(s => (
            <span key={s.key} className="sales-legend-item">
              <span className="sales-legend-swatch" style={{ background: s.color }} />
              <span>{s.label}</span>
              <strong>{chartMetric === 'revenue' ? formatMoney(s.totalRevenue) : s.totalOrders}</strong>
            </span>
          ))}
        </div>

        {/* Historical missing timestamp disclosure (Daily mode keeps 24-hour axis layout) */}
        {period === 'Daily' && salesChart.hasMissingTimestamps && (
          <div className="sales-chart-disclosure" role="status">
            <FiInfo size={14} aria-hidden="true" />
            <span>
              Hourly breakdown unavailable for historical records because transaction times were not recorded.
              {!salesChart.hasHourlyTimestamps && salesChart.totalOrders > 0
                ? ` Completed total for ${formatDateLabel(anchorDate)}: ${formatMoney(salesChart.totalRevenue)} (${salesChart.totalOrders} ${salesChart.totalOrders === 1 ? 'sale' : 'sales'}).`
                : ''}
            </span>
          </div>
        )}

        {/* Multi-Series Hourly / Multi-Period Line Chart */}
        {chartBuckets.length > 0 && (period === 'Daily' || salesChart.hasPlottedData) ? (
          <div className="sales-chart-viewport" ref={chartViewportRef}>
            <svg
              className="sales-svg-chart"
              width={effectiveWidth}
              height={chartHeight}
              viewBox={`0 0 ${effectiveWidth} ${chartHeight}`}
              role="img"
              aria-label={`${period} completed sales ${chartMetric} multi-line chart by ${chartBreakdown}`}
            >
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
                      {chartMetric === 'revenue' ? formatMoney(val) : val}
                    </text>
                  </g>
                );
              })}

              {/* X Axis Labels (always visible, including 12 AM - 11 PM in Daily mode) */}
              {chartBuckets.map((bucket, i) => {
                const { x } = getCoordinates(i, 0);
                return (
                  <text
                    key={`xlabel-${i}`}
                    x={x}
                    y={chartHeight - 8}
                    textAnchor="middle"
                    className="chart-axis-text"
                  >
                    {bucket.label}
                  </text>
                );
              })}

              {/* Multi-series Lines & Data Points (only plotted from actual timestamped/dated completed sales) */}
              {salesChart.hasPlottedData && salesChart.series.map(s => {
                const pathD = chartBuckets.map((bucket, i) => {
                  const val = chartMetric === 'revenue'
                    ? (bucket.bySeries[s.key]?.revenue || 0)
                    : (bucket.bySeries[s.key]?.orders || 0);
                  const { x, y } = getCoordinates(i, val);
                  return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                }).join(' ');

                return (
                  <g key={s.key}>
                    {chartBuckets.length > 1 && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke={s.color}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    {chartBuckets.map((bucket, i) => {
                      const val = chartMetric === 'revenue'
                        ? (bucket.bySeries[s.key]?.revenue || 0)
                        : (bucket.bySeries[s.key]?.orders || 0);
                      if (val === 0 && activePoint !== i) return null;
                      const { x, y } = getCoordinates(i, val);
                      const isSelected = activePoint === i;
                      return (
                        <circle
                          key={`${s.key}-${i}`}
                          cx={x}
                          cy={y}
                          r={isSelected ? 5.5 : 3.5}
                          fill={s.color}
                          stroke="#fff"
                          strokeWidth="1.5"
                        />
                      );
                    })}
                  </g>
                );
              })}

              {/* Generous vertical hit zones for bucket selection */}
              {salesChart.hasPlottedData && chartBuckets.map((_bucket, i) => {
                const { x } = getCoordinates(i, 0);
                return (
                  <rect
                    key={`hit-${i}`}
                    x={x - 16}
                    y={paddingTop}
                    width={32}
                    height={chartHeight - paddingTop - paddingBottom}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setActivePoint(i)}
                    onClick={() => setActivePoint(i)}
                  />
                );
              })}
            </svg>

            {/* Multi-Series Tooltip */}
            {activePoint !== null && chartBuckets[activePoint] && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
                <div className="sales-tooltip-bubble">
                  <div className="sales-tooltip-date">
                    {chartBuckets[activePoint].fullLabel}
                  </div>
                  <div className="sales-tooltip-val">
                    {chartMetric === 'revenue'
                      ? formatMoney(chartBuckets[activePoint].totalRevenue)
                      : `${chartBuckets[activePoint].totalOrders} ${chartBuckets[activePoint].totalOrders === 1 ? 'sale' : 'sales'}`}
                  </div>
                  <div className="sales-tooltip-series">
                    {salesChart.series.map(s => {
                      const cell = chartBuckets[activePoint].bySeries[s.key] || { revenue: 0, orders: 0 };
                      return (
                        <span key={s.key}>
                          <i style={{ background: s.color }} />
                          {s.label}: {chartMetric === 'revenue' ? formatMoney(cell.revenue) : cell.orders}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '22px 12px', textAlign: 'center', color: '#64748d', fontSize: 12 }}>
            <p style={{ margin: '0 0 10px' }}>No completed sales recorded for this period ({periodLabel}).</p>
            {orders.length > 0 && defaultDate && defaultDate !== anchorDate && (
              <button
                type="button"
                className="sales-zoom-pill"
                onClick={() => handleDateSelectionChange(resolveDateRangePreset('custom', { todayStr, customStart: defaultDate, customEnd: defaultDate, records: orders }))}
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
