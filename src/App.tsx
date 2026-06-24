import React, { useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell, ComposedChart, Line } from 'recharts';
import { ArrowUpRight, ArrowDownRight, RefreshCw, Smartphone, Monitor, TrendingUp, Calendar, AlertCircle, BarChart3, Activity, Info, Sun, Moon } from 'lucide-react';
import { format, parse, isAfter, subDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { DateRangePicker } from './components/DateRangePicker';

const DATA_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRJCA617kuAjDdkxcyw8FKL_UV1X_k-QsLiDYsNasvWngS6ks38L5mfLejeTkE5c-4YMI5bpMNXvIud/pub?output=tsv";

interface DataRow {
  dateStr: string;
  timestamp: number;
  mobile: number;
  pc: number;
  pageviewsMobile: number;
  pageviewsPC: number;
  pageviews: number;
  total: number;
}

const COLORS = {
  mobile: '#10b981', // emerald-500
  pc: '#3b82f6',     // blue-500
  total: '#f8fafc',  // slate-50
};


function InfoTooltip({ content, align = 'center' }: { content: string, align?: 'left' | 'center' | 'right' }) {
  let positionClasses = 'left-1/2 -translate-x-1/2';
  let arrowClasses = 'left-1/2 -translate-x-1/2';
  
  if (align === 'right') {
    positionClasses = 'right-[-4px] md:right-[-8px]';
    arrowClasses = 'right-4';
  } else if (align === 'left') {
    positionClasses = 'left-[-4px] md:left-[-8px]';
    arrowClasses = 'left-4';
  }

  return (
    <div className="group relative z-[9999] inline-flex items-center justify-center">
      <Info className="w-4 h-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-help transition-colors" />
      <div className={`absolute top-[calc(100%+8px)] ${positionClasses} px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs leading-relaxed rounded-lg shadow-xl border border-slate-200 dark:border-white/10 w-48 sm:w-64 md:w-72 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9999] font-normal text-left`}>
        {content}
        <div className={`absolute bottom-full ${arrowClasses} border-4 border-transparent border-b-white dark:border-b-slate-800`}></div>
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const [allData, setAllData] = useState<DataRow[]>([]);
  const [data, setData] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [platform, setPlatform] = useState<'all' | 'mobile' | 'pc'>('all');
  
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(DATA_URL + "&t=" + new Date().getTime());
      if (!response.ok) throw new Error("Failed to fetch data");
      
      const tsvText = await response.text();
      const lines = tsvText.split('\n').map(l => l.trim()).filter(Boolean);
      
      const parsedData: DataRow[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('\t');
        if (parts.length >= 3) {
          const dateStr = parts[0];
          const mobileStr = parts[1];
          const pcStr = parts[2];
          const pvMobileStr = parts[3] || '0';
          const pvPCStr = parts[4] || '0';
          const pvTotalStr = parts[5] || '0';
          
          if (!dateStr || dateStr.toLowerCase().includes('day')) continue;
          
          const ms = new Date(dateStr).getTime();
          if (isNaN(ms)) continue;
          
          const parseVNNumber = (str: string) => {
            if (!str) return 0;
            return parseFloat(str.replace(/\./g, '').replace(/,/g, '.')) || 0;
          };
          
          const mobile = parseVNNumber(mobileStr);
          const pc = parseVNNumber(pcStr);
          const pageviewsMobile = parseVNNumber(pvMobileStr);
          const pageviewsPC = parseVNNumber(pvPCStr);
          const pageviews = parseVNNumber(pvTotalStr);
          
          parsedData.push({
            dateStr,
            timestamp: ms,
            mobile,
            pc,
            pageviewsMobile,
            pageviewsPC,
            pageviews,
            total: mobile + pc
          });
        }
      }
      
      parsedData.sort((a, b) => a.timestamp - b.timestamp);
      setAllData(parsedData);
      setLastUpdated(new Date());
      
      // Select last 30 days as default on initial load
      if (parsedData.length > 0 && !startDate && !endDate) {
          const latest = new Date(parsedData[parsedData.length - 1].timestamp);
          const earliest = new Date(parsedData[0].timestamp);
          const start = new Date(latest);
          start.setDate(latest.getDate() - 29);
          
          setStartDate(start < earliest ? earliest : start);
          setEndDate(latest);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000); // 5 mins
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
      if (allData.length === 0) {
          setData([]);
          return;
      }
      
      if (!startDate || !endDate) {
          setData(allData);
          return;
      }
      
      const s = startDate.getTime();
      const e = endDate.getTime();
      
      const filtered = allData.filter(d => {
          // Add extra buffering or simple equal check? since time is set at 00:00 we just compare stamps
          return d.timestamp >= s && d.timestamp <= e;
      });
      
      setData(filtered);
  }, [allData, startDate, endDate]);

  const availableDatesObj = useMemo(() => {
      return allData.map(d => new Date(d.timestamp));
  }, [allData]);

  const previousData = useMemo(() => {
      if (allData.length === 0 || data.length === 0) return [];
      
      const latestTimestamp = data[data.length - 1].timestamp;
      const earliestTimestamp = data[0].timestamp;
      
      const latestDate = new Date(latestTimestamp);
      const earliestDate = new Date(earliestTimestamp);
      
      const days = Math.round((latestDate.getTime() - earliestDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      
      // Calculate previous period dates safely using date-fns
      const prevEndDate = subDays(earliestDate, 1);
      const prevStartDate = subDays(earliestDate, days);
      
      const prevStart = prevStartDate.getTime();
      const prevEnd = prevEndDate.getTime() + (23 * 60 * 60 + 59 * 60 + 59) * 1000; // end of that day
      
      return allData.filter(d => d.timestamp >= prevStart && d.timestamp <= prevEnd);
  }, [allData, data]);

  const stats = useMemo(() => {
    if (data.length === 0) return null;
    
    const latest = data[data.length - 1];
    
    const totalClicks = data.reduce((acc, row) => acc + row.total, 0);
    const totalMobile = data.reduce((acc, row) => acc + row.mobile, 0);
    const totalPC = data.reduce((acc, row) => acc + row.pc, 0);
    const totalPageviews = data.reduce((acc, row) => acc + row.pageviews, 0);
    const totalPageviewsMobile = data.reduce((acc, row) => acc + row.pageviewsMobile, 0);
    const totalPageviewsPC = data.reduce((acc, row) => acc + row.pageviewsPC, 0);
    
    const prevTotalClicks = previousData.reduce((acc, row) => acc + row.total, 0);
    const prevTotalMobile = previousData.reduce((acc, row) => acc + row.mobile, 0);
    const prevTotalPC = previousData.reduce((acc, row) => acc + row.pc, 0);
    const prevTotalPageviews = previousData.reduce((acc, row) => acc + row.pageviews, 0);
    const prevTotalPageviewsMobile = previousData.reduce((acc, row) => acc + row.pageviewsMobile, 0);
    const prevTotalPageviewsPC = previousData.reduce((acc, row) => acc + row.pageviewsPC, 0);
    
    let maxDay = data[0];
    for (const row of data) {
      if (row.total > maxDay.total) maxDay = row;
    }
    
    const calculateGrowth = (current: number, prev: number) => {
      if (!prev) return 0;
      return ((current - prev) / prev) * 100;
    };
    
    const totalGrowth = previousData.length > 0 ? calculateGrowth(totalClicks, prevTotalClicks) : 0;
    const mobileGrowth = previousData.length > 0 ? calculateGrowth(totalMobile, prevTotalMobile) : 0;
    const pcGrowth = previousData.length > 0 ? calculateGrowth(totalPC, prevTotalPC) : 0;
    const pageviewsGrowth = previousData.length > 0 ? calculateGrowth(totalPageviews, prevTotalPageviews) : 0;

    const earliestTimestamp = data[0].timestamp;
    const latestTimestamp = latest.timestamp;
    const durationDays = Math.round((latestTimestamp - earliestTimestamp) / (24 * 60 * 60 * 1000)) + 1;

    return {
      totalClicks,
      totalMobile,
      totalPC,
      totalPageviews,
      totalPageviewsMobile,
      totalPageviewsPC,
      latest,
      totalGrowth,
      mobileGrowth,
      pcGrowth,
      pageviewsGrowth,
      maxDay,
      prevTotalClicks,
      prevTotalMobile,
      prevTotalPC,
      prevTotalPageviews,
      prevTotalPageviewsMobile,
      prevTotalPageviewsPC,
      durationDays
    };
  }, [data, previousData]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(num);
  };
  
  const formatShortNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return formatNumber(num);
  };

  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      displayDate: format(new Date(d.timestamp), 'dd/MM'),
    }));
  }, [data]);
  
  const comparisonChartData = useMemo(() => {
    if (!stats) return [];
    
    if (platform === 'mobile') {
      return [
        { name: 'Mobile', current: stats.totalMobile, previous: stats.prevTotalMobile }
      ];
    }
    
    if (platform === 'pc') {
      return [
        { name: 'PC', current: stats.totalPC, previous: stats.prevTotalPC }
      ];
    }
    
    return [
      {
        name: 'Tổng Click',
        current: stats.totalClicks,
        previous: stats.prevTotalClicks,
      },
      {
        name: 'Mobile',
        current: stats.totalMobile,
        previous: stats.prevTotalMobile,
      },
      {
        name: 'PC',
        current: stats.totalPC,
        previous: stats.prevTotalPC,
      }
    ];
  }, [stats, platform]);

  if (loading && data.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/30 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-900/20 rounded-full blur-[120px]"></div>
        </div>
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4 relative z-10" />
        <p className="text-slate-500 dark:text-slate-400 font-medium relative z-10">Đang tải dữ liệu Thế Giới...</p>
      </div>
    );
  }

  if (error && data.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/30 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-900/20 rounded-full blur-[120px]"></div>
        </div>
        <div className="bg-slate-100 dark:bg-white/5 backdrop-blur-lg p-6 rounded-2xl shadow-sm border border-red-500/20 max-w-md w-full text-center relative z-10">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Lỗi tải dữ liệu</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">{error}</p>
          <button 
            onClick={fetchData}
            className="bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-900 dark:text-white px-6 py-2 rounded-lg font-medium transition-colors border border-slate-200 dark:border-white/10"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const pieData = stats ? [
    { name: 'Mobile', value: stats.totalMobile, color: COLORS.mobile },
    { name: 'PC', value: stats.totalPC, color: COLORS.pc },
  ] : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-12 relative overflow-hidden flex flex-col">
      {/* Mesh Background Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none fixed">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/30 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-900/20 rounded-full blur-[120px]"></div>
      </div>

      {/* Header */}
      <header className="relative z-50 bg-slate-100 dark:bg-white/5 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#9f224e] rounded-xl flex items-center justify-center shadow-inner">
                <span className="text-slate-900 dark:text-white font-bold text-xl leading-none">VN</span>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">VnExpress <span className="text-slate-300 dark:text-white/20 font-normal mx-1">|</span> <span className="text-[#9f224e]">Thế Giới</span></h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Dashboard Tương Tác</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex bg-slate-200/50 dark:bg-white/5 rounded-xl p-1 border border-slate-200 dark:border-white/10">
                <button 
                  onClick={() => setPlatform('all')}
                  className={cn("px-3 py-1.5 text-sm font-semibold rounded-lg transition-all", platform === 'all' ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")}
                >
                  Tất cả
                </button>
                <button 
                  onClick={() => setPlatform('mobile')}
                  className={cn("px-3 py-1.5 text-sm font-semibold rounded-lg transition-all", platform === 'mobile' ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")}
                >
                  Mobile
                </button>
                <button 
                  onClick={() => setPlatform('pc')}
                  className={cn("px-3 py-1.5 text-sm font-semibold rounded-lg transition-all", platform === 'pc' ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")}
                >
                  PC
                </button>
              </div>

              <DateRangePicker 
                startDate={startDate}
                endDate={endDate}
                onChange={(s, e) => {
                    setStartDate(s);
                    setEndDate(e);
                }}
                availableDates={availableDatesObj}
              />
              
              {lastUpdated && (
                <div className="text-xs text-green-400 hidden lg:flex items-center gap-2 bg-green-500/10 px-3 py-1.5 rounded-full font-medium border border-green-500/20">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Cập nhật: {format(lastUpdated, 'HH:mm')}
                </div>
              )}
              <button 
                onClick={fetchData} 
                disabled={loading}
                className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 bg-slate-100 dark:bg-white/5"
                title="Làm mới dữ liệu"
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin text-blue-400")} />
              </button>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 bg-slate-100 dark:bg-white/5"
                title="Bật/Tắt giao diện tối"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 w-full">
        
        {/* KPI Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6">
            <KpiCard 
              title="Tổng Pageviews"
              value={formatNumber(stats.totalPageviews)}
              subtitle={`Cập nhật đến ${format(new Date(stats.latest!.timestamp), 'dd/MM/yyyy')}`}
              icon={<Activity className="w-5 h-5 text-purple-400" />}
              trend={stats.pageviewsGrowth}
              trendTooltip={`Chênh lệch pageviews so với kỳ trước (${stats.durationDays} ngày liền kề)`}
            />
            <KpiCard 
              title="Tổng Lượt Click"
              value={formatNumber(stats.totalClicks)}
              subtitle={`CTR: ${((stats.totalClicks / (stats.totalPageviews || 1)) * 100).toFixed(2)}%`}
              icon={<BarChart3 className="w-5 h-5 text-emerald-400" />}
              trend={stats.totalGrowth}
              trendTooltip={`Chênh lệch so với kỳ trước (${stats.durationDays} ngày liền kề)`}
            />
            <KpiCard 
              title="Click Mobile"
              value={formatNumber(stats.totalMobile)}
              subtitle={`CTR: ${((stats.totalMobile / (stats.totalPageviewsMobile || 1)) * 100).toFixed(2)}%`}
              icon={<Smartphone className="w-5 h-5 text-emerald-400" />}
              trend={stats.mobileGrowth}
              trendTooltip={`Chênh lệch click trên mobile so với kỳ trước (${stats.durationDays} ngày liền kề)`}
            />
            <KpiCard 
              title="Click PC"
              value={formatNumber(stats.totalPC)}
              subtitle={`CTR: ${((stats.totalPC / (stats.totalPageviewsPC || 1)) * 100).toFixed(2)}%`}
              icon={<Monitor className="w-5 h-5 text-blue-400" />}
              trend={stats.pcGrowth}
              trendTooltip={`Chênh lệch click trên PC so với kỳ trước (${stats.durationDays} ngày liền kề)`}
            />
            <KpiCard 
              title="Ngày Đỉnh Kỷ Lục"
              value={formatNumber(stats.maxDay.total)}
              subtitle={format(new Date(stats.maxDay.timestamp), 'dd/MM/yyyy', { locale: vi })}
              icon={<TrendingUp className="w-5 h-5 text-amber-400" />}
            />
          </div>
        )}

        {/* Charts Row */}
        <div className={cn("grid gap-6", platform === 'all' ? "grid-cols-1 xl:grid-cols-4" : "grid-cols-1")}>
          {/* Main Trend Chart */}
          <section className={cn("bg-slate-100 dark:bg-white/5 backdrop-blur-lg border border-slate-200 dark:border-white/10 rounded-2xl p-6 flex flex-col", platform === 'all' ? "xl:col-span-2" : "xl:col-span-1")}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <Activity className="w-5 h-5 text-[#9f224e]" />
                  Xu hướng Click theo ngày
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Lưu lượng tương tác từ Mobile và PC</p>
              </div>
            </div>
            
            <div className="flex-1 min-h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff1a" />
                  <XAxis 
                    dataKey="displayDate" 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(val, i) => i % 5 === 0 || i === chartData.length - 1 ? val : ''}
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                    tickFormatter={(val) => formatShortNumber(val)}
                  />
                  <RechartsTooltip content={<CustomTooltip platform={platform} />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)', strokeWidth: 1 }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 500 }} />
                  
                  {platform === 'all' && <Area type="monotone" name="Tổng" dataKey="total" fill="url(#colorTotal)" stroke={COLORS.total} strokeWidth={2} fillOpacity={1} opacity={0.3} />}
                  {(platform === 'all' || platform === 'mobile') && <Line type="monotone" name="Mobile" dataKey="mobile" stroke={COLORS.mobile} strokeWidth={platform === 'mobile' ? 4 : 3} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: COLORS.mobile }} />}
                  {(platform === 'all' || platform === 'pc') && <Line type="monotone" name="PC" dataKey="pc" stroke={COLORS.pc} strokeWidth={platform === 'pc' ? 4 : 3} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: COLORS.pc }} />}
                  
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.total} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={COLORS.total} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Allocation Pie Chart */}
          {platform === 'all' && stats && (
            <>
            <section className="bg-slate-100 dark:bg-white/5 backdrop-blur-lg border border-slate-200 dark:border-white/10 rounded-2xl p-6 flex flex-col z-10 hover:z-50 transition-all xl:col-span-1">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Tỷ trọng nền tảng
                  <InfoTooltip content="Thể hiện tỷ lệ phần trăm phân bổ lượt tương tác (click) từ 2 nền tảng Mobile và PC dựa trên tổng lượt click trong khoảng khoảng thời gian đã được chọn." />
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">Mobile vs PC trong thời gian chọn</p>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number) => formatNumber(value)}
                      contentStyle={{ borderRadius: '12px', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', backdropFilter: 'blur(12px)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)', fontWeight: 'bold' }}
                      itemStyle={{ color: 'white' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="flex justify-center gap-8 w-full mt-2">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex flex-col items-center p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 min-w-[100px]">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: d.color }}></div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{d.name}</span>
                      </div>
                      <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{((d.value / (stats?.totalClicks || 1)) * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            
            <section className="bg-slate-100 dark:bg-white/5 backdrop-blur-lg border border-slate-200 dark:border-white/10 rounded-2xl p-6 flex flex-col z-10 hover:z-50 transition-all xl:col-span-1">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Tỷ lệ Click (CTR)
                  <InfoTooltip content="Tỷ lệ click tính riêng trên số pageviews của từng nền tảng tương ứng." />
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">CTR chi tiết theo Nền tảng</p>
              </div>
              
              <div className="flex-1 flex flex-col justify-center gap-8">
                {/* Tổng CTR */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center shadow-sm">
                        <Activity className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-0.5">Tổng CTR</div>
                        <div className="text-xs font-medium text-slate-500">{formatNumber(stats.totalClicks)} / {formatNumber(stats.totalPageviews)} PV</div>
                      </div>
                    </div>
                    <div className="text-2xl font-black text-slate-800 dark:text-white">
                      {((stats.totalClicks / (stats.totalPageviews || 1)) * 100).toFixed(2)}%
                    </div>
                  </div>
                  <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-slate-600 dark:bg-slate-400 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (stats.totalClicks / (stats.totalPageviews || 1)) * 100)}%` }}></div>
                  </div>
                </div>

                {/* Mobile CTR */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-sm">
                        <Smartphone className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-0.5">Mobile CTR</div>
                        <div className="text-xs font-medium text-slate-500">{formatNumber(stats.totalMobile)} / {formatNumber(stats.totalPageviewsMobile)} PV</div>
                      </div>
                    </div>
                    <div className="text-2xl font-black text-emerald-500">
                      {((stats.totalMobile / (stats.totalPageviewsMobile || 1)) * 100).toFixed(2)}%
                    </div>
                  </div>
                  <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (stats.totalMobile / (stats.totalPageviewsMobile || 1)) * 100)}%` }}></div>
                  </div>
                </div>

                {/* PC CTR */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-sm">
                        <Monitor className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-0.5">PC CTR</div>
                        <div className="text-xs font-medium text-slate-500">{formatNumber(stats.totalPC)} / {formatNumber(stats.totalPageviewsPC)} PV</div>
                      </div>
                    </div>
                    <div className="text-2xl font-black text-blue-500">
                      {((stats.totalPC / (stats.totalPageviewsPC || 1)) * 100).toFixed(2)}%
                    </div>
                  </div>
                  <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (stats.totalPC / (stats.totalPageviewsPC || 1)) * 100)}%` }}></div>
                  </div>
                </div>
              </div>
            </section>
            </>
          )}
        </div>

        {/* Comparison Chart */}
        <section className="bg-slate-100 dark:bg-white/5 backdrop-blur-lg border border-slate-200 dark:border-white/10 rounded-2xl p-6 flex flex-col relative z-20 hover:z-50 transition-all">
          <div className="flex justify-between items-start mb-6 gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                So sánh với kỳ trước
                <InfoTooltip content={`Báo cáo so sánh sự biến động của dữ liệu kỳ hiện tại (${stats?.durationDays || 0} ngày) so với kỳ trước (${stats?.durationDays || 0} ngày liền kề trước đó).`} />
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Đối chiếu chênh lệch tương tác giữa hai mốc thời gian tương đương</p>
            </div>
          </div>
          
          <div className="w-full mt-4 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonChartData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }} barGap={12}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff1a" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} tickFormatter={(val) => formatShortNumber(val)} />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  contentStyle={{ borderRadius: '12px', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', backdropFilter: 'blur(12px)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)', fontWeight: 'bold' }}
                  itemStyle={{ color: 'white' }}
                  formatter={(value: number) => formatNumber(value)}
                />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 500 }} />
                
                <Bar dataKey="current" name="Kỳ hiện tại" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={50} />
                <Bar dataKey="previous" name="Kỳ trước" fill="#64748b" radius={[6, 6, 0, 0]} barSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Recent Data Table */}
        <section className="bg-slate-100 dark:bg-white/5 backdrop-blur-lg border border-slate-200 dark:border-white/10 rounded-2xl hover:z-50 relative transition-all">
          <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center rounded-t-2xl">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Calendar className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                Dữ liệu theo ngày
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Biến động tương tác chi tiết từng ngày trong khoảng thời gian chọn</p>
            </div>
          </div>
          
          <div className="overflow-x-auto pb-4 rounded-b-2xl">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="bg-slate-200/50 dark:bg-[#1e293b]/50 text-slate-500 dark:text-slate-400 text-[13px]">
                <tr className="border-b border-slate-200 dark:border-white/10">
                  <th className="px-6 py-4 font-semibold">Ngày</th>
                  <th className="px-6 py-4 font-semibold text-right">Pageviews {platform === 'all' ? 'Tổng' : platform === 'mobile' ? 'Mobile' : 'PC'}</th>
                  {(platform === 'all' || platform === 'mobile') && <th className="px-6 py-4 font-semibold text-right">Mobile</th>}
                  {(platform === 'all' || platform === 'pc') && <th className="px-6 py-4 font-semibold text-right">PC</th>}
                  {platform === 'all' && <th className="px-6 py-4 font-semibold text-right">Tổng click</th>}
                  <th className="px-6 py-4 font-semibold text-right">CTR</th>
                  {platform === 'all' && (
                    <th className="px-6 py-4 font-semibold text-right">
                      <div className="flex items-center justify-end gap-2">
                        Tỷ trọng mobile
                        <InfoTooltip content="Tỷ lệ % lượt click từ thiết bị mobile so với tổng lượt click của chuyên mục Thế Giới trong ngày. Giúp đánh giá xu hướng đọc báo trên điện thoại." align="right" />
                      </div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {[...data].reverse().slice(0, 30).map((row, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={row.dateStr} 
                    className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white">{format(new Date(row.timestamp), 'dd/MM/yyyy')}</div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 capitalize">{format(new Date(row.timestamp), 'EEEE', { locale: vi })}</div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-900 dark:text-slate-100 font-medium">
                      {formatNumber(platform === 'all' ? row.pageviews : platform === 'mobile' ? row.pageviewsMobile : row.pageviewsPC)}
                    </td>
                    {(platform === 'all' || platform === 'mobile') && (
                      <td className="px-6 py-4 text-right">
                        <span className="font-mono text-emerald-400">{formatNumber(row.mobile)}</span>
                      </td>
                    )}
                    {(platform === 'all' || platform === 'pc') && (
                      <td className="px-6 py-4 text-right">
                        <span className="font-mono text-blue-400">{formatNumber(row.pc)}</span>
                      </td>
                    )}
                    {platform === 'all' && (
                      <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-white/5">
                        {formatNumber(row.total)}
                      </td>
                    )}
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {platform === 'mobile' 
                          ? ((row.mobile / (row.pageviewsMobile || 1)) * 100).toFixed(2) 
                          : platform === 'pc' 
                            ? ((row.pc / (row.pageviewsPC || 1)) * 100).toFixed(2)
                            : ((row.total / (row.pageviews || 1)) * 100).toFixed(2)}%
                      </span>
                    </td>
                    {platform === 'all' && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{((row.mobile / row.total) * 100).toFixed(1)}%</span>
                          <div className="w-20 h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden shadow-inner flex shrink-0 justify-start">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(row.mobile / row.total) * 100}%` }}></div>
                          </div>
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

// Subcomponents

function KpiCard({ title, value, subtitle, icon, trend, trendTooltip }: { title: string, value: string, subtitle: string, icon: React.ReactNode, trend?: number, trendTooltip?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-100 dark:bg-white/5 backdrop-blur-lg border border-slate-200 dark:border-white/10 p-6 rounded-2xl relative group hover:border-slate-400 dark:hover:border-white/20 hover:z-50 transition-colors"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-sm relative z-10 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full z-20 border relative whitespace-nowrap",
            trend > 0 ? "bg-green-500/10 text-green-400 border-green-500/20" : trend < 0 ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10"
          )}>
            {trend > 0 ? <ArrowUpRight className="w-3.5 h-3.5 shrink-0" /> : trend < 0 ? <ArrowDownRight className="w-3.5 h-3.5 shrink-0" /> : null}
            <span>{Math.abs(trend).toFixed(1)}%</span>
            {trendTooltip && <div className="ml-0.5"><InfoTooltip content={trendTooltip} /></div>}
          </div>
        )}
      </div>
      <div className="relative z-10 block mt-2">
        <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold mb-1.5 drop-shadow-sm line-clamp-1">{title}</p>
        <h3 className="text-2xl 2xl:text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight truncate" title={value}>{value}</h3>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-1">{subtitle}</p>
      </div>
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label, platform }: any) => {
  if (active && payload && payload.length) {
    const rawData = payload[0].payload as DataRow;
    const formatNumber = (num: number) => new Intl.NumberFormat('vi-VN').format(num);
    
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-4 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 w-64 ring-1 ring-slate-200 dark:ring-white/5">
        <p className="font-bold text-slate-900 dark:text-white mb-3 border-b border-slate-200 dark:border-white/10 pb-2 flex justify-between items-center">
          <span className="text-[15px]">{format(new Date(rawData.timestamp), 'dd/MM/yyyy')}</span>
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 px-2 py-0.5 bg-slate-100 dark:bg-white/5 rounded-md">
            {format(new Date(rawData.timestamp), 'EEEE', { locale: vi })}
          </span>
        </p>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold tracking-wide">
              <span className="w-3 h-3 rounded-full shadow-sm bg-purple-400"></span>
              Pageviews {platform === 'all' ? 'Tổng' : platform === 'mobile' ? 'Mobile' : 'PC'}
            </span>
            <span className="font-black text-slate-900 dark:text-white text-base">
              {formatNumber(platform === 'all' ? rawData.pageviews : platform === 'mobile' ? rawData.pageviewsMobile : rawData.pageviewsPC)}
            </span>
          </div>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold tracking-wide">
                <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }}></span>
                {entry.name}
              </span>
              <span className="font-black text-slate-900 dark:text-white text-base">{formatNumber(entry.value)}</span>
            </div>
          ))}
          <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200 dark:border-white/10">
            <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold tracking-wide">
              CTR {platform === 'all' ? 'Tổng' : platform === 'mobile' ? 'Mobile' : 'PC'}
            </span>
            <span className="font-bold text-emerald-400">
              {platform === 'mobile' 
                ? ((rawData.mobile / (rawData.pageviewsMobile || 1)) * 100).toFixed(2) 
                : platform === 'pc' 
                  ? ((rawData.pc / (rawData.pageviewsPC || 1)) * 100).toFixed(2)
                  : ((rawData.total / (rawData.pageviews || 1)) * 100).toFixed(2)}%
            </span>
          </div>
          {platform === 'all' && (
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 flex flex-col gap-1 text-sm">
               <div className="flex justify-between items-center">
                   <span className="text-slate-500 dark:text-slate-400 font-medium">Tỷ trọng mobile:</span>
                   <span className="font-bold text-emerald-400">{((rawData.mobile / rawData.total) * 100).toFixed(1)}%</span>
               </div>
               <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden mt-1 flex justify-start">
                   <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(rawData.mobile / rawData.total) * 100}%` }}></div>
               </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};
