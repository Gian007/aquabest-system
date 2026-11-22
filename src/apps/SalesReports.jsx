import { useState, useMemo, useRef, useEffect } from 'react';
import {
  FiBarChart2, FiDollarSign, FiClock, FiCreditCard, FiTrendingUp,
  FiZoomIn, FiZoomOut, FiRefreshCw, FiCalendar, FiChevronLeft,
  FiChevronRight, FiPieChart, FiShoppingBag, FiSearch, FiFileText,
  FiCheckCircle, FiChevronDown, FiChevronUp, FiInfo, FiDownload,
  FiTruck, FiAlertCircle
} from 'react-icons/fi';
import { DEMO_PRODUCTS, formatMoney } from '../data/managerDemo.js';
import ExpenseReport from './ExpenseReport.jsx';
import {
  getTodayLocalStr,
  getWeekRange,
  shiftPeriod,
  isWithinPeriod,
  getPeriodLabel,
  getPeriodFilename,
  formatDateLabel
} from '../utils/dateUtils.js';
import {
  generateFinancialSummaryPDF,
  generateCompleteFinancialReportPDF
} from '../utils/generateSalesReportPDF.js';
import './salesReports.css';

const PERIODS = ['Daily', 'Weekly', 'Monthly', 'Yearly', 'All Time'];

// Accurate payment method classifier
function classifyPaymentMethod(order) {
  const m = (order.paymentMethod || order.method || '').trim().toLowerCase();
  if (m === 'cash') return 'Cash';
  if (m === 'gcash') return 'GCash';
  if (m === 'bank transfer' || m.includes('bank') || m.includes('transfer')) return 'Bank Transfer';
  if (m === 'other') return 'Other';
  if (!m) return 'Not Specified';
  return 'Other';
}

// Service type normalizer
function normalizeServiceType(order) {
  const s = (order.service || '').trim();
  if (!s) return 'Not Specified';
  return s;
}

export default function SalesReports({
  orders = [],
  expenses = [],
  setExpenses,
  onNotice = () => {},
  isOwner = false
}) {
  // Determine anchor date defaulting to latest order date or today
  const defaultDate = useMemo(() => {
    const dates = orders.map(o => o.date).filter(Boolean).sort();
    return dates.length ? dates[dates.length - 1] : getTodayLocalStr();
  }, [orders]);

  const [period, setPeriod] = useState('Weekly');
  const [anchorDate, setAnchorDate] = useState(defaultDate);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activePoint, setActivePoint] = useState(null);
  const [searchTx, setSearchTx] = useState('');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(null);

  const chartViewportRef = useRef(null);
  const exportDropdownRef = useRef(null);

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
    return getPeriodLabel(period, anchorDate);
  }, [period, anchorDate]);

  const periodFilename = useMemo(() => {
    return getPeriodFilename(period, anchorDate);
  }, [period, anchorDate]);

  // Navigate date range safely
  const shiftAnchor = (step) => {
    const nextDate = shiftPeriod(anchorDate, period, step);
    setAnchorDate(nextDate);
    setActivePoint(null);
  };

  // Filter orders by active period
  const periodOrders = useMemo(() => {
    return orders.filter(o => isWithinPeriod(o.date, period, anchorDate));
  }, [orders, period, anchorDate]);

  // Filter active expenses by period
  const periodExpenses = useMemo(() => {
    return expenses.filter(e => isWithinPeriod(e.date, period, anchorDate));
  }, [expenses, period, anchorDate]);

  const activePeriodExpenses = useMemo(() => {
    return periodExpenses.filter(e => e.active);
  }, [periodExpenses]);

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

  const recordedExpenses = useMemo(() => {
    return activePeriodExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [activePeriodExpenses]);

  const paidExpenses = useMemo(() => {
    return activePeriodExpenses
      .filter(e => e.paymentStatus === 'Paid')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [activePeriodExpenses]);

  const unpaidExpenses = useMemo(() => {
    return activePeriodExpenses
      .filter(e => e.paymentStatus === 'Unpaid')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [activePeriodExpenses]);

  const unrecordedStatusExpenses = useMemo(() => {
    return activePeriodExpenses
      .filter(e => !e.paymentStatus || (e.paymentStatus !== 'Paid' && e.paymentStatus !== 'Unpaid'))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [activePeriodExpenses]);

  const collectionsAfterPaidExpenses = verifiedCollected - paidExpenses;
  const estimatedMargin = verifiedCollected - recordedExpenses;

  const totalOrders = periodOrders.length;
  const cancelledOrdersCount = periodOrders.filter(o => o.status === 'Cancelled').length;
  const paidOrdersCount = periodOrders.filter(o => o.paymentStatus === 'Paid').length;
  const unpaidOrdersCount = periodOrders.filter(o => o.paymentStatus !== 'Paid' && o.status !== 'Cancelled').length;

  const avgTicket = paidOrdersCount > 0 ? (verifiedCollected / paidOrdersCount) : 0;

  // Accurate Payment Breakdown (distinguishing recorded vs verified)
  const paymentBreakdown = useMemo(() => {
    const buckets = {
      Cash: { recorded: 0, verified: 0, count: 0 },
      GCash: { recorded: 0, verified: 0, count: 0 },
      'Bank Transfer': { recorded: 0, verified: 0, count: 0 },
      Other: { recorded: 0, verified: 0, count: 0 },
      'Not Specified': { recorded: 0, verified: 0, count: 0 }
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
      }
    });

    return buckets;
  }, [periodOrders]);

  // Sales by Fulfillment Service Type
  const serviceBreakdown = useMemo(() => {
    const map = {};
    periodOrders.forEach(o => {
      if (o.status === 'Cancelled') return;
      const srv = normalizeServiceType(o);
      if (!map[srv]) {
        map[srv] = { service: srv, orders: 0, gross: 0, verified: 0, outstanding: 0 };
      }
      const amt = Number(o.amount) || 0;
      map[srv].orders += 1;
      map[srv].gross += amt;
      if (o.paymentStatus === 'Paid') {
        map[srv].verified += amt;
      } else {
        map[srv].outstanding += amt;
      }
    });
    return Object.values(map);
  }, [periodOrders]);

  // Best-Selling Container counts & relative progress
  const productBreakdown = useMemo(() => {
    const counts = { round5: 0, slim25: 0, slim5: 0 };
    let totalQty = 0;

    periodOrders.forEach(o => {
      if (o.status === 'Cancelled') return;
      (o.items || []).forEach(item => {
        if (counts[item.sizeId] !== undefined) {
          const q = Number(item.quantity) || 0;
          counts[item.sizeId] += q;
          totalQty += q;
        }
      });
    });

    const list = DEMO_PRODUCTS.map(p => {
      const q = counts[p.id] || 0;
      return {
        ...p,
        quantity: q,
        share: totalQty > 0 ? (q / totalQty) * 100 : 0
      };
    });

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

  // Check if any order has an actual hourly timestamp
  const hasHourlyTimestamps = useMemo(() => {
    return periodOrders.some(o => {
      const t = o.time || o.createdAt || o.created_at;
      return Boolean(t && typeof t === 'string' && t.includes(':'));
    });
  }, [periodOrders]);

  // Chart Data Aggregation
  const chartPoints = useMemo(() => {
    if (period === 'Daily') {
      if (!hasHourlyTimestamps) {
        // Honest limitation: no artificial distribution!
        return [];
      }
      // If hourly timestamps exist, group by hour
      const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM
      return hours.map(h => {
        const hLabel = h > 12 ? `${h - 12} PM` : h === 12 ? '12 PM' : `${h} AM`;
        const matchOrders = periodOrders.filter(o => {
          if (o.status === 'Cancelled') return false;
          const t = o.time || o.createdAt || o.created_at;
          if (!t) return false;
          const hr = parseInt(t.split(':')[0], 10);
          return hr === h;
        });
        const sales = matchOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
        return {
          label: hLabel,
          fullLabel: `${hLabel} (${formatDateLabel(anchorDate)})`,
          sales,
          orders: matchOrders.length
        };
      });
    }

    if (period === 'Weekly') {
      // Sunday through Saturday
      const { startDate } = getWeekRange(anchorDate);
      const days = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      for (let i = 0; i < 7; i++) {
        const cur = new Date(startDate);
        cur.setDate(startDate.getDate() + i);
        const curYear = cur.getFullYear();
        const curMonth = String(cur.getMonth() + 1).padStart(2, '0');
        const curDay = String(cur.getDate()).padStart(2, '0');
        const curStr = `${curYear}-${curMonth}-${curDay}`;

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
      const parts = anchorDate.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const numDays = new Date(year, month, 0).getDate();
      const points = [];

      for (let day = 1; day <= numDays; day++) {
        const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
  }, [period, anchorDate, orders, periodOrders, hasHourlyTimestamps]);

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

  // Prepare full data payload for PDF generation
  const buildReportPDFData = () => {
    const paymentMethodsArr = Object.entries(paymentBreakdown).map(([method, val]) => ({
      method,
      orders: val.count,
      recorded: val.recorded,
      verified: val.verified
    }));

    const receivablesList = periodOrders
      .filter(o => o.status !== 'Cancelled' && o.paymentStatus !== 'Paid')
      .map(o => ({
        id: o.id,
        customer: o.customer || 'Walk-in',
        service: o.service || 'Walk-in',
        date: o.date,
        amount: Number(o.amount) || 0,
        paid: 0,
        balance: Number(o.amount) || 0,
        paymentStatus: o.paymentStatus || 'Unpaid'
      }));

    const transactionsList = periodOrders.map(o => ({
      id: o.id,
      date: o.date,
      customer: o.customer || 'Walk-in',
      source: o.source || 'Walk-in',
      service: o.service || 'Walk-in',
      amount: Number(o.amount) || 0,
      paymentStatus: o.paymentStatus || 'Unpaid',
      status: o.status || 'Active'
    }));

    return {
      period,
      periodLabel,
      periodFilename,
      dateGenerated: new Date().toLocaleString('en-PH'),
      role: isOwner ? 'Super Admin / Business Owner' : 'Station Manager',
      grossSales,
      discounts: null,
      netSales: grossSales,
      verifiedCollected,
      outstandingBalance,
      recordedExpenses,
      paidExpenses,
      unpaidExpenses,
      unrecordedStatusExpenses,
      collectionsAfterPaidExpenses,
      estimatedMargin,
      totalOrders,
      paidOrdersCount,
      unpaidOrdersCount,
      cancelledOrdersCount,
      avgTicket,
      sources: sourceBreakdown.map(s => ({ source: s.source, orders: s.count, gross: s.total, verified: s.paid })),
      services: serviceBreakdown,
      paymentMethods: paymentMethodsArr,
      containers: productBreakdown.list.map(p => ({ label: `${p.label} · ${p.shape}`, quantity: p.quantity, share: p.share })),
      expensesList: periodExpenses,
      receivablesList,
      transactionsList
    };
  };

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
                <small>1–2 page executive KPI & deductions overview</small>
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
            <strong className="sales-kpi-amount">{formatMoney(recordedExpenses)}</strong>
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

          {/* Zoom controls only active when chart points exist */}
          {chartPoints.length > 0 && (
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

        {/* Daily view honest information state if no hourly timestamps */}
        {period === 'Daily' && !hasHourlyTimestamps ? (
          <div className="sales-daily-info">
            <FiClock size={24} color="#244ea3" />
            <h3>Hourly breakdown unavailable — transaction times are not recorded.</h3>
            <p>
              Current order fixtures record calendar dates without hourly timestamps. Displaying full day total:
            </p>
            <div className="sales-daily-badge">
              {formatDateLabel(anchorDate)} Total: {formatMoney(grossSales)} ({periodOrders.length} {periodOrders.length === 1 ? 'order' : 'orders'})
            </div>
          </div>
        ) : chartPoints.length > 0 && maxVal > 0 ? (
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
                      <span className={`mgmt-pill ${o.status === 'Cancelled' ? 'warn' : o.paymentStatus === 'Paid' ? 'ok' : 'warn'}`}>
                        {o.status === 'Cancelled' ? 'Cancelled' : o.paymentStatus}
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
