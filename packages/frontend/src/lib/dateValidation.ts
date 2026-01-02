/**
 * 日時バリデーションユーティリティ
 * 食事記録の日時入力に関するバリデーション関数を提供
 */

/**
 * 指定された日時が未来かどうかをチェック
 * @param dateStr ISO形式またはdatetime-local形式の日時文字列
 * @returns 未来の場合はエラーメッセージ、そうでなければnull
 */
export function validateNotFuture(dateStr: string): string | null {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return '無効な日時形式です';
  }
  if (date > new Date()) {
    return '未来の日時は指定できません';
  }
  return null;
}

/**
 * 現在日時をdatetime-local形式で取得
 * @returns "YYYY-MM-DDTHH:mm" 形式の文字列
 */
export function getCurrentDateTimeLocal(): string {
  return new Date().toISOString().slice(0, 16);
}

/**
 * datetime-local形式からISO形式に変換
 * @param datetimeLocal "YYYY-MM-DDTHH:mm" 形式の文字列
 * @returns ISO 8601形式の文字列
 */
export function toISOString(datetimeLocal: string): string {
  // datetime-local形式でタイムゾーン情報がない場合
  if (!datetimeLocal.includes('Z') && !datetimeLocal.includes('+')) {
    return new Date(datetimeLocal).toISOString();
  }
  return datetimeLocal;
}

/**
 * ISO形式からdatetime-local形式に変換
 * @param isoString ISO 8601形式の文字列
 * @returns "YYYY-MM-DDTHH:mm" 形式の文字列
 */
export function toDateTimeLocal(isoString: string): string {
  const date = new Date(isoString);
  // ローカルタイムゾーンに変換
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
