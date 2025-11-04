import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteButton from '../DeleteButton';
import ConfirmationDialog from '../ConfirmationDialog';

describe('Keyboard Navigation Tests', () => {
  describe('DeleteButton キーボードナビゲーション', () => {
    let mockOnDelete;
    let user;

    beforeEach(() => {
      mockOnDelete = vi.fn();
      user = userEvent.setup();
    });

    it('Tabキーでフォーカス可能', async () => {
      render(
        <div>
          <button>前のボタン</button>
          <DeleteButton
            projectId="test-1"
            projectTitle="テストプロジェクト"
            onDelete={mockOnDelete}
          />
          <button>次のボタン</button>
        </div>
      );

      const prevButton = screen.getByText('前のボタン');
      const deleteButton = screen.getByLabelText('プロジェクト「テストプロジェクト」を削除');
      const nextButton = screen.getByText('次のボタン');

      // 最初のボタンにフォーカス
      prevButton.focus();
      expect(prevButton).toHaveFocus();

      // Tab で削除ボタンへ
      await user.keyboard('{Tab}');
      expect(deleteButton).toHaveFocus();

      // Tab で次のボタンへ
      await user.keyboard('{Tab}');
      expect(nextButton).toHaveFocus();
    });

    it('Shift+Tabで逆方向にフォーカス移動', async () => {
      render(
        <div>
          <button>前のボタン</button>
          <DeleteButton
            projectId="test-1"
            projectTitle="テストプロジェクト"
            onDelete={mockOnDelete}
          />
          <button>次のボタン</button>
        </div>
      );

      const prevButton = screen.getByText('前のボタン');
      const deleteButton = screen.getByLabelText('プロジェクト「テストプロジェクト」を削除');
      const nextButton = screen.getByText('次のボタン');

      // 次のボタンにフォーカス
      nextButton.focus();
      expect(nextButton).toHaveFocus();

      // Shift+Tab で削除ボタンへ
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(deleteButton).toHaveFocus();

      // Shift+Tab で前のボタンへ
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(prevButton).toHaveFocus();
    });

    it('Enterキーで削除処理実行', async () => {
      render(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByLabelText('プロジェクト「テストプロジェクト」を削除');
      deleteButton.focus();

      await user.keyboard('{Enter}');
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockOnDelete).toHaveBeenCalledWith('test-1');
    });

    it('Spaceキーで削除処理実行', async () => {
      render(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByLabelText('プロジェクト「テストプロジェクト」を削除');
      deleteButton.focus();

      await user.keyboard(' ');
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockOnDelete).toHaveBeenCalledWith('test-1');
    });

    it('無効状態ではキーボード操作が無効', async () => {
      render(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
          disabled={true}
        />
      );

      const deleteButton = screen.getByLabelText('プロジェクト「テストプロジェクト」を削除');
      deleteButton.focus();

      await user.keyboard('{Enter}');
      expect(mockOnDelete).not.toHaveBeenCalled();

      await user.keyboard(' ');
      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it('ローディング中はキーボード操作が無効', async () => {
      render(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
          isLoading={true}
        />
      );

      const deleteButton = screen.getByLabelText('プロジェクト「テストプロジェクト」を削除');
      deleteButton.focus();

      await user.keyboard('{Enter}');
      expect(mockOnDelete).not.toHaveBeenCalled();

      await user.keyboard(' ');
      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it('他のキーでは反応しない', async () => {
      render(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByLabelText('プロジェクト「テストプロジェクト」を削除');
      deleteButton.focus();

      // 他のキーを押しても反応しない
      await user.keyboard('{Escape}');
      await user.keyboard('a');
      await user.keyboard('{ArrowUp}');
      await user.keyboard('{ArrowDown}');

      expect(mockOnDelete).not.toHaveBeenCalled();
    });
  });

  describe('ConfirmationDialog キーボードナビゲーション', () => {
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

    it('ダイアログ内でのフォーカストラップが機能する', async () => {
      render(
        <div>
          <button>外部ボタン1</button>
          <ConfirmationDialog
            isOpen={true}
            onClose={mockOnClose}
            onConfirm={mockOnConfirm}
            projectDetails={mockProjectDetails}
          />
          <button>外部ボタン2</button>
        </div>
      );

      const cancelButton = screen.getByText('キャンセル');
      const confirmButton = screen.getByText('削除する');
      const closeButton = screen.getByLabelText('ダイアログを閉じる');

      // 初期フォーカスを待つ
      await waitFor(() => {
        expect(cancelButton).toHaveFocus();
      });

      // Tab で順方向に移動
      await user.keyboard('{Tab}');
      expect(confirmButton).toHaveFocus();

      await user.keyboard('{Tab}');
      expect(closeButton).toHaveFocus();

      // 最後の要素から最初の要素へ循環
      await user.keyboard('{Tab}');
      expect(cancelButton).toHaveFocus();

      // Shift+Tab で逆方向に移動
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(closeButton).toHaveFocus();

      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(confirmButton).toHaveFocus();

      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(cancelButton).toHaveFocus();
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

    it('キャンセルボタンにフォーカスがある時のEnterキーでダイアログが閉じる', async () => {
      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      // 初期フォーカスを待つ
      await waitFor(() => {
        const cancelButton = screen.getByText('キャンセル');
        expect(cancelButton).toHaveFocus();
      });

      await user.keyboard('{Enter}');
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

    it('ローディング中は確認ボタンでのキーボード操作が無効', async () => {
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
      confirmButton.focus();

      await user.keyboard('{Enter}');
      await user.keyboard(' ');

      // ローディング中なので追加の呼び出しはない
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('ダイアログが閉じている時はキーボード操作が無効', async () => {
      render(
        <ConfirmationDialog
          isOpen={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      // ダイアログが表示されていない
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // キーボード操作しても何も起こらない
      await user.keyboard('{Escape}');
      await user.keyboard('{Enter}');
      await user.keyboard(' ');

      expect(mockOnClose).not.toHaveBeenCalled();
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe('複合キーボードナビゲーション', () => {
    it('複数の削除ボタンが存在する場合のナビゲーション', async () => {
      const user = userEvent.setup();
      const mockOnDelete1 = vi.fn();
      const mockOnDelete2 = vi.fn();
      const mockOnDelete3 = vi.fn();

      render(
        <div>
          <DeleteButton
            projectId="test-1"
            projectTitle="プロジェクト1"
            onDelete={mockOnDelete1}
          />
          <DeleteButton
            projectId="test-2"
            projectTitle="プロジェクト2"
            onDelete={mockOnDelete2}
          />
          <DeleteButton
            projectId="test-3"
            projectTitle="プロジェクト3"
            onDelete={mockOnDelete3}
          />
        </div>
      );

      const button1 = screen.getByLabelText('プロジェクト「プロジェクト1」を削除');
      const button2 = screen.getByLabelText('プロジェクト「プロジェクト2」を削除');
      const button3 = screen.getByLabelText('プロジェクト「プロジェクト3」を削除');

      // 最初のボタンにフォーカス
      button1.focus();
      expect(button1).toHaveFocus();

      // Tab で次のボタンへ
      await user.keyboard('{Tab}');
      expect(button2).toHaveFocus();

      await user.keyboard('{Tab}');
      expect(button3).toHaveFocus();

      // Shift+Tab で逆方向へ
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(button2).toHaveFocus();

      // Enter で削除実行
      await user.keyboard('{Enter}');
      expect(mockOnDelete2).toHaveBeenCalledTimes(1);
      expect(mockOnDelete2).toHaveBeenCalledWith('test-2');

      // 他のボタンは呼ばれない
      expect(mockOnDelete1).not.toHaveBeenCalled();
      expect(mockOnDelete3).not.toHaveBeenCalled();
    });

    it('一部のボタンが無効な場合のナビゲーション', async () => {
      const user = userEvent.setup();
      const mockOnDelete1 = vi.fn();
      const mockOnDelete2 = vi.fn();
      const mockOnDelete3 = vi.fn();

      render(
        <div>
          <DeleteButton
            projectId="test-1"
            projectTitle="プロジェクト1"
            onDelete={mockOnDelete1}
          />
          <DeleteButton
            projectId="test-2"
            projectTitle="プロジェクト2"
            onDelete={mockOnDelete2}
            disabled={true}
          />
          <DeleteButton
            projectId="test-3"
            projectTitle="プロジェクト3"
            onDelete={mockOnDelete3}
          />
        </div>
      );

      const button1 = screen.getByLabelText('プロジェクト「プロジェクト1」を削除');
      const button2 = screen.getByLabelText('プロジェクト「プロジェクト2」を削除');
      const button3 = screen.getByLabelText('プロジェクト「プロジェクト3」を削除');

      // 最初のボタンにフォーカス
      button1.focus();
      expect(button1).toHaveFocus();

      // Tab で次のボタンへ（無効なボタンはスキップされる）
      await user.keyboard('{Tab}');
      expect(button3).toHaveFocus();

      // 無効なボタンは直接フォーカスできるが操作は無効
      button2.focus();
      expect(button2).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(mockOnDelete2).not.toHaveBeenCalled();
    });
  });
});