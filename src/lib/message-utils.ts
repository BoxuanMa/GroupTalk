export function maskMessagesForStudent(
  messages: Array<Record<string, unknown>>,
  aiRole: string,
  groupId: string
): Array<Record<string, unknown>> {
  return messages.map((msg) => {
    if (msg.senderType === 'ai' && aiRole === 'hidden_ai_peer') {
      const { aiMetadata, ...rest } = msg
      void aiMetadata
      return { ...rest, senderType: 'student', senderId: `virtual-${groupId}` }
    }
    const { aiMetadata, ...rest } = msg
    void aiMetadata
    return rest
  })
}
