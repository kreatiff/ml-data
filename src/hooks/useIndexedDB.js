import { useCallback } from 'react'

const DB_NAME = 'DupleighcatesDB'
const STORE_NAME = 'songs'
const DB_VERSION = 1
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

let dbInstance = null

const getDB = () => {
  if (!dbInstance) {
    dbInstance = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        dbInstance = null // Reset so next call retries
        reject(request.error)
      }
      request.onsuccess = () => resolve(request.result)

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }
    })
  }
  return dbInstance
}

export function useIndexedDB() {
  const saveData = useCallback(async (data) => {
    try {
      const db = await getDB()
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      const cacheEntry = {
        id: 'songs_cache',
        data,
        timestamp: Date.now()
      }

      store.put(cacheEntry)

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
    } catch (error) {
      console.error('Error saving to IndexedDB:', error)
    }
  }, [])

  const loadData = useCallback(async () => {
    try {
      const db = await getDB()
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get('songs_cache')

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const result = request.result

          if (!result) {
            resolve(null)
            return
          }

          const age = Date.now() - result.timestamp

          if (age > CACHE_DURATION) {
            resolve(null)
            return
          }

          resolve(result.data)
        }

        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Error loading from IndexedDB:', error)
      return null
    }
  }, [])

  const clearCache = useCallback(async () => {
    try {
      const db = await getDB()
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      store.delete('songs_cache')

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
    } catch (error) {
      console.error('Error clearing IndexedDB cache:', error)
    }
  }, [])

  return { saveData, loadData, clearCache }
}
