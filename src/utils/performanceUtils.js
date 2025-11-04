/**
 * パフォーマンス最適化とメモリ管理のユーティリティ
 */

/**
 * パフォーマンス監視クラス
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
  }

  /**
   * 操作の開始時刻を記録
   * @param {string} operationName - 操作名
   * @returns {string} 操作ID
   */
  startOperation(operationName) {
    const operationId = `${operationName}-${Date.now()}-${Math.random()}`;
    const startTime = performance.now();
    
    this.metrics.set(operationId, {
      name: operationName,
      startTime,
      endTime: null,
      duration: null,
      memoryBefore: this.getMemoryUsage(),
      memoryAfter: null
    });

    return operationId;
  }

  /**
   * 操作の終了時刻を記録
   * @param {string} operationId - 操作ID
   */
  endOperation(operationId) {
    const endTime = performance.now();
    const metric = this.metrics.get(operationId);
    
    if (metric) {
      metric.endTime = endTime;
      metric.duration = endTime - metric.startTime;
      metric.memoryAfter = this.getMemoryUsage();
      
      // パフォーマンス警告のチェック
      this.checkPerformanceWarnings(metric);
    }
  }

  /**
   * メモリ使用量を取得
   * @returns {Object} メモリ使用量情報
   */
  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  /**
   * パフォーマンス警告をチェック
   * @param {Object} metric - メトリクス情報
   */
  checkPerformanceWarnings(metric) {
    // 削除操作が1秒以上かかった場合は警告
    if (metric.name.includes('delete') && metric.duration > 1000) {
      console.warn(`削除操作が遅い: ${metric.name} - ${metric.duration.toFixed(2)}ms`);
    }

    // メモリ使用量が大幅に増加した場合は警告
    if (metric.memoryBefore && metric.memoryAfter) {
      const memoryIncrease = metric.memoryAfter.used - metric.memoryBefore.used;
      if (memoryIncrease > 1024 * 1024) { // 1MB以上の増加
        console.warn(`メモリ使用量が大幅に増加: ${metric.name} - ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      }
    }
  }

  /**
   * 操作の統計情報を取得
   * @param {string} operationName - 操作名
   * @returns {Object} 統計情報
   */
  getOperationStats(operationName) {
    const operations = Array.from(this.metrics.values())
      .filter(metric => metric.name === operationName && metric.duration !== null);

    if (operations.length === 0) {
      return null;
    }

    const durations = operations.map(op => op.duration);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    return {
      operationName,
      count: operations.length,
      avgDuration: avgDuration.toFixed(2),
      minDuration: minDuration.toFixed(2),
      maxDuration: maxDuration.toFixed(2)
    };
  }

  /**
   * 全ての統計情報を取得
   * @returns {Array} 統計情報の配列
   */
  getAllStats() {
    const operationNames = [...new Set(Array.from(this.metrics.values()).map(m => m.name))];
    return operationNames.map(name => this.getOperationStats(name)).filter(Boolean);
  }

  /**
   * メトリクスをクリア
   */
  clearMetrics() {
    this.metrics.clear();
  }
}

/**
 * メモリリーク検出クラス
 */
export class MemoryLeakDetector {
  constructor() {
    this.references = new WeakMap();
    this.counters = new Map();
    this.checkInterval = null;
  }

  /**
   * オブジェクトの参照を追跡開始
   * @param {Object} obj - 追跡するオブジェクト
   * @param {string} type - オブジェクトタイプ
   */
  trackObject(obj, type) {
    this.references.set(obj, { type, createdAt: Date.now() });
    
    const currentCount = this.counters.get(type) || 0;
    this.counters.set(type, currentCount + 1);
  }

  /**
   * オブジェクトの参照を追跡停止
   * @param {Object} obj - 追跡停止するオブジェクト
   */
  untrackObject(obj) {
    const ref = this.references.get(obj);
    if (ref) {
      const currentCount = this.counters.get(ref.type) || 0;
      this.counters.set(ref.type, Math.max(0, currentCount - 1));
      this.references.delete(obj);
    }
  }

  /**
   * メモリリークの定期チェックを開始
   * @param {number} interval - チェック間隔（ミリ秒）
   */
  startLeakDetection(interval = 30000) {
    this.checkInterval = setInterval(() => {
      this.checkForLeaks();
    }, interval);
  }

  /**
   * メモリリークの定期チェックを停止
   */
  stopLeakDetection() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * メモリリークをチェック
   */
  checkForLeaks() {
    for (const [type, count] of this.counters.entries()) {
      if (count > 100) { // 100個以上のオブジェクトが残っている場合は警告
        console.warn(`潜在的なメモリリーク検出: ${type} - ${count}個のオブジェクトが残存`);
      }
    }
  }

  /**
   * 現在の追跡状況を取得
   * @returns {Object} 追跡状況
   */
  getTrackingStatus() {
    return Object.fromEntries(this.counters.entries());
  }
}

/**
 * イベントリスナー管理クラス
 */
export class EventListenerManager {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * イベントリスナーを追加
   * @param {EventTarget} target - イベントターゲット
   * @param {string} type - イベントタイプ
   * @param {Function} listener - リスナー関数
   * @param {Object} options - オプション
   */
  addEventListener(target, type, listener, options = {}) {
    const key = this.getListenerKey(target, type, listener);
    
    if (!this.listeners.has(key)) {
      target.addEventListener(type, listener, options);
      this.listeners.set(key, { target, type, listener, options });
    }
  }

  /**
   * イベントリスナーを削除
   * @param {EventTarget} target - イベントターゲット
   * @param {string} type - イベントタイプ
   * @param {Function} listener - リスナー関数
   */
  removeEventListener(target, type, listener) {
    const key = this.getListenerKey(target, type, listener);
    const listenerInfo = this.listeners.get(key);
    
    if (listenerInfo) {
      target.removeEventListener(type, listener);
      this.listeners.delete(key);
    }
  }

  /**
   * 全てのイベントリスナーを削除
   */
  removeAllListeners() {
    for (const [key, { target, type, listener }] of this.listeners.entries()) {
      target.removeEventListener(type, listener);
    }
    this.listeners.clear();
  }

  /**
   * リスナーキーを生成
   * @param {EventTarget} target - イベントターゲット
   * @param {string} type - イベントタイプ
   * @param {Function} listener - リスナー関数
   * @returns {string} リスナーキー
   */
  getListenerKey(target, type, listener) {
    return `${target.constructor.name}-${type}-${listener.name || 'anonymous'}`;
  }

  /**
   * 現在のリスナー数を取得
   * @returns {number} リスナー数
   */
  getListenerCount() {
    return this.listeners.size;
  }
}

/**
 * デバウンス関数（パフォーマンス最適化用）
 * @param {Function} func - 実行する関数
 * @param {number} wait - 待機時間（ミリ秒）
 * @param {boolean} immediate - 即座に実行するか
 * @returns {Function} デバウンスされた関数
 */
export function debounce(func, wait, immediate = false) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(this, args);
  };
}

/**
 * スロットル関数（パフォーマンス最適化用）
 * @param {Function} func - 実行する関数
 * @param {number} limit - 制限時間（ミリ秒）
 * @returns {Function} スロットルされた関数
 */
export function throttle(func, limit) {
  let inThrottle;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 遅延実行関数
 * @param {number} ms - 遅延時間（ミリ秒）
 * @returns {Promise} 遅延Promise
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * バッチ処理関数
 * @param {Array} items - 処理するアイテム
 * @param {Function} processor - 処理関数
 * @param {number} batchSize - バッチサイズ
 * @param {number} delayMs - バッチ間の遅延
 * @returns {Promise} 処理完了Promise
 */
export async function processBatch(items, processor, batchSize = 10, delayMs = 0) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
    
    if (delayMs > 0 && i + batchSize < items.length) {
      await delay(delayMs);
    }
  }
  
  return results;
}

// グローバルインスタンス
export const performanceMonitor = new PerformanceMonitor();
export const memoryLeakDetector = new MemoryLeakDetector();
export const eventListenerManager = new EventListenerManager();