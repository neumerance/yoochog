const STORAGE_KEY = 'yoochog:guest:assumeAdminEligible'

export function readAssumeAdminEligible(): boolean {
  if (typeof localStorage === 'undefined') {
    return false
  }
  return localStorage.getItem(STORAGE_KEY) === '1'
}

export function saveAssumeAdminEligible(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
}
