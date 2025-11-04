import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  handleDeleteError, 
  OptimisticDeleteManager, 
  DeleteRetryManager, 
  DeleteStatsManager 
} from '../utils/deleteHelpers';
import { 
  performanceMonitor, 
  memoryLeakDetector, 
  eventListenerManager,
  debounce 
} from '../utils/performanceUtils';

/**
 * 拡張削除機能のカスタムフック
 * @param {Object} options - オプション設定
 * @param {Function} options.deleteFunction - 実際の削除処理関数
 * @param {Function} options.onSuccess - 成功時のコールバック
 * @param {Function} options.onError - エラー時のコールバック
 * @param {boolean} options.enableOptimisticUpdates - 楽観的更新を有効にするか
 * @param {boolean} options.enableRetry - リトライ機能を有効にするか
 * @param {number} options.maxRetries - 最大リトライ回数
 * @returns {Object} 削除機能のオブジェクト
 */
export const useEnhancedDelete = ({
  deleteFunction,
  onSuccess,
  onError,
  enableOptimisticUpdates = true,
  enableRetry = true,
  maxRetries = 3
} = {}) => {
  // 削除状態の管理
  const [deletingStates, setDeletingStates] = useState({});
  const [deleteErrors, setDeleteErrors] = useState({});
  
  // マネージャーインスタンス
  const optimisticManager = useRef(new OptimisticDeleteManager());
  const retryManager = useRef(new DeleteRetryManager(maxRetries));
  const statsManager = useRef(new DeleteStatsManager());

  // 削除処理の実行（パフォーマンス監視付き）
  const executeDelete = useCallback(async (projectId, projectData, updateStateCallback) => {
    // パフォーマンス監視開始
    const operationId = performanceMonitor.startOperation(`delete-project-${projectId}`);
    
    // メモリリーク検出のためのオブジェクト追跡
    if (projectData) {
      memoryLeakDetector.trackObject(projectData, 'DeleteProjectData');
    }
    
    // 削除状態を設定
    setDeletingStates(prev => ({ ...prev, [projectId]: true }));
    setDeleteErrors(prev => ({ ...prev, [projectId]: null }));
    
    const startTime = statsManager.current.startDelete();
    
    try {
      // 楽観的更新の実行
      if (enableOptimisticUpdates && projectData && updateStateCallback) {
        optimisticManager.current.optimisticDelete(projectId, projectData, updateStateCallback);
      }
      
      // 削除処理の実行（リトライ機能付き）
      let result;
      if (enableRetry) {
        result = await retryManager.current.retryDelete(deleteFunction, projectId);
      } else {
        result = await deleteFunction(projectId);
      }
      
      if (result) {
        // 削除成功
        optimisticManager.current.confirmDelete(projectId);
        statsManager.current.recordSuccess(startTime);
        
        // パフォーマンス監視終了
        performanceMonitor.endOperation(operationId);
        
        // メモリリーク検出のオブジェクト追跡解除
        if (projectData) {
          memoryLeakDetector.untrackObject(projectData);
        }
        
        if (onSuccess) {
          onSuccess(projectId, projectData);
        }
        
        return true;
      } else {
        throw new Error('削除処理が失敗しました');
      }
      
    } catch (error) {
      console.error('削除処理エラー:', error);
      
      // 楽観的更新のロールバック
      if (enableOptimisticUpdates) {
        optimisticManager.current.rollbackDelete(projectId);
      }
      
      // エラー情報の処理
      const errorInfo = handleDeleteError(error, projectData?.title || '');
      setDeleteErrors(prev => ({ ...prev, [projectId]: errorInfo }));
      
      // 統計記録
      statsManager.current.recordFailure(startTime, error);
      
      // パフォーマンス監視終了（エラー時）
      performanceMonitor.endOperation(operationId);
      
      // メモリリーク検出のオブジェクト追跡解除
      if (projectData) {
        memoryLeakDetector.untrackObject(projectData);
      }
      
      if (onError) {
        onError(projectId, error, errorInfo);
      }
      
      return false;
      
    } finally {
      // 削除状態をクリア
      setDeletingStates(prev => ({ ...prev, [projectId]: false }));
    }
  }, [deleteFunction, onSuccess, onError, enableOptimisticUpdates, enableRetry]);

  // 削除エラーをクリア
  const clearDeleteError = useCallback((projectId) => {
    setDeleteErrors(prev => ({ ...prev, [projectId]: null }));
  }, []);

  // すべての削除エラーをクリア
  const clearAllDeleteErrors = useCallback(() => {
    setDeleteErrors({});
  }, []);

  // 削除状態をチェック
  const isDeleting = useCallback((projectId) => {
    return Boolean(deletingStates[projectId]);
  }, [deletingStates]);

  // 削除エラーを取得
  const getDeleteError = useCallback((projectId) => {
    return deleteErrors[projectId];
  }, [deleteErrors]);

  // 統計情報を取得
  const getDeleteStats = useCallback(() => {
    return statsManager.current.getStats();
  }, []);

  // 統計情報をリセット
  const resetDeleteStats = useCallback(() => {
    statsManager.current.resetStats();
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      optimisticManager.current.clearAll();
    };
  }, []);

  return {
    // 削除実行関数
    executeDelete,
    
    // 状態管理
    isDeleting,
    getDeleteError,
    clearDeleteError,
    clearAllDeleteErrors,
    
    // 統計情報
    getDeleteStats,
    resetDeleteStats,
    
    // 内部状態（デバッグ用）
    deletingStates,
    deleteErrors
  };
};

/**
 * 削除確認ダイアログ付きの削除機能フック
 * @param {Object} options - オプション設定
 * @returns {Object} 削除機能のオブジェクト
 */
export const useDeleteWithConfirmation = (options = {}) => {
  const [confirmationState, setConfirmationState] = useState({
    isOpen: false,
    projectId: null,
    projectData: null
  });

  const enhancedDelete = useEnhancedDelete(options);

  // 削除確認ダイアログを開く
  const openDeleteConfirmation = useCallback((projectId, projectData) => {
    setConfirmationState({
      isOpen: true,
      projectId,
      projectData
    });
  }, []);

  // 削除確認ダイアログを閉じる
  const closeDeleteConfirmation = useCallback(() => {
    setConfirmationState({
      isOpen: false,
      projectId: null,
      projectData: null
    });
  }, []);

  // 削除を確認して実行
  const confirmDelete = useCallback(async (updateStateCallback) => {
    const { projectId, projectData } = confirmationState;
    
    if (!projectId || !projectData) {
      console.error('削除対象のプロジェクト情報が不足しています');
      return false;
    }

    const result = await enhancedDelete.executeDelete(projectId, projectData, updateStateCallback);
    
    if (result) {
      closeDeleteConfirmation();
    }
    
    return result;
  }, [confirmationState, enhancedDelete.executeDelete, closeDeleteConfirmation]);

  return {
    ...enhancedDelete,
    
    // 確認ダイアログ関連
    confirmationState,
    openDeleteConfirmation,
    closeDeleteConfirmation,
    confirmDelete
  };
};