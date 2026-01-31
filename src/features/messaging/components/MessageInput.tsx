import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import type { MessageFile } from '../domain/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useMessageStore } from '../store/messageStore';
import { MESSAGE_INPUT_LIMITS } from '../domain/constants';

interface MessageInputProps {
  conversationId: string;
  disabled?: boolean;
}

export function MessageInput({ conversationId, disabled }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<MessageFile[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sendMessage } = useMessageStore();

  const handleSend = async () => {
    if ((!content.trim() && files.length === 0) || sending) return;

    setSending(true);
    try {
      await sendMessage(conversationId, content.trim(), files);
      setContent('');
      setFiles([]);
    } finally {
      setSending(false);
    }
  };
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (files.length + selectedFiles.length > MESSAGE_INPUT_LIMITS.MAX_FILES) {
      alert('Maximum 5 files allowed');
      return;
    }

    const newFiles: MessageFile[] = selectedFiles.map((file) => ({
      id: `file_${Date.now()}_${Math.random()}`,
      name: file.name,
      type: file.type.includes('image') ? 'image' : 'document' as any,
      size: file.size,
      url: URL.createObjectURL(file), // Mock URL for now
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  return (
    <div className="border-t p-4 bg-white">
      {files.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-gray-100 rounded px-2 py-1 text-sm"
            >
              <span className="truncate max-w-[150px]">{file.name}</span>
              <button
                onClick={() => removeFile(file.id)}
                className="text-gray-500 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
          accept="image/*,.pdf,.doc,.docx"
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || sending}
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled || sending}
          className="flex-1"
          maxLength={MESSAGE_INPUT_LIMITS.MAX_MESSAGE_LENGTH}
        />

        <Button
          onClick={handleSend}
          disabled={disabled || sending || (!content.trim() && files.length === 0)}
          size="icon"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>

      {content.length > MESSAGE_INPUT_LIMITS.WARNING_THRESHOLD_LENGTH && (
        <p className="text-xs text-gray-500 mt-1">
          {content.length}/{MESSAGE_INPUT_LIMITS.MAX_MESSAGE_LENGTH} characters
        </p>
      )}
    </div>
  );
}