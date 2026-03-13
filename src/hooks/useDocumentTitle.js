import { useEffect } from 'react'

/**
 * Custom hook to set the document title dynamically.
 * @param {string} title The title to set.
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    const originalTitle = document.title
    document.title = title

    // Optional: restore title on unmount
    return () => {
      document.title = originalTitle
    }
  }, [title])
}
