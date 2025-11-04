import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getErrorType,
  handleDeleteError,
  OptimisticDeleteManager,
  DeleteRetryManager,
  DeleteStatsManager
} from '../deleteHelpers';

describe('deleteHelpers', () => {
  describe('getErrorType', () => {
    it('ネットワークエラーを正しく判定する', () => {
      const networkErrors = [
        new Error('network error'),
        new Error('fetch failed'),
        new Error('connection timeout')
      ];

      networkErrors.forEach(error => {
        expect(getErrorType(error)).toBe('network');
      });
    });

    it('権限エラーを正しく判定する', () => {
      const permissionErrors = [
        new Error('permission denied'),
        new Error('unauthorized access'),
        new Error('forbidden operation')
      ];

      permissionErrors.forEach(error => {
        expect(getErrorType(error)).toBe('permission');
      });
    });

    it('Not Foundエラーを正しく判定する', () => {
      const notFoundErrors = [
        new Error('not found'),
        new Error('404 error')
      ];

      notFoundErrors.forEach(error => {
        expect(getErrorType(error)).toBe('not_found');
      });
    });

    it('タイムアウトエラーを正しく判定する', () => {
      const timeoutError = new Error('timeout occurred');
      expect(getErrorType(timeoutError)).toBe('timeout');
    });

    it('競合エラーを正しく判定する', () => {
      const conflictErrors = [
        new Error('conflict detected'),
        new Error('409 conflict')
      ];

      conflictErrors.forEach(error => {
        expect(getErrorType(error)).toBe('conflict');
      });
    });

    it('未知のエラーはdefaultを返す', () => {
      const unknownError = new Error('unknown error');
      expect(getErrorType(unknownError)).toBe('default');
    });

    it('エラーオブジェクトがnullの場合はdefaultを返す', () => {
      expect(getErrorType(null)).toBe('default');
    });
  });

  describe('handleDeleteError', () => {
    const projectTitle = 'テストプロジェクト';

    it('ネットワークエラーの適切な情報を返す', () => {
      const error = new Error('network error');
      const result = handleDeleteError(error, projectTitle);

      expect(result.message).toContain('ネットワークエラー');
      expect(result.action).toBe('retry');
      expect(result.severity).toBe('warning');
      expect(result.retryable).toBe(true);
    });

    it('権限エラーの適切な情報を返す', () => {
      const error = new Error('permission denied');
      const result = handleDeleteError(error, projectTitle);

      expect(result.message).toContain('削除権限がありません');
      expect(result.action).toBe('reauth');
      expect(result.severity).toBe('error');
      expect(result.retryable).toBe(false);
    });

    it('Not Foundエラーの適切な情報を返す', () => {
      const error = new Error('not found');
      const result = handleDeleteError(error, projectTitle);

      expect(result.message).toContain('プロジェクトが見つかりません');
      expect(result.action).toBe('refresh');
      expect(result.severity).toBe('info');
      expect(result.retryable).toBe(false);
    });

    it('デフォルトエラーにプロジェクトタイトルが含まれる', () => {
      const error = new Error('unknown error');
      const result = handleDeleteError(error, projectTitle);

      expect(result.message).toContain(projectTitle);
      expect(result.action).toBe('none');
      expect(result.severity).toBe('error');
      expect(result.retryable).toBe(true);
    });
  });

  describe('OptimisticDeleteManager', () => {
    let manager;
    let mockUpdateCallback;

    beforeEach(() => {
      manager = new OptimisticDeleteManager();
      mockUpdateCallback = vi.fn();
    });

    it('楽観的削除が正しく実行される', () => {
      const projectId = 'test-1';
      const projectData = { id: projectId, title: 'Test Project' };

      manager.optimisticDelete(projectId, projectData, mockUpdateCallback);

      expect(mockUpdateCallback).toHaveBeenCalledTimes(1);
      expect(manager.deletedProjects.has(projectId)).toBe(true);
      expect(manager.rollbackCallbacks.has(projectId)).toBe(true);
    });

    it('削除確定が正しく実行される', () => {
      const projectId = 'test-1';
      const projectData = { id: projectId, title: 'Test Project' };

      manager.optimisticDelete(projectId, projectData, mockUpdateCallback);
      manager.confirmDelete(projectId);

      expect(manager.deletedProjects.has(projectId)).toBe(false);
      expect(manager.rollbackCallbacks.has(projectId)).toBe(false);
    });

    it('ロールバックが正しく実行される', () => {
      const projectId = 'test-1';
      const projectData = { id: projectId, title: 'Test Project' };

      manager.optimisticDelete(projectId, projectData, mockUpdateCallback);
      manager.rollbackDelete(projectId);

      expect(mockUpdateCallback).toHaveBeenCalledTimes(2); // 削除時とロールバック時
      expect(manager.deletedProjects.has(projectId)).toBe(false);
      expect(manager.rollbackCallbacks.has(projectId)).toBe(false);
    });

    it('存在しないプロジェクトのロールバックでエラーが発生しない', () => {
      expect(() => {
        manager.rollbackDelete('non-existent');
      }).not.toThrow();
    });

    it('全クリアが正しく実行される', () => {
      const projectId1 = 'test-1';
      const projectId2 = 'test-2';
      const projectData1 = { id: projectId1, title: 'Test Project 1' };
      const projectData2 = { id: projectId2, title: 'Test Project 2' };

      manager.optimisticDelete(projectId1, projectData1, mockUpdateCallback);
      manager.optimisticDelete(projectId2, projectData2, mockUpdateCallback);
      manager.clearAll();

      expect(manager.deletedProjects.size).toBe(0);
      expect(manager.rollbackCallbacks.size).toBe(0);
    });
  });

  describe('DeleteRetryManager', () => {
    let manager;
    let mockDeleteFunction;

    beforeEach(() => {
      manager = new DeleteRetryManager(3, 100); // 3回リトライ、100ms間隔
      mockDeleteFunction = vi.fn();
    });

    it('成功時はリトライしない', async () => {
      mockDeleteFunction.mockResolvedValue(true);

      const result = await manager.retryDelete(mockDeleteFunction, 'test-1');

      expect(result).toBe(true);
      expect(mockDeleteFunction).toHaveBeenCalledTimes(1);
    });

    it('リトライ可能なエラーで最大回数までリトライする', async () => {
      const networkError = new Error('network error');
      mockDeleteFunction.mockRejectedValue(networkError);

      await expect(manager.retryDelete(mockDeleteFunction, 'test-1')).rejects.toThrow(networkError);
      expect(mockDeleteFunction).toHaveBeenCalledTimes(4); // 初回 + 3回リトライ
    });

    it('リトライ不可能なエラーは即座に失敗する', async () => {
      const permissionError = new Error('permission denied');
      mockDeleteFunction.mockRejectedValue(permissionError);

      await expect(manager.retryDelete(mockDeleteFunction, 'test-1')).rejects.toThrow(permissionError);
      expect(mockDeleteFunction).toHaveBeenCalledTimes(1); // リトライしない
    });

    it('途中で成功した場合はリトライを停止する', async () => {
      const networkError = new Error('network error');
      mockDeleteFunction
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue(true);

      const result = await manager.retryDelete(mockDeleteFunction, 'test-1');

      expect(result).toBe(true);
      expect(mockDeleteFunction).toHaveBeenCalledTimes(3); // 2回失敗 + 1回成功
    });
  });

  describe('DeleteStatsManager', () => {
    let manager;

    beforeEach(() => {
      manager = new DeleteStatsManager();
    });

    it('削除成功の統計が正しく記録される', () => {
      const startTime = manager.startDelete();
      
      // 少し時間を進める
      vi.advanceTimersByTime(100);
      
      manager.recordSuccess(startTime);

      const stats = manager.getStats();
      expect(stats.totalDeletes).toBe(1);
      expect(stats.successfulDeletes).toBe(1);
      expect(stats.failedDeletes).toBe(0);
      expect(stats.successRate).toBe('100.0');
    });

    it('削除失敗の統計が正しく記録される', () => {
      const startTime = manager.startDelete();
      const error = new Error('network error');
      
      manager.recordFailure(startTime, error);

      const stats = manager.getStats();
      expect(stats.totalDeletes).toBe(1);
      expect(stats.successfulDeletes).toBe(0);
      expect(stats.failedDeletes).toBe(1);
      expect(stats.successRate).toBe('0.0');
      expect(stats.errorTypes.network).toBe(1);
    });

    it('複数の操作の統計が正しく計算される', () => {
      // 成功2回
      for (let i = 0; i < 2; i++) {
        const startTime = manager.startDelete();
        manager.recordSuccess(startTime);
      }

      // 失敗1回
      const startTime = manager.startDelete();
      const error = new Error('permission denied');
      manager.recordFailure(startTime, error);

      const stats = manager.getStats();
      expect(stats.totalDeletes).toBe(3);
      expect(stats.successfulDeletes).toBe(2);
      expect(stats.failedDeletes).toBe(1);
      expect(stats.successRate).toBe('66.7');
      expect(stats.errorTypes.permission).toBe(1);
    });

    it('統計リセットが正しく動作する', () => {
      const startTime = manager.startDelete();
      manager.recordSuccess(startTime);

      manager.resetStats();

      const stats = manager.getStats();
      expect(stats.totalDeletes).toBe(0);
      expect(stats.successfulDeletes).toBe(0);
      expect(stats.failedDeletes).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(Object.keys(stats.errorTypes)).toHaveLength(0);
    });

    it('平均応答時間が正しく計算される', () => {
      // 複数の操作を記録
      const times = [100, 200, 300];
      
      times.forEach(time => {
        const startTime = Date.now() - time;
        manager.recordSuccess(startTime);
      });

      const stats = manager.getStats();
      expect(stats.averageResponseTime).toBeCloseTo(200, 0); // 平均200ms
    });
  });
});