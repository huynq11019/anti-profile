import { ipcMain } from 'electron'
import { IPC_CHANNELS, type BookmarkWriteResult } from '../../shared/types'
import { BookmarkRepository } from '../repositories/bookmarkRepo'

const bookmarkRepo = new BookmarkRepository()

export function setupBookmarkHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.BOOKMARKS_LIST, async (_event, profileId: string) => {
    return bookmarkRepo.list(profileId)
  })

  ipcMain.handle(
    IPC_CHANNELS.BOOKMARKS_ADD,
    async (_event, profileId: string, bookmark: { title: string; url: string; folder?: string }): Promise<BookmarkWriteResult> => {
      try {
        bookmarkRepo.add(profileId, bookmark)
        return { success: true, count: 1 }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, count: 0, error: message }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.BOOKMARKS_DELETE, async (_event, profileId: string, bookmarkId: string): Promise<BookmarkWriteResult> => {
    try {
      bookmarkRepo.delete(profileId, bookmarkId)
      return { success: true, count: 1 }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, count: 0, error: message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.BOOKMARKS_IMPORT_JSON, async (_event, profileId: string, jsonContent: string): Promise<BookmarkWriteResult> => {
    try {
      const count = bookmarkRepo.importJson(profileId, jsonContent)
      return { success: true, count }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, count: 0, error: message }
    }
  })
}
