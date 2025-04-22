import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createCalendarAgent } from '../convex/activitySetterAgent';

// Define message types
interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function AssistantPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hi! I\'m your calendar assistant. I can help you create, update, or delete activities. How can I help you today?',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agent, setAgent] = useState<any>(null);
  const [isAgentLoading, setIsAgentLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // Initialize the agent on component mount
  useEffect(() => {
    const initAgent = async () => {
      try {
        console.log('Starting agent initialization...');
        const calendarAgent = await createCalendarAgent();
        console.log('Agent initialization successful');
        setAgent(calendarAgent);
        setIsAgentLoading(false);
      } catch (error) {
        // Enhanced error logging
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : 'No stack trace available';
        
        console.error('Error initializing agent:', {
          message: errorMessage,
          stack: errorStack,
          timestamp: new Date().toISOString()
        });
        
        setIsAgentLoading(false);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: `Sorry, I encountered an error while starting up: ${errorMessage}. Please try again later.`,
          isUser: false,
          timestamp: new Date()
        }]);
      }
    };
    
    initAgent();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    }
  }, [messages]);

  // Handle sending a message to the agent
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading || isAgentLoading) return;
    
    const userMessage = inputText.trim();
    setInputText('');
    Keyboard.dismiss();
    
    // Add user message to the chat
    const newUserMessage: Message = {
      id: Date.now().toString(),
      text: userMessage,
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);
    
    try {
      // Call the agent with the user's message
      const response = await agent.invoke(userMessage);
      
      // The last message in the history should be the agent's response
      const lastMessage = response[response.length - 1];
      
      // Add agent response to the chat
      if (lastMessage && lastMessage.content) {
        const agentMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: lastMessage.content,
          isUser: false,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, agentMessage]);
      }
    } catch (error) {
      console.error('Error from agent:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error processing your request. Please try again.',
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Format timestamp for message
  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render a single message
  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessageContainer : styles.botMessageContainer
    ]}>
      <View style={[
        styles.messageBubble,
        item.isUser ? styles.userMessageBubble : styles.botMessageBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.isUser ? styles.userMessageText : styles.botMessageText
        ]}>
          {item.text}
        </Text>
      </View>
      <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 85}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#f7f7f7" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendar Assistant</Text>
        <View style={{ width: 24 }} /> {/* Empty view for spacing */}
      </View>
      
      {/* Loading screen while agent is initializing */}
      {isAgentLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Setting up your calendar assistant...</Text>
        </View>
      ) : (
        <>
          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesContainer}
          />
          
          {/* Input area */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              multiline
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
              editable={!isLoading && !isAgentLoading}
            />
            <TouchableOpacity 
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading || isAgentLoading) && styles.disabledButton
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isLoading || isAgentLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="send" size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  botMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 18,
    padding: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  userMessageBubble: {
    backgroundColor: '#6200ee',
  },
  botMessageBubble: {
    backgroundColor: '#ffffff',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#ffffff',
  },
  botMessageText: {
    color: '#333333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
    color: '#333',
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: '#6200ee',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#b39ddb',
  },
});