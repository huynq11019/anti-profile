import type { ChildProcess } from 'child_process'

const processMap = new Map<string, ChildProcess>()

export function setProfileProcess(profileId: string, child: ChildProcess): void {
  processMap.set(profileId, child)
}

export function getProfileProcess(profileId: string): ChildProcess | undefined {
  return processMap.get(profileId)
}

export function hasRunningProfileProcess(profileId: string): boolean {
  const child = processMap.get(profileId)
  return Boolean(child && child.exitCode === null && !child.killed)
}

export function removeProfileProcess(profileId: string): void {
  processMap.delete(profileId)
}

export function getRunningProfileCount(): number {
  let count = 0

  for (const child of processMap.values()) {
    if (child.exitCode === null && !child.killed) {
      count += 1
    }
  }

  return count
}
