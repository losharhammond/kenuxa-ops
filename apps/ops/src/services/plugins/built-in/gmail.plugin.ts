/**
 * Gmail Plugin — email operations via Gmail OAuth
 */
import { registerPlugin, createPlugin } from '../plugin-manager'
// Email handlers are registered in email.handler.ts
// This plugin just registers the plugin metadata

registerPlugin(
  createPlugin({
    name:        'gmail',
    displayName: 'Gmail',
    description: 'Read, send, and manage Gmail messages with AI summarization',
    category:    'communication',
    commands:    ['send_email', 'read_emails', 'search_emails', 'summarize_inbox', 'draft_reply'],
    triggers:    ['email.received'],
    isBuiltIn:   true,
  }),
  () => {
    // Handlers are registered in email.handler.ts via side-effects
    // This setup fn can initialize OAuth tokens from storage etc.
    console.log('[gmail-plugin] Gmail plugin ready')
  }
)
