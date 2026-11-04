/**
 * Markers the model appends so the page can act instead of just talk.
 *
 * The assistant cannot send email or contact anyone, so it must never say it
 * did. Instead it ends a reply with a marker, the client strips it before
 * display, and the page offers the real action (an email button, or example
 * questions).
 */
export const MARKERS = {
  /** Visitor wants to hire, collaborate, or asked something only Abdul can answer. */
  email: "[[EMAIL]]",
  /** Message had nothing to do with Abdul's work. */
  offTopic: "[[OFF_TOPIC]]",
} as const;

/** One-tap starters shown in an empty chat, and again after an off-topic reply. */
export const SUGGESTED_QUESTIONS = [
  "What has Abdul built?",
  "Is Abdul available for freelance work?",
  "What's Abdul's tech stack?",
  "I'd like to hire Abdul",
] as const;

/** Limits shared by the widget and the API so they can never disagree. */
export const CHAT_LIMITS = {
  maxCharsPerMessage: 500,
  maxTurnsSent: 12,
} as const;
