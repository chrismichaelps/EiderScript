/** @EiderScript.Config.Constants - Unified magic values and structural tags */
import { Config } from 'effect'

export const Tags = {
  FETCH_SERVICE: 'EiderScript/FetchService',
  LOG_SERVICE: 'EiderScript/LogService',
  PARSE_ERROR: 'ParseError',
  COMPILE_ERROR: 'CompileError',
  RUNTIME_ERROR: 'RuntimeError',
  FETCH_ERROR: 'FetchError',
} as const

export const Regex = {
  DIRECTIVE: /^(v-if|v-else-if|v-else|v-for|v-model|v-show|v-bind|v-on|v-slot|v-once|v-pre|v-memo|v-cloak|v-text|v-html|@\w[\w.-]*|:\w[\w.-]*|#\w[\w.-]*)$/,
  INTERPOLATION: /\{\{\s*([^}]+)\s*\}\}/g,
} as const

export const EiderConstValues = Config.all({
  // Logging & Errors
  logPrefix: Config.string('EIDER_LOG_PREFIX').pipe(Config.withDefault('[EiderScript]')),
  errHttpPrefix: Config.string('EIDER_ERR_HTTP').pipe(Config.withDefault('HTTP')),
  errParseFailed: Config.string('EIDER_ERR_PARSE').pipe(Config.withDefault('YAML parse failed:')),
  errCompileFailed: Config.string('EIDER_ERR_COMPILE').pipe(Config.withDefault('Component compile failed:')),
  errStoreCompileFailed: Config.string('EIDER_ERR_STORE_COMPILE').pipe(Config.withDefault('Store compile failed:')),
  errActionFailed: Config.string('EIDER_ERR_ACTION').pipe(Config.withDefault('Action failed:')),
  errStoreActionFailed: Config.string('EIDER_ERR_STORE_ACTION').pipe(Config.withDefault('Store action failed:')),
  errUnknownYaml: Config.string('EIDER_ERR_UNKNOWN_YAML').pipe(
    Config.withDefault('Cannot determine YAML document type. Must have "name"+"template" (component), "id" (store), or "name"+"router" (app).')
  ),
  errRootAppExpected: Config.string('EIDER_ERR_ROOT_APP_EXPECTED').pipe(Config.withDefault('Root YAML must be "app" kind, got')),
  errComponentExpected: Config.string('EIDER_ERR_COMPONENT_EXPECTED').pipe(Config.withDefault('Expected component YAML for')),
  errComponentNameEmpty: Config.string('EIDER_ERR_COMPONENT_NAME_EMPTY').pipe(Config.withDefault('Component name must not be empty')),

  // Defaults & Fallbacks
  defaultHtmlTag: Config.string('EIDER_DEFAULT_TAG').pipe(Config.withDefault('div')),
  fragmentHtmlTag: Config.string('EIDER_FRAGMENT_TAG').pipe(Config.withDefault('template')),
  routerViewTemplate: Config.string('EIDER_ROUTER_VIEW_TEMPLATE').pipe(Config.withDefault('<router-view />')),
  routerFallbackPrefix: Config.string('EIDER_ROUTER_FALLBACK_PREFIX').pipe(Config.withDefault('<div>[')),
  routerFallbackSuffix: Config.string('EIDER_ROUTER_FALLBACK_SUFFIX').pipe(Config.withDefault(']</div>')),
  interpolationPrefix: Config.string('EIDER_INTERPOLATION_PREFIX').pipe(Config.withDefault('{{')),

  // Directives
  dirIf: Config.string('EIDER_DIR_IF').pipe(Config.withDefault('v-if')),
  dirFor: Config.string('EIDER_DIR_FOR').pipe(Config.withDefault('v-for')),
  dirModel: Config.string('EIDER_DIR_MODEL').pipe(Config.withDefault('v-model')),

  // AST Kinds
  kindComponent: Config.string('EIDER_KIND_COMPONENT').pipe(Config.withDefault('component')),
  kindStore: Config.string('EIDER_KIND_STORE').pipe(Config.withDefault('store')),
  kindApp: Config.string('EIDER_KIND_APP').pipe(Config.withDefault('app')),
})
