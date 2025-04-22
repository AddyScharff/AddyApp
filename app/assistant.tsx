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
  StatusBar,
  Animated,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createCalendarAgent } from '../convex/activitySetterAgent';
import { AppHeader } from './_layout';

// Define message types
interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

// Menu navigation component
const SideMenu = ({ 
  isVisible, 
  onClose, 
  onNavigate 
}: { 
  isVisible: boolean, 
  onClose: () => void,
  onNavigate: (routeName: string) => void 
}) => {
  const menuAnimation = useRef(new Animated.Value(-300)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(menuAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(menuAnimation, {
          toValue: -300,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const menuItems = [
    { icon: 'calendar-outline', title: 'Calendar', route: '/' },
    { icon: 'chatbox-ellipses-outline', title: 'Calendar Assistant', route: '/assistant' },
    { icon: 'checkbox-outline', title: 'To-Do List', route: '/todo' },
  ];

  return (
    <View style={styles.menuOverlay}>
      <Animated.View 
        style={[
          styles.menuOverlayBackground,
          { opacity: overlayOpacity }
        ]}
        >
        <TouchableOpacity 
          style={{ width: '100%', height: '100%' }} 
          activeOpacity={1}
          onPress={onClose} 
        />
      </Animated.View>
      <Animated.View 
        style={[
          styles.menuContainer,
          { transform: [{ translateX: menuAnimation }] }
        ]}
      >
        <View style={styles.menuHeader}>
          <Text style={styles.menuTitle}>AddyApp</Text>
          <TouchableOpacity onPress={onClose}>
            <View>
              <Ionicons name="close" size={24} color="#333" />
            </View>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.menuItems}>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={`menu-item-${index}`} 
              style={styles.menuItem}
              onPress={() => {
                onClose();
                onNavigate(item.route);
              }}
            >
              <View>
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={24} color="#6200ee" />
              </View>
              <Text style={styles.menuItemText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

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
  const [menuVisible, setMenuVisible] = useState(false);
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
  
  // Handle navigation
  const handleNavigate = (route: string) => {
    if (route === '/assistant') {
      // Already on this page, do nothing
      return;
    }
    
    // Cast the route string to the appropriate type for router.push
    router.push(route as any);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 85}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#f7f7f7" />
      
      {/* Use the shared AppHeader component */}
      <AppHeader 
        title="Calendar Assistant" 
        onMenuPress={() => setMenuVisible(true)}
      />
      
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
      
      <SideMenu 
        isVisible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleNavigate}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
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
  // Side Menu Styles
  menuOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  menuOverlayBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 280,
    backgroundColor: '#fff',
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginTop: 30, // Add padding at top to position menu header lower
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  menuItems: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 16,
    color: '#333',
  },
});