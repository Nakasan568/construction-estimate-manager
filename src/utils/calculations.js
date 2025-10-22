/**
 * 利益率を計算する関数
 * @param {number} customerAmount - 客出金額
 * @param {number} netAmount - ネット金額
 * @returns {string} 利益率（小数点第1位まで）
 */
export const calculateProfitRate = (customerAmount, netAmount) => {
  if (netAmount === 0 || netAmount === null || netAmount === undefined) {
    return '0.0';
  }
  
  const rate = (customerAmount / netAmount) * 100;
  return rate.toFixed(1);
};

/**
 * 経過日数を計算する関数
 * @param {string|Date} submissionDate - 提出日
 * @returns {number} 経過日数
 */
export const calculateDaysPassed = (submissionDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const submitted = new Date(submissionDate);
  submitted.setHours(0, 0, 0, 0);
  
  const diffTime = today - submitted;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * 金額をフォーマットする関数
 * @param {number} amount - 金額
 * @returns {string} フォーマットされた金額（¥記号とカンマ区切り）
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '¥0';
  }
  
  return `¥${Math.round(Number(amount)).toLocaleString()}`;
};