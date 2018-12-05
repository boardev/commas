import {FileStorage} from '../plugins/storage'

const quote = command => `"${command.replace(/"/g, '"\\""')}"`

export default {
  states: {
    all: [],
  },
  actions: {
    async load({state}) {
      const launchers = await FileStorage.load('launchers.json')
      if (launchers) state.set([this, 'all'], launchers)
    },
    activite({state, action}, launcher) {
      if (launcher.tab) {
        action.dispatch('terminal.activite', launcher.tab)
      } else {
        const tab = action.dispatch('terminal.spawn')
        state.update('terminal.tabs', () => {
          tab.launcher = launcher
          state.update([this, 'all'], () => {
            launcher.tab = tab
          })
        })
      }
    },
    launch({action}, launcher) {
      action.dispatch([this, 'activite'], launcher)
      let command = launcher.command
      if (launcher.login) {
        command = `bash -lic ${quote(command)}`
      } else {
        command = `(${command})`
      }
      if (launcher.directory) {
        command = `cd ${launcher.directory} && ${command}`
      }
      if (launcher.remote) {
        command = `ssh -t ${launcher.remote} ${quote(command)}`
      }
      launcher.tab.pty.write(`${command}\n`)
    },
  },
}
