export const MESSAGING_UI_CONSTANTS = {
  MOBILE_BREAKPOINT_PX: 768,
  SIDEBAR_WIDTH_PX: 320,
  MAX_MESSAGE_LENGTH: 2000,
} as const;

export const CONVERSATION_WINDOW_POSITION = {
  DEFAULT_BOTTOM_PX: 0,
  DEFAULT_RIGHT_PX: 400,
} as const;

export const MESSAGE_INPUT_LIMITS = {
  MAX_FILES: 5,
  MAX_MESSAGE_LENGTH: 1000,
  WARNING_THRESHOLD_LENGTH: 800,
} as const;

export const MESSAGE_LIST_UI = {
  LOAD_MORE_SCROLL_THRESHOLD_PX: 100,
} as const;

export const TIME_CONSTANTS = {
  MINUTE_MS: 60_000,
  HOUR_MINUTES: 60,
  DAY_HOURS: 24,
} as const;


export const DEMO_USERS = [
  { id: '1', name: 'User 1 Name', color: 'bg-pink-500' },
  { id: '2', name: 'User 2 Name', color: 'bg-blue-500' },
  { id: '3', name: 'User 3 Name', color: 'bg-green-500' },
  { id: '4', name: 'User 4 Name', color: 'bg-purple-500' },
] as const;
