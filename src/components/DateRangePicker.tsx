import React, { useState, useEffect, useRef } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isBefore, startOfDay, subDays, startOfQuarter, endOfQuarter, setQuarter } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
  availableDates: Date[];
}

export function DateRangePicker({ startDate, endDate, onChange, availableDates }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  const [tempStart, setTempStart] = useState<Date | null>(startDate);
  const [tempEnd, setTempEnd] = useState<Date | null>(endDate);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTempStart(startDate);
      setTempEnd(endDate);
      
      if (endDate) {
        setCurrentMonth(startOfMonth(subMonths(endDate, 1)));
      } else if (availableDates.length > 0) {
        setCurrentMonth(startOfMonth(subMonths(availableDates[availableDates.length - 1], 1)));
      } else {
        setCurrentMonth(startOfMonth(subMonths(new Date(), 1)));
      }
    }
  }, [isOpen, startDate, endDate, availableDates]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const availableSet = new Set(availableDates.map(d => format(d, 'yyyy-MM-dd')));

  const isAvailable = (date: Date) => {
    return availableSet.has(format(date, 'yyyy-MM-dd'));
  };

  const handleDateClick = (date: Date) => {
    if (!isAvailable(date)) return;

    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(date);
      setTempEnd(null);
    } else {
      if (isBefore(date, tempStart)) {
        setTempEnd(tempStart);
        setTempStart(date);
      } else {
        setTempEnd(date);
      }
    }
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const handleApply = () => {
    onChange(tempStart, tempEnd || tempStart);
    setIsOpen(false);
  };
  
  const handleClear = () => {
      setTempStart(null);
      setTempEnd(null);
  };
  
  const applyPreset = (id: string | number) => {
      if (availableDates.length === 0) return;
      const latestDataDate = availableDates[availableDates.length - 1]; 
      
      if (id === -1 || id === 'all') {
          setTempStart(availableDates[0]);
          setTempEnd(latestDataDate);
          setCurrentMonth(startOfMonth(subMonths(latestDataDate, 1)));
          return;
      }
      
      if (typeof id === 'number') {
          const start = subDays(latestDataDate, id - 1);
          const realStart = start < availableDates[0] ? availableDates[0] : start;
          
          setTempStart(realStart);
          setTempEnd(latestDataDate);
          setCurrentMonth(startOfMonth(subMonths(latestDataDate, 1)));
          return;
      }
      
      if (typeof id === 'string' && id.startsWith('q')) {
          const quarter = parseInt(id.charAt(1));
          let qDate = setQuarter(latestDataDate, quarter);
          
          const start = startOfQuarter(qDate);
          const end = endOfQuarter(qDate);
          
          const realStart = start < availableDates[0] ? availableDates[0] : start;
          const realEnd = end > latestDataDate ? latestDataDate : end;
          
          if (realStart > latestDataDate || realEnd < availableDates[0]) {
              // Ignore if outside range
              setTempStart(start);
              setTempEnd(end);
              setCurrentMonth(startOfMonth(start));
              return;
          }
          
          setTempStart(realStart);
          setTempEnd(realEnd);
          setCurrentMonth(startOfMonth(realStart));
      }
  }

  const renderMonth = (month: Date) => {
    const startDateOfMonth = startOfMonth(month);
    const endDateOfMonth = endOfMonth(month);
    const startDateOfWeek = startOfWeek(startDateOfMonth);
    const endDateOfWeek = endOfWeek(endDateOfMonth);

    const days = eachDayOfInterval({ start: startDateOfWeek, end: endDateOfWeek });

    return (
      <div className="flex-1 w-full sm:w-[260px]">
        <div className="text-center font-bold mb-4 text-slate-900 dark:text-white capitalize">
          {format(month, 'MMMM yyyy', { locale: vi })}
        </div>
        <div className="grid grid-cols-7 gap-y-2 text-center text-[11px] text-slate-500 dark:text-slate-400 mb-2 font-semibold">
          {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {days.map((day, i) => {
            const isCurrentMonth = isSameMonth(day, month);
            if (!isCurrentMonth) {
              return <div key={i} className="h-8"></div>;
            }

            const hasData = isAvailable(day);
            const isStart = tempStart && isSameDay(day, tempStart);
            const isEndCalculated = tempEnd ? isSameDay(day, tempEnd) : (hoverDate && tempStart && isSameDay(day, hoverDate));
            const isEnd = !!isEndCalculated;

            const dTime = day.getTime();
            const sTime = tempStart?.getTime() || 0;
            const eTime = tempEnd?.getTime() || 0;
            const hTime = hoverDate?.getTime() || 0;

            let isBg = false;
            let bgStart = false;
            let bgEnd = false;

            if (tempStart && tempEnd) {
                if (dTime > sTime && dTime < eTime) isBg = true;
                if (dTime === sTime && dTime < eTime) bgStart = true;
                if (dTime === eTime && dTime > sTime) bgEnd = true;
            } else if (tempStart && !tempEnd && hoverDate) {
                if (sTime < hTime) {
                    if (dTime > sTime && dTime < hTime) isBg = true;
                    if (dTime === sTime) bgStart = true;
                    if (dTime === hTime) bgEnd = true;
                } else if (sTime > hTime) {
                    if (dTime < sTime && dTime > hTime) isBg = true;
                    if (dTime === sTime) bgEnd = true;
                    if (dTime === hTime) bgStart = true;
                }
            }

            return (
              <div 
                key={i} 
                className="relative h-8 w-full flex items-center justify-center text-sm"
                onClick={() => handleDateClick(day)}
                onMouseEnter={() => hasData && setHoverDate(day)}
                onMouseLeave={() => setHoverDate(null)}
              >
                {isBg && <div className="absolute inset-0 bg-blue-500/20"></div>}
                {bgStart && <div className="absolute right-0 top-0 bottom-0 left-1/2 bg-blue-500/20"></div>}
                {bgEnd && <div className="absolute left-0 top-0 bottom-0 right-1/2 bg-blue-500/20"></div>}

                <div className={cn(
                  "absolute w-8 h-8 rounded-full flex items-center justify-center z-10 transition-colors",
                  (isStart || (tempEnd && isSameDay(day, tempEnd))) ? "bg-blue-600 text-slate-900 dark:text-white font-bold shadow-md shadow-blue-500/20" : "",
                  (!isStart && !(tempEnd && isSameDay(day, tempEnd))) && hasData && !isBg ? "text-slate-800 dark:text-slate-200 cursor-pointer hover:border hover:border-slate-400 dark:hover:border-white/20 hover:bg-slate-100 dark:hover:bg-white/5" : "",
                  (!isStart && !(tempEnd && isSameDay(day, tempEnd))) && hasData && isBg ? "text-slate-800 dark:text-slate-200 cursor-pointer hover:font-bold" : "",
                  (!hasData && "opacity-30 cursor-not-allowed text-slate-500")
                )}>
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const rightMonth = addMonths(currentMonth, 1);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-sm transition-colors text-slate-900 dark:text-white"
      >
        <CalendarIcon className="w-4 h-4 text-emerald-400" />
        <span className="font-medium whitespace-nowrap">
          {startDate ? format(startDate, 'dd MMM yyyy', { locale: vi }) : 'Tất cả thời gian'} 
          {startDate && endDate && !isSameDay(startDate, endDate) ? ` - ${format(endDate, 'dd MMM yyyy', { locale: vi })}` : ''}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400 ml-2" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full right-0 mt-2 z-50 flex flex-col md:flex-row bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-white/5 origin-top-right w-[calc(100vw-2rem)] md:w-auto max-w-[800px]"
          >
            {/* Presets Sidebar */}
            <div className="w-full md:w-48 bg-slate-100 dark:bg-white/5 border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/10 p-4 flex flex-row md:flex-col gap-1 overflow-x-auto">
              <div className="text-[10px] font-bold text-slate-500 mb-2 px-3 uppercase tracking-wider hidden md:block">Presets</div>
              {[
                { label: 'Tất cả thời gian', id: 'all' },
                { label: 'Dữ liệu mới nhất', id: 1 },
                { label: '3 ngày gần nhất', id: 3 },
                { label: '7 ngày gần nhất', id: 7 },
                { label: '30 ngày gần nhất', id: 30 },
                { label: 'Quý 1', id: 'q1' },
                { label: 'Quý 2', id: 'q2' },
                { label: 'Quý 3', id: 'q3' },
                { label: 'Quý 4', id: 'q4' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset.id)}
                  className="px-3 py-2 text-sm text-left text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white rounded-lg whitespace-nowrap transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Main Date Picker Area */}
            <div className="p-4 md:p-6 flex flex-col">
              {/* Header Inputs */}
              <div className="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-white/10 pb-4">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 min-w-[130px] text-center">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Ngày bắt đầu</div>
                    <div className="font-semibold text-slate-900 dark:text-white">{tempStart ? format(tempStart, 'dd/MM/yyyy', { locale: vi }) : '--'}</div>
                  </div>
                  <span className="text-slate-500">-</span>
                  <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 min-w-[130px] text-center">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Ngày kết thúc</div>
                    <div className="font-semibold text-slate-900 dark:text-white">{tempEnd ? format(tempEnd, 'dd/MM/yyyy', { locale: vi }) : '--'}</div>
                  </div>
                </div>
                <button onClick={handleClear} className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors ml-6">
                  Clear filters
                </button>
              </div>

              {/* Calendars */}
              <div className="flex flex-col sm:flex-row gap-8 relative items-start">
                <button onClick={prevMonth} className="absolute left-[-16px] top-0 p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-200 dark:hover:bg-white/10 z-10 hidden sm:block">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="sm:hidden flex justify-between w-full mb-4">
                   <button onClick={prevMonth} className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><ChevronLeft className="w-5 h-5" /></button>
                   <button onClick={nextMonth} className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><ChevronRight className="w-5 h-5" /></button>
                </div>
                
                {renderMonth(currentMonth)}
                {renderMonth(rightMonth)}

                <button onClick={nextMonth} className="absolute right-[-16px] top-0 p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-200 dark:hover:bg-white/10 z-10 hidden sm:block">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-white/10">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleApply}
                  className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-slate-900 dark:text-white rounded-lg shadow-lg shadow-blue-500/20 transition-all"
                >
                  Apply
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
