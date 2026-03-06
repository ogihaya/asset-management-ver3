/**
 * 日付を指定フォーマットで文字列に変換
 * @param date - 日付文字列またはDateオブジェクト
 * @param format - フォーマット（デフォルト: 'short'）
 * @returns フォーマットされた日付文字列
 */
export const formatDate = (
  date: string | Date | null | undefined,
  format: 'full' | 'short' | 'yearMonth' = 'short',
): string => {
  if (!date) {
    return '-';
  }

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return '-';
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  if (format === 'full') {
    return `${year}/${month}/${day}`;
  }

  if (format === 'yearMonth') {
    return d.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
    });
  }

  // short format: yy/MM/dd
  const shortYear = String(year).slice(-2);
  return `${shortYear}/${month}/${day}`;
};

/**
 * プロジェクト期間用の日付フォーマット
 * @param date - 日付文字列またはnull
 * @returns フォーマットされた日付文字列（nullの場合は「現在」）
 */
export const formatProjectDate = (date: string | null): string => {
  if (!date) return '現在';
  return formatDate(date, 'yearMonth');
};
