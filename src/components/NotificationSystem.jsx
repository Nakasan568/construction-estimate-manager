import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Trash2 } from 'lucide-react';

/**
 * 通知タイプのアイコンマッピング
 */
const getNotificationIcon = (type) => {
  const iconMap = {
    'success': CheckCircle,
    'error': AlertCircle,
    'warning': AlertTriangle,
    'info': Info,
    'delete-success': CheckCircle,
    'delete-error': AlertCircle
  };
  
  return iconMap[type] || Info;
};

/**
 * 通知タイプのスタイルマッピング
 */
const getNotificationStyles = (type) => {
  const styleMap = {
    'success': {
      container: 'bg-green-50 border-green-200 text-green-800',
      icon: 'text-green-600',
      closeButton: 'text-green-400 hover:text-green-600'
    },
    'error': {
      container: 'bg-red-50 border-red-200 text-red-800',
      icon: 'text-red-600',
      closeButton: 'text-red-400 hover:text-red-600'
    },
    'warning': {
      container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      icon: 'text-yellow-600',
      closeButton: 'text-yellow-400 hover:text-yellow-600'
    },
    'info': {
      container: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: 'text-blue-600',
      closeButton: 'text-blue-400 hover:text-blue-600'
    },
    'delete-success': {
      container: 'bg-green-50 border-green-200 text-green-800',
      icon: 'text-green-600',
      closeButton: 'text-green-400 hover:text-green-600'
    },
    'delete-error': {
      container: 'bg-red-50 border-red-200 text-red-800',
      icon: 'text-red-600',
      closeButton: 'text-red-400 hover:text-red-600'
    }
  };
  
  return styleMap[type] || styleMap.info;
};

/**
 * 個別の通知コンポーネント
 */
const NotificationItem = ({ notification, onRemove }) => {
  const { id, type, message, projectTitle, duration = 3000, details } = notification;
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  
  const Icon = getNotificationIcon(type);
  const styles = getNotificationStyles(type);

  // 通知の表示アニメーション
  useEffect(() => {
    const showTimer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(showTimer);
  }, []);

  // 自動削除タイマー
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleRemove();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration]);

  // 削除処理
  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(id);
    }, 200); // アニメーション時間
  };

  // 削除専用の表示内容
  const renderDeleteContent = () => {
    if (type === 'delete-success') {
      return (
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            <CheckCircle className={`w-5 h-5 ${styles.icon}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <Trash2 className="w-4 h-4 text-green-600" />
              <p className="text-sm font-medium">削除完了</p>
            </div>
            {projectTitle && (
              <p className="text-sm mt-1">
                プロジェクト「<span className="font-semibold">{projectTitle}</span>」を削除しました
              </p>
            )}
            {details && (
              <p className="text-xs mt-1 text-green-600">{details}</p>
            )}
          </div>
        </div>
      );
    }

    if (type === 'delete-error') {
      return (
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            <AlertCircle className={`w-5 h-5 ${styles.icon}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <Trash2 className="w-4 h-4 text-red-600" />
              <p className="text-sm font-medium">削除失敗</p>
            </div>
            {projectTitle && (
              <p className="text-sm mt-1">
                プロジェクト「<span className="font-semibold">{projectTitle}</span>」の削除に失敗しました
              </p>
            )}
            <p className="text-sm mt-1">{message}</p>
            {details && (
              <p className="text-xs mt-1 text-red-600">{details}</p>
            )}
          </div>
        </div>
      );
    }

    // 通常の通知
    return (
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          <Icon className={`w-5 h-5 ${styles.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm">{message}</p>
          {details && (
            <p className="text-xs mt-1 opacity-75">{details}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`
        relative max-w-sm w-full border rounded-lg shadow-lg p-4 mb-3
        transform transition-all duration-200 ease-out
        ${styles.container}
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${isRemoving ? 'translate-x-full opacity-0 scale-95' : ''}
      `}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      {renderDeleteContent()}
      
      {/* 閉じるボタン */}
      <button
        type="button"
        onClick={handleRemove}
        className={`
          absolute top-2 right-2 p-1 rounded-md transition-colors duration-200
          ${styles.closeButton}
        `}
        aria-label="通知を閉じる"
      >
        <X className="w-4 h-4" />
      </button>
      
      {/* プログレスバー（自動削除の場合） */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black bg-opacity-10 rounded-b-lg overflow-hidden">
          <div 
            className="h-full bg-current opacity-30 animate-progress"
            style={{
              animation: `progress ${duration}ms linear forwards`
            }}
          />
        </div>
      )}
    </div>
  );
};

/**
 * 通知システムコンポーネント
 */
const NotificationSystem = ({ notifications, onRemoveNotification }) => {
  if (!notifications || notifications.length === 0) {
    return null;
  }

  return (
    <div 
      className="fixed top-4 right-4 z-50 space-y-2"
      aria-label="通知エリア"
      role="region"
    >
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={onRemoveNotification}
        />
      ))}
    </div>
  );
};

/**
 * 通知作成ヘルパー関数
 */
export const createDeleteSuccessNotification = (projectTitle, details = '') => ({
  id: Date.now() + Math.random(),
  type: 'delete-success',
  projectTitle,
  message: '削除が完了しました',
  details,
  duration: 3000
});

export const createDeleteErrorNotification = (projectTitle, errorMessage, details = '') => ({
  id: Date.now() + Math.random(),
  type: 'delete-error',
  projectTitle,
  message: errorMessage,
  details,
  duration: 5000 // エラーは少し長く表示
});

export const createNotification = (type, message, options = {}) => ({
  id: Date.now() + Math.random(),
  type,
  message,
  duration: 3000,
  ...options
});

export default NotificationSystem;