import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  MessageCircle, 
  Send, 
  X, 
  Bot, 
  User, 
  Lightbulb,
  BookOpen,
  PenTool,
  Target,
  Sparkles,
  RefreshCw,
  Copy,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  isTyping?: boolean;
}

interface TeacherAIChatProps {
  isOpen: boolean;
  onClose: () => void;
}

// Componente para efeito de digitação
const TypewriterText: React.FC<{ text: string; speed?: number; onComplete?: () => void }> = ({ 
  text, 
  speed = 15, 
  onComplete 
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={tomorrow}
              language={match[1]}
              PreTag="div"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
        h1: ({ children }) => <h1 className="text-xl font-bold mb-2 text-foreground break-words">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 text-foreground break-words">{children}</h2>,
        h3: ({ children }) => <h3 className="text-md font-medium mb-1 text-foreground break-words">{children}</h3>,
        p: ({ children }) => <p className="mb-2 leading-relaxed break-words">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 break-words">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 break-words">{children}</ol>,
        li: ({ children }) => <li className="text-foreground break-words">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        em: ({ children }) => <em className="italic text-foreground">{children}</em>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-blue-500 pl-4 italic text-muted-foreground my-2 break-words">
            {children}
          </blockquote>
        ),
      }}
    >
      {displayedText}
    </ReactMarkdown>
  );
};

const TeacherAIChat: React.FC<TeacherAIChatProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sugestões rápidas para professores
  const quickSuggestions = [
    {
      icon: <Lightbulb className="w-4 h-4" />,
      text: "Ideias para atividades criativas",
      prompt: "Me dê 5 ideias criativas de atividades para engajar meus alunos na disciplina de matemática do ensino fundamental"
    },
    {
      icon: <BookOpen className="w-4 h-4" />,
      text: "Plano de aula",
      prompt: "Ajude-me a criar um plano de aula detalhado sobre frações para alunos do 5º ano"
    },
    {
      icon: <PenTool className="w-4 h-4" />,
      text: "Exercícios práticos",
      prompt: "Crie exercícios práticos e interessantes sobre o sistema solar para crianças de 8-10 anos"
    },
    {
      icon: <Target className="w-4 h-4" />,
      text: "Métodos de avaliação",
      prompt: "Sugira métodos de avaliação eficazes para uma aula sobre meio ambiente"
    }
  ];

  // Mensagem de boas-vindas
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: `# Olá, ${user?.firstName}! ðŸ‘‹

Sou sua **assistente de IA educacional**. Estou aqui para ajudá-lo(a) com:

## ðŸŽ¯ Minhas especialidades:
- **ðŸ“š Criação de planos de aula** estruturados e eficazes
- **ðŸŽ¯ Desenvolvimento de atividades** criativas e engajantes  
- **ðŸ“ Sugestões de exercícios** práticos e didáticos
- **🔍 Métodos de avaliação** formativa e somativa
- **ðŸ’¡ Ideias criativas** para engajar alunos de todas as idades
- **ðŸŽ¨ Recursos educacionais** e materiais didáticos

Como posso ajudá-lo(a) hoje? Use as sugestões abaixo ou digite sua pergunta!`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, user?.firstName, messages.length]);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focar no input quando abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Simular progresso de carregamento
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setLoadingProgress(0);
      interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 200);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  const sendMessage = async (messageText: string = inputMessage) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date()
    };

    const loadingMessage: Message = {
      id: 'loading',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputMessage('');
    setIsLoading(true);
    setLoadingProgress(0);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText.trim(),
          context: {
            role: 'teacher',
            userName: user?.firstName,
            subject: 'educação'
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Erro na comunicação com a IA');
      }

      const data = await response.json();
      setLoadingProgress(100);
      
      // Remover mensagem de loading e adicionar mensagem com efeito de digitação
      setMessages(prev => prev.filter(m => m.id !== 'loading'));
      
      const aiMessage: Message = {
        id: Date.now().toString() + '_ai',
        role: 'assistant',
        content: data.response || 'Desculpe, não consegui processar sua solicitação.',
        timestamp: new Date(),
        isTyping: true
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      const errorMessage: Message = {
        id: 'error',
        role: 'assistant',
        content: '**❌ Erro de Conexão**\n\nDesculpe, ocorreu um erro ao processar sua mensagem. Verifique se o serviço de IA está funcionando e tente novamente.\n\n*Dica: Certifique-se de que o servidor backend está rodando.*',
        timestamp: new Date()
      };
      setMessages(prev => prev.filter(m => m.id !== 'loading').concat(errorMessage));
    } finally {
      setIsLoading(false);
      setLoadingProgress(0);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const clearChat = () => {
    setMessages([]);
    // Recriar mensagem de boas-vindas
    const welcomeMessage: Message = {
      id: 'welcome_new',
      role: 'assistant',
      content: `# Olá novamente, ${user?.firstName}! ðŸ‘‹\n\n**Como posso ajudá-lo(a) hoje?**\n\nUse as sugestões abaixo ou digite sua pergunta diretamente!`,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  };

  const handleTypingComplete = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, isTyping: false } : msg
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="w-full h-full flex flex-col">
      <Card className="w-full h-full flex flex-col bg-card shadow-lg overflow-hidden rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Assistente IA Educacional</CardTitle>
              <p className="text-blue-100 text-base">Sua parceira para criar conteúdo educacional</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="lg"
              onClick={clearChat}
              className="text-white hover:bg-white/20 p-3"
              title="Limpar conversa"
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={onClose}
              className="text-white hover:bg-white/20 p-3"
              title="Fechar chat"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </CardHeader>

        {/* Barra de progresso */}
        {isLoading && (
          <div className="px-4 py-2 bg-blue-50 border-b">
            <div className="flex items-center gap-3">
              <Bot className="w-4 h-4 text-blue-600 animate-pulse" />
              <div className="flex-1">
                <Progress value={loadingProgress} className="h-2" />
              </div>
              <span className="text-xs text-blue-600 font-medium">
                {loadingProgress < 30 ? 'Processando...' : 
                 loadingProgress < 70 ? 'Analisando...' : 
                 loadingProgress < 90 ? 'Gerando resposta...' : 'Finalizando...'}
              </span>
            </div>
          </div>
        )}

        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          {/* Área de mensagens */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8 min-h-0">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      {message.isLoading ? (
                        <RefreshCw className="w-4 h-4 text-white animate-spin" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </div>
                )}
                
                <div className={`max-w-[80%] break-words overflow-hidden ${message.role === 'user' ? 'order-first' : ''}`}>
                  <div
                    className={`p-4 rounded-lg break-words overflow-hidden ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white ml-auto'
                        : 'bg-muted/60 text-foreground border border-border'
                    }`}
                  >
                    {message.isLoading ? (
                      <div className="flex items-center gap-2">
                        <span>Pensando</span>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    ) : message.role === 'user' ? (
                      <div className="whitespace-pre-wrap break-words overflow-hidden">{message.content}</div>
                    ) : message.isTyping ? (
                      <TypewriterText 
                        text={message.content} 
                        speed={3}
                        onComplete={() => handleTypingComplete(message.id)}
                      />
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={tomorrow}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className="bg-gray-200 px-1 py-0.5 rounded text-sm" {...props}>
                                {children}
                              </code>
                            );
                          },
                          h1: ({ children }) => <h1 className="text-xl font-bold mb-3 text-foreground border-b pb-2 break-words">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 text-foreground break-words">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-md font-medium mb-2 text-foreground break-words">{children}</h3>,
                          p: ({ children }) => <p className="mb-3 leading-relaxed text-foreground break-words">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1 pl-2 break-words">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1 pl-2 break-words">{children}</ol>,
                          li: ({ children }) => <li className="text-foreground leading-relaxed break-words">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                          em: ({ children }) => <em className="italic text-muted-foreground">{children}</em>,
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-blue-500 pl-4 italic text-muted-foreground my-3 bg-blue-50 py-2 rounded-r break-words">
                              {children}
                            </blockquote>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    )}
                  </div>
                  
                  {message.role === 'assistant' && !message.isLoading && !message.isTyping && (
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(message.content)}
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copiar
                      </Button>
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Sugestões rápidas */}
          {messages.length <= 1 && (
            <div className="p-8 border-t bg-gradient-to-r from-blue-50 to-purple-50">
              <p className="text-lg text-foreground mb-6 font-medium flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-purple-600" />
                Sugestões rápidas para começar:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickSuggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => sendMessage(suggestion.prompt)}
                    className="justify-start h-auto p-6 text-left hover:bg-card hover:shadow-lg transition-all"
                    disabled={isLoading}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-blue-600">{suggestion.icon}</div>
                      <span className="text-base font-medium">{suggestion.text}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input de mensagem */}
          <div className="p-8 border-t bg-card">
            <div className="flex gap-4">
              <Input
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua pergunta sobre educação..."
                disabled={isLoading}
                className="flex-1 border-gray-300 focus:border-blue-500 h-14 text-lg"
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 px-10 h-14"
              >
                {isLoading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            <p className="text-base text-muted-foreground mt-4 flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> para enviar • 
              <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Shift+Enter</kbd> para nova linha
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherAIChat;
