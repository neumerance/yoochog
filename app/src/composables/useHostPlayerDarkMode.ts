import { ref } from 'vue'

const STORAGE_KEY = 'yoochog-host-player-dark'

function readStored(): boolean {
  if (typeof localStorage === 'undefined') {
    return false
  }
  return localStorage.getItem(STORAGE_KEY) === '1'
}

/** Persisted dark appearance for the host PlayerView right column (aside). */
const isDark = ref(readStored())

export function useHostPlayerDarkMode() {
  function toggle() {
    isDark.value = !isDark.value
    try {
      localStorage.setItem(STORAGE_KEY, isDark.value ? '1' : '0')
    } catch {
      // ignore quota / private mode
    }
  }

  return { isDark, toggle }
}
