/**
 * 削除処理関連のヘルパー関数
 */

/**
 * エラータイプを判定する関数
 * @param {Error} error - エラーオブジェクト
 * @returns {string} エラータイプ
 */
export const getErrorType = (error) => {
  const message = error?.message?.toLowerCase() || '';
  
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'network';
  }
  
  if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
    return 'permission';
  }
  
  if (message.includes('not found') || message.includes('404')) {
    return 'not_found';
  }
  
  if (message.includes('timeout')) {
    return 'timeout';
  }
  
  if (message.includes('conflict') || message.includes('409')) {
    return 'conflict';
  }
  
  return 'default';
};

/**
 * 削除エラーのメッセージとアクションを取得する関数
 * @param {Error} error - エラーオブジェクト
 * @param {string} projectTitle - プロジェクトタイトル
 * @returns {Object} エラー情報オブジェクト
 */
export const handleDeleteError = (error, projectTitle) => {
  const errorType = getErrorType(error);
  
  const errorMappings = {
    'network': {
      message: 'ネットワークエラーが発生しました。インターネット接続を確認して再度お試しください。',
      action: 'retry',
      severity: 'warning',
      retryable: true
    },
    'permission': {
      message: '削除権限がありません。再ログインしてから再度お試しください。',
      action: 'reauth',
      severity: 'error',
      retryable: false
    },
    'not_found': {
      message: 'プロジェクトが見つかりません。ページを更新してください。',
      action: 'refresh',
      severity: 'info',
      retryable: false
    },
    'timeout': {
      message: 'タイムアウトが発生しました。しばらく待ってから再度お試しください。',
      action: 'retry',
      severity: 'warning',
      retryable: true
    },
    'conflict': {
      message: 'データが他のユーザーによって変更されています。ページを更新してください。',
      action: 'refresh',
      severity: 'warning',
      retryable: false
    },
    'default': {
      message: `プロジェクト「${projectTitle}」の削除に失敗しました。`,
      action: 'none',
      severity: 'error',
      retryable: true
    }
  };
  
  return errorMappings[errorType] || errorMappings.default;
};

/**
 * 楽観的更新のためのプロジェクト状態管理
 */
export class OptimisticDeleteManager {
  constructor() {
    this.deletedProjects = new Map(); // 削除されたプロジェクトの一時保存
    this.rollbackCallbacks = new Map(); // ロールバック用のコールバック
  }

  /**
   * 楽観的削除を実行
   * @param {string} projectId - プロジェクトID
   * @param {Object} projectData - プロジェクトデータ
   * @param {Function} updateStateCallback - 状態更新コールバック
   */
  optimisticDelete(projectId, projectData, updateStateCallback) {
    // 削除前の状態を保存
    this.deletedProjects.set(projectId, projectData);
    this.rollbackCallbacks.set(projectId, updateStateCallback);
    
    // UI上で即座に削除
    updateStateCallback(prevProjects => 
      prevProjects.filter(project => project.id !== projectId)
    );
  }

  /**
   * 削除成功時の確定処理
   * @param {string} projectId - プロジェクトID
   */
  confirmDelete(projectId) {
    this.deletedProjects.delete(projectId);
    this.rollbackCallbacks.delete(projectId);
  }

  /**
   * 削除失敗時のロールバック処理
   * @param {string} projectId - プロジェクトID
   */
  rollbackDelete(projectId) {
    const projectData = this.deletedProjects.get(projectId);
    const rollbackCallback = this.rollbackCallbacks.get(projectId);
    
    if (projectData && rollbackCallback) {
      // 削除されたプロジェクトを元の位置に復元
      rollbackCallback(prevProjects => {
        // 既に存在しない場合のみ追加
        const exists = prevProjects.some(p => p.id === projectId);
        if (!exists) {
          // 作成日時順で適切な位置に挿入
          const newProjects = [...prevProjects, projectData];
          return newProjects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        return prevProjects;
      });
      
      // クリーンアップ
      this.deletedProjects.delete(projectId);
      this.rollbackCallbacks.delete(projectId);
    }
  }

  /**
   * すべての保留中の削除をクリア
   */
  clearAll() {
    this.deletedProjects.clear();
    this.rollbackCallbacks.clear();
  }
}

/**
 * 削除処理のリトライ機能
 */
export class DeleteRetryManager {
  constructor(maxRetries = 3, baseDelay = 1000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
  }

  /**
   * 指数バックオフでリトライを実行
   * @param {Function} deleteFunction - 削除処理関数
   * @param {string} projectId - プロジェクトID
   * @param {number} attempt - 現在の試行回数
   * @returns {Promise<boolean>} 削除成功可否
   */
  async retryDelete(deleteFunction, projectId, attempt = 0) {
    try {
      const result = await deleteFunction(projectId);
      return result;
    } catch (error) {
      const errorInfo = handleDeleteError(error, '');
      
      // リトライ可能なエラーかつ最大試行回数未満の場合
      if (errorInfo.retryable && attempt < this.maxRetries) {
        const delay = this.baseDelay * Math.pow(2, attempt); // 指数バックオフ
        
        console.warn(`削除リトライ ${attempt + 1}/${this.maxRetries} (${delay}ms後)`, error);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryDelete(deleteFunction, projectId, attempt + 1);
      }
      
      // リトライ不可能またはリトライ回数上限
      throw error;
    }
  }
}

/**
 * 削除処理の統計情報を管理
 */
export class DeleteStatsManager {
  constructor() {
    this.stats = {
      totalDeletes: 0,
      successfulDeletes: 0,
      failedDeletes: 0,
      errorTypes: {},
      averageResponseTime: 0,
      responseTimes: []
    };
  }

  /**
   * 削除開始時の記録
   * @returns {number} 開始時刻
   */
  startDelete() {
    return Date.now();
  }

  /**
   * 削除成功時の記録
   * @param {number} startTime - 開始時刻
   */
  recordSuccess(startTime) {
    const responseTime = Date.now() - startTime;
    
    this.stats.totalDeletes++;
    this.stats.successfulDeletes++;
    this.stats.responseTimes.push(responseTime);
    
    // 平均応答時間を更新（直近100件の平均）
    const recentTimes = this.stats.responseTimes.slice(-100);
    this.stats.averageResponseTime = recentTimes.reduce((sum, time) => sum + time, 0) / recentTimes.length;
  }

  /**
   * 削除失敗時の記録
   * @param {number} startTime - 開始時刻
   * @param {Error} error - エラーオブジェクト
   */
  recordFailure(startTime, error) {
    const responseTime = Date.now() - startTime;
    const errorType = getErrorType(error);
    
    this.stats.totalDeletes++;
    this.stats.failedDeletes++;
    this.stats.responseTimes.push(responseTime);
    this.stats.errorTypes[errorType] = (this.stats.errorTypes[errorType] || 0) + 1;
    
    // 平均応答時間を更新
    const recentTimes = this.stats.responseTimes.slice(-100);
    this.stats.averageResponseTime = recentTimes.reduce((sum, time) => sum + time, 0) / recentTimes.length;
  }

  /**
   * 統計情報を取得
   * @returns {Object} 統計情報
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalDeletes > 0 
        ? (this.stats.successfulDeletes / this.stats.totalDeletes * 100).toFixed(1)
        : 0
    };
  }

  /**
   * 統計情報をリセット
   */
  resetStats() {
    this.stats = {
      totalDeletes: 0,
      successfulDeletes: 0,
      failedDeletes: 0,
      errorTypes: {},
      averageResponseTime: 0,
      responseTimes: []
    };
  }
}