/**
 * Loads the official YouTube IFrame API script at most once per full page load
 * and resolves when `YT.Player` is available.
 */
let loadPromise: Promise<typeof YT> | null = null

const IFRAME_API_SRC = 'https://www.youtube.com/iframe_api'

function hasExistingScript(): boolean {
  return Boolean(
    document.querySelector(`script[src="${IFRAME_API_SRC}"]`),
  )
}

function isApiReady(): boolean {
  return Boolean(
    typeof window !== 'undefined' && window.YT?.Player,
  )
}

export function loadYouTubeIframeApi(): Promise<typeof YT> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('loadYouTubeIframeApi requires a browser environment'))
  }

  if (isApiReady()) {
    return Promise.resolve(window.YT)
  }

  if (loadPromise) {
    return loadPromise
  }

  loadPromise = new Promise((resolve, reject) => {
    const finish = () => {
      if (isApiReady()) {
        resolve(window.YT)
        return
      }
      reject(new Error('YouTube IFrame API loaded but YT.Player is missing'))
    }

    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = function onYouTubeIframeAPIReady() {
      if (typeof previous === 'function') {
        previous.call(window)
      }
      finish()
    }

    if (!hasExistingScript()) {
      const tag = document.createElement('script')
      tag.src = IFRAME_API_SRC
      const firstScript = document.getElementsByTagName('script')[0]
      firstScript?.parentNode?.insertBefore(tag, firstScript)
    }

    queueMicrotask(() => {
      if (isApiReady()) {
        finish()
      }
    })
  })

  return loadPromise
}
