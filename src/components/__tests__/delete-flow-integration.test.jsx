import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteButton from '../DeleteButton';
import ConfirmationDialog from '../ConfirmationDialog';
import NotificationSystem from '../NotificationSystem';

// 統合テスト用のコンポーネント
const DeleteFlowIntegration = ({ 
  projectId, 
  projectTitle, 
  projectDetails, 
  onDeleteSuccess,
  onDeleteError,
  simulateError = false,
  simulateNetworkDelay = 0
}) => {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [notifications, setNotifications] = React.useState([]);

  const handleDeleteClick = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    
    try {
      // ネットワーク遅延のシミュレーション
      if (simulateNetworkDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, simulateNetworkDelay));
      }

      if (simulateError) {
        throw new Error('削除処理に失敗しました');
      }

      // 削除成功
      setIsDialogOpen(false);
      
      const successNotification = {
        id: Date.now(),
        type: 'delete-success',
        message: '削除が完了しました',
        projectTitle,
        duration: 3000
      };
      
      setNotifications(prev => [...prev, successNotification]);
      
      if (onDeleteSuccess) {
        onDeleteSuccess(projectId);
      }

    } catch (error) {
      // 削除失敗
      const errorNotification = {
        id: Date.now(),
        type: 'delete-error',
        message: error.message,
        projectTitle,
        duration: 5000
      };
      
      setNotifications(prev => [...prev, errorNotification]);
      
      if (onDeleteError) {
        onDeleteError(projectId, error);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div>
      <DeleteButton
        projectId={projectId}
        projectTitle={projectTitle}
        onDelete={handleDeleteClick}
        isLoading={isDeleting}
      />
      
      <ConfirmationDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmDelete}
        projectDetails={projectDetails}
        isLoading={isDeleting}
      />
      
      <NotificationSystem
        notifications={notifications}
        onRemoveNotification={removeNotification}
      />
    </div>
  );
};

describe('Delete Flow Integration Tests', () => {
  let user;
  let mockOnDeleteSuccess;
  let mockOnDeleteError;

  const mockProjectDetails = {
    client: 'テスト株式会社',
    title: 'テストプロジェクト',
    customerAmount: 1000000
  };

  beforeEach(() => {
    user = userEvent.setup();
    mockOnDeleteSuccess = vi.fn();
    mockOnDeleteError = vi.fn();
    
    // タイマーをモック
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('正常な削除フロー', () => {
    it('削除ボタン → 確認ダイアログ → 削除実行 → 成功通知の完全フロー', async () => {
      render(
        <DeleteFlowIntegration
          projectId="test-1"
          projectTitle="テストプロジェクト"
          projectDetails={mockProjectDetails}
          onDeleteSuccess={mockOnDeleteSuccess}
          onDeleteError={mockOnDeleteError}
        />
      );

      // 1. 削除ボタンをクリック
      const deleteButton = screen.getByLabelText('プロジェクト「テストプロジェクト」を削除');
      await user.click(deleteButton);

      // 2. 確認ダイアログが表示される
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('削除の確認')).toBeInTheDocument();
      expect(screen.getByText('テスト株式会社')).toBeInTheDocument();
      expect(screen.getByText('テストプロジェクト')).toBeInTheDocument();

      // 3. 削除を確認
      const confirmButton = screen.getByText('削除する');
      await user.click(confirmButton);

      // 4. ローディング状態の確認
      expect(screen.getByText('削除中...')).toBeInTheDocument();
      expect(deleteButton).toBeDisabled();

      // 5. 削除処理完了を待つ
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // 6. 成功通知が表示される
      expect(screen.getByText('削除完了')).toBeInTheDocument();
      expect(screen.getByText(/プロジェクト「テストプロジェクト」を削除しました/)).toBeInTheDocument();

      // 7. コールバックが呼ばれる
      expect(mockOnDeleteSuccess).toHaveBeenCalledWith('test-1');
      expect(mockOnDeleteError).not.toHaveBeenCalled();
    });

    it('キーボードのみでの削除フロー', async () => {
      render(
        <DeleteFlowIntegration
          projectId="test-1"
          projectTitle="テストプロジェクト"
          projectDetails={mockProjectDetails}
          onDeleteSuccess={mockOnDeleteSuccess}
          onDeleteError={mockOnDeleteError}
        />
      );

      // 1. Tab で削除ボタンにフォーカス
      await user.tab();
      const deleteButton = screen.getByLabelText('プロジェクト「テストプロジェクト」を削除');
      expect(deleteButton).toHaveFocus();

      // 2. Enter で削除ダイアログを開く
      await user.keyboard('{Enter}');
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // 3. Tab で確認ボタンにフォーカス
      await user.keyboard('{Tab}');
      const confirmButton = screen.getByText('削除する');
      expect(confirmButton).toHaveFocus();

      // 4. Enter で削除実行
      await user.keyboard('{Enter}');

      // 5. 削除完了を待つ
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // 6. 成功通知が表示される
      expect(screen.getByText('削除完了')).toBeInTheDocument();
      expect(mockOnDeleteSuccess).toHaveBeenCalledWith('test-1');
    });
  });

  describe('削除キャンセルフロー', () => {
    it('キャンセルボタンで削除をキャンセル', async () => {
      render(
        <DeleteFlowIntegration
          projectId="test-1"
          projectTitle="テストプロジェクト"
          projectDetails={mockProjectDetails}
          onDeleteSuccess={mockOnDeleteSuccess}
          onDeleteError={mockOnDeleteError}
        />
      );

      // 1. 削除ボタンをクリック
      const deleteButton = screen.getByLabelText('プロジェクト「テストプロジェクト」を削除');
      await user.click(deleteButton);

      // 2. 確認ダイアログが表示される
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // 3. キャンセルボタンをクリック
      const cancelButton = screen.getByText('キャンセル');
      await user.click(cancelButton);

      // 4. ダイアログが閉じる
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // 5. 通知は表示されない
      expect(screen.queryByText('削除完了')).not.toBeInTheDocument();
      expect(screen.queryByText('削除失敗')).not.toBeInTheDocument();

      // 6. コールバックは呼ばれない
      expect(mockOnDeleteSuccess).not.toHaveBeenCalled();
      expect(mockOnDeleteError).not.toHaveBeenCalled();
    });

    it('Escキーで削除をキャンセル', async () => {
      render(
        <DeleteFlowIntegration
          projectId="test-1"
          projectTitle="テストプロジェクト"
          projectDetails={mockProjectDetails}
          onDeleteSuccess={mockOnDeleteSuccess}
          onDeleteError={mockOnDeleteError}
        />
      );

      // 1. 削除ボタンをクリック
      const deleteButton = screen.getByLabelText('プロジェクト「テストプロジェクト」を削除');
      await user.click(deleteButton);

      // 2. 確認ダイアログが表示される
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // 3. Escキーでキャンセル
      await user.keyboard('{Escape}');

      // 4. ダイアログが閉じる
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // 5. コールバックは呼ばれない
      expect(mockOnDeleteSuccess).not.toHaveBeenCalled();
      expect(mockOnDeleteError).not.toHaveBeenCalled();
    });

    it('バックドロップクリックで削除をキャンセル', async () => {
      render(
        <DeleteFlowIntegration
          projectId="test-1"
          projectTitle="テストプロジェクト"
          projectDetails={mockProjectDetails}
          onDeleteSuccess={mockOnDeleteSuccess}
          onDeleteError={mockOnDeleteError}
        />
      );

      // 1. 削除ボタンをクリック
      const deleteButton = screen.getByLabelText('プロジェクト「テストプロジェクト」を削除');
      await user.click(deleteButton);

      // 2. 確認ダイアログが表示される
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // 3. バックドロップ（ダイアログの外側）をクリック
      const backdrop = dialog.parentElement;
      await user.click(backdrop);

      // 4. ダイアログが閉じる
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // 5. コールバックは呼ばれない
      expect(mockOnDeleteSuccess).not.toHaveBeenCalled();
      expect(mockOnDeleteError).not.toHaveBeenCalled();
    });
  });

  describe('エラーハンドリングフロー', () => {
    it('削除エラー時のフロー', async () => {
      render(
        <DeleteFlowIntegration
          projectId="test-1"
          projectTitle="テストプロジェクト"
          projectDetails={mockProjectDetails}
          onDeleteSuccess={mockOnDeleteSuccess}
          onDeleteError={mockOnDeleteError}
          simulateError={true}
        />
      );

      // 1. 削除ボタンをクリック
      const deleteButton = screen.getByLabelText('プロジェクト「テストプロジェクト」を削除');
      await user.click(deleteButton);

      // 2. 確認ダイアログが表示される
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // 3. 削除を確認
      const confirmButton = screen.getByText('削除する');
      await user.click(confirmButton);

      // 4. ローディング状態の確認
      expect(screen.getByText('削除中...')).toBeInTheDocument();

      // 5. エラー処理完了を待つ
      await waitFor(() => {
        expect(screen.queryByText('削除中...')).not.toBeInTheDocument();
      });

      // 6. ダイアログは開いたまま（エラー時は閉じない）
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // 7. エラー通知が表示される
      expect(screen.getByText('削除失敗')).toBeInTheDocument();
      expect(screen.getByText(/削除処理に失敗しました/)).toBeInTheDocument();

      // 8. エラーコールバックが呼ばれる
      expect(mockOnDeleteError).toHaveBeenCalledWith('test-1', expect.any(Error));
      expect(mockOnDeleteSuccess).not.toHaveBeenCalled();
    });

    it('ネットワーク遅延時のローディング状態', async () => {
      render(
        <DeleteFlowIntegration
          projectId="test-1"
          projectTitle="テストプロジェクト"
          projectDetails={mockProjectDetails}
          onDeleteSuccess={mockOnDeleteSuccess}
          onDeleteError={mockOnDeleteError}
          simulateNetworkDelay={1000}
        />
      );

      // 1. 削除ボタンをクリック
      const deleteButton = screen.getByLabelText('プロジェクト「テストプロジェクト」を削除');
      await user.click(deleteButton);

      // 2. 削除を確認
      const confirmButton = screen.getByText('削除する');
      await user.click(confirmButton);

      // 3. ローディング状態が表示される
      expect(screen.getByText('削除中...')).toBeInTheDocument();
      expect(deleteButton).toBeDisabled();

      // 4. ローディング中はキャンセルできない
      expect(screen.queryByLabelText('ダイアログを閉じる')).not.toBeInTheDocument();

      // 5. 時間を進める
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // 6. 削除完了を待つ
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // 7. 成功通知が表示される
      expect(screen.getByText('削除完了')).toBeInTheDocument();
      expect(mockOnDeleteSuccess).toHaveBeenCalledWith('test-1');
    });
  });

  describe('通知システム統合', () => {
    it('成功通知の自動消去', async () => {
      render(
        <DeleteFlowIntegration
          projectId="test-1"
          projectTitle="テストプロジェクト"
          projectDetails={mockProjectDetails}
          onDeleteSuccess={mockOnDeleteSuccess}
          onDeleteError={mockOnDeleteError}
        />
      );

      // 削除フローを実行
      const deleteButton = screen.getByLabelText('プロジェクト「テストプロジェクト」を削除');
      await user.click(deleteButton);
      
      const confirmButton = screen.getByText('削除する');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('削除完了')).toBeInTheDocument();
      });

      // 3秒後に通知が自動消去される
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(screen.queryByText('削除完了')).not.toBeInTheDocument();
      });
    });

    it('エラー通知の自動消去（5秒）', async () => {
      render(
        <DeleteFlowIntegration
          projectId="test-1"
          projectTitle="テストプロジェクト"
          projectDetails={mockProjectDetails}
          onDeleteSuccess={mockOnDeleteSuccess}
          onDeleteError={mockOnDeleteError}
          simulateError={true}
        />
      );

      // エラーフローを実行
      const deleteButton = screen.getByLabelText('プロジェクト「テストプロジェクト」を削除');
      await user.click(deleteButton);
      
      const confirmButton = screen.getByText('削除する');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('削除失敗')).toBeInTheDocument();
      });

      // 5秒後に通知が自動消去される
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.queryByText('削除失敗')).not.toBeInTheDocument();
      });
    });

    it('通知の手動削除', async () => {
      render(
        <DeleteFlowIntegration
          projectId="test-1"
          projectTitle="テストプロジェクト"
          projectDetails={mockProjectDetails}
          onDeleteSuccess={mockOnDeleteSuccess}
          onDeleteError={mockOnDeleteError}
        />
      );

      // 削除フローを実行
      const deleteButton = screen.getByLabelText('プロジェクト「テストプロジェクト」を削除');
      await user.click(deleteButton);
      
      const confirmButton = screen.getByText('削除する');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('削除完了')).toBeInTheDocument();
      });

      // 通知の閉じるボタンをクリック
      const closeButton = screen.getByLabelText('通知を閉じる');
      await user.click(closeButton);

      // 通知が即座に消去される
      expect(screen.queryByText('削除完了')).not.toBeInTheDocument();
    });
  });

  describe('複数削除の防止', () => {
    it('削除処理中は追加の削除操作が無効', async () => {
      render(
        <DeleteFlowIntegration
          projectId="test-1"
          projectTitle="テストプロジェクト"
          projectDetails={mockProjectDetails}
          onDeleteSuccess={mockOnDeleteSuccess}
          onDeleteError={mockOnDeleteError}
          simulateNetworkDelay={1000}
        />
      );

      const deleteButton = screen.getByLabelText('プロジェクト「テストプロジェクト」を削除');

      // 1回目の削除開始
      await user.click(deleteButton);
      const confirmButton = screen.getByText('削除する');
      await user.click(confirmButton);

      // ローディング状態の確認
      expect(screen.getByText('削除中...')).toBeInTheDocument();
      expect(deleteButton).toBeDisabled();

      // 削除ボタンが無効なので追加クリックは無効
      await user.click(deleteButton);

      // 1回だけ削除処理が実行される
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockOnDeleteSuccess).toHaveBeenCalledTimes(1);
      });
    });
  });
});