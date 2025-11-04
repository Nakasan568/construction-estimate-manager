import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PerformanceMonitor,
  MemoryLeakDetector,
  EventListenerManager,
  debounce,
  throttle,
  delay,
  processBatch
} from '../performanceUtils';

describe('Performance Utils', () => {
  describe('PerformanceMonitor', () => {
    let monitor;

    beforeEach(() => {
      monitor = new PerformanceMonitor();
      // performance.now のモック
      vi.spyOn(performance, 'now').mockReturnValue(1000);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('操作の開始と終了を正しく記録する', () => {
      const operationId = monitor.startOperation('test-delete');
      expect(operationId).toContain('test-delete');

      // 時間を進める
      vi.spyOn(performance, 'now').mockReturnValue(1100);
      monitor.endOperation(operationId);

      const stats = monitor.getOperationStats('test-delete');
      expect(stats).toEqual({
        operationName: 'test-delete',
        count: 1,
        avgDuration: '100.00',
        minDuration: '100.00',
        maxDuration: '100.00'
      });
    });

    it('複数の操作の統計を正しく計算する', () => {
      // 1回目の操作
      const op1 = monitor.startOperation('test-delete');
      vi.spyOn(performance, 'now').mockReturnValue(1100);
      monitor.endOperation(op1);

      // 2回目の操作
      vi.spyOn(performance, 'now').mockReturnValue(1200);
      const op2 = monitor.startOperation('test-delete');
      vi.spyOn(performance, 'now').mockReturnValue(1350);
      monitor.endOperation(op2);

      const stats = monitor.getOperationStats('test-delete');
      expect(stats.count).toBe(2);
      expect(parseFloat(stats.avgDuration)).toBe(125); // (100 + 150) / 2
      expect(parseFloat(stats.minDuration)).toBe(100);
      expect(parseFloat(stats.maxDuration)).toBe(150);
    });

    it('メトリクスをクリアできる', () => {
      const operationId = monitor.startOperation('test-delete');
      monitor.endOperation(operationId);

      expect(monitor.getOperationStats('test-delete')).toBeTruthy();

      monitor.clearMetrics();
      expect(monitor.getOperationStats('test-delete')).toBeNull();
    });

    it('パフォーマンス警告を適切に出力する', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const operationId = monitor.startOperation('delete-project-1');
      
      // 1秒以上の処理時間をシミュレート
      vi.spyOn(performance, 'now').mockReturnValue(2100);
      monitor.endOperation(operationId);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('削除操作が遅い')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('MemoryLeakDetector', () => {
    let detector;

    beforeEach(() => {
      detector = new MemoryLeakDetector();
    });

    afterEach(() => {
      detector.stopLeakDetection();
    });

    it('オブジェクトの追跡と追跡解除が正しく動作する', () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };

      detector.trackObject(obj1, 'TestObject');
      detector.trackObject(obj2, 'TestObject');

      let status = detector.getTrackingStatus();
      expect(status.TestObject).toBe(2);

      detector.untrackObject(obj1);
      status = detector.getTrackingStatus();
      expect(status.TestObject).toBe(1);

      detector.untrackObject(obj2);
      status = detector.getTrackingStatus();
      expect(status.TestObject).toBe(0);
    });

    it('メモリリーク検出が正しく動作する', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // 101個のオブジェクトを追跡（100個を超えるとリーク警告）
      for (let i = 0; i < 101; i++) {
        detector.trackObject({ id: i }, 'TestObject');
      }

      detector.checkForLeaks();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('潜在的なメモリリーク検出')
      );

      consoleSpy.mockRestore();
    });

    it('定期チェックの開始と停止が正しく動作する', () => {
      vi.useFakeTimers();

      const checkSpy = vi.spyOn(detector, 'checkForLeaks');

      detector.startLeakDetection(1000);
      
      vi.advanceTimersByTime(1000);
      expect(checkSpy).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1000);
      expect(checkSpy).toHaveBeenCalledTimes(2);

      detector.stopLeakDetection();
      vi.advanceTimersByTime(1000);
      expect(checkSpy).toHaveBeenCalledTimes(2); // 停止後は呼ばれない

      vi.useRealTimers();
    });
  });

  describe('EventListenerManager', () => {
    let manager;
    let mockElement;

    beforeEach(() => {
      manager = new EventListenerManager();
      mockElement = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        constructor: { name: 'MockElement' }
      };
    });

    it('イベントリスナーの追加と削除が正しく動作する', () => {
      const mockListener = vi.fn();

      manager.addEventListener(mockElement, 'click', mockListener);
      expect(mockElement.addEventListener).toHaveBeenCalledWith('click', mockListener, {});
      expect(manager.getListenerCount()).toBe(1);

      manager.removeEventListener(mockElement, 'click', mockListener);
      expect(mockElement.removeEventListener).toHaveBeenCalledWith('click', mockListener);
      expect(manager.getListenerCount()).toBe(0);
    });

    it('重複するリスナーは追加されない', () => {
      const mockListener = vi.fn();

      manager.addEventListener(mockElement, 'click', mockListener);
      manager.addEventListener(mockElement, 'click', mockListener);

      expect(mockElement.addEventListener).toHaveBeenCalledTimes(1);
      expect(manager.getListenerCount()).toBe(1);
    });

    it('全てのリスナーを一括削除できる', () => {
      const mockListener1 = vi.fn();
      const mockListener2 = vi.fn();

      manager.addEventListener(mockElement, 'click', mockListener1);
      manager.addEventListener(mockElement, 'keydown', mockListener2);

      expect(manager.getListenerCount()).toBe(2);

      manager.removeAllListeners();

      expect(mockElement.removeEventListener).toHaveBeenCalledTimes(2);
      expect(manager.getListenerCount()).toBe(0);
    });
  });

  describe('debounce', () => {
    it('指定時間内の連続呼び出しを1回にまとめる', async () => {
      vi.useFakeTimers();

      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('call1');
      debouncedFn('call2');
      debouncedFn('call3');

      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('call3');

      vi.useRealTimers();
    });

    it('immediate=trueの場合は最初の呼び出しが即座に実行される', () => {
      vi.useFakeTimers();

      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100, true);

      debouncedFn('call1');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('call1');

      debouncedFn('call2');
      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1); // 追加呼び出しはない

      vi.useRealTimers();
    });
  });

  describe('throttle', () => {
    it('指定時間内は1回だけ実行される', () => {
      vi.useFakeTimers();

      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 100);

      throttledFn('call1');
      expect(mockFn).toHaveBeenCalledTimes(1);

      throttledFn('call2');
      throttledFn('call3');
      expect(mockFn).toHaveBeenCalledTimes(1); // まだ1回だけ

      vi.advanceTimersByTime(100);

      throttledFn('call4');
      expect(mockFn).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe('delay', () => {
    it('指定時間後にresolveされる', async () => {
      vi.useFakeTimers();

      const promise = delay(100);
      let resolved = false;

      promise.then(() => {
        resolved = true;
      });

      expect(resolved).toBe(false);

      vi.advanceTimersByTime(100);
      await promise;

      expect(resolved).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('processBatch', () => {
    it('アイテムをバッチ処理する', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = vi.fn().mockImplementation(x => Promise.resolve(x * 2));

      const results = await processBatch(items, processor, 2);

      expect(results).toEqual([2, 4, 6, 8, 10]);
      expect(processor).toHaveBeenCalledTimes(5);
    });

    it('バッチ間に遅延を入れる', async () => {
      vi.useFakeTimers();

      const items = [1, 2, 3, 4];
      const processor = vi.fn().mockImplementation(x => Promise.resolve(x * 2));

      const promise = processBatch(items, processor, 2, 100);

      // 最初のバッチは即座に処理される
      await vi.runOnlyPendingTimersAsync();
      expect(processor).toHaveBeenCalledTimes(2);

      // 遅延後に次のバッチが処理される
      vi.advanceTimersByTime(100);
      await vi.runOnlyPendingTimersAsync();
      expect(processor).toHaveBeenCalledTimes(4);

      const results = await promise;
      expect(results).toEqual([2, 4, 6, 8]);

      vi.useRealTimers();
    });
  });
});