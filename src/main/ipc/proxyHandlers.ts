import { ipcMain } from 'electron'
import { IPC_CHANNELS, type Proxy } from '../../shared/types'
import { ProxyRepository } from '../repositories/proxyRepo'

const proxyRepo = new ProxyRepository()

export function setupProxyHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.PROXIES_GET_ALL, async () => {
    return proxyRepo.list()
  })

  ipcMain.handle(IPC_CHANNELS.PROXIES_CREATE, async (_event, data: Partial<Proxy>) => {
    return proxyRepo.create(data)
  })

  ipcMain.handle(IPC_CHANNELS.PROXIES_UPDATE, async (_event, id: string, data: Partial<Proxy>) => {
    return proxyRepo.update(id, data)
  })

  ipcMain.handle(IPC_CHANNELS.PROXIES_DELETE, async (_event, id: string) => {
    proxyRepo.delete(id)
  })
}
