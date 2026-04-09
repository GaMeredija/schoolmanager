import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, 
  Send, 
  Paperclip, 
  Phone,
  Video,
  Info,
  MessageSquare,
  Check,
  CheckCheck,
  Loader2,
  ArrowLeft
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSearchUsers, useConversations, useMessages, useSendMessage } from "@/hooks/useApi";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  timestamp: string;
  isRead: boolean;
}

interface Chat {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
  participants: string[];
  type: 'direct' | 'group';
  otherUserId?: string;
  otherUserEmail?: string;
}

const StudentChatPage = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [tempRecipient, setTempRecipient] = useState<{name:string; email:string; avatar?:string} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const debouncedUserSearchQuery = useDebounce(userSearchTerm, 300);
  const { data: searchUsersData, isLoading: isLoadingUsers, error: searchError } = useSearchUsers(debouncedUserSearchQuery);

  // Usar APIs reais do chat
  const { data: conversationsData, isLoading: isLoadingConversations } = useConversations();
  // Calcular conversationId determinístico quando há chat selecionado
  const currentConversationId = useMemo(() => {
    if (!selectedChat) return "";
    const conv = conversations.find(c => c.id === selectedChat);
    if (!conv || !user?.id) return "";
    const pair = [user.id, conv.otherUserId || conv.otherUserEmail || ''].filter(Boolean).sort();
    return pair.length === 2 ? `conv_${pair[0]}_${pair[1]}` : selectedChat;
  }, [selectedChat, conversations, user?.id]);

  const { data: messagesData, isLoading: isLoadingMessages, refetch: refetchMessages } = useMessages(
    currentConversationId,
    {
      refetchInterval: selectedChat ? 2000 : false,
      refetchIntervalInBackground: true,
      refetchOnMount: true,
      refetchOnWindowFocus: true
    }
  );
  const sendMessageMutation = useSendMessage();

  // Processar conversas reais do banco
  const conversations = useMemo(() => {
    if (!conversationsData?.data) return [];
    const mapped = conversationsData.data.map((conv: any) => {
      const fullName = conv.otherUserName || '';
      const [first, ...rest] = fullName.split(' ').filter(Boolean);
      return {
        id: conv.conversationId,
        name: fullName || conv.otherUserEmail || 'Usuário',
        avatar: conv.otherUserProfileImageUrl,
        lastMessage: conv.lastMessage || "",
        timestamp: conv.lastTimestamp ? new Date(conv.lastTimestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : "",
        unreadCount: 0,
        isOnline: true,
        participants: [user?.id || '', conv.otherUserId],
        type: 'direct' as const,
        otherUserId: conv.otherUserId,
        otherUserEmail: conv.otherUserEmail,
        otherUserFirstName: first || 'Usuário',
        otherUserLastName: rest.join(' ') || ''
      };
    });
    return mapped;
  }, [conversationsData, user]);

  const filteredChats = useMemo(() => {
    if (!searchTerm) return conversations;
    return conversations.filter(chat => 
      chat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [conversations, searchTerm]);

  const currentChat = conversations.find(chat => chat.id === selectedChat);
  const currentHeader = useMemo(() => {
    if (currentChat) {
      return { name: currentChat.name, email: currentChat.otherUserEmail, avatar: currentChat.avatar };
    }
    if (tempRecipient) return tempRecipient;
    return null;
  }, [currentChat, tempRecipient]);

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage("");

    try {
      let recipientEmail: string;

      if (currentChat) {
        // Conversa existente
        recipientEmail = currentChat.otherUserEmail || currentChat.otherUserId;
      } else {
        throw new Error('Conversa inválida');
      }

      if (!recipientEmail) {
        throw new Error('Email do destinatário não encontrado');
      }

      // Enviar mensagem real para o backend
      await sendMessageMutation.mutateAsync({
        recipientEmail,
        content: messageContent
      });

      // Refetch das mensagens e conversas
      refetchMessages();
      
      toast.success("Mensagem enviada com sucesso!");
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setNewMessage(messageContent); // Restaurar mensagem em caso de erro
      toast.error("Erro ao enviar mensagem: " + (error as Error).message);
    }
  }, [newMessage, currentChat, sendMessageMutation, refetchMessages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStartChat = (searchUser: any) => {
    // Verificar se já existe conversa com este usuário
    const existingChat = conversations.find(chat => 
      chat.otherUserEmail === searchUser.email
    );

    if (existingChat) {
      // Selecionar conversa existente
      setSelectedChat(existingChat.id);
      setIsMobileChatOpen(true);
      toast.success(`Conversa com ${searchUser.firstName} ${searchUser.lastName} selecionada`);
    } else {
      // Definir conversa determinística e selecionar
      const ids = [user?.id as string, searchUser.id as string].filter(Boolean).sort();
      const convId = `conv_${ids[0]}_${ids[1]}`;
      setSelectedChat(convId);
      setTempRecipient({ name: `${searchUser.firstName} ${searchUser.lastName}`.trim(), email: searchUser.email, avatar: searchUser.profileImageUrl });
      // Mensagem opcional para iniciar
      setNewMessage("");
      setIsMobileChatOpen(true);
      toast.success(`Iniciando conversa com ${searchUser.firstName} ${searchUser.lastName}`);
    }

    setShowUserSearch(false);
    setUserSearchTerm("");
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-200';
      case 'teacher': return 'bg-blue-500/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200';
      case 'coordinator': return 'bg-violet-500/10 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200';
      case 'student': return 'bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-200';
      default: return 'bg-muted text-foreground';
    }
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (isLoadingConversations) {
    return (
      <div className="h-[calc(100vh-120px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando conversas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] w-full">
      <div className="flex h-full gap-1 overflow-hidden rounded-lg border border-border bg-muted/50">
        {/* Sidebar - Lista de conversas */}
        <div className={`h-full flex-col border-r border-border bg-card shadow-sm
          ${isMobileChatOpen ? 'hidden lg:flex w-64' : 'flex w-full lg:w-64'}`}>
          <div className="border-b border-border bg-card p-2">
            <div className="mb-2">
              <h2 className="text-base font-semibold text-foreground">💬 Chat</h2>
              <p className="text-xs text-muted-foreground">Converse com professores e colegas</p>
            </div>
            
            {/* Barra de pesquisa */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground/60" />
              <Input
                placeholder="Buscar conversas ou usuários..."
                className="border-border bg-background py-1.5 pl-7 pr-3 text-sm focus:border-blue-500 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setUserSearchTerm(e.target.value);
                  setShowUserSearch(e.target.value.length >= 2);
                }}
                onFocus={() => setShowUserSearch(searchTerm.length >= 2)}
                onBlur={() => setTimeout(() => setShowUserSearch(false), 200)}
              />
              
              {/* Dropdown de busca de usuários */}
              {showUserSearch && searchTerm.length >= 2 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
                  {isLoadingUsers ? (
                    <div className="p-3 text-center">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Buscando usuários...</p>
                    </div>
                  ) : searchError ? (
                    <div className="p-3 text-center text-red-500">
                      Erro ao buscar usuários
                    </div>
                  ) : searchUsersData?.data && searchUsersData.data.length > 0 ? (
                    <div className="py-1">
                      {searchUsersData.data
                        .filter((searchUser: any) => searchUser.id !== user?.id)
                        .map((searchUser: any) => (
                        <div
                          key={searchUser.id}
                          onClick={() => handleStartChat(searchUser)}
                          className="flex cursor-pointer items-center gap-2 p-2 hover:bg-muted/60"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={searchUser.profileImageUrl} />
                            <AvatarFallback className="text-xs">
                              {getUserInitials(`${searchUser.firstName} ${searchUser.lastName}`)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {searchUser.firstName} {searchUser.lastName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{searchUser.email}</p>
                          </div>
                          <Badge className={`text-xs ${getRoleColor(searchUser.role)}`}>
                            {searchUser.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Nenhum usuário encontrado</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Lista de conversas */}
          <div className="flex-1 overflow-y-auto">
            {filteredChats.length === 0 ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => {
                      setSelectedChat(chat.id);
                      setIsMobileChatOpen(true);
                    }}
                    className={`p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedChat === chat.id
                        ? 'border border-blue-500/30 bg-blue-500/10 dark:bg-blue-500/15'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={chat.avatar} />
                          <AvatarFallback className="text-xs">
                            {getUserInitials(chat.name)}
                          </AvatarFallback>
                        </Avatar>
                        {chat.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-background bg-green-500"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-xs font-medium text-foreground">
                            {chat.name}
                          </p>
                          {chat.unreadCount > 0 && (
                            <Badge className="bg-blue-600 text-white text-xs h-4 px-1">
                              {chat.unreadCount}
                            </Badge>
                          )}
                        </div>
                        {chat.lastMessage && (
                          <p className="truncate text-xs text-muted-foreground">
                            {chat.lastMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Área principal de chat */}
        <div className={`flex-1 flex flex-col ${isMobileChatOpen ? 'flex' : 'hidden lg:flex'}`}>
          {selectedChat ? (
            <>
              {/* Header da conversa */}
              <div className="flex items-center justify-between border-b border-border bg-card p-3">
                  <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="lg:hidden mr-2"
                    onClick={() => setIsMobileChatOpen(false)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                    <Avatar className="h-8 w-8">
                    <AvatarImage src={currentHeader?.avatar} />
                      <AvatarFallback className="text-xs">
                      {currentHeader?.name ? getUserInitials(currentHeader.name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-base font-medium text-foreground">
                      {currentHeader?.name || 'Usuário'}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {currentChat?.isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Info className="h-4 w-4" />
                    </Button>
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 space-y-2 overflow-y-auto bg-muted/20 p-3">
                {messagesData?.data?.map((message: any) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                      message.senderId === user?.id
                        ? 'bg-blue-600 text-white'
                        : 'border border-border bg-card text-foreground'
                    }`}>
                      {message.senderId !== user?.id && (
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-xs font-medium">{message.senderName}</span>
                          <Badge className={`text-xs ${getRoleColor(message.senderRole)}`}>
                            {message.senderRole}
                          </Badge>
                        </div>
                      )}
                      <p className="text-sm">{message.content}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-xs opacity-70">{message.timestamp}</span>
                        {message.senderId === user?.id && (
                          <div className="flex items-center">
                            {message.isRead ? (
                              <CheckCheck className="h-3 w-3" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input de mensagem */}
              <div className="border-t border-border bg-card p-3">
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="sm">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 relative">
                    <Textarea
                      ref={textareaRef}
                      placeholder="Digite sua mensagem..."
                      className="min-h-[40px] max-h-[120px] resize-none pr-12 text-sm"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      rows={1}
                    />
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    size="sm"
                    className="px-3 py-1.5"
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Estado vazio */
            <div className="flex flex-1 items-center justify-center bg-muted/50">
              <div className="text-center">
                <MessageSquare className="mx-auto mb-4 h-16 w-16 text-muted-foreground/60" />
                <h3 className="mb-2 text-lg font-medium text-foreground">Bem-vindo ao Chat!</h3>
                <p className="text-muted-foreground">
                  Escolha uma conversa da lista ou digite o nome de alguém para iniciar uma nova conversa.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentChatPage;
