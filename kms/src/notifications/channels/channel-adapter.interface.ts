export interface ChannelSendResult {
  ok: boolean;
  error?: string;
}

export interface ChannelAdapter {
  // recipient is channel-specific: a Telegram chat id, an email address,
  // an internal parent id for the in-app "push" log, etc.
  send(recipient: string, message: string): Promise<ChannelSendResult>;
}
