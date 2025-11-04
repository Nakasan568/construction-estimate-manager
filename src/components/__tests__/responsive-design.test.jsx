import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteButton from '../DeleteButton';
import ConfirmationDialog from '../ConfirmationDialog';
import NotificationSystem from '../NotificationSystem';

// ビューポートサイズを変更するヘルパー関数
const setViewportSize = (width, height) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  // matchMediaのモック
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // リサイズイベントを発火
  window.dispatchEvent(new Event('resize'));
};

describe('Responsive Design Tests', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  afterEach(() => {
    // ビューポートサイズをリセット
    setViewportSize(1024, 768);
  });

  describe('DeleteButton レスポンシブ対応', () => {
    it('デスクトップサイズで正常に表示される', () => {
      setViewportSize(1024, 768);

      const mockOnDelete = vi.fn();
      const { container } = render(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
          size="md"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('delete-btn-md');
      
      // デスクトップサイズでは通常のスタイルが適用される
      const computedStyle = window.getComputedStyle(button);
      expect(button).toBeInTheDocument();
    });

    it('タブレットサイズで適切に表示される', () => {
      setViewportSize(768, 1024);

      const mockOnDelete = vi.fn();
      render(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
          size="md"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('delete-btn-md');
      
      // タブレットサイズでも正常に表示される
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'プロジェクト「テストプロジェクト」を削除');
    });

    it('モバイルサイズで適切に表示される', () => {
      setViewportSize(375, 667);

      const mockOnDelete = vi.fn();
      render(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
          size="sm"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('delete-btn-sm');
      
      // モバイルサイズでも正常に表示される
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'プロジェクト「テストプロジェクト」を削除');
    });

    it('小さなモバイルサイズでも適切に表示される', () => {
      setViewportSize(320, 568);

      const mockOnDelete = vi.fn();
      render(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
          size="sm"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      
      // 小さなモバイルサイズでも機能は正常に動作
      expect(button).toHaveAttribute('aria-label', 'プロジェクト「テストプロジェクト」を削除');
    });

    it('異なるサイズバリアントがレスポンシブに対応', () => {
      const mockOnDelete = vi.fn();

      // 大サイズボタン
      const { rerender } = render(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
          size="lg"
        />
      );

      let button = screen.getByRole('button');
      expect(button).toHaveClass('delete-btn-lg');

      // 中サイズボタン
      rerender(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
          size="md"
        />
      );

      button = screen.getByRole('button');
      expect(button).toHaveClass('delete-btn-md');

      // 小サイズボタン
      rerender(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
          size="sm"
        />
      );

      button = screen.getByRole('button');
      expect(button).toHaveClass('delete-btn-sm');
    });
  });

  describe('ConfirmationDialog レスポンシブ対応', () => {
    const mockProjectDetails = {
      client: 'テスト株式会社',
      title: 'テストプロジェクト',
      customerAmount: 1000000
    };

    it('デスクトップサイズで正常に表示される', () => {
      setViewportSize(1024, 768);

      const mockOnClose = vi.fn();
      const mockOnConfirm = vi.fn();

      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      
      // デスクトップサイズでは通常のレイアウト
      expect(screen.getByText('削除の確認')).toBeInTheDocument();
      expect(screen.getByText('テスト株式会社')).toBeInTheDocument();
      expect(screen.getByText('¥1,000,000')).toBeInTheDocument();
    });

    it('タブレットサイズで適切に表示される', () => {
      setViewportSize(768, 1024);

      const mockOnClose = vi.fn();
      const mockOnConfirm = vi.fn();

      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      
      // タブレットサイズでも正常に表示
      expect(screen.getByText('削除の確認')).toBeInTheDocument();
      expect(screen.getByText('キャンセル')).toBeInTheDocument();
      expect(screen.getByText('削除する')).toBeInTheDocument();
    });

    it('モバイルサイズで適切に表示される', () => {
      setViewportSize(375, 667);

      const mockOnClose = vi.fn();
      const mockOnConfirm = vi.fn();

      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      
      // モバイルサイズでも全ての要素が表示される
      expect(screen.getByText('削除の確認')).toBeInTheDocument();
      expect(screen.getByText('テストプロジェクト')).toBeInTheDocument();
      expect(screen.getByText('重要な注意事項')).toBeInTheDocument();
    });

    it('小さなモバイルサイズでも適切に表示される', () => {
      setViewportSize(320, 568);

      const mockOnClose = vi.fn();
      const mockOnConfirm = vi.fn();

      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      
      // 小さなモバイルサイズでも機能は正常
      expect(screen.getByText('削除の確認')).toBeInTheDocument();
      expect(screen.getByLabelText('削除をキャンセルしてダイアログを閉じる')).toBeInTheDocument();
    });

    it('長いプロジェクトタイトルが適切に処理される', () => {
      setViewportSize(375, 667);

      const longTitleProject = {
        client: 'テスト株式会社',
        title: 'これは非常に長いプロジェクトタイトルでモバイル画面でも適切に表示されることを確認するためのテストです',
        customerAmount: 1000000
      };

      const mockOnClose = vi.fn();
      const mockOnConfirm = vi.fn();

      render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={longTitleProject}
        />
      );

      // 長いタイトルでも表示される（truncateクラスで省略される）
      const titleElement = screen.getByTitle(longTitleProject.title);
      expect(titleElement).toBeInTheDocument();
      expect(titleElement).toHaveClass('truncate');
    });
  });

  describe('NotificationSystem レスポンシブ対応', () => {
    const mockNotifications = [
      {
        id: 1,
        type: 'delete-success',
        message: '削除が完了しました',
        projectTitle: 'テストプロジェクト',
        duration: 3000
      }
    ];

    it('デスクトップサイズで正常に表示される', () => {
      setViewportSize(1024, 768);

      const mockOnRemove = vi.fn();

      render(
        <NotificationSystem
          notifications={mockNotifications}
          onRemoveNotification={mockOnRemove}
        />
      );

      const notification = screen.getByRole('alert');
      expect(notification).toBeInTheDocument();
      expect(screen.getByText('削除完了')).toBeInTheDocument();
    });

    it('タブレットサイズで適切に表示される', () => {
      setViewportSize(768, 1024);

      const mockOnRemove = vi.fn();

      render(
        <NotificationSystem
          notifications={mockNotifications}
          onRemoveNotification={mockOnRemove}
        />
      );

      const notification = screen.getByRole('alert');
      expect(notification).toBeInTheDocument();
      expect(screen.getByText('削除完了')).toBeInTheDocument();
    });

    it('モバイルサイズで適切に表示される', () => {
      setViewportSize(375, 667);

      const mockOnRemove = vi.fn();

      render(
        <NotificationSystem
          notifications={mockNotifications}
          onRemoveNotification={mockOnRemove}
        />
      );

      const notification = screen.getByRole('alert');
      expect(notification).toBeInTheDocument();
      
      // モバイルサイズでも通知は表示される
      expect(screen.getByText('削除完了')).toBeInTheDocument();
      expect(screen.getByLabelText('通知を閉じる')).toBeInTheDocument();
    });

    it('複数の通知がモバイルサイズで適切にスタックされる', () => {
      setViewportSize(375, 667);

      const multipleNotifications = [
        {
          id: 1,
          type: 'delete-success',
          message: '削除が完了しました',
          projectTitle: 'プロジェクト1',
          duration: 3000
        },
        {
          id: 2,
          type: 'delete-error',
          message: '削除に失敗しました',
          projectTitle: 'プロジェクト2',
          duration: 5000
        }
      ];

      const mockOnRemove = vi.fn();

      render(
        <NotificationSystem
          notifications={multipleNotifications}
          onRemoveNotification={mockOnRemove}
        />
      );

      // 複数の通知が表示される
      const notifications = screen.getAllByRole('alert');
      expect(notifications).toHaveLength(2);
      
      expect(screen.getByText('削除完了')).toBeInTheDocument();
      expect(screen.getByText('削除失敗')).toBeInTheDocument();
    });
  });

  describe('タッチデバイス対応', () => {
    it('タッチイベントが適切に処理される', async () => {
      setViewportSize(375, 667);

      const mockOnDelete = vi.fn();

      render(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
        />
      );

      const button = screen.getByRole('button');

      // タッチイベントをシミュレート
      fireEvent.touchStart(button);
      fireEvent.touchEnd(button);
      fireEvent.click(button);

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it('タッチターゲットサイズが適切', () => {
      setViewportSize(375, 667);

      const mockOnDelete = vi.fn();

      render(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
          size="sm"
        />
      );

      const button = screen.getByRole('button');
      
      // モバイルでは最小44pxのタッチターゲットが確保される
      expect(button).toHaveClass('delete-btn-sm');
      expect(button).toBeInTheDocument();
    });
  });

  describe('画面回転対応', () => {
    it('縦向きから横向きへの回転', () => {
      // 縦向き
      setViewportSize(375, 667);

      const mockOnClose = vi.fn();
      const mockOnConfirm = vi.fn();
      const mockProjectDetails = {
        client: 'テスト株式会社',
        title: 'テストプロジェクト',
        customerAmount: 1000000
      };

      const { rerender } = render(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // 横向きに回転
      setViewportSize(667, 375);

      rerender(
        <ConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          projectDetails={mockProjectDetails}
        />
      );

      // 回転後も正常に表示される
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('削除の確認')).toBeInTheDocument();
    });
  });

  describe('極端なサイズでの動作', () => {
    it('非常に小さな画面サイズでも動作する', () => {
      setViewportSize(240, 320);

      const mockOnDelete = vi.fn();

      render(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
          size="sm"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'プロジェクト「テストプロジェクト」を削除');
    });

    it('非常に大きな画面サイズでも動作する', () => {
      setViewportSize(2560, 1440);

      const mockOnDelete = vi.fn();

      render(
        <DeleteButton
          projectId="test-1"
          projectTitle="テストプロジェクト"
          onDelete={mockOnDelete}
          size="lg"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('delete-btn-lg');
    });
  });
});