import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmationDialog from '../ConfirmationDialog';

// テスト用のモックデータ
const mockProjectDetails = {
  client: 'テスト株式会社',
  title: 'テストプロジェクト',
  customerAmount: 1000000
};

describe('ConfirmationDialog', () => {
  let mockOnClose;
  let mockOnConfirm;
  let user;

  beforeEach(() => {
    mockOnClose = vi.fn();
    mockOnConfirm = vi.fn();
    user = userEvent.setup();
  });

  afterEach(() => {
    // ダイアログが開いている場合のクリーンアップ
    document.body.style.overflow = '';
  });

  describe('基本的なレンダリング', () => {
    it('ダイアログが閉じている時は何も表示されない', () => {
      render(
        <ConfirmationDialog
          isOpen={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('ダイアログが開いている時は正しく表示される', () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('削除の確認')).toBeInTheDocument();
      expect(screen.getByText('以下のプロジェクトを削除してもよろしいですか？')).toBeInTheDocument();
    });

    it('カスタムタイトルとメッセージが表示される', () => {
      const customTitle = 'カスタムタイトル';
      const customMessage = 'カスタムメッセージ';

      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title={customTitle}
          message={customMessage}
          projectDetails={mockProjectDetails}
        />
      );

      expect(screen.getByText(customTitle)).toBeInTheDocument();
      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });
  });

  describe('プロジェクト詳細表示', () => {
    it('プロジェクト詳細が正しく表示される', () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      expect(screen.getByText('削除対象プロジェクト')).toBeInTheDocument();
      expect(screen.getByText(mockProjectDetails.client)).toBeInTheDocument();
      expect(screen.getByText(mockProjectDetails.title)).toBeInTheDocument();
      expect(screen.getByText('¥1,000,000')).toBeInTheDocument();
    });

    it('プロジェクト詳細がない場合でも正常に動作する', () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={null}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.queryByText('削除対象プロジェクト')).not.toBeInTheDocument();
    });
  });

  describe('警告メッセージ', () => {
    it('重要な注意事項が表示される', () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      expect(screen.getByText('重要な注意事項')).toBeInTheDocument();
      expect(screen.getByText('この操作は取り消せません。プロジェクトのすべてのデータが完全に削除されます。')).toBeInTheDocument();
    });
  });

  describe('ボタン操作', () => {
    it('キャンセルボタンクリックでonCloseが呼ばれる', async () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      const cancelButton = screen.getByText('キャンセル');
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('削除するボタンクリックでonConfirmが呼ばれる', async () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      const confirmButton = screen.getByText('削除する');
      await user.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('閉じるボタン（X）クリックでonCloseが呼ばれる', async () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      const closeButton = screen.getByLabelText('ダイアログを閉じる');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('ローディング状態', () => {
    it('ローディング中は削除ボタンが無効になる', () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
          isLoading={true}
        />
      );

      const confirmButton = screen.getByText('削除中...');
      expect(confirmButton).toBeDisabled();
      expect(screen.getByText('削除中...')).toBeInTheDocument();
    });

    it('ローディング中は閉じるボタンが表示されない', () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
          isLoading={true}
        />
      );

      expect(screen.queryByLabelText('ダイアログを閉じる')).not.toBeInTheDocument();
    });

    it('ローディング中はキャンセルボタンが無効になる', () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
          isLoading={true}
        />
      );

      const cancelButton = screen.getByText('キャンセル');
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('キーボード操作', () => {
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

    it('ローディング中はEscキーが無効', async () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
          isLoading={true}
        />
      );

      await user.keyboard('{Escape}');
      expect(mockOnClose).not.toHaveBeenCalled();
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

    it('確認ボタンにフォーカスがある時のSpaceキーで削除実行', async () => {
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
      await user.keyboard(' ');

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('フォーカス管理', () => {
    it('ダイアログが開いた時にキャンセルボタンにフォーカスが移る', async () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      // フォーカスの移動は非同期で行われるため少し待つ
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
  });

  describe('バックドロップクリック', () => {
    it('バックドロップクリックでダイアログが閉じる', async () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      const backdrop = screen.getByRole('dialog').parentElement;
      await user.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('ローディング中はバックドロップクリックが無効', async () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
          isLoading={true}
        />
      );

      const backdrop = screen.getByRole('dialog').parentElement;
      await user.click(backdrop);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIA属性が設定される', () => {
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

    it('警告メッセージにrole="alert"が設定される', () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      const alertElement = screen.getByRole('alert');
      expect(alertElement).toHaveTextContent('重要な注意事項');
    });

    it('ボタンに適切なaria-labelが設定される', () => {
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
  });

  describe('エラーハンドリング', () => {
    it('onConfirmでエラーが発生してもクラッシュしない', async () => {
      const mockOnConfirmWithError = vi.fn().mockRejectedValue(new Error('削除エラー'));
      
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirmWithError}
          projectDetails={mockProjectDetails}
        />
      );

      const confirmButton = screen.getByText('削除する');
      
      // エラーが発生してもコンポーネントがクラッシュしないことを確認
      await expect(user.click(confirmButton)).resolves.not.toThrow();
      expect(mockOnConfirmWithError).toHaveBeenCalledTimes(1);
    });
  });
});