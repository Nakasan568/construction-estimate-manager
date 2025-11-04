import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteButton from '../DeleteButton';
import ConfirmationDialog from '../ConfirmationDialog';
import NotificationSystem from '../NotificationSystem';

// アクセシビリティテスト用のヘルパー関数
const getByAriaLabel = (container, label) => {
  return container.querySelector(`[aria-label="${label}"]`);
};

const getByRole = (container, role) => {
  return container.querySelector(`[role="${role}"]`);
};

const getAllFocusableElements = (container) => {
  return container.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
  );
};

describe('Accessibility Tests', () => {
  describe('DeleteButton アクセシビリティ', () => {
    let mockOnDelete;
    let user;

    beforeEach(() => {
      mockOnDelete = vi.fn();
      user = userEvent.setup();
    });

    it('適切なARIA属性が設定されている', () => {
      const { container } = render(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
        />
      );

      const button = screen.getByRole('button');
      
      // 必須のARIA属性をチェック
      expect(button).toHaveAttribute('aria-label', 'プロジェクト「テストプロジェクト」を削除');
      expect(button).toHaveAttribute('aria-describedby', 'delete-description-test-1');
      expect(button).toHaveAttribute('role', 'button');
      expect(button).toHaveAttribute('tabIndex', '0');
    });

    it('スクリーンリーダー用の説明が適切に設定されている', () => {
      render(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
        />
      );

      const description = document.getElementById('delete-description-test-1');
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('sr-only');
      expect(description).toHaveTextContent(
        'この操作は取り消せません。プロジェクト「テストプロジェクト」のすべてのデータが完全に削除されます。'
      );
    });

    it('キーボードでフォーカス可能である', async () => {
      render(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
        />
      );

      const button = screen.getByRole('button');
      
      // Tabキーでフォーカス
      await user.tab();
      expect(button).toHaveFocus();
    });

    it('Enterキーで操作可能である', async () => {
      render(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
        />
      );

      const button = screen.getByRole('button');
      button.focus();
      
      await user.keyboard('{Enter}');
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it('Spaceキーで操作可能である', async () => {
      render(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
        />
      );

      const button = screen.getByRole('button');
      button.focus();
      
      await user.keyboard(' ');
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it('無効状態でも適切なARIA属性が維持される', () => {
      render(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
          disabled={true}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-label', 'プロジェクト「テストプロジェクト」を削除');
    });

    it('ローディング状態でも適切なARIA属性が維持される', () => {
      render(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
          isLoading={true}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-label', 'プロジェクト「テストプロジェクト」を削除');
      expect(screen.getByText('削除中...')).toBeInTheDocument();
    });
  });

  describe('ConfirmationDialog アクセシビリティ', () => {
    let mockOnClose;
    let mockOnConfirm;
    let user;

    const mockProjectDetails = {
      client: 'テスト株式会社',
      title: 'テストプロジェクト',
      customerAmount: 1000000
    };

    beforeEach(() => {
      mockOnClose = vi.fn();
      mockOnConfirm = vi.fn();
      user = userEvent.setup();
    });

    it('ダイアログに適切なARIA属性が設定されている', () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'dialog-description');
      expect(dialog).toHaveAttribute('aria-live', 'polite');
    });

    it('ダイアログタイトルが適切に関連付けられている', () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      const title = document.getElementById('dialog-title');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('削除の確認');
    });

    it('警告メッセージにrole="alert"が設定されている', () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('重要な注意事項');
    });

    it('フォーカスが適切に管理されている', async () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      // 初期フォーカスがキャンセルボタンに移る
      await waitFor(() => {
        const cancelButton = screen.getByText('キャンセル');
        expect(cancelButton).toHaveFocus();
      }, { timeout: 200 });
    });

    it('Tabキーでフォーカスが循環する', async () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      const cancelButton = screen.getByText('キャンセル');
      const confirmButton = screen.getByText('削除する');
      const closeButton = screen.getByLabelText('ダイアログを閉じる');

      // 初期フォーカスを待つ
      await waitFor(() => {
        expect(cancelButton).toHaveFocus();
      });

      // Tab で次の要素へ
      await user.keyboard('{Tab}');
      expect(confirmButton).toHaveFocus();

      await user.keyboard('{Tab}');
      expect(closeButton).toHaveFocus();

      // 最後の要素から最初の要素へ循環
      await user.keyboard('{Tab}');
      expect(cancelButton).toHaveFocus();
    });

    it('Shift+Tabで逆方向にフォーカスが移動する', async () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      const cancelButton = screen.getByText('キャンセル');
      const closeButton = screen.getByLabelText('ダイアログを閉じる');

      // 初期フォーカスを待つ
      await waitFor(() => {
        expect(cancelButton).toHaveFocus();
      });

      // Shift+Tab で逆方向へ（最後の要素へ）
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(closeButton).toHaveFocus();
    });

    it('Escキーでダイアログが閉じる', async () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      await user.keyboard('{Escape}');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('確認ボタンにフォーカスがある時のEnterキーで削除実行', async () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      const confirmButton = screen.getByText('削除する');
      confirmButton.focus();
      
      await user.keyboard('{Enter}');
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('ボタンに適切なaria-labelが設定されている', () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      const cancelButton = screen.getByLabelText('削除をキャンセルしてダイアログを閉じる');
      const confirmButton = screen.getByLabelText(`プロジェクト「${mockProjectDetails.title}」を完全に削除する`);
      
      expect(cancelButton).toBeInTheDocument();
      expect(confirmButton).toBeInTheDocument();
    });

    it('ローディング中はフォーカス管理が適切に動作する', async () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
          isLoading={true}
        />
      );

      // ローディング中でもフォーカス可能な要素が存在する
      const cancelButton = screen.getByText('キャンセル');
      expect(cancelButton).toBeDisabled();
      
      // 閉じるボタンは表示されない
      expect(screen.queryByLabelText('ダイアログを閉じる')).not.toBeInTheDocument();
    });
  });

  describe('NotificationSystem アクセシビリティ', () => {
    let mockOnRemove;

    beforeEach(() => {
      mockOnRemove = vi.fn();
    });

    it('通知にrole="alert"が設定されている', () => {
      const notifications = [
        {
          id: 1,
          type: 'delete-success',
          message: 'テストメッセージ',
          projectTitle: 'テストプロジェクト'
        }
      ];

      render(
        <NotificationSystem
          notifications={notifications}
          onRemoveNotification={mockOnRemove}
        />
      );

      const notification = screen.getByRole('alert');
      expect(notification).toBeInTheDocument();
    });

    it('通知エリアに適切なaria-labelが設定されている', () => {
      const notifications = [
        {
          id: 1,
          type: 'delete-success',
          message: 'テストメッセージ',
          projectTitle: 'テストプロジェクト'
        }
      ];

      const { container } = render(
        <NotificationSystem
          notifications={notifications}
          onRemoveNotification={mockOnRemove}
        />
      );

      const notificationArea = container.querySelector('[aria-label="通知エリア"]');
      expect(notificationArea).toBeInTheDocument();
      expect(notificationArea).toHaveAttribute('role', 'region');
    });

    it('閉じるボタンが適切にラベル付けされている', () => {
      const notifications = [
        {
          id: 1,
          type: 'delete-success',
          message: 'テストメッセージ',
          projectTitle: 'テストプロジェクト'
        }
      ];

      render(
        <NotificationSystem
          notifications={notifications}
          onRemoveNotification={mockOnRemove}
        />
      );

      const closeButton = screen.getByLabelText('通知を閉じる');
      expect(closeButton).toBeInTheDocument();
    });

    it('通知がaria-liveで適切に設定されている', () => {
      const notifications = [
        {
          id: 1,
          type: 'delete-success',
          message: 'テストメッセージ',
          projectTitle: 'テストプロジェクト'
        }
      ];

      render(
        <NotificationSystem
          notifications={notifications}
          onRemoveNotification={mockOnRemove}
        />
      );

      const notification = screen.getByRole('alert');
      expect(notification).toHaveAttribute('aria-live', 'polite');
      expect(notification).toHaveAttribute('aria-atomic', 'true');
    });
  });

  describe('統合アクセシビリティテスト', () => {
    it('複数のコンポーネントが同時に表示されても適切にフォーカス管理される', async () => {
      const user = userEvent.setup();
      const mockOnDelete = vi.fn();
      const mockOnClose = vi.fn();
      const mockOnConfirm = vi.fn();
      const mockOnRemove = vi.fn();

      const mockProjectDetails = {
        client: 'テスト株式会社',
        title: 'テストプロジェクト',
        customerAmount: 1000000
      };

      const notifications = [
        {
          id: 1,
          type: 'delete-success',
          message: 'テストメッセージ',
          projectTitle: 'テストプロジェクト'
        }
      ];

      render(
        <div>
          <DeleteButton
            projectId="test-1"
            projectTitle="テストプロジェクト"
            onDelete={mockOnDelete}
          />
          <ConfirmationDialog
            isOpen={true}
            onClose={mockOnClose}
            onConfirm={mockOnConfirm}
            projectDetails={mockProjectDetails}
          />
          <NotificationSystem
            notifications={notifications}
            onRemoveNotification={mockOnRemove}
          />
        </div>
      );

      // ダイアログが開いている時は、ダイアログ内の要素にフォーカスが移る
      await waitFor(() => {
        const cancelButton = screen.getByText('キャンセル');
        expect(cancelButton).toHaveFocus();
      });

      // ダイアログ外の要素（DeleteButton）はフォーカスされない
      const deleteButton = screen.getByLabelText('プロジェクト「テストプロジェクト」を削除');
      deleteButton.focus();
      
      // ダイアログが開いている間は、フォーカスがダイアログ内に戻る
      await user.keyboard('{Tab}');
      const confirmButton = screen.getByText('削除する');
      expect(confirmButton).toHaveFocus();
    });

    it('高コントラストモードでも適切に表示される', () => {
      // 高コントラストモードのシミュレーション
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const mockOnDelete = vi.fn();

      render(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      // 高コントラストモードでも適切にレンダリングされることを確認
      expect(button).toHaveAttribute('aria-label', 'プロジェクト「テストプロジェクト」を削除');
    });

    it('動きを減らす設定でも適切に動作する', () => {
      // 動きを減らす設定のシミュレーション
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const mockOnDelete = vi.fn();

      render(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      // 動きを減らす設定でも機能は正常に動作することを確認
      expect(button).toHaveAttribute('aria-label', 'プロジェクト「テストプロジェクト」を削除');
    });
  });
});