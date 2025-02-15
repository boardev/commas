import type { Component } from 'vue'
import type { TerminalTabGroup } from '../src/typings/terminal'

declare module './modules/context' {
  export interface Context {
    'terminal.ui-left-action-anchor': Component,
    'terminal.ui-right-action-anchor': Component,
    'terminal.ui-side-list': Component,
    'terminal.ui-slot': Component,
    'terminal.category': {
      title: string,
      groups: TerminalTabGroup[],
      command: string,
      priority?: number,
    },
  }
}

export * as app from './modules/app'
export * as context from './modules/context'
export * as helper from './modules/helper'
export * as ipcRenderer from './modules/ipc-renderer'
export * as remote from './modules/remote'
export * as ui from './modules/ui'
export * as workspace from './modules/workspace'
