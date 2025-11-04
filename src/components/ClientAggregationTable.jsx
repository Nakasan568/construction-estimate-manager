import React, { useState, useCallback } from 'react';
import DeleteButton from './DeleteButton';
import ConfirmationDialog from './ConfirmationDialog';
import { createDeleteSuccessNotification, createDeleteErrorNotification } from './NotificationSystem';
import { formatCurrency, calculateProfitRate } from '../utils/calculations';

/**
 * 客先別集計テーブルコンポーネント
 * 客先別集計画面での削除機能を提供
 */
const ClientAggregationTable = ({ 
  clientData, 
  projects,
  onDeleteProject,
  showNotification,
  loadingStates 
}) => {
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    projectId: null,
    projectData: null
  });

  const [expandedClients, setExpandedClients] = useState(new Set());

  // 客先の展開/折りたたみ
  const toggleClientExpansion = useCallback((clientName) => {
    setExpandedClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientName)) {
        newSet.delete(clientName);
      } else {
        newSet.add(clientName);
      }
      return newSet;
    });
  }, []);

  // 削除確認ダイアログを開く
  const openDeleteConfirmation = useCallback((projectId, projectData) => {
    setDeleteConfirmation({
      isOpen: true,
      projectId,
      projectData
    });
  }, []);

  // 削除確認ダイアログを閉じる
  const closeDeleteConfirmation = useCallback(() => {
    setDeleteConfirmation({
      isOpen: false,
      projectId: null,
      projectData: null
    });
  }, []);

  // 削除を確認して実行
  const confirmDelete = useCallback(async () => {
    const { projectId, projectData } = deleteConfirmation;
    
    if (!projectId || !projectData) {
      console.error('削除対象のプロジェクト情報が不足しています');
      return false;
    }

    const result = await onDeleteProject(projectId);
    
    if (result) {
      closeDeleteConfirmation();
      
      // 成功通知を表示
      const notification = createDeleteSuccessNotification(
        projectData.title,
        `客先: ${projectData.client} - 集計データを更新しました`
      );
      showNotification(notification);
    }
    
    return result;
  }, [deleteConfirmation, onDeleteProject, closeDeleteConfirmation, showNotification]);

  // 特定の客先のプロジェクトを取得
  const getClientProjects = useCallback((clientName) => {
    return projects.filter(project => project.client === clientName);
  }, [projects]);

  return (
    <>
      <table className="min-w-full divide-y divide-gray-200 view-transition" role="table" aria-label="客先別集計テーブル">
        <caption className="sr-only sm:not-sr-only text-sm text-gray-500 py-2 lg:hidden">
          横スクロールして全ての列を表示できます
        </caption>
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              客先名
            </th>
            <th scope="col" className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              案件数
            </th>
            <th scope="col" className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              合計ネット金額
            </th>
            <th scope="col" className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              合計客出金額
            </th>
            <th scope="col" className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              平均利益率
            </th>
            <th scope="col" className="px-2 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {clientData.map((data, index) => {
            const isExpanded = expandedClients.has(data.client);
            const clientProjects = getClientProjects(data.client);
            
            return (
              <React.Fragment key={data.client}>
                {/* 客先集計行 */}
                <tr className={`table-row ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleClientExpansion(data.client)}
                        className="mr-2 p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                        aria-label={`${data.client}のプロジェクト詳細を${isExpanded ? '折りたたむ' : '展開する'}`}
                      >
                        {isExpanded ? '📂' : '📁'}
                      </button>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{data.client}</div>
                        <div className="text-xs text-gray-500">{clientProjects.length}件のプロジェクト</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {data.projectCount}件
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {formatCurrency(data.totalNetAmount)}
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {formatCurrency(data.totalCustomerAmount)}
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center ${
                      data.averageProfitRate >= 120 ? 'profit-high-bg' :
                      data.averageProfitRate >= 110 ? 'profit-medium-bg' : 'profit-low-bg'
                    }`}>
                      {data.averageProfitRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => toggleClientExpansion(data.client)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      {isExpanded ? '詳細を隠す' : '詳細を表示'}
                    </button>
                  </td>
                </tr>

                {/* 展開された個別プロジェクト行 */}
                {isExpanded && clientProjects.map((project) => (
                  <tr key={`${data.client}-${project.id}`} className="bg-blue-50 border-l-4 border-blue-200">
                    <td className="px-2 sm:px-4 py-2 whitespace-nowrap">
                      <div className="ml-8 text-sm text-gray-900">
                        <div className="font-medium truncate max-w-xs" title={project.title}>
                          {project.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          工事番号: {project.project_number || 'なし'}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      個別案件
                    </td>
                    <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(project.net_amount)}
                    </td>
                    <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(project.customer_amount)}
                    </td>
                    <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center text-xs ${
                        parseFloat(calculateProfitRate(project.customer_amount, project.net_amount)) >= 120 ? 'profit-high-bg' :
                        parseFloat(calculateProfitRate(project.customer_amount, project.net_amount)) >= 110 ? 'profit-medium-bg' : 'profit-low-bg'
                      }`}>
                        {calculateProfitRate(project.customer_amount, project.net_amount)}%
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-center">
                      <DeleteButton
                        projectId={project.id}
                        projectTitle={project.title}
                        onDelete={() => openDeleteConfirmation(project.id, project)}
                        isLoading={loadingStates.deleting[project.id]}
                        size="sm"
                        variant="icon"
                      />
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* 削除確認ダイアログ */}
      <ConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={closeDeleteConfirmation}
        onConfirm={confirmDelete}
        title="プロジェクトの削除"
        message="以下のプロジェクトを削除してもよろしいですか？削除後、客先別集計データが自動的に更新されます。"
        projectDetails={deleteConfirmation.projectData}
        isLoading={loadingStates.deleting[deleteConfirmation.projectId]}
      />
    </>
  );
};

export default ClientAggregationTable;