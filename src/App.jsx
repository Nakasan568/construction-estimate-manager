import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { formatCurrency, calculateProfitRate, calculateDaysPassed } from './utils/calculations'
import * as XLSX from 'xlsx'

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  
  // プロジェクトデータ関連の状態
  const [projects, setProjects] = useState([])
  const [dataLoading, setDataLoading] = useState(false)
  const [error, setError] = useState('')
  
  // ソート機能の状態
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' })
  
  // 表示制御の状態
  const [showAllProjects, setShowAllProjects] = useState(false)
  const [showClientView, setShowClientView] = useState(false)
  
  // フォーム関連の状態
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    project_number: '',
    client: '',
    title: '',
    construction_manager: '',
    sales_manager: '',
    net_amount: '',
    customer_amount: '',
    submission_date: new Date().toISOString().split('T')[0] // 本日をデフォルト
  })
  const [formErrors, setFormErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResults, setImportResults] = useState(null)
  const [loadingStates, setLoadingStates] = useState({
    fetching: false,
    creating: false,
    deleting: {},
    exporting: false
  })
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setLoading(false)
    }

    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // ユーザーが変更された時にプロジェクトデータを取得
  useEffect(() => {
    if (user) {
      fetchProjects()
    } else {
      // ログアウト時はプロジェクトデータをクリア
      setProjects([])
      setError('')
    }
  }, [user])

  // キーボードショートカット
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Ctrl+Shift+V でビュー切り替え
      if (event.ctrlKey && event.shiftKey && event.key === 'V') {
        event.preventDefault()
        toggleClientView()
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [showClientView])

  // 通知を表示する関数
  const showNotification = (message, type = 'info', duration = 3000) => {
    const id = Date.now()
    const notification = { id, message, type }
    
    setNotifications(prev => [...prev, notification])
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, duration)
  }

  // 通知を削除する関数
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  // ログイン処理
  const handleLogin = async (e) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setAuthError(error.message)
      }
    } catch (error) {
      setAuthError('ログインに失敗しました。')
    } finally {
      setAuthLoading(false)
    }
  }

  // ログアウト処理
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('ログアウトエラー:', error)
    }
  }

  // プロジェクトデータ取得
  const fetchProjects = async () => {
    if (!user) return
    
    setDataLoading(true)
    setError('')
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw error
      }
      
      setProjects(data || [])
    } catch (error) {
      console.error('プロジェクト取得エラー:', error)
      
      let errorMessage = 'プロジェクトデータの取得に失敗しました。'
      if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。'
      } else if (error.message.includes('timeout')) {
        errorMessage = 'タイムアウトが発生しました。しばらく待ってから再度お試しください。'
      } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        errorMessage = 'データアクセス権限がありません。再ログインしてください。'
      }
      
      setError(errorMessage)
      showNotification(errorMessage, 'error', 5000)
    } finally {
      setDataLoading(false)
    }
  }

  // プロジェクト作成
  const createProject = async (projectData) => {
    if (!user) return false
    
    setDataLoading(true)
    setError('')
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([{
          ...projectData,
          user_id: user.id
        }])
        .select()
      
      if (error) {
        throw error
      }
      
      // 新しいプロジェクトを既存のリストに追加
      if (data && data.length > 0) {
        setProjects(prevProjects => [data[0], ...prevProjects])
      }
      
      return true
    } catch (error) {
      console.error('プロジェクト作成エラー:', error)
      const errorMessage = 'プロジェクトの作成に失敗しました。'
      setError(errorMessage)
      showNotification(errorMessage, 'error')
      return false
    } finally {
      setDataLoading(false)
    }
  }

  // プロジェクト削除
  const deleteProject = async (projectId) => {
    if (!user) return false
    
    // 削除対象のプロジェクト情報を取得
    const targetProject = projects.find(p => p.id === projectId)
    if (!targetProject) {
      setError('削除対象のプロジェクトが見つかりません。')
      return false
    }
    
    // 詳細な確認ダイアログ
    const confirmMessage = `以下のプロジェクトを削除してもよろしいですか？\n\n` +
      `客先: ${targetProject.client}\n` +
      `件名: ${targetProject.title}\n` +
      `金額: ${formatCurrency(targetProject.customer_amount)}\n\n` +
      `※この操作は取り消せません。`
    
    if (!window.confirm(confirmMessage)) {
      return false
    }
    
    // 個別の削除ローディング状態を設定
    setLoadingStates(prev => ({
      ...prev,
      deleting: { ...prev.deleting, [projectId]: true }
    }))
    setError('')
    
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', user.id) // セキュリティのため、user_idも確認
      
      if (error) {
        throw error
      }
      
      // プロジェクトリストから削除
      setProjects(prevProjects => 
        prevProjects.filter(project => project.id !== projectId)
      )
      
      // 成功メッセージを表示
      const successMessage = `✓ プロジェクト「${targetProject.title}」を削除しました`
      setError('')
      showNotification(successMessage, 'success')
      
      return true
    } catch (error) {
      console.error('プロジェクト削除エラー:', error)
      
      // より詳細なエラーメッセージ
      let errorMessage = 'プロジェクトの削除に失敗しました。'
      if (error.message.includes('permission')) {
        errorMessage = '削除権限がありません。'
      } else if (error.message.includes('network')) {
        errorMessage = 'ネットワークエラーが発生しました。再度お試しください。'
      } else if (error.message.includes('not found')) {
        errorMessage = '削除対象のプロジェクトが見つかりません。'
      }
      
      setError(errorMessage)
      return false
    } finally {
      // 個別の削除ローディング状態をクリア
      setLoadingStates(prev => ({
        ...prev,
        deleting: { ...prev.deleting, [projectId]: false }
      }))
    }
  }

  // ソート処理関数
  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // 表示するプロジェクトデータを取得（ソート＋表示制御）
  const getDisplayProjects = () => {
    const sortedProjects = [...projects].sort((a, b) => {
      let aValue = a[sortConfig.key]
      let bValue = b[sortConfig.key]

      // 数値フィールドの処理
      if (['net_amount', 'customer_amount'].includes(sortConfig.key)) {
        aValue = parseFloat(aValue) || 0
        bValue = parseFloat(bValue) || 0
      }
      
      // 日付フィールドの処理
      if (['submission_date', 'created_at'].includes(sortConfig.key)) {
        aValue = new Date(aValue)
        bValue = new Date(bValue)
      }

      // 計算フィールドの処理
      if (sortConfig.key === 'profit_rate') {
        aValue = parseFloat(calculateProfitRate(a.customer_amount, a.net_amount))
        bValue = parseFloat(calculateProfitRate(b.customer_amount, b.net_amount))
      }

      if (sortConfig.key === 'days_passed') {
        aValue = calculateDaysPassed(a.submission_date)
        bValue = calculateDaysPassed(b.submission_date)
      }

      // 文字列フィールドの処理（null/undefined対応）
      if (typeof aValue === 'string') {
        aValue = aValue || ''
        bValue = bValue || ''
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })

    // 表示件数制御：全件表示でない場合は直近20件のみ
    return showAllProjects ? sortedProjects : sortedProjects.slice(0, 20)
  }

  // 表示切り替え処理
  const toggleShowAllProjects = () => {
    setShowAllProjects(!showAllProjects)
  }

  // 客先別集計表示切り替え
  const toggleClientView = () => {
    const newShowClientView = !showClientView
    setShowClientView(newShowClientView)
    
    // ビュー切り替え時にフォームを閉じる
    if (showForm) {
      setShowForm(false)
      resetForm()
    }
    
    // 成功メッセージをクリア
    setSuccessMessage('')
    setErrorMessage('')
    
    // エラーメッセージをクリア
    setError('')
    
    // ビュー切り替えの成功フィードバック
    const viewName = newShowClientView ? '客先別集計' : 'プロジェクト一覧'
    const tempMessage = `✓ ${viewName}に切り替えました`
    
    // 一時的な成功メッセージを表示
    const successDiv = document.createElement('div')
    successDiv.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg z-50 view-transition'
    successDiv.textContent = tempMessage
    document.body.appendChild(successDiv)
    
    setTimeout(() => {
      if (document.body.contains(successDiv)) {
        document.body.removeChild(successDiv)
      }
    }, 2000)
  }

  // フォーム表示切り替え
  const toggleForm = () => {
    if (showForm) {
      // フォームを閉じる時は確認
      if (Object.values(formData).some(value => value && value.toString().trim())) {
        if (!window.confirm('入力中のデータが失われますが、よろしいですか？')) {
          return
        }
      }
      // フォームをリセット
      resetForm()
      setSuccessMessage('')
    } else {
      // フォームを開く時はリセット
      resetForm()
      setSuccessMessage('')
    }
    setShowForm(!showForm)
  }

  // フォーム入力処理
  const handleFormChange = (e) => {
    const { name, value } = e.target
    
    // 金額フィールドの自動カンマ区切りフォーマット
    if (name === 'net_amount' || name === 'customer_amount') {
      // 数字のみ抽出（全角数字も半角に変換）
      const numericValue = value
        .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
        .replace(/[^\d]/g, '')
      
      // 空文字の場合はそのまま
      if (numericValue === '') {
        setFormData(prev => ({ ...prev, [name]: '' }))
      } else {
        // カンマ区切りフォーマット（最大桁数制限：10桁）
        const number = parseInt(numericValue.slice(0, 10), 10)
        const formattedValue = number.toLocaleString()
        setFormData(prev => ({ ...prev, [name]: formattedValue }))
      }
    } else {
      // その他のフィールドは通常の処理（入力中はtrimしない）
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    
    // エラーをクリア
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
      // 全てのフィールドエラーがクリアされた場合、総合エラーメッセージもクリア
      const remainingErrors = Object.keys(formErrors).filter(key => key !== name && formErrors[key])
      if (remainingErrors.length === 0) {
        setErrorMessage('')
      }
    }
  }

  // フォーム検証
  const validateForm = () => {
    const errors = {}
    
    // 必須フィールドの検証
    if (!formData.client.trim()) {
      errors.client = '客先は必須です'
    } else if (formData.client.trim().length > 100) {
      errors.client = '客先名は100文字以内で入力してください'
    }
    
    if (!formData.title.trim()) {
      errors.title = '件名は必須です'
    } else if (formData.title.trim().length > 200) {
      errors.title = '件名は200文字以内で入力してください'
    }
    
    if (!formData.net_amount.trim()) {
      errors.net_amount = 'ネット金額は必須です'
    } else {
      const numericValue = parseFloat(formData.net_amount.replace(/,/g, ''))
      if (isNaN(numericValue) || numericValue <= 0) {
        errors.net_amount = 'ネット金額は正の数値を入力してください'
      } else if (numericValue > 9999999999) {
        errors.net_amount = 'ネット金額は99億円以下で入力してください'
      }
    }
    
    if (!formData.customer_amount.trim()) {
      errors.customer_amount = '客出金額は必須です'
    } else {
      const numericValue = parseFloat(formData.customer_amount.replace(/,/g, ''))
      if (isNaN(numericValue) || numericValue <= 0) {
        errors.customer_amount = '客出金額は正の数値を入力してください'
      } else if (numericValue > 9999999999) {
        errors.customer_amount = '客出金額は99億円以下で入力してください'
      }
    }
    
    if (!formData.submission_date) {
      errors.submission_date = '提出日は必須です'
    } else {
      const submissionDate = new Date(formData.submission_date)
      const today = new Date()
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(today.getFullYear() - 1)
      const oneYearLater = new Date()
      oneYearLater.setFullYear(today.getFullYear() + 1)
      
      if (submissionDate < oneYearAgo || submissionDate > oneYearLater) {
        errors.submission_date = '提出日は1年前から1年後の範囲で入力してください'
      }
    }
    
    // 任意フィールドの文字数制限
    if (formData.project_number && formData.project_number.length > 50) {
      errors.project_number = '工事番号は50文字以内で入力してください'
    }
    
    if (formData.construction_manager && formData.construction_manager.length > 50) {
      errors.construction_manager = '工事担当者は50文字以内で入力してください'
    }
    
    if (formData.sales_manager && formData.sales_manager.length > 50) {
      errors.sales_manager = '営業担当者は50文字以内で入力してください'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // フォーム送信処理
  const handleFormSubmit = async (e) => {
    e.preventDefault()
    
    // 検証実行
    if (!validateForm()) {
      // エラーメッセージを表示
      setSuccessMessage('')
      const errorCount = Object.keys(formErrors).length
      setErrorMessage(`❌ 入力エラーが${errorCount}件あります。赤枠のフィールドを確認してください。`)
      
      // 最初のエラーフィールドにフォーカス
      setTimeout(() => {
        const firstErrorField = Object.keys(formErrors)[0]
        if (firstErrorField) {
          const element = document.getElementById(firstErrorField)
          if (element) {
            element.focus()
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      }, 100)
      return
    }
    
    // 送信前の最終データ準備
    const projectData = {
      project_number: formData.project_number.trim() || null,
      client: formData.client.trim(),
      title: formData.title.trim(),
      construction_manager: formData.construction_manager.trim() || null,
      sales_manager: formData.sales_manager.trim() || null,
      net_amount: parseFloat(formData.net_amount.replace(/,/g, '')),
      customer_amount: parseFloat(formData.customer_amount.replace(/,/g, '')),
      submission_date: formData.submission_date
    }
    
    // データ保存実行
    const success = await createProject(projectData)
    
    if (success) {
      // 成功メッセージを表示
      setSuccessMessage('✓ 保存しました')
      setErrorMessage('')
      
      // フォームをクリア
      resetForm()
      
      // フォームを上部にスクロール（成功メッセージを見やすくする）
      const formElement = document.querySelector('form')
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      
      // 3秒後にメッセージを消去してフォームを閉じる
      setTimeout(() => {
        setSuccessMessage('')
        setShowForm(false)
        
        // テーブルの上部にスクロール（新しく追加されたプロジェクトを見やすくする）
        const tableElement = document.querySelector('table')
        if (tableElement) {
          tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 3000)
    } else {
      // 保存失敗時の処理
      setSuccessMessage('')
    }
  }

  // フォームリセット関数
  const resetForm = () => {
    setFormData({
      project_number: '',
      client: '',
      title: '',
      construction_manager: '',
      sales_manager: '',
      net_amount: '',
      customer_amount: '',
      submission_date: new Date().toISOString().split('T')[0]
    })
    setFormErrors({})
    setErrorMessage('')
  }

  // ソートアイコンを表示する関数
  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <span className="text-gray-400 ml-1">↕️</span>
    }
    return sortConfig.direction === 'asc' ? 
      <span className="text-blue-600 ml-1">↑</span> : 
      <span className="text-blue-600 ml-1">↓</span>
  }

  // 客先別集計データの計算
  const calculateClientAggregation = () => {
    const clientMap = new Map()
    
    projects.forEach(project => {
      const client = project.client
      const netAmount = parseFloat(project.net_amount) || 0
      const customerAmount = parseFloat(project.customer_amount) || 0
      
      if (clientMap.has(client)) {
        const existing = clientMap.get(client)
        existing.projectCount += 1
        existing.totalNetAmount += netAmount
        existing.totalCustomerAmount += customerAmount
        existing.profitRates.push(parseFloat(calculateProfitRate(customerAmount, netAmount)))
      } else {
        clientMap.set(client, {
          client,
          projectCount: 1,
          totalNetAmount: netAmount,
          totalCustomerAmount: customerAmount,
          profitRates: [parseFloat(calculateProfitRate(customerAmount, netAmount))]
        })
      }
    })
    
    // 平均利益率を計算してソート
    const clientData = Array.from(clientMap.values()).map(data => ({
      ...data,
      averageProfitRate: data.profitRates.reduce((sum, rate) => sum + rate, 0) / data.profitRates.length
    }))
    
    // 客出金額の多い順でソート
    return clientData.sort((a, b) => b.totalCustomerAmount - a.totalCustomerAmount)
  }

  // Excelインポート機能
  const handleFileImport = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // ファイル形式チェック
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      alert('Excelファイル（.xlsx または .xls）を選択してください。')
      return
    }

    setIsImporting(true)
    setImportResults(null)

    try {
      // ファイル読み込み
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      if (jsonData.length === 0) {
        throw new Error('インポートするデータがありません。')
      }

      // データ検証とマッピング
      const validProjects = []
      const errors = []

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i]
        const rowNumber = i + 2 // Excelの行番号（ヘッダー行を考慮）

        try {
          // 必須フィールドチェック
          if (!row['客先'] || !row['件名'] || !row['ネット金額'] || !row['客出金額'] || !row['提出日']) {
            errors.push(`行${rowNumber}: 必須フィールド（客先、件名、ネット金額、客出金額、提出日）が不足しています。`)
            continue
          }

          // 金額の検証
          const netAmount = parseFloat(String(row['ネット金額']).replace(/[,¥]/g, ''))
          const customerAmount = parseFloat(String(row['客出金額']).replace(/[,¥]/g, ''))

          if (isNaN(netAmount) || netAmount <= 0) {
            errors.push(`行${rowNumber}: ネット金額が無効です。`)
            continue
          }

          if (isNaN(customerAmount) || customerAmount <= 0) {
            errors.push(`行${rowNumber}: 客出金額が無効です。`)
            continue
          }

          // 日付の検証
          let submissionDate
          if (row['提出日'] instanceof Date) {
            submissionDate = row['提出日'].toISOString().split('T')[0]
          } else {
            const dateStr = String(row['提出日'])
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
              submissionDate = dateStr
            } else if (dateStr.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
              const parts = dateStr.split('/')
              submissionDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
            } else {
              errors.push(`行${rowNumber}: 提出日の形式が無効です（YYYY-MM-DD または YYYY/MM/DD 形式で入力してください）。`)
              continue
            }
          }

          // プロジェクトデータ作成
          const projectData = {
            project_number: row['工事番号'] || null,
            client: String(row['客先']).trim(),
            title: String(row['件名']).trim(),
            construction_manager: row['工事担当者'] ? String(row['工事担当者']).trim() : null,
            sales_manager: row['営業担当者'] ? String(row['営業担当者']).trim() : null,
            net_amount: netAmount,
            customer_amount: customerAmount,
            submission_date: submissionDate,
            user_id: user.id
          }

          validProjects.push(projectData)

        } catch (error) {
          errors.push(`行${rowNumber}: データ処理エラー - ${error.message}`)
        }
      }

      // エラーがある場合は確認
      if (errors.length > 0) {
        const errorMessage = `以下のエラーがあります:\n\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? `\n\n...他${errors.length - 10}件のエラー` : ''}\n\n有効なデータ（${validProjects.length}件）のみをインポートしますか？`
        
        if (validProjects.length === 0) {
          alert(`インポートできるデータがありません。\n\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...他${errors.length - 5}件のエラー` : ''}`)
          return
        }

        if (!confirm(errorMessage)) {
          return
        }
      }

      // 重複チェック（客先+件名+提出日で判定）
      const duplicates = []
      for (const newProject of validProjects) {
        const isDuplicate = projects.some(existingProject => 
          existingProject.client === newProject.client &&
          existingProject.title === newProject.title &&
          existingProject.submission_date === newProject.submission_date
        )
        if (isDuplicate) {
          duplicates.push(`${newProject.client} - ${newProject.title}`)
        }
      }

      if (duplicates.length > 0) {
        const duplicateMessage = `以下のプロジェクトは既に存在します:\n\n${duplicates.slice(0, 5).join('\n')}${duplicates.length > 5 ? `\n...他${duplicates.length - 5}件` : ''}\n\n重複を含めてインポートしますか？`
        
        if (!confirm(duplicateMessage)) {
          return
        }
      }

      // Supabaseに一括保存
      const { data: insertedData, error } = await supabase
        .from('projects')
        .insert(validProjects)
        .select()

      if (error) {
        throw error
      }

      // 成功処理
      const importedCount = insertedData.length
      setImportResults({
        success: true,
        imported: importedCount,
        errors: errors.length,
        duplicates: duplicates.length
      })

      // プロジェクト一覧を更新
      await fetchProjects()

      // 成功メッセージ
      const successMessage = `✓ ${importedCount}件のプロジェクトをインポートしました${errors.length > 0 ? `（${errors.length}件のエラーをスキップ）` : ''}`
      showNotification(successMessage, 'success', 5000)

    } catch (error) {
      console.error('Excelインポートエラー:', error)
      
      let errorMessage = 'Excelファイルのインポートに失敗しました。'
      if (error.message.includes('network')) {
        errorMessage = 'ネットワークエラーが発生しました。再度お試しください。'
      } else if (error.message.includes('permission')) {
        errorMessage = 'データ保存権限がありません。'
      } else if (error.message) {
        errorMessage = `インポートエラー: ${error.message}`
      }
      
      showNotification(errorMessage, 'error', 5000)
      setImportResults({
        success: false,
        error: errorMessage
      })
    } finally {
      setIsImporting(false)
      // ファイル入力をリセット
      event.target.value = ''
    }
  }

  // Excelエクスポート機能
  const exportToExcel = async () => {
    if (projects.length === 0) {
      alert('エクスポートするデータがありません。')
      return
    }

    setIsExporting(true)

    // エクスポート処理中の表示
    const loadingDiv = document.createElement('div')
    loadingDiv.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg z-50'
    loadingDiv.textContent = '⏳ Excelファイルを作成中...'
    document.body.appendChild(loadingDiv)

    try {
      // 少し待機してローディング表示を見せる
      await new Promise(resolve => setTimeout(resolve, 500))
      // エクスポート用データの準備
      const exportData = projects.map(project => {
        const profitRate = calculateProfitRate(project.customer_amount, project.net_amount)
        const daysPassed = calculateDaysPassed(project.submission_date)
        
        return {
          '工事番号': project.project_number || '',
          '客先': project.client,
          '件名': project.title,
          '工事担当者': project.construction_manager || '',
          '営業担当者': project.sales_manager || '',
          'ネット金額': parseFloat(project.net_amount) || 0,
          '客出金額': parseFloat(project.customer_amount) || 0,
          '利益率(%)': parseFloat(profitRate),
          '提出日': project.submission_date,
          '経過日数': daysPassed,
          '作成日時': new Date(project.created_at).toLocaleString('ja-JP')
        }
      })

      // ワークブックとワークシートを作成
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(exportData)

      // 列幅を自動調整
      const columnWidths = [
        { wch: 15 }, // 工事番号
        { wch: 20 }, // 客先
        { wch: 30 }, // 件名
        { wch: 15 }, // 工事担当者
        { wch: 15 }, // 営業担当者
        { wch: 15 }, // ネット金額
        { wch: 15 }, // 客出金額
        { wch: 10 }, // 利益率
        { wch: 12 }, // 提出日
        { wch: 10 }, // 経過日数
        { wch: 20 }  // 作成日時
      ]
      worksheet['!cols'] = columnWidths

      // ワークシートをワークブックに追加
      XLSX.utils.book_append_sheet(workbook, worksheet, 'プロジェクト一覧')

      // 統計サマリーシートを作成
      const stats = calculateStats()
      const summaryData = [
        { '項目': '登録案件数', '値': `${stats.totalProjects}件` },
        { '項目': '合計ネット金額', '値': formatCurrency(stats.totalNetAmount) },
        { '項目': '合計客出金額', '値': formatCurrency(stats.totalCustomerAmount) },
        { '項目': 'エクスポート日時', '値': new Date().toLocaleString('ja-JP') }
      ]
      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData)
      summaryWorksheet['!cols'] = [{ wch: 20 }, { wch: 20 }]
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, '統計サマリー')

      // 客先別集計シートを作成
      const clientData = calculateClientAggregation().map(data => ({
        '客先': data.client,
        '案件数': `${data.projectCount}件`,
        '合計ネット金額': data.totalNetAmount,
        '合計客出金額': data.totalCustomerAmount,
        '平均利益率(%)': parseFloat(data.averageProfitRate.toFixed(1))
      }))
      
      if (clientData.length > 0) {
        const clientWorksheet = XLSX.utils.json_to_sheet(clientData)
        clientWorksheet['!cols'] = [
          { wch: 20 }, // 客先
          { wch: 10 }, // 案件数
          { wch: 15 }, // 合計ネット金額
          { wch: 15 }, // 合計客出金額
          { wch: 12 }  // 平均利益率
        ]
        XLSX.utils.book_append_sheet(workbook, clientWorksheet, '客先別集計')
      }

      // ファイル名を生成（YYYY-MM-DD形式）
      const today = new Date()
      const dateString = today.toISOString().split('T')[0]
      const fileName = `工事見積管理_${dateString}.xlsx`

      // ファイルをダウンロード
      XLSX.writeFile(workbook, fileName)

      // ローディング表示を削除
      if (document.body.contains(loadingDiv)) {
        document.body.removeChild(loadingDiv)
      }

      // 成功メッセージを表示
      const successDiv = document.createElement('div')
      successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50'
      successDiv.textContent = `✓ ${fileName} をダウンロードしました`
      document.body.appendChild(successDiv)
      
      setTimeout(() => {
        if (document.body.contains(successDiv)) {
          document.body.removeChild(successDiv)
        }
      }, 3000)

    } catch (error) {
      console.error('Excelエクスポートエラー:', error)
      
      // ローディング表示を削除
      if (document.body.contains(loadingDiv)) {
        document.body.removeChild(loadingDiv)
      }
      
      // エラーメッセージを表示
      const errorDiv = document.createElement('div')
      errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50'
      errorDiv.textContent = '❌ Excelファイルのエクスポートに失敗しました'
      document.body.appendChild(errorDiv)
      
      setTimeout(() => {
        if (document.body.contains(errorDiv)) {
          document.body.removeChild(errorDiv)
        }
      }, 3000)
    } finally {
      setIsExporting(false)
    }
  }

  // 統計計算関数
  const calculateStats = () => {
    const totalProjects = projects.length
    const totalNetAmount = projects.reduce((sum, project) => {
      return sum + (parseFloat(project.net_amount) || 0)
    }, 0)
    const totalCustomerAmount = projects.reduce((sum, project) => {
      return sum + (parseFloat(project.customer_amount) || 0)
    }, 0)

    return {
      totalProjects,
      totalNetAmount,
      totalCustomerAmount
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {!user ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
            <h1 className="text-2xl font-bold text-center mb-6">工事見積管理システム</h1>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="example@email.com"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  パスワード
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="パスワードを入力"
                />
              </div>

              {authError && (
                <div className="text-red-600 text-sm text-center">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {authLoading ? 'ログイン中...' : 'ログイン'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50 flex flex-col">
          {/* ヘッダー */}
          <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                {/* ロゴ・タイトル */}
                <div className="flex items-center">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 hover:text-blue-600 header-title cursor-pointer">
                    工事見積管理システム
                  </h1>
                </div>

                {/* ユーザー情報とログアウト */}
                <div className="flex items-center space-x-2 sm:space-x-4">
                  {/* ユーザーメール表示 */}
                  <div className="hidden sm:flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center user-avatar cursor-pointer">
                      <span className="text-blue-600 font-semibold text-sm">
                        {user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-gray-700 font-medium text-sm lg:text-base">
                      {user.email}
                    </span>
                  </div>

                  {/* モバイル用ユーザーアイコン */}
                  <div className="sm:hidden w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center user-avatar cursor-pointer">
                    <span className="text-blue-600 font-semibold text-sm">
                      {user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* ログアウトボタン */}
                  <button
                    onClick={handleLogout}
                    className="bg-red-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 btn-logout"
                  >
                    <span className="hidden sm:inline">ログアウト</span>
                    <span className="sm:hidden">出</span>
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* メインコンテンツ */}
          <main className="flex-1 bg-gray-50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              {/* 統計サマリー */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 view-transition">
                {(() => {
                  const stats = calculateStats()
                  return (
                    <>
                      {/* 登録案件数 */}
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 stats-card" role="region" aria-label="登録案件数統計">
                        <div className="flex items-center">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 stats-icon">
                            <span className="text-blue-600 text-lg sm:text-xl font-bold">📋</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">登録案件数</p>
                            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalProjects}件</p>
                          </div>
                        </div>
                      </div>

                      {/* 合計ネット金額 */}
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 stats-card" role="region" aria-label="合計ネット金額統計">
                        <div className="flex items-center">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 stats-icon">
                            <span className="text-green-600 text-lg sm:text-xl font-bold">💰</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">合計ネット金額</p>
                            <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{formatCurrency(stats.totalNetAmount)}</p>
                          </div>
                        </div>
                      </div>

                      {/* 合計客出金額 */}
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 stats-card" role="region" aria-label="合計客出金額統計">
                        <div className="flex items-center">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 stats-icon">
                            <span className="text-purple-600 text-lg sm:text-xl font-bold">💸</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">合計客出金額</p>
                            <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{formatCurrency(stats.totalCustomerAmount)}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>

              {/* プロジェクト一覧テーブル / 客先別集計テーブル */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* テーブルヘッダー */}
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800 mb-1">
                        {showClientView ? '客先別集計' : 'プロジェクト一覧'}
                      </h2>
                      {!showClientView && (
                        <p className="text-xs text-gray-500">
                          🟢高利益(120%+) 🔵標準(100-119%) 🔴低利益(100%未満) | 🟢新規(14日以内) 🟡注意(15-30日) 🔴要対応(30日超)
                        </p>
                      )}
                      {showClientView && (
                        <p className="text-xs text-gray-500">
                          客先別の案件数、金額、平均利益率を表示（客出金額の多い順）
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 no-print">
                      {/* 登録ボタン */}
                      <button
                        onClick={toggleForm}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                          showForm 
                            ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500' 
                            : 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500'
                        } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                        aria-label={showForm ? 'プロジェクト登録をキャンセル' : '新規プロジェクト登録フォームを開く'}
                        aria-expanded={showForm}
                      >
                        {showForm ? 'キャンセル' : '登録'}
                      </button>

                      {/* 客先別集計表示ボタン */}
                      <button
                        onClick={toggleClientView}
                        className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium display-toggle-btn transition-all duration-200 ${
                          showClientView 
                            ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-md' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          showClientView ? 'focus:ring-orange-500' : 'focus:ring-indigo-500'
                        }`}
                        title={`${showClientView ? 'プロジェクト一覧に戻る' : '客先別の集計データを表示'} (Ctrl+Shift+V)`}
                      >
                        <span className="mr-1">
                          {showClientView ? '📋' : '📊'}
                        </span>
                        {showClientView ? 'プロジェクト一覧' : '客先別集計表示'}
                      </button>

                      {/* 表示切り替えボタン（プロジェクト一覧時のみ表示） */}
                      {!showClientView && (
                        <button
                          onClick={toggleShowAllProjects}
                          className={`px-3 py-2 rounded-md text-sm font-medium display-toggle-btn ${
                            showAllProjects 
                              ? 'bg-green-600 text-white hover:bg-green-700' 
                              : 'bg-gray-600 text-white hover:bg-gray-700'
                          } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            showAllProjects ? 'focus:ring-green-500' : 'focus:ring-gray-500'
                          }`}
                        >
                          {showAllProjects ? '直近20件表示' : '全件表示'}
                        </button>
                      )}

                      {/* Excelインポートボタン */}
                      <label className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed import-btn">
                        <span className="mr-1">📥</span>
                        {isImporting ? 'インポート中...' : 'Excelインポート'}
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleFileImport}
                          className="hidden"
                          disabled={isImporting}
                        />
                      </label>

                      {/* Excelエクスポートボタン */}
                      <button
                        onClick={exportToExcel}
                        disabled={dataLoading || projects.length === 0 || isExporting}
                        className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed export-btn"
                        title={projects.length === 0 ? 'エクスポートするデータがありません' : 'プロジェクトデータをExcelファイルでダウンロード'}
                      >
                        <span className="mr-1">📊</span>
                        {isExporting ? 'エクスポート中...' : 'Excelエクスポート'}
                      </button>

                      {/* 手動更新ボタン */}
                      <button
                        onClick={fetchProjects}
                        disabled={dataLoading}
                        className="inline-flex items-center bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed loading-btn"
                      >
                        {dataLoading && (
                          <span className="loading-spinner mr-2">🔄</span>
                        )}
                        {dataLoading ? '更新中...' : '更新'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* エラー・ローディング表示 */}
                {error && (
                  <div className="px-6 py-4 bg-red-50 border-b border-red-200">
                    <p className="text-red-800 text-sm">❌ {error}</p>
                  </div>
                )}

                {dataLoading && (
                  <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-200">
                    <p className="text-yellow-800 text-sm">⏳ データを処理中です...</p>
                  </div>
                )}

                {/* テーブル */}
                <div className="overflow-x-auto table-container">
                  {showClientView ? (
                    /* 客先別集計テーブル */
                    <table className="min-w-full divide-y divide-gray-200 view-transition" role="table" aria-label="客先別集計テーブル">
                      <caption className="sr-only sm:not-sr-only text-sm text-gray-500 py-2 lg:hidden">
                        横スクロールして全ての列を表示できます
                      </caption>
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                            客先
                          </th>
                          <th className="px-2 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                            案件数
                          </th>
                          <th className="px-2 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                            合計ネット金額
                          </th>
                          <th className="px-2 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                            合計客出金額
                          </th>
                          <th className="px-2 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                            平均利益率
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {calculateClientAggregation().length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                              集計データがありません
                            </td>
                          </tr>
                        ) : (
                          calculateClientAggregation().map((clientData, index) => (
                            <tr key={clientData.client} className="table-row">
                              <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 font-medium">
                                {clientData.client}
                              </td>
                              <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 text-right font-medium">
                                {clientData.projectCount}件
                              </td>
                              <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 text-right font-medium">
                                {formatCurrency(clientData.totalNetAmount)}
                              </td>
                              <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 text-right font-medium">
                                {formatCurrency(clientData.totalCustomerAmount)}
                              </td>
                              <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-right">
                                <span className={`inline-flex items-center ${
                                  clientData.averageProfitRate >= 120 ? 'profit-high-bg' : 
                                  clientData.averageProfitRate >= 100 ? 'profit-medium-bg' : 'profit-low-bg'
                                }`}>
                                  {clientData.averageProfitRate >= 120 ? '🟢' : 
                                   clientData.averageProfitRate >= 100 ? '🔵' : '🔴'} {clientData.averageProfitRate.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  ) : (
                    /* プロジェクト一覧テーブル */
                    <table className="min-w-full divide-y divide-gray-200 view-transition" role="table" aria-label="プロジェクト一覧テーブル">
                    {/* モバイル用の注意書き */}
                    <caption className="sr-only sm:not-sr-only text-sm text-gray-500 py-2 lg:hidden">
                      横スクロールして全ての列を表示できます
                    </caption>
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px] cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                          onClick={() => handleSort('project_number')}
                        >
                          <div className="flex items-center">
                            工事番号
                            {getSortIcon('project_number')}
                          </div>
                        </th>
                        <th 
                          className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                          onClick={() => handleSort('client')}
                        >
                          <div className="flex items-center">
                            客先
                            {getSortIcon('client')}
                          </div>
                        </th>
                        <th 
                          className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px] cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                          onClick={() => handleSort('title')}
                        >
                          <div className="flex items-center">
                            件名
                            {getSortIcon('title')}
                          </div>
                        </th>
                        <th 
                          className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                          onClick={() => handleSort('construction_manager')}
                        >
                          <div className="flex items-center">
                            工事担当者
                            {getSortIcon('construction_manager')}
                          </div>
                        </th>
                        <th 
                          className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                          onClick={() => handleSort('sales_manager')}
                        >
                          <div className="flex items-center">
                            営業担当者
                            {getSortIcon('sales_manager')}
                          </div>
                        </th>
                        <th 
                          className="px-2 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                          onClick={() => handleSort('net_amount')}
                        >
                          <div className="flex items-center justify-end">
                            ネット金額
                            {getSortIcon('net_amount')}
                          </div>
                        </th>
                        <th 
                          className="px-2 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                          onClick={() => handleSort('customer_amount')}
                        >
                          <div className="flex items-center justify-end">
                            客出金額
                            {getSortIcon('customer_amount')}
                          </div>
                        </th>
                        <th 
                          className="px-2 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px] cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                          onClick={() => handleSort('profit_rate')}
                        >
                          <div className="flex items-center justify-end">
                            利益率
                            {getSortIcon('profit_rate')}
                          </div>
                        </th>
                        <th 
                          className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                          onClick={() => handleSort('submission_date')}
                        >
                          <div className="flex items-center">
                            提出日
                            {getSortIcon('submission_date')}
                          </div>
                        </th>
                        <th 
                          className="px-2 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px] cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                          onClick={() => handleSort('days_passed')}
                        >
                          <div className="flex items-center justify-end">
                            経過日数
                            {getSortIcon('days_passed')}
                          </div>
                        </th>
                        <th className="px-2 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[60px]">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getDisplayProjects().length === 0 ? (
                        <tr>
                          <td colSpan="11" className="px-4 py-8 text-center text-gray-500">
                            {projects.length === 0 
                              ? 'プロジェクトが登録されていません' 
                              : 'フィルター条件に一致するプロジェクトがありません'
                            }
                          </td>
                        </tr>
                      ) : (
                        getDisplayProjects().map((project) => {
                          const profitRate = calculateProfitRate(project.customer_amount, project.net_amount)
                          const daysPassed = calculateDaysPassed(project.submission_date)
                          
                          return (
                            <tr key={project.id} className="table-row">
                              <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                {project.project_number || '-'}
                              </td>
                              <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 font-medium">
                                {project.client}
                              </td>
                              <td className="px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 max-w-[150px] sm:max-w-xs truncate" title={project.title}>
                                {project.title}
                              </td>
                              <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                {project.construction_manager || '-'}
                              </td>
                              <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                {project.sales_manager || '-'}
                              </td>
                              <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 text-right font-medium">
                                {formatCurrency(project.net_amount)}
                              </td>
                              <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 text-right font-medium">
                                {formatCurrency(project.customer_amount)}
                              </td>
                              <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-right">
                                <span className={`inline-flex items-center ${
                                  parseFloat(profitRate) >= 120 ? 'profit-high-bg' : 
                                  parseFloat(profitRate) >= 100 ? 'profit-medium-bg' : 'profit-low-bg'
                                }`}>
                                  {parseFloat(profitRate) >= 120 ? '🟢' : 
                                   parseFloat(profitRate) >= 100 ? '🔵' : '🔴'} {profitRate}%
                                </span>
                              </td>
                              <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                {new Date(project.submission_date).toLocaleDateString('ja-JP')}
                              </td>
                              <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-right">
                                <span className={`inline-flex items-center ${
                                  daysPassed <= 14 ? 'days-recent-bg' : 
                                  daysPassed <= 30 ? 'days-medium-bg' : 'days-old-bg'
                                }`}>
                                  {daysPassed <= 14 ? '🟢' : 
                                   daysPassed <= 30 ? '🟡' : '🔴'} {daysPassed}日
                                </span>
                              </td>
                              <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-center">
                                <button
                                  onClick={() => deleteProject(project.id)}
                                  disabled={loadingStates.deleting[project.id]}
                                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed delete-btn transition-all duration-200"
                                  title={`プロジェクト「${project.title}」を削除`}
                                >
                                  {loadingStates.deleting[project.id] && (
                                    <span className="loading-spinner mr-1">🔄</span>
                                  )}
                                  {!loadingStates.deleting[project.id] && (
                                    <span className="mr-1">🗑️</span>
                                  )}
                                  {loadingStates.deleting[project.id] ? '削除中...' : '削除'}
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                  )}
                </div>

                {/* テーブルフッター */}
                {projects.length > 0 && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="mb-2 sm:mb-0">
                        {showClientView ? (
                          <p className="text-sm text-gray-600">
                            {calculateClientAggregation().length} 社の客先を表示中（全 {projects.length} 件のプロジェクトから集計）
                          </p>
                        ) : (
                          <>
                            <p className="text-sm text-gray-600">
                              {showAllProjects 
                                ? `全 ${projects.length} 件のプロジェクトを表示中`
                                : `直近 ${Math.min(20, projects.length)} 件を表示中（全 ${projects.length} 件）`
                              }
                            </p>
                            {!showAllProjects && projects.length > 20 && (
                              <p className="text-xs text-amber-600 mt-1">
                                💡 「全件表示」ボタンで全てのプロジェクトを表示できます
                              </p>
                            )}
                          </>
                        )}
                      </div>
                      {!showClientView && (
                        <p className="text-xs text-gray-500">
                          ソート: {sortConfig.key === 'created_at' ? '作成日時' : 
                                  sortConfig.key === 'project_number' ? '工事番号' :
                                  sortConfig.key === 'client' ? '客先' :
                                  sortConfig.key === 'title' ? '件名' :
                                  sortConfig.key === 'construction_manager' ? '工事担当者' :
                                  sortConfig.key === 'sales_manager' ? '営業担当者' :
                                  sortConfig.key === 'net_amount' ? 'ネット金額' :
                                  sortConfig.key === 'customer_amount' ? '客出金額' :
                                  sortConfig.key === 'profit_rate' ? '利益率' :
                                  sortConfig.key === 'submission_date' ? '提出日' :
                                  sortConfig.key === 'days_passed' ? '経過日数' : sortConfig.key} 
                          ({sortConfig.direction === 'asc' ? '昇順' : '降順'})
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 新規プロジェクト登録フォーム */}
              {showForm && (
                <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">新規プロジェクト登録</h3>
                  </div>
                  
                  {/* 成功メッセージ */}
                  {successMessage && (
                    <div className="px-6 py-4 bg-green-50 border-b border-green-200">
                      <p className="text-green-800 text-sm font-medium">{successMessage}</p>
                    </div>
                  )}

                  {/* エラーメッセージ */}
                  {errorMessage && (
                    <div className="px-6 py-4 bg-red-50 border-b border-red-200">
                      <p className="text-red-800 text-sm font-medium">{errorMessage}</p>
                    </div>
                  )}

                  <form onSubmit={handleFormSubmit} className="p-6" role="form" aria-label="新規プロジェクト登録フォーム">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* 工事番号 */}
                      <div>
                        <label htmlFor="project_number" className="block text-sm font-medium text-gray-700 mb-1">
                          工事番号 <span className="text-gray-400">(任意)</span>
                        </label>
                        <input
                          type="text"
                          id="project_number"
                          name="project_number"
                          value={formData.project_number}
                          onChange={handleFormChange}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                            formErrors.project_number ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="例: P2024-001"
                        />
                        {formErrors.project_number && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.project_number}</p>
                        )}
                      </div>

                      {/* 客先 */}
                      <div>
                        <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-1">
                          客先 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="client"
                          name="client"
                          value={formData.client}
                          onChange={handleFormChange}
                          required
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                            formErrors.client ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="例: 株式会社サンプル"
                        />
                        {formErrors.client && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.client}</p>
                        )}
                      </div>

                      {/* 件名 */}
                      <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                          件名 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="title"
                          name="title"
                          value={formData.title}
                          onChange={handleFormChange}
                          required
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                            formErrors.title ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="例: オフィスビル改修工事"
                        />
                        {formErrors.title && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>
                        )}
                      </div>

                      {/* 工事担当者 */}
                      <div>
                        <label htmlFor="construction_manager" className="block text-sm font-medium text-gray-700 mb-1">
                          工事担当者 <span className="text-gray-400">(任意)</span>
                        </label>
                        <input
                          type="text"
                          id="construction_manager"
                          name="construction_manager"
                          value={formData.construction_manager}
                          onChange={handleFormChange}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                            formErrors.construction_manager ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="例: 田中太郎"
                        />
                        {formErrors.construction_manager && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.construction_manager}</p>
                        )}
                      </div>

                      {/* 営業担当者 */}
                      <div>
                        <label htmlFor="sales_manager" className="block text-sm font-medium text-gray-700 mb-1">
                          営業担当者 <span className="text-gray-400">(任意)</span>
                        </label>
                        <input
                          type="text"
                          id="sales_manager"
                          name="sales_manager"
                          value={formData.sales_manager}
                          onChange={handleFormChange}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                            formErrors.sales_manager ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="例: 佐藤花子"
                        />
                        {formErrors.sales_manager && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.sales_manager}</p>
                        )}
                      </div>

                      {/* ネット金額 */}
                      <div>
                        <label htmlFor="net_amount" className="block text-sm font-medium text-gray-700 mb-1">
                          ネット金額 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="net_amount"
                          name="net_amount"
                          value={formData.net_amount}
                          onChange={handleFormChange}
                          required
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                            formErrors.net_amount ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="例: 1,000,000"
                        />
                        {formErrors.net_amount && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.net_amount}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          数字を入力すると自動でカンマ区切りになります
                        </p>
                      </div>

                      {/* 客出金額 */}
                      <div>
                        <label htmlFor="customer_amount" className="block text-sm font-medium text-gray-700 mb-1">
                          客出金額 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="customer_amount"
                          name="customer_amount"
                          value={formData.customer_amount}
                          onChange={handleFormChange}
                          required
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                            formErrors.customer_amount ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="例: 1,200,000"
                        />
                        {formErrors.customer_amount && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.customer_amount}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          数字を入力すると自動でカンマ区切りになります
                        </p>
                      </div>

                      {/* 提出日 */}
                      <div>
                        <label htmlFor="submission_date" className="block text-sm font-medium text-gray-700 mb-1">
                          提出日 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          id="submission_date"
                          name="submission_date"
                          value={formData.submission_date}
                          onChange={handleFormChange}
                          required
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                            formErrors.submission_date ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {formErrors.submission_date && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.submission_date}</p>
                        )}
                      </div>
                    </div>

                    {/* フォームボタン */}
                    <div className="mt-6 flex items-center justify-end space-x-3">
                      <button
                        type="button"
                        onClick={toggleForm}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                      >
                        キャンセル
                      </button>
                      <button
                        type="submit"
                        disabled={dataLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {dataLoading ? '保存中...' : '保存'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </main>
        </div>
      )}

      {/* 通知システム */}
      <div className="fixed top-4 right-4 z-50 space-y-2" role="region" aria-label="通知エリア" aria-live="polite">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`px-4 py-2 rounded-md shadow-lg text-white text-sm max-w-sm cursor-pointer transition-all duration-300 ${
              notification.type === 'error' ? 'bg-red-500' :
              notification.type === 'success' ? 'bg-green-500' :
              notification.type === 'warning' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}
            onClick={() => removeNotification(notification.id)}
          >
            <div className="flex items-center justify-between">
              <span>{notification.message}</span>
              <button
                className="ml-2 text-white hover:text-gray-200 focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation()
                  removeNotification(notification.id)
                }}
                aria-label="通知を閉じる"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App