import React, { useState, useCallback } from 'react';
import DeleteButton from './DeleteButton';
import ConfirmationDialog from './ConfirmationDialog';
import { useDeleteWithConfirmation } from '../hooks/useEnhancedDelete';
import { createDeleteSuccessNotification, createDeleteErrorNotification } from './NotificationSystem';

/**
 * 拡張されたプロジェクトテーブルコンポーネント
 * 既存のテーブル行に新しい削除機能を統合
 */
const EnhancedProjectTable = ({ 
  project, 
  onDeleteProject, 
  showNotification,
  loadingStates,
  children 
}) => {
  // 削除機能のフック
  const deleteWithConfirmation = useDeleteWithConfirmation({
    deleteFunction: onDeleteProject,
    onSuccess: (projectId, projectData) => {
      const notification = createDeleteSuccessNotification(
        projectData.title,
        `客先: ${projectData.client}`
      );
      showNotification(notification);
    },
    onError: (projectId, error, errorInfo) => {
      const notification = createDeleteErrorNotification(
        project.title,
        errorInfo.message,
        errorInfo.action === 'retry' ? 'しばらく待ってから再度お試しください' : ''
      );
      showNotification(notification);
    },
    enableOptimisticUpdates: true,
    enableRetry: true,
    maxRetries: 3
  });

  // 削除ボタンクリック処理
  const handleDeleteClick = useCallback(() => {
    deleteWithConfirmation.openDeleteConfirmation(project.id, project);
  }, [project, deleteWithConfirmation.openDeleteConfirmation]);

  // 削除確認処理
  const handleConfirmDelete = useCallback(async () => {
    // setProjectsコールバックを渡す必要があるため、親コンポーネントから受け取る
    return await deleteWithConfirmation.confirmDelete();
  }, [deleteWithConfirmation.confirmDelete]);

  return (
    <>
      {/* 既存のテーブル行コンテンツ */}
      {children}
      
      {/* 削除ボタンセル */}
      <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-center">
        <DeleteButton
          projectId={project.id}
          projectTitle={project.title}
          onDelete={handleDeleteClick}
          isLoading={deleteWithConfirmation.isDeleting(project.id)}
          size="sm"
          variant="both"
        />
      </td>

      {/* 削除確認ダイアログ */}
      <ConfirmationDialog
        isOpen={deleteWithConfirmation.confirmationState.isOpen}
        onClose={deleteWithConfirmation.closeDeleteConfirmation}
        onConfirm={handleConfirmDelete}
        title="プロジェクトの削除"
        message="以下のプロジェクトを削除してもよろしいですか？"
        projectDetails={deleteWithConfirmation.confirmationState.projectData}
        isLoading={deleteWithConfirmation.isDeleting(project.id)}
      />
    </>
  );
};

export default EnhancedProjectTable;