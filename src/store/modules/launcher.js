import FileStorage from '@/utils/storage'
import {quote, resolveHome} from '@/utils/terminal'
import {getLauncherTab, merge} from '@/utils/launcher'
import {shell} from 'electron'
import {spawn} from 'child_process'
import {EOL} from 'os'

export default {
  namespaced: true,
  state: {
    launchers: [],
    watcher: null,
  },
  mutations: {
    setLaunchers(state, value) {
      state.launchers = value
    },
    setWatcher(state, value) {
      state.watcher = value
    },
  },
  actions: {
    async load({state, commit, rootState}) {
      const launchers = await FileStorage.load('launchers.json')
      if (!launchers) return
      const merged = merge(state.launchers, launchers)
      commit('setLaunchers', merged)
      commit('terminal/setTabs', rootState.terminal.tabs.map(tab => {
        if (!tab.launcher) return tab
        const updated = merged.find(item => item.id === tab.launcher)
        return updated ? tab : {...tab, launcher: undefined}
      }), {root: true})
    },
    open({dispatch, rootState}, launcher) {
      const tab = getLauncherTab(rootState.terminal.tabs, launcher)
      if (tab) {
        return dispatch('terminal/activite', tab, {root: true})
      } else {
        const directory = launcher.remote ? null : launcher.directory
        return dispatch('terminal/spawn', {
          cwd: resolveHome(directory),
          launcher: launcher.id,
        }, {root: true})
      }
    },
    async launch({state, dispatch, rootState}, launcher) {
      const id = launcher.id
      const active = getLauncherTab(rootState.terminal.tabs, launcher)
      await dispatch('open', launcher)
      launcher = state.launchers.find(item => item.id === id)
      let command = launcher.command
      if (launcher.login) {
        command = `bash -lic ${quote(command)}`
      }
      if (launcher.directory) {
        command = `cd ${launcher.directory} && (${command})`
      }
      if (launcher.remote) {
        command = `ssh -t ${launcher.remote} ${quote(command)}`
      }
      const tab = getLauncherTab(rootState.terminal.tabs, launcher)
      const {pty} = rootState.terminal.poll.get(tab.id)
      // Windows does not support pty signal
      if (active && process.platform !== 'win32') pty.kill('SIGINT')
      pty.write(command + EOL)
    },
    assign({rootState}, launcher) {
      const settings = rootState.settings.settings
      const explorer = settings['terminal.external.explorer']
      if (!launcher.directory) return false
      const directory = resolveHome(launcher.directory)
      if (!explorer) {
        shell.openItem(directory)
        return
      }
      if (!Array.isArray(explorer)) {
        spawn(explorer, [directory])
        return
      }
      const [command, ...args] = explorer
      spawn(command, [...args, directory])
    },
    watch({state, commit, dispatch}) {
      if (state.watcher) state.watcher.close()
      const watcher = FileStorage.watch('launchers.json', () => {
        dispatch('load')
      })
      commit('setWatcher', watcher)
    },
  },
}
