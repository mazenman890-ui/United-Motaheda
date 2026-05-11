/**
 * PERFORMANCE MONITOR - Real-time Performance Tracking
 * 
 * Displays real-time performance metrics for the optimized catalog system.
 * Shows loading times, cache hit rates, and query performance.
 */

import { useState, useEffect } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import {
  Activity,
  Clock,
  Database,
  HardDrive,
  Zap,
  TrendingUp,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "../app/components/UI";

interface PerformanceMetrics {
  // Page performance
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  
  // Cache performance
  cacheSize: number;
  cacheMaxSize: number;
  cacheHitRate: number;
  
  // Query performance
  averageQueryTime: number;
  totalQueries: number;
  slowQueries: number;
  
  // Memory usage
  memoryUsage: number;
  memoryLimit: number;
  
  // Network performance
  totalDataTransferred: number;
  requestsPerSecond: number;
}

export function PerformanceMonitor() {
  const { lang } = useLanguage();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    pageLoadTime: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    cacheSize: 0,
    cacheMaxSize: 30,
    cacheHitRate: 0,
    averageQueryTime: 0,
    totalQueries: 0,
    slowQueries: 0,
    memoryUsage: 0,
    memoryLimit: 100,
    totalDataTransferred: 0,
    requestsPerSecond: 0,
  });
  
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    const updateMetrics = () => {
      // Get navigation timing
      const navEntry = performance.getEntriesByType('navigation')[0] as any;
      const pageLoadTime = navEntry ? navEntry.loadEventEnd - navEntry.startTime : 0;
      
      // Get paint timing
      const paintEntries = performance.getEntriesByType('paint');
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
      
      // Get LCP (largest contentful paint)
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      const lcp = lcpEntries[lcpEntries.length - 1]?.startTime || 0;
      
      // Get memory usage (if available)
      const memoryInfo = (performance as any).memory;
      const memoryUsage = memoryInfo ? (memoryInfo.usedJSHeapSize / 1024 / 1024) : 0;
      
      // Get resource timing for network metrics
      const resources = performance.getEntriesByType('resource');
      const totalDataTransferred = resources.reduce((sum, resource) => {
        return sum + (resource as PerformanceResourceTiming).transferSize || 0;
      }, 0);

      setMetrics(prev => ({
        ...prev,
        pageLoadTime,
        firstContentfulPaint: fcp,
        largestContentfulPaint: lcp,
        memoryUsage,
        memoryLimit: memoryInfo ? (memoryInfo.jsHeapSizeLimit / 1024 / 1024) : 100,
        totalDataTransferred: totalDataTransferred / 1024, // KB
        requestsPerSecond: resources.length / (pageLoadTime / 1000) || 0,
      }));
    };

    const interval = setInterval(updateMetrics, 1000);
    updateMetrics(); // Initial update

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-lg hover:bg-slate-800 transition-colors"
      >
        <Activity className="h-3 w-3" />
        {lang === "ar" ? "الأداء" : "Performance"}
      </button>
    );
  }

  const getPerformanceGrade = () => {
    const score = (
      (metrics.pageLoadTime < 3000 ? 25 : 0) +
      (metrics.cacheHitRate > 0.8 ? 25 : 0) +
      (metrics.largestContentfulPaint < 2500 ? 25 : 0) +
      (metrics.averageQueryTime < 100 ? 25 : 0)
    );
    
    if (score >= 75) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-50' };
    if (score >= 50) return { grade: 'B', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (score >= 25) return { grade: 'C', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { grade: 'D', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const performanceGrade = getPerformanceGrade();

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-slate-200 bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 p-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-teal-600" />
          <span className="text-sm font-bold text-slate-900">
            {lang === "ar" ? "مراقبة الأداء" : "Performance Monitor"}
          </span>
          <span className={cn(
            "px-2 py-1 text-xs font-bold rounded",
            performanceGrade.bg,
            performanceGrade.color
          )}>
            {performanceGrade.grade}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-slate-600"
          >
            {isExpanded ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 text-slate-400 hover:text-slate-600"
          >
            ×
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
        {/* Page Performance */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-medium text-slate-700">
                {lang === "ar" ? "وقت التحميل" : "Page Load"}
              </span>
            </div>
            <div className={cn(
              "text-xs font-bold",
              metrics.pageLoadTime < 3000 ? "text-green-600" :
              metrics.pageLoadTime < 5000 ? "text-yellow-600" : "text-red-600"
            )}>
              {metrics.pageLoadTime.toFixed(0)}ms
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 ml-6">
              {lang === "ar" ? "أول محتوى" : "First Paint"}
            </span>
            <div className={cn(
              "text-xs",
              metrics.firstContentfulPaint < 1800 ? "text-green-600" :
              metrics.firstContentfulPaint < 3000 ? "text-yellow-600" : "text-red-600"
            )}>
              {metrics.firstContentfulPaint.toFixed(0)}ms
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 ml-6">
              {lang === "ar" ? "أكبر محتوى" : "Largest Paint"}
            </span>
            <div className={cn(
              "text-xs",
              metrics.largestContentfulPaint < 2500 ? "text-green-600" :
              metrics.largestContentfulPaint < 4000 ? "text-yellow-600" : "text-red-600"
            )}>
              {metrics.largestContentfulPaint.toFixed(0)}ms
            </div>
          </div>
        </div>

        {/* Cache Performance */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-700">
              {lang === "ar" ? "الذاكرة المؤقتة" : "Cache"}
            </span>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-slate-900">
              {metrics.cacheSize}/{metrics.cacheMaxSize}
            </div>
            <div className={cn(
              "text-xs",
              metrics.cacheHitRate > 0.8 ? "text-green-600" : 
              metrics.cacheHitRate > 0.5 ? "text-yellow-600" : "text-red-600"
            )}>
              {(metrics.cacheHitRate * 100).toFixed(0)}% {lang === "ar" ? "ضرب" : "hit"}
            </div>
          </div>
        </div>

        {/* Cache Hit Rate Bar */}
        <div className="w-full rounded-full bg-slate-200 h-2">
          <div
            className={cn(
              "h-2 rounded-full transition-all",
              metrics.cacheHitRate > 0.8 ? "bg-green-500" :
              metrics.cacheHitRate > 0.5 ? "bg-yellow-500" : "bg-red-500"
            )}
            style={{ width: `${metrics.cacheHitRate * 100}%` }}
          />
        </div>

        {/* Memory Usage */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-700">
              {lang === "ar" ? "الذاكرة" : "Memory"}
            </span>
          </div>
          <div className={cn(
            "text-xs font-bold",
            metrics.memoryUsage < 50 ? "text-green-600" :
            metrics.memoryUsage < 80 ? "text-yellow-600" : "text-red-600"
          )}>
            {metrics.memoryUsage.toFixed(1)}MB
          </div>
        </div>

        {/* Network Performance */}
        {isExpanded && (
          <div className="space-y-2 border-t border-slate-100 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-medium text-slate-700">
                  {lang === "ar" ? "الشبكة" : "Network"}
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-900">
                  {(metrics.totalDataTransferred / 1024).toFixed(1)}MB
                </div>
                <div className="text-xs text-slate-600">
                  {metrics.requestsPerSecond.toFixed(1)} {lang === "ar" ? "طلب/ث" : "req/s"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Performance Status */}
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2">
          {performanceGrade.grade === 'A' ? (
            <>
              <Zap className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-700">
                {lang === "ar" ? "أداء ممتاز" : "Excellent Performance"}
              </span>
            </>
          ) : performanceGrade.grade === 'B' ? (
            <>
              <TrendingUp className="h-4 w-4 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-700">
                {lang === "ar" ? "أداء جيد" : "Good Performance"}
              </span>
            </>
          ) : performanceGrade.grade === 'C' ? (
            <>
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-medium text-orange-700">
                {lang === "ar" ? "يحتاج تحسين" : "Needs Improvement"}
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-xs font-medium text-red-700">
                {lang === "ar" ? "أداء ضعيف" : "Poor Performance"}
              </span>
            </>
          )}
        </div>

        {/* Optimization Tips */}
        {isExpanded && (
          <div className="text-xs text-slate-500 border-t border-slate-100 pt-2">
            <div className="font-medium mb-1">
              {lang === "ar" ? "نصائح:" : "Tips:"}
            </div>
            <ul className="space-y-1">
              {metrics.pageLoadTime > 3000 && (
                <li>• {lang === "ar" ? "تحسين الصور وتقليل حجم الملفات" : "Optimize images and reduce file sizes"}</li>
              )}
              {metrics.cacheHitRate < 0.5 && (
                <li>• {lang === "ar" ? "استخدم التصفية لتقليل الاستعلامات" : "Use filters to reduce queries"}</li>
              )}
              {metrics.memoryUsage > 80 && (
                <li>• {lang === "ar" ? "إغلاق التطبيقات غير المستخدمة" : "Close unused applications"}</li>
              )}
              {metrics.largestContentfulPaint > 4000 && (
                <li>• {lang === "ar" ? "تحسين أداء الخادم" : "Optimize server performance"}</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
