import React, { useEffect, useRef, useCallback, memo } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

/**
 * 削除確認ダイアログコンポーネント
 * 
 * @param {Object} props - コンポーネントのプロパティ
 * @param {boolean} props.isOpen - ダイアログの表示状態
 * @param {Function} props.onClose - ダイアログを閉じる関数
 * @param {Function} props.onConfirm - 削除を確認する関数
 * @param {string} props.title - ダイアログのタイトル
 * @param {string} props.message - 確認メッセージ
 * @param {Object} props.projectDetails - プロジェクトの詳細情報
 * @param {string} props.projectDetails.client - 客先名
 * @param {string} props.projectDetails.title - プロジェクトタイトル
 * @param {number} props.projectDetails.customerAmount - 客出金額
 * @param {boolean} [props.isLoading=false] - 削除処理中の状態
 */
const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = '削除の確認',
  message = '以下のプロジェクトを削除してもよろしいですか？',
  projectDetails,
  isLoading = false
}) => {
  const dialogRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const cancelButtonRef = useRef(null);

  // Escキーでダイアログを閉じる
  const handleEscape = useCallback((event) => {
    if (event.key === 'Escape' && !isLoading) {
      onClose();
    }
  }, [onClose, isLoading]);

  // バックドロップクリックでダイアログを閉じる
  const handleBackdropClick = useCallback((event) => {
    if (event.target === event.currentTarget && !isLoading) {
      onClose();
    }
  }, [onClose, isLoading]);

  // 確認ボタンのクリック処理
  const handleConfirm = useCallback(async () => {
    if (isLoading) return;
    
    try {
      await onConfirm();
    } catch (error) {
      console.error('削除確認エラー:', error);
    }
  }, [onConfirm, isLoading]);

  // キーボードナビゲーション（Tab循環とEnter/Space対応）
  const handleKeyDown = useCallback((event) => {
    if (!isOpen) return;

    // Enter または Space キーで確認ボタンを実行（確認ボタンにフォーカスがある場合）
    if ((event.key === 'Enter' || event.key === ' ') && 
        document.activeElement === confirmButtonRef.current && 
        !isLoading) {
      event.preventDefault();
      handleConfirm();
      return;
    }

    // Tab キーでのフォーカス循環
    if (event.key === 'Tab') {
      const focusableElements = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
      );
      
      if (focusableElements && focusableElements.length > 0) {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (event.shiftKey) {
          // Shift+Tab: 逆方向
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: 順方向
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    }
  }, [isOpen, handleConfirm, isLoading]);

  // ダイアログの開閉時のフォーカス管理
  useEffect(() => {
    if (isOpen) {
      // ダイアログが開いた時の処理
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('keydown', handleKeyDown);
      
      // 最初のフォーカス可能要素にフォーカス（通常はキャンセルボタン）
      setTimeout(() => {
        if (cancelButtonRef.current) {
          cancelButtonRef.current.focus();
        }
      }, 100);
      
      // ボディのスクロールを無効化
      document.body.style.overflow = 'hidden';
    } else {
      // ダイアログが閉じた時の処理
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape, handleKeyDown]);

  // ダイアログが表示されていない場合は何も表示しない
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm dialog-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
      aria-live="polite"
    >
      <div 
        ref={dialogRef}
        className="relative w-full max-w-md bg-white rounded-lg shadow-xl transform transition-all duration-200 scale-100 dialog-content dialog-focus-trap"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 id="dialog-title" className="text-lg font-semibold text-gray-900">
              {title}
            </h3>
          </div>
          
          {!isLoading && (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              aria-label="ダイアログを閉じる"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* コンテンツ */}
        <div className="p-6">
          <div id="dialog-description" className="space-y-4">
            <p className="text-sm text-gray-600">
              {message}
            </p>
            
            {projectDetails && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-gray-900">削除対象プロジェクト</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">客先:</span>
                    <span className="font-medium text-gray-900">{projectDetails.client}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">件名:</span>
                    <span className="font-medium text-gray-900 text-right max-w-48 truncate" title={projectDetails.title}>
                      {projectDetails.title}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">金額:</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(projectDetails.customerAmount)}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 dialog-warning">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium" role="alert">重要な注意事項</p>
                  <p id="confirm-warning" className="mt-1" aria-live="polite">
                    この操作は取り消せません。プロジェクトのすべてのデータが完全に削除されます。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 dialog-button-cancel"
            aria-label="削除をキャンセルしてダイアログを閉じる"
            tabIndex={0}
          >
            キャンセル
          </button>
          
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 dialog-button-confirm"
            aria-label={`プロジェクト「${projectDetails?.title || ''}」を完全に削除する`}
            aria-describedby="confirm-warning"
            tabIndex={0}
          >
            {isLoading ? (
              <>
                <div className="animate-spin mr-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                </div>
                削除中...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                削除する
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// React.memoを使用して不要な再レンダリングを防止
export default memo(ConfirmationDialog, (prevProps, nextProps) => {
  // ダイアログの表示状態、ローディング状態、プロジェクト詳細が同じ場合は再レンダリングしない
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.title === nextProps.title &&
    prevProps.message === nextProps.message &&
    JSON.stringify(prevProps.projectDetails) === JSON.stringify(nextProps.projectDetails)
  );
});