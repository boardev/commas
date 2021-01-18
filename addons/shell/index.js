module.exports = function (commas) {
  if (commas.app.isMainProcess()) {

    const util = require('util')
    const { executeCommand, getExternalURLCommands } = commas.bundler.extract('shell/command.ts')

    commas.ipcMain.handle('get-shell-commands', async () => {
      const commands = commas.context.shareArray('shell')
      return commands.flatMap(item => item.command)
    })

    commas.ipcMain.handle('execute-shell-command', async (event, line) => {
      const commands = commas.context.shareArray('shell')
      return executeCommand(event, line, commands)
    })

    commas.context.shareDataIntoArray('shell', {
      command: ['javascript', 'js'],
      raw: true,
      handler(argv) {
        const vm = require('vm')
        const context = {}
        vm.createContext(context)
        return util.inspect(vm.runInContext(argv, context), {
          showHidden: true,
          showProxy: true,
          colors: true,
        })
      },
    })

    let loadedCommands = []
    const loadExternalURLCommands = async () => {
      const commands = await getExternalURLCommands()
      commas.context.removeDataFromArray('shell', ...loadedCommands)
      commas.context.shareDataIntoArray('shell', ...commands)
      loadedCommands = commands
    }

    loadExternalURLCommands()
    const events = commas.settings.getEvents()
    events.on('updated', () => {
      loadExternalURLCommands()
    })

    commas.keybinding.add({
      label: 'Open shell#!shell.2',
      accelerator: 'CmdOrCtrl+P',
      command: 'open-shell-pane',
    })

    commas.settings.addSpecs(require('./settings.spec.json'))

    commas.i18n.addTranslation(['zh', 'zh-CN'], require('./locales/zh-CN.json'))

  } else {

    commas.ipcRenderer.on('open-shell-pane', () => {
      commas.workspace.openPaneTab('shell')
    })

    commas.workspace.registerTabPane('shell', {
      title: 'Shell#!shell.1',
      component: commas.bundler.extract('shell/shell-pane.vue').default,
      icon: {
        name: 'feather-icon icon-terminal',
      },
    })

    commas.reactive.shareDataIntoArray('settings', {
      component: commas.bundler.extract('shell/shell-link.vue').default,
      group: 'feature',
    })

    commas.reactive.shareDataIntoArray('user-settings:terminal.addon.includes', {
      value: 'shell',
      note: 'Built-in command runner#!shell.3',
    })

    const tab = commas.workspace.getPaneTab('shell')
    const { initializeShellTerminal } = commas.bundler.extract('shell/terminal.ts')
    initializeShellTerminal(tab)

  }
}
