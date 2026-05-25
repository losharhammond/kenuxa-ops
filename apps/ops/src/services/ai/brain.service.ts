/**
 * KENUXA OPS — Brain Service
 * Inspired by the Python executive assistant's brain.py
 * Converts natural language to structured intents with entities
 */
import { fastJSON, balancedChat } from '@/lib/groq/client'
import { stripWakeWord }          from '@/lib/utils'
import type { ParsedIntent, CommandIntent } from '@/types/ops'

const INTENT_SYSTEM_PROMPT = `You are the command parser for KENUXA OPS — a voice-driven AI operations system.
Your job is to parse natural language commands into structured intents with high precision.

Available intents:
- open_app: open an application (entities: app_name)
- close_app: close an application (entities: app_name)
- search_files: search for files (entities: query, directory?)
- open_url: open a URL or website (entities: url, site_name?)
- search_web: search the internet (entities: query)
- get_page_content: get content of current page
- send_email: send an email (entities: to, subject, body, cc?)
- read_emails: read/check emails (entities: count?, filter?, from?)
- search_emails: search email inbox (entities: query)
- summarize_inbox: summarize unread emails
- draft_reply: draft a reply to an email (entities: thread_id?, instruction)
- create_task: create a task (entities: title, description?, priority?, due_date?)
- list_tasks: list tasks (entities: filter?, status?)
- complete_task: mark task complete (entities: task_id?, task_name?)
- query_reach: query KENUXA REACH intelligence (entities: query)
- get_intelligence: get market intelligence (entities: topic, country?)
- search_entities: search entity graph (entities: query)
- remember: save something to memory (entities: key?, value)
- recall: retrieve from memory (entities: key?, query)
- run_workflow: run a workflow (entities: workflow_name)
- list_workflows: list available workflows
- create_event: create calendar event (entities: title, date, time?, duration?, attendees?)
- list_events: list calendar events (entities: date?, period?)
- find_free_time: find available time slots (entities: date?, duration?)
- speak_only: just respond with text (entities: message)
- ask_clarification: need more info (entities: question)
- help: explain capabilities
- unknown: cannot determine intent

Respond ONLY with a JSON object in this EXACT structure:
{
  "intent": "intent_name",
  "confidence": 0.0-1.0,
  "entities": { "key": "value" },
  "speak_text": "what to say immediately to the user (max 15 words)",
  "needs_confirm": false,
  "raw_text": "original input"
}`

export async function parseIntent(rawText: string): Promise<ParsedIntent> {
  const cleanText = stripWakeWord(rawText)

  try {
    const result = await fastJSON<ParsedIntent>(
      INTENT_SYSTEM_PROMPT,
      `Parse this command: "${cleanText}"`,
      { temperature: 0.05 }
    )

    return {
      ...result,
      intent:    (result.intent as CommandIntent) ?? 'unknown',
      confidence: result.confidence ?? 0.5,
      entities:   result.entities  ?? {},
      speak_text: result.speak_text ?? 'Working on it.',
      needs_confirm: result.needs_confirm ?? false,
      raw_text:   rawText,
    }
  } catch (err) {
    console.error('[brain] parseIntent error:', err)
    return {
      intent:     'unknown',
      confidence: 0,
      entities:   {},
      speak_text: 'I didn\'t understand that. Please try again.',
      needs_confirm: false,
      raw_text:   rawText,
    }
  }
}

/** Generate a natural language response for a command result */
export async function generateResponse(
  intent: CommandIntent,
  result: unknown,
  context: string
): Promise<string> {
  const prompt = `You are KENUXA OPS, a professional AI operations assistant.
Generate a SHORT, natural response (max 2 sentences) for the user based on:
- Intent executed: ${intent}
- Result: ${JSON.stringify(result).slice(0, 500)}
- Context: ${context}
Be concise, professional, and helpful. No filler words.`

  try {
    return await balancedChat(prompt, 'Generate the response.', {
      temperature: 0.3,
      maxTokens:   100,
    })
  } catch {
    return 'Done.'
  }
}

/** Summarize a list of items into a speakable summary */
export async function summarizeForVoice(
  type: string,
  items: unknown[]
): Promise<string> {
  if (items.length === 0) return `No ${type} found.`
  if (items.length === 1) return `Found one ${type}.`

  const prompt = `Summarize these ${type} into 1-2 natural, speakable sentences for a voice assistant:
${JSON.stringify(items).slice(0, 2000)}

Be brief and natural. Focus on the most important information.`

  try {
    return await balancedChat(
      'You are a voice assistant. Generate very brief, natural summaries.',
      prompt,
      { temperature: 0.2, maxTokens: 80 }
    )
  } catch {
    return `Found ${items.length} ${type}.`
  }
}
