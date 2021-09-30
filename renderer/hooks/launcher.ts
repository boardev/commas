import { shell, ipcRenderer } from 'electron'
import { memoize } from 'lodash-es'
import { quote } from 'shell-quote'
import { unref } from 'vue'
import type { Launcher } from '../../typings/launcher'
import type { TerminalTab } from '../../typings/terminal'
import { injectIPC } from '../utils/hooks'
import { getLauncherCommand } from '../utils/launcher'
import { resolveHome } from '../utils/terminal'
import { useSettings } from './settings'
import {
  useTerminalTabs,
  createTerminalTab,
  activateTerminalTab,
  executeTerminalTab,
} from './terminal'

export const useLaunchers = memoize(() => {
  return injectIPC<Launcher[]>('launchers', [])
})

export function getTerminalTabByLauncher(launcher: Launcher) {
  const tabs = unref(useTerminalTabs())
  return tabs.find(tab => tab.launcher === launcher.id)
}

export function getLauncherByTerminalTab(tab: TerminalTab) {
  const launchers = unref(useLaunchers())
  return launchers.find(launcher => tab.launcher === launcher.id)
}

interface OpenLauncherOptions {
  command?: string,
}

export async function openLauncher(launcher: Launcher, { command }: OpenLauncherOptions = {}) {
  const tab = getTerminalTabByLauncher(launcher)
  if (tab) {
    activateTerminalTab(tab)
    if (command) {
      executeTerminalTab(tab, command, true)
    }
  } else {
    const directory = launcher.remote ? undefined : launcher.directory
    await createTerminalTab({
      cwd: directory && resolveHome(directory),
      launcher: launcher.id,
      command,
    })
  }
}

export async function startLauncher(launcher: Launcher) {
  const settings = unref(useSettings())
  const shellPath = settings['terminal.shell.path']
  return openLauncher(launcher, {
    command: getLauncherCommand(launcher, shellPath),
  })
}

export async function runLauncherScript(launcher: Launcher, index: number) {
  const settings = unref(useSettings())
  const shellPath = settings['terminal.shell.path']
  return openLauncher(launcher, {
    command: getLauncherCommand({
      ...launcher,
      ...launcher.scripts![index],
    }, shellPath),
  })
}

export async function startLauncherExternally(launcher: Launcher) {
  if (!launcher.directory) return
  const directory = resolveHome(launcher.directory)
  const settings = unref(useSettings())
  let explorer = settings['terminal.external.explorer']
  if (!explorer) {
    return shell.openPath(directory)
  }
  if (!Array.isArray(explorer)) {
    // Use applications on macOS by default
    if (process.platform === 'darwin') {
      explorer = ['open', '-a', explorer]
    } else {
      explorer = [explorer]
    }
  }
  if (explorer.includes('$_')) {
    explorer = explorer.map(item => (item === '$_' ? directory : item))
  } else {
    explorer = [...explorer, directory]
  }
  return ipcRenderer.invoke('execute', quote(explorer))
}

export function moveLauncher(from: number, to: number) {
  const launchersRef = useLaunchers()
  const launchers = [...unref(launchersRef)]
  const rule = launchers[from]
  if (from < to) {
    launchers.splice(to + 1, 0, rule)
    launchers.splice(from, 1)
  } else {
    launchers.splice(from, 1)
    launchers.splice(to, 0, rule)
  }
  launchersRef.value = launchers
}

export function handleLauncherMessages() {
  ipcRenderer.on('start-launcher', (event, launcher: Launcher) => {
    startLauncher(launcher)
  })
  ipcRenderer.on('run-script', (event, launcher: Launcher, index: number) => {
    runLauncherScript(launcher, index)
  })
}
