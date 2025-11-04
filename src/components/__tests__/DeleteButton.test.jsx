import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteButton from '../DeleteButton';

// テスト用のモックデータ
const mockProject = {
  id: 'test-project-1',
  title: 'テストプロジェクト',
  client: 'テスト株式会社',
  customer_amount: 1000000
};

describe('DeleteButton', () => {
  let mockOnDelete;
  let user;

  beforeEach(() => {
    mockOnDelete = vi.fn();
    user = userEvent.setup();
  });

  describe('基本的なレンダリング', () => {
    it('デフォルトプロパティで正しくレンダリングされる', () => {
      render(
        <DeleteButton
          projectId={mockProject.id}
          projectTitle={mockProject.title}
          onDelete={mockOnDelete}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', `プロジェクト「${mockProject.title}」を削除`);
      expect(button).toHaveAttribute('title', `プロジェクト「${mockProject.title}」を削除`);
    });

    it('アイコンとテキストの両方が表示される（デフォルト）', () => {
      render(
        <DeleteButton
          projectId={mockProject.id}
          projectTitle={mockProject.title}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('削除')).toBeInTheDocument();
      // Lucide-reactのアイコンはSVGとしてレンダリングされる
      expect(document.querySelector('svg')).toBeInTheDocument();
    });

    it('アイコンのみ表示される（variant="icon"）', () => {
      render(
        <DeleteButton
          projectId={mockProject.id}
          projectTitle={mockProject.title}
          onDelete={mockOnDelete}
          variant="icon"
        />
      );

      expect(screen.queryByText('削除')).not.toBeInTheDocument();
      expect(document.querySelector('svg')).toBeInTheDocument();
    });

    it('テキストのみ表示される（variant="text"）', () => {
      render(
        <DeleteButton
          projectId={mockProject.id}
          projectTitle={mockProject.title}
          onDelete={mockOnDelete}
          variant="text"
        />
      );

      expect(screen.getByText('削除')).toBeInTheDocument();
      expect(document.querySelector('svg')).not.toBeInTheDocument();
    });
  });

  describe('サイズバリアント', () => {
    it('小サイズ（sm）のクラスが適用される', () => {
      render(
        <DeleteButton
          projectId={mockProject.id}
          projectTitle={mockProject.title}
          onDelete={mockOnDelete}
          size="sm"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('delete-btn-sm');
    });

    it('中サイズ（md）のクラスが適用される（デフォルト）', () => {
      render(
        <DeleteButton
          projectId={mockProject.id}
          projectTitle={mockProject.title}
          onDelete={mockOnDelete}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('delete-btn-md');
    });

    it('大サイズ（lg）のクラスが適用される', () => {
      render(
        <DeleteButton
          projectId={mockProject.id}
          projectTitle={mockProject.title}
          onDelete={mockOnDelete}
          size="lg"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('delete-btn-lg');
    });
  });

  describe('状態管理', () => {
    it('ローディング状態が正しく表示される', () => {
      render(
        <DeleteButton
          projectId={mockProject.id}
          projectTitle={mockProject.title}
          onDelete={mockOnDelete}
          isLoading={true}
        />
      );

      expect(screen.getByText('削除中...')).toBeInTheDocument();
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('無効状態が正しく適用される', () => {
      render(
        <DeleteButton
          projectId={mockProject.id}
          projectTitle={mockProject.title}
          onDelete={mockOnDelete}
          disabled={true}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('cursor-not-allowed', 'opacity-50');
    });

    it('ローディング中は無効状態になる', () => {
      render(
        <DeleteButton
          projectId={mockProject.id}
          projectTitle={mockProject.title}
          onDelete={mockOnDelete}
          isLoading={true}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('イベント処理', () => {
    it('クリック時にonDeleteが呼ばれる', async () => {
      render(
        <DeleteButton
          projectId={mockProject.id}
          projectTitle={mockProject.title}
          onDelete={mockOnDelete}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockOnDelete).toHaveBeenCalledWith(mockProject.id);
    });

    it('EnterキーでonDeleteが呼ばれる', async () => {
      render(
        <DeleteButton
          projectId={mockProject.id}
          projectTitle={mockProject.title}
          onDelete={mockOnDelete}
        />
      );

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it('SpaceキーでonDeleteが呼ばれる', async () => {
      render(
        <DeleteButton
          projectId={mockProject.id}
          projectTitle={mockProject.title}
          onDelete={mockOnDelete}
        />
      );

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard(' ');

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it('無効状態ではonDeleteが呼ばれない', async () => {
      render(
        <DeleteButton
          projectId={mockProject.id}
          projectTitle={mockProject.title}
          onDelete={mockOnDelete}
          disabled={true}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it('ローディング中はonDeleteが呼ばれない', async () => {
      render(
        <DeleteButton
          projectId={mockProject.id}
          projectTitle={mockProject.title}
          onDelete={mockOnDelete}
          isLoading={true}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnDelete).not.toHaveBeenCalled();
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIA属性が設定される', () => {
      render(
        <DeleteButton
          projectId={mockProject.id}
          projectTitle={mockProject.title}
          onDelete={mockOnDelete}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', `プロジェクト「${mockProject.title}」を削除`);
      expect(button).toHaveAttribute('aria-describedby', `delete-description-${mockProject.id}`);
      expect(button).toHaveAttribute('role', 'button');
      expect(button).toHaveAttribute('tabIndex', '0');
    });

    it('スクリーンリーダー用の説明が存在する', () => {
      render(
        <DeleteButton
          projectId={mockProject.id}
          projectTitle={mockProject.title}
          onDelete={mockOnDelete}
        />
      );

      const description = document.getElementById(`delete-description-${mockProject.id}`);
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('sr-only');
      expect(description).toHaveTextContent(`この操作は取り消せません。プロジェクト「${mockProject.title}」のすべてのデータが完全に削除されます。`);
    });

    it('フォーカス可能である', () => {
      render(
        <DeleteButton
          projectId={mockProject.id}
          projectTitle={mockProject.title}
          onDelete={mockOnDelete}
        />
      );

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });
  });

  describe('危険度判定', () => {
    it('重要なプロジェクトでは危険クラスが適用される', () => {
      render(
        <DeleteButton
          projectId={mockProject.id}
          projectTitle="重要なプロジェクト"
          onDelete={mockOnDelete}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('delete-btn-critical');
    });

    it('緊急プロジェクトでは危険クラスが適用される', () => {
      render(
        <DeleteButton
          projectId={mockProject.id}
          projectTitle="緊急対応プロジェクト"
          onDelete={mockOnDelete}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('delete-btn-critical');
    });

    it('本社プロジェクトでは危険クラスが適用される', () => {
      render(
        <DeleteButton
          projectId={mockProject.id}
          projectTitle="本社ビル改修工事"
          onDelete={mockOnDelete}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('delete-btn-critical');
    });

    it('通常のプロジェクトでは危険クラスが適用されない', () => {
      render(
        <DeleteButton
          projectId={mockProject.id}
          projectTitle="通常のプロジェクト"
          onDelete={mockOnDelete}
        />
      );

      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('delete-btn-critical');
    });
  });

  describe('エラーハンドリング', () => {
    it('onDeleteでエラーが発生してもクラッシュしない', async () => {
      const mockOnDeleteWithError = vi.fn().mockRejectedValue(new Error('削除エラー'));
      
      render(
        <DeleteButton
          projectId={mockProject.id}
          projectTitle={mockProject.title}
          onDelete={mockOnDeleteWithError}
        />
      );

      const button = screen.getByRole('button');
      
      // エラーが発生してもコンポーネントがクラッシュしないことを確認
      await expect(user.click(button)).resolves.not.toThrow();
      expect(mockOnDeleteWithError).toHaveBeenCalledTimes(1);
    });
  });
});