const bundler = globalThis.require('../api/modules/bundler')

const aliases = Object.create(null)
Object.assign(aliases, {
  vue: './node_modules/vue/dist/vue.esm-bundler.js',
  'lodash-es': './node_modules/lodash-es/lodash.js',
})
bundler.setAliases(aliases)

const importAll = request => request.keys().forEach(request)
importAll(require.context('../internal/', true, /\.(mjs|css|vue)$/))

bundler.setCache(require.cache)
