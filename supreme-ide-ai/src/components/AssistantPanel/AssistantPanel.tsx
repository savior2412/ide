import { useState, useEffect, useRef } from 'react';
import styles from './AssistantPanel.module.css';

// Define the structure for a message
interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}

const AssistantPanel = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const chatDisplayRef = useRef<HTMLDivElement>(null);

  // Function to get a simulated AI response
  const getAIResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase();
    if (lowerInput.includes('hello') || lowerInput.includes('xin chào')) {
      return "Chào bạn, tôi là trợ lý AI. Tôi có thể giúp gì cho bạn?";
    } else if (lowerInput.includes('giúp')) {
      return "Chắc chắn rồi. Bạn cần giúp đỡ về vấn đề gì? Code, debug, hay tìm kiếm thông tin?";
    } else if (lowerInput.includes('code')) {
      return "Tôi có thể giúp bạn viết code, giải thích thuật toán, hoặc tối ưu hóa hiệu suất. Hãy cho tôi biết yêu cầu của bạn.";
    } else if (lowerInput.includes('tên gì')) {
      return "Tôi là một mô hình ngôn ngữ lớn, được huấn luyện bởi Google.";
    } else {
      return "Tôi chưa hiểu ý bạn. Bạn có thể diễn đạt lại được không?";
    }
  };

  // Effect to show initial welcome messages
  useEffect(() => {
    setTimeout(() => {
      setMessages([
        { id: 1, text: "Khởi tạo hệ thống... AI [v2.7] đã sẵn sàng.", sender: 'ai' },
        { id: 2, text: "Tôi có thể giúp gì cho bạn hôm nay?", sender: 'ai' },
      ]);
    }, 500);
  }, []); // Empty dependency array means this runs only once on mount

  // Effect to scroll to the bottom when new messages are added
  useEffect(() => {
    if (chatDisplayRef.current) {
      chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
    }
  }, [messages]);

  // Function to handle sending a message
  const handleSendMessage = () => {
    const trimmedInput = inputValue.trim();
    if (trimmedInput) {
      // Add user message
      const userMessage: Message = {
        id: Date.now(),
        text: trimmedInput,
        sender: 'user',
      };
      setMessages(prevMessages => [...prevMessages, userMessage]);
      setInputValue('');

      // Simulate AI response
      setTimeout(() => {
        const aiResponseText = getAIResponse(trimmedInput);
        const aiMessage: Message = {
          id: Date.now() + 1,
          text: aiResponseText,
          sender: 'ai',
        };
        setMessages(prevMessages => [...prevMessages, aiMessage]);
      }, 1000 + Math.random() * 500);
    }
  };

  // Handle Enter key press
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <aside className={`${styles.container} border-glow-pink`}>
      <div className={styles.header}>
        <h2 className={`${styles.title} text-glow-pink`}>AI Assistant [v2.7]</h2>
      </div>
      <div ref={chatDisplayRef} className={styles.chatDisplay}>
        {messages.map((msg) => (
          <div key={msg.id} className={`${styles.messageWrapper} ${styles[msg.sender]}`}>
            <div className={`${styles.messageBubble} ${styles[msg.sender]}`}>
              <p>{msg.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.inputArea}>
        <button className={styles.contextButton}>+ Add Context Files</button>
        <div className={styles.inputWrapper}>
          <textarea
            rows={3}
            placeholder="Ask me anything..."
            className={styles.chatInput}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={handleSendMessage} className={styles.sendButton}>
            SEND
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AssistantPanel;