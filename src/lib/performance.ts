/**
 * 性能监控工具
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private isEnabled: boolean;

  constructor(enabled: boolean = process.env.NODE_ENV === 'development') {
    this.isEnabled = enabled;
  }

  /**
   * 开始性能测量
   */
  start(name: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata,
    });
  }

  /**
   * 结束性能测量
   */
  end(name: string): number | null {
    if (!this.isEnabled) return null;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric "${name}" not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;

    // 在开发环境中输出性能信息
    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`, metric.metadata);
    }

    return duration;
  }

  /**
   * 测量函数执行时间
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T> | T,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(name, metadata);
    try {
      const result = await fn();
      return result;
    } finally {
      this.end(name);
    }
  }

  /**
   * 获取所有指标
   */
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values()).filter(m => m.duration !== undefined);
  }

  /**
   * 获取特定指标
   */
  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  /**
   * 清除所有指标
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * 获取性能摘要
   */
  getSummary(): {
    totalMetrics: number;
    averageDuration: number;
    slowestMetric: PerformanceMetric | null;
    fastestMetric: PerformanceMetric | null;
  } {
    const completedMetrics = this.getMetrics();
    
    if (completedMetrics.length === 0) {
      return {
        totalMetrics: 0,
        averageDuration: 0,
        slowestMetric: null,
        fastestMetric: null,
      };
    }

    const durations = completedMetrics.map(m => m.duration!);
    const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    
    const slowestMetric = completedMetrics.reduce((prev, current) => 
      (current.duration! > prev.duration!) ? current : prev
    );
    
    const fastestMetric = completedMetrics.reduce((prev, current) => 
      (current.duration! < prev.duration!) ? current : prev
    );

    return {
      totalMetrics: completedMetrics.length,
      averageDuration,
      slowestMetric,
      fastestMetric,
    };
  }
}

// 全局性能监控实例
const performanceMonitor = new PerformanceMonitor();

/**
 * 性能装饰器
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  name?: string
): T {
  const metricName = name || fn.name || 'anonymous';
  
  return (async (...args: Parameters<T>) => {
    return performanceMonitor.measure(metricName, () => fn(...args));
  }) as T;
}

/**
 * React Hook 用于性能监控
 */
export function usePerformanceMonitor() {
  const start = (name: string, metadata?: Record<string, any>) => {
    performanceMonitor.start(name, metadata);
  };

  const end = (name: string) => {
    return performanceMonitor.end(name);
  };

  const measure = async <T>(
    name: string,
    fn: () => Promise<T> | T,
    metadata?: Record<string, any>
  ) => {
    return performanceMonitor.measure(name, fn, metadata);
  };

  return { start, end, measure };
}

/**
 * 监控API请求性能
 */
export async function monitorApiRequest<T>(
  url: string,
  requestFn: () => Promise<T>
): Promise<T> {
  const metricName = `api:${url}`;
  return performanceMonitor.measure(metricName, requestFn, { url });
}

/**
 * 监控组件渲染性能
 */
export function monitorComponentRender(componentName: string) {
  return {
    start: () => performanceMonitor.start(`render:${componentName}`),
    end: () => performanceMonitor.end(`render:${componentName}`),
  };
}

/**
 * 监控数据库查询性能
 */
export async function monitorDatabaseQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const metricName = `db:${queryName}`;
  return performanceMonitor.measure(metricName, queryFn, { type: 'database' });
}

/**
 * Web Vitals 监控
 */
export function initWebVitalsMonitoring() {
  if (typeof window === 'undefined') return;

  // 监控 Largest Contentful Paint (LCP)
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            console.log('LCP:', entry.startTime);
          }
        }
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('LCP monitoring not supported');
    }
  }

  // 监控 First Input Delay (FID)
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'first-input') {
            console.log('FID:', (entry as any).processingStart - entry.startTime);
          }
        }
      });
      observer.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('FID monitoring not supported');
    }
  }

  // 监控 Cumulative Layout Shift (CLS)
  if ('PerformanceObserver' in window) {
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        console.log('CLS:', clsValue);
      });
      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('CLS monitoring not supported');
    }
  }
}

/**
 * 导出性能报告
 */
export function exportPerformanceReport(): string {
  const summary = performanceMonitor.getSummary();
  const metrics = performanceMonitor.getMetrics();
  
  const report = {
    timestamp: new Date().toISOString(),
    summary,
    metrics: metrics.map(m => ({
      name: m.name,
      duration: m.duration,
      metadata: m.metadata,
    })),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
  };

  return JSON.stringify(report, null, 2);
}

// 导出默认实例
export default performanceMonitor;
