/**
 * KENUXA Core Plugin — ecosystem integration
 */
import { registerPlugin, createPlugin } from '../plugin-manager'

registerPlugin(
  createPlugin({
    name:        'kenuxa_core',
    displayName: 'KENUXA Core',
    description: 'Query KENUXA REACH intelligence, entity graph, and ecosystem data',
    category:    'kenuxa',
    commands:    ['query_reach', 'get_intelligence', 'search_entities'],
    triggers:    ['core.alert'],
    isBuiltIn:   true,
  }),
  () => {
    // Handlers are registered in kenuxa.handler.ts
    console.log('[core-plugin] KENUXA Core plugin ready')
  }
)
