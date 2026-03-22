import { anonymizeProxy, closeAnonymizedProxy } from 'proxy-chain'
import type { Proxy } from '../../shared/types'

const activeProxyTunnels = new Map<string, string>()

function buildProxyUrl(proxy: Proxy): string {
  const auth = proxy.username
    ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password ?? '')}@`
    : ''

  return `${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`
}

export async function createProxyTunnel(profileId: string, proxy: Proxy): Promise<string> {
  const existingTunnel = activeProxyTunnels.get(profileId)
  if (existingTunnel) {
    await closeAnonymizedProxy(existingTunnel, true)
    activeProxyTunnels.delete(profileId)
  }

  const proxyUrl = buildProxyUrl(proxy)
  const tunnelUrl = await anonymizeProxy(proxyUrl)
  activeProxyTunnels.set(profileId, tunnelUrl)
  return tunnelUrl
}

export async function closeProxyTunnel(profileId: string): Promise<void> {
  const tunnelUrl = activeProxyTunnels.get(profileId)
  if (!tunnelUrl) {
    return
  }

  await closeAnonymizedProxy(tunnelUrl, true)
  activeProxyTunnels.delete(profileId)
}

export function getProxyTunnel(profileId: string): string | undefined {
  return activeProxyTunnels.get(profileId)
}

export async function closeAllProxyTunnels(): Promise<void> {
  const entries = Array.from(activeProxyTunnels.entries())

  for (const [profileId, tunnelUrl] of entries) {
    await closeAnonymizedProxy(tunnelUrl, true)
    activeProxyTunnels.delete(profileId)
  }
}
