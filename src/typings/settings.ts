import type { BrowserWindowConstructorOptions } from 'electron'
import type { JSONSchema } from './json-schema'
import type { TerminalContext } from './terminal'
import type { ThemeDefinition } from './theme'

export interface TerminalProfile extends Partial<TerminalContext> {
  label?: string,
}

export interface Settings {
  'terminal.shell.path': string,
  'terminal.shell.args': string[],
  'terminal.shell.windowsArgs': string[],
  'terminal.shell.env': NodeJS.ProcessEnv,
  'terminal.shell.extraProfiles': TerminalProfile[],
  'terminal.shell.integration': boolean,
  'terminal.shell.highlightErrors': boolean,
  'terminal.shell.autoCompletion': boolean,
  'terminal.external.openPathIn': 'new-tab' | 'new-window',
  'terminal.external.explorer': string,
  'terminal.external.remoteExplorer': string,
  'terminal.tab.liveCwd': boolean,
  'terminal.tab.liveIcon': boolean,
  'terminal.tab.livePreview': boolean,
  'terminal.tab.titleFormat': string,
  'terminal.view.linkModifier': 'any' | 'CmdOrCtrl' | 'Alt',
  'terminal.view.rendererType': 'dom' | 'canvas' | 'webgl',
  'terminal.view.frameType': 'system' | 'system-with-menu' | 'immersive',
  'terminal.view.tabListPosition': 'left' | 'right' | 'top' | 'bottom',
  'terminal.style.opacity': number,
  'terminal.style.vibrancy': BrowserWindowConstructorOptions['vibrancy'] | boolean,
  'terminal.style.vibrancyOpacity': number,
  'terminal.style.fontSize': number,
  'terminal.style.fontFamily': string,
  'terminal.style.fontLigatures': boolean,
  'terminal.style.cursorStyle': 'block' | 'bar' | 'underline',
  'terminal.theme.name': string,
  'terminal.theme.customization': ThemeDefinition,
  'terminal.addon.includes': string[],
}

export interface SettingsSpec {
  key: string,
  label: string,
  comments?: string[],
  configurable?: NodeJS.Platform[],
  schema?: JSONSchema,
  recommendations?: any[],
  reload?: boolean,
  default?: any,
}
