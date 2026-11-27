// Pure UI helper for isolating Order Source or Fulfillment Mode series
// in Sales Trend Analytics without mutating or recalculating core financials.

export const ALL_SERIES_KEY = 'all';

export function getAvailableSeriesOptions(salesChart) {
  const series = Array.isArray(salesChart?.series) ? salesChart.series : [];
  return [
    { key: ALL_SERIES_KEY, label: 'All', color: '#1B2F63', isAll: true },
    ...series.map(s => ({
      key: s.key,
      label: s.label,
      color: s.color,
      totalRevenue: s.totalRevenue,
      totalOrders: s.totalOrders,
      isAll: false
    }))
  ];
}

export function normalizeSelectedSeries(salesChart, selectedSeries) {
  if (!selectedSeries || selectedSeries === ALL_SERIES_KEY) return ALL_SERIES_KEY;
  const series = Array.isArray(salesChart?.series) ? salesChart.series : [];
  return series.some(s => s.key === selectedSeries) ? selectedSeries : ALL_SERIES_KEY;
}

export function filterChartSeriesView(salesChart, selectedSeries = ALL_SERIES_KEY, metric = 'revenue') {
  const safeChart = salesChart || { buckets: [], series: [], totalRevenue: 0, totalOrders: 0 };
  const allSeries = Array.isArray(safeChart.series) ? safeChart.series : [];
  const buckets = Array.isArray(safeChart.buckets) ? safeChart.buckets : [];
  const activeKey = normalizeSelectedSeries(safeChart, selectedSeries);

  const visibleSeries = activeKey === ALL_SERIES_KEY
    ? allSeries
    : allSeries.filter(s => s.key === activeKey);

  const displayedRevenue = activeKey === ALL_SERIES_KEY
    ? Number(safeChart.totalRevenue || 0)
    : visibleSeries.reduce((sum, s) => sum + (Number(s.totalRevenue) || 0), 0);

  const displayedOrders = activeKey === ALL_SERIES_KEY
    ? Number(safeChart.totalOrders || 0)
    : visibleSeries.reduce((sum, s) => sum + (Number(s.totalOrders) || 0), 0);

  let maxVal = 0;
  for (const bucket of buckets) {
    for (const s of visibleSeries) {
      const cell = bucket.bySeries?.[s.key];
      const val = metric === 'revenue' ? (cell?.revenue || 0) : (cell?.orders || 0);
      if (val > maxVal) maxVal = val;
    }
  }

  const getBucketSummary = bucket => {
    if (!bucket) return { revenue: 0, orders: 0 };
    if (activeKey === ALL_SERIES_KEY) {
      return {
        revenue: Number(bucket.totalRevenue || 0),
        orders: Number(bucket.totalOrders || 0)
      };
    }
    return visibleSeries.reduce(
      (acc, s) => {
        const cell = bucket.bySeries?.[s.key] || { revenue: 0, orders: 0 };
        acc.revenue += Number(cell.revenue || 0);
        acc.orders += Number(cell.orders || 0);
        return acc;
      },
      { revenue: 0, orders: 0 }
    );
  };

  const activeSeriesMeta = activeKey === ALL_SERIES_KEY
    ? null
    : visibleSeries[0] || null;

  return {
    activeKey,
    activeSeriesMeta,
    isFiltered: activeKey !== ALL_SERIES_KEY,
    visibleSeries,
    displayedRevenue,
    displayedOrders,
    seriesMaxVal: maxVal,
    hasVisibleData: buckets.some(b => {
      const sum = getBucketSummary(b);
      return (metric === 'revenue' ? sum.revenue : sum.orders) > 0;
    }),
    getBucketSummary
  };
}
