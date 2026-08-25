DROP POLICY IF EXISTS "Users create messages" ON public.chat_messages;

CREATE POLICY "Users create messages" ON public.chat_messages
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND (
    (
      sender_role = 'user'
      AND EXISTS (
        SELECT 1 FROM public.chat_conversations
        WHERE chat_conversations.id = chat_messages.conversation_id
          AND chat_conversations.user_id = auth.uid()
      )
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);