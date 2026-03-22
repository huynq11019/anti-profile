import { ipcMain } from 'electron'
import { IPC_CHANNELS, type Group } from '../../shared/types'
import { GroupRepository } from '../repositories/groupRepo'

const groupRepo = new GroupRepository()

export function setupGroupHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GROUPS_GET_ALL, async () => {
    return groupRepo.list()
  })

  ipcMain.handle(IPC_CHANNELS.GROUPS_CREATE, async (_event, data: Partial<Group>) => {
    return groupRepo.create(data)
  })

  ipcMain.handle(IPC_CHANNELS.GROUPS_UPDATE, async (_event, id: string, data: Partial<Group>) => {
    return groupRepo.update(id, data)
  })

  ipcMain.handle(IPC_CHANNELS.GROUPS_DELETE, async (_event, id: string) => {
    groupRepo.delete(id)
  })
}
