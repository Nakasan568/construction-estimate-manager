import React, { useCallback, memo } from 'react';
import { Trash2 } from 'lucide-react';

/**
 * 削除ボタンコンポーネント
 * 
 * @param {Object} props - コンポーネントのプロパティ
 * @param {string} props.projectId - プロジェクトID
 * @param {string} props.projectTitle - プロジェクトタイトル
 * @param {Function} props.onDelete - 削除処理関数
 * @param {boolean} [props.isLoading=false] - ローディング状態
 * @param {boolean} [props.disabled=false] - 無効状態
 * @param {'sm'|'md'|'lg'} [props.size='md'] - ボタンサイズ
 * @param {'icon'|'text'|'both'} [props.variant='both'] - 表示バリアント
 */
const DeleteButton = ({
  projectId,
  projectTitle,
  onDelete,
  isLoading = false,
  disabled = false,
  size = 'md',
  variant = 'both'
}) => {
  // サイズに応じたクラス設定
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs delete-btn-sm',
    md: 'px-3 py-2 text-sm delete-btn-md',
    lg: 'px-4 py-3 text-base delete-btn-lg'
  };

  // アイコンサイズの設定
  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  };

  // 危険度判定（重要なプロジェクトかどうか）
  const isCritical = projectTitle && (
    projectTitle.includes('重要') || 
    projectTitle.includes('緊急') || 
    projectTitle.includes('本社')
  );

  // 削除処理のハンドラー
  const handleDelete = useCallback(async () => {
    if (disabled || isLoading) return;
    
    try {
      await onDelete(projectId);
    } catch (error) {
      console.error('削除処理エラー:', error);
    }
  }, [projectId, onDelete, disabled, isLoading]);

  // キーボードイベントのハンドラー
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDelete();
    }
  }, [handleDelete]);

  // ボタンの基本クラス
  const baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'border',
    'rounded-md',
    'transition-all',
    'duration-200',
    'focus:outline-none',
    'focus-visible:outline-none',
    sizeClasses[size]
  ].join(' ');

  // 状態に応じたクラス
  let stateClasses = '';
  
  if (disabled || isLoading) {
    stateClasses = [
      'text-gray-400',
      'bg-gray-50',
      'border-gray-200',
      'cursor-not-allowed',
      'opacity-50'
    ].join(' ');
  } else {
    stateClasses = [
      'text-red-600',
      'delete-btn-gradient',
      'hover:text-red-800',
      'active:text-red-900',
      'delete-btn',
      isLoading ? 'delete-btn-loading' : '',
      isCritical ? 'delete-btn-critical' : ''
    ].filter(Boolean).join(' ');
  }

  // 最終的なクラス名
  const className = `${baseClasses} ${stateClasses}`;

  // アクセシビリティ用の説明ID
  const descriptionId = `delete-description-${projectId}`;

  // 表示内容の決定
  const renderContent = () => {
    if (isLoading) {
      return (
        <>
          <div className="animate-spin mr-1">
            <div className="w-3 h-3 border-2 border-red-300 border-t-red-600 rounded-full"></div>
          </div>
          <span className="animate-pulse">削除中...</span>
        </>
      );
    }

    switch (variant) {
      case 'icon':
        return (
          <Trash2 
            size={iconSizes[size]} 
            className="delete-btn-icon" 
          />
        );
      case 'text':
        return (
          <span className="font-semibold">
            削除
          </span>
        );
      case 'both':
      default:
        return (
          <>
            <Trash2 
              size={iconSizes[size]} 
              className="mr-1 delete-btn-icon" 
            />
            <span className="font-semibold">
              削除
            </span>
          </>
        );
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleDelete}
        onKeyDown={handleKeyDown}
        disabled={disabled || isLoading}
        className={className}
        aria-label={`プロジェクト「${projectTitle}」を削除`}
        aria-describedby={descriptionId}
        title={`プロジェクト「${projectTitle}」を削除`}
        role="button"
        tabIndex={0}
      >
        {renderContent()}
      </button>
      
      {/* スクリーンリーダー用の説明 */}
      <div id={descriptionId} className="sr-only">
        この操作は取り消せません。プロジェクト「{projectTitle}」のすべてのデータが完全に削除されます。
      </div>
    </>
  );
};

// React.memoを使用して不要な再レンダリングを防止
export default memo(DeleteButton, (prevProps, nextProps) => {
  // プロジェクトIDが同じで、ローディング状態と無効状態が同じ場合は再レンダリングしない
  return (
    prevProps.projectId === nextProps.projectId &&
    prevProps.projectTitle === nextProps.projectTitle &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.size === nextProps.size &&
    prevProps.variant === nextProps.variant
  );
});