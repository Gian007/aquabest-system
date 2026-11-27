import { useEffect, useRef, useState } from 'react';
import { FiCalendar, FiChevronDown, FiChevronLeft, FiChevronRight, FiCheck } from 'react-icons/fi';
import {
  DATE_RANGE_PRESETS,
  formatDateRangeDisplay,
  resolveDateRangePreset,
  stepDateSelection,
  canStepForward
} from '../utils/dateRangePresets.js';
import { getTodayLocalDate } from '../utils/reportDateUtils.js';
import './dateRangeSelector.css';

export default function DateRangeSelector({
  value,
  onChange,
  records = [],
  todayStr = getTodayLocalDate(),
  align = 'left'
}) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [draftStart, setDraftStart] = useState(value?.startDate || todayStr);
  const [draftEnd, setDraftEnd] = useState(value?.endDate || todayStr);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setCustomMode(false);
      }
    };
    const onKey = e => {
      if (e.key === 'Escape') {
        setOpen(false);
        setCustomMode(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleToggle = () => {
    setOpen(prev => {
      const next = !prev;
      if (next) {
        setDraftStart(value?.startDate || todayStr);
        setDraftEnd(value?.endDate || todayStr);
        setCustomMode(false);
      }
      return next;
    });
  };

  const handleSelectPreset = presetId => {
    if (presetId === 'custom') {
      setDraftStart(value?.startDate || todayStr);
      setDraftEnd(value?.endDate || todayStr);
      setCustomMode(true);
      return;
    }
    const resolved = resolveDateRangePreset(presetId, { todayStr, records });
    onChange(resolved);
    setOpen(false);
    setCustomMode(false);
  };

  const handleApplyCustom = () => {
    const resolved = resolveDateRangePreset('custom', {
      todayStr,
      customStart: draftStart,
      customEnd: draftEnd,
      records
    });
    onChange(resolved);
    setOpen(false);
    setCustomMode(false);
  };

  const handleStep = step => {
    const next = stepDateSelection(value, step, todayStr);
    onChange(next);
  };

  const displayLabel = formatDateRangeDisplay(value || { preset: 'today', startDate: todayStr, endDate: todayStr });
  const allowForward = canStepForward(value, todayStr);

  return (
    <div className="drs-wrap" ref={containerRef}>
      <button
        type="button"
        className="drs-trigger"
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <FiCalendar size={15} className="drs-icon" aria-hidden="true" />
        <span className="drs-label">{displayLabel}</span>
        <FiChevronDown size={15} className={`drs-chevron ${open ? 'open' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div className={`drs-popover ${align === 'right' ? 'align-right' : ''}`} role="dialog" aria-label="Select date range">
          {!customMode ? (
            <>
              {value?.preset !== 'all_time' && (
                <div className="drs-stepper">
                  <button type="button" className="drs-step-btn" onClick={() => handleStep(-1)} aria-label="Previous range">
                    <FiChevronLeft size={15} /> Prev
                  </button>
                  <span className="drs-step-current">{value?.period || 'Daily'}</span>
                  <button
                    type="button"
                    className="drs-step-btn"
                    onClick={() => handleStep(1)}
                    disabled={!allowForward}
                    aria-label="Next range"
                  >
                    Next <FiChevronRight size={15} />
                  </button>
                </div>
              )}
              <div className="drs-preset-list" role="listbox" aria-label="Date range presets">
                {DATE_RANGE_PRESETS.map(p => {
                  const isActive = value?.preset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className={`drs-preset-btn ${isActive ? 'active' : ''}`}
                      onClick={() => handleSelectPreset(p.id)}
                    >
                      <span>{p.label}</span>
                      {isActive && <FiCheck size={14} aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="drs-custom-form">
              <div className="drs-custom-head">
                <strong>Custom Date Range</strong>
                <small>Choose start and end business dates</small>
              </div>
              <label className="drs-field">
                <span>Start Date</span>
                <input
                  type="date"
                  max={todayStr}
                  value={draftStart}
                  onChange={e => {
                    const val = e.target.value || todayStr;
                    setDraftStart(val);
                    if (draftEnd < val) setDraftEnd(val);
                  }}
                />
              </label>
              <label className="drs-field">
                <span>End Date</span>
                <input
                  type="date"
                  min={draftStart}
                  max={todayStr}
                  value={draftEnd}
                  onChange={e => setDraftEnd(e.target.value || draftStart)}
                />
              </label>
              <div className="drs-custom-actions">
                <button type="button" className="drs-btn secondary" onClick={() => setCustomMode(false)}>
                  Cancel
                </button>
                <button type="button" className="drs-btn primary" onClick={handleApplyCustom}>
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
