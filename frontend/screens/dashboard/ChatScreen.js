import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import BASE_URL from '../../utils/config';

// Mock data for initial development
const MOCK_INITIAL_MESSAGES = [
  {
    id: '1',
    text: 'Hello! How can I help you with your nutrition today?',
    sender: 'assistant',
    timestamp: new Date(Date.now() - 60000 * 30).toISOString(), // 30 mins ago
  },
];

const ChatScreen = ({ navigation, route }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);

  // Simulated polling interval (in ms) - would be replaced with real-time solution
  const POLLING_INTERVAL = 3000;

  useEffect(() => {
    const loadUserAndChat = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const user = JSON.parse(atob(token.split('.')[1]));
          setUserId(user.id);
          
          // Check if we have a session ID from navigation params
          const activeSessionId = route.params?.sessionId;
          
          if (activeSessionId) {
            setSessionId(activeSessionId);
            await fetchSessionMessages(activeSessionId);
          } else {
            // Create a new session or get the most recent one
            await createOrGetSession(user.id);
          }
        }
      } catch (error) {
        console.log("Error loading user data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserAndChat();
    
    // Set up polling for new messages (simulating real-time)
    const interval = setInterval(() => {
      if (sessionId) {
        fetchSessionMessages(sessionId, true);
      }
    }, POLLING_INTERVAL);
    
    return () => clearInterval(interval);
  }, [sessionId, route.params?.sessionId]);

  const createOrGetSession = async (userId) => {
    // In a real implementation, you would either create a new session
    // or load the most recent active one
    
    // For now, we'll just use mock data and a fake session ID
    setSessionId('mock-session-1');
    setMessages(MOCK_INITIAL_MESSAGES);
    
    /* Real implementation would look something like:
    try {
      const token = await AsyncStorage.getItem('token');
      // Try to get the most recent active session
      const response = await axios.get(
        `${BASE_URL}/chat/sessions?active_only=true&limit=1`, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data && response.data.length > 0) {
        // Use existing session
        const session = response.data[0];
        setSessionId(session.id);
        fetchSessionMessages(session.id);
      } else {
        // Create new session
        const newSessionResponse = await axios.post(
          `${BASE_URL}/chat/sessions`,
          { title: "New Chat" },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSessionId(newSessionResponse.data.id);
        setMessages([]);
      }
    } catch (error) {
      console.log("Error creating/getting session:", error);
    }
    */
  };

  const fetchSessionMessages = async (sid, silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    
    try {
      // In a real implementation, you would fetch from your API
      // For now, we'll use mock data
      if (!silent) {
        setMessages(MOCK_INITIAL_MESSAGES);
      }
      
      /* Real implementation would look something like:
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/chat/sessions/${sid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(response.data.messages.map(msg => ({
        id: msg.id.toString(),
        text: msg.content,
        sender: msg.sender,
        timestamp: msg.created_at
      })));
      */
    } catch (error) {
      console.log("Error fetching messages:", error);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
  
    const newMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
  
    setMessages(prevMessages => [...prevMessages, newMessage]);
    setInputText('');
  
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  
    try {
      setIsTyping(true);
  
      const response = await axios.post(`${BASE_URL}/auth/chat`, {
        prompt: inputText,
      });
  
      const assistantMessage = {
        id: Date.now().toString(),
        text: response.data.response,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
      };
  
      setMessages(prevMessages => [...prevMessages, assistantMessage]);
      setIsTyping(false);
  
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.log("Error sending message:", error);
      setIsTyping(false);
      Alert.alert("Error", "Failed to get a response from the assistant.");
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }) => (
    <View 
      style={[
        styles.messageBubble,
        item.sender === 'user' ? styles.userBubble : styles.assistantBubble
      ]}
    >
      <Text style={[
        styles.messageText,
        { color: item.sender === 'user' ? '#ffffff' : '#333333' }
      ]}>
        {item.text}
      </Text>
      <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text>Loading your conversation...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Chat Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
        
        {/* Typing Indicator */}
        {isTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>Assistant is typing</Text>
            <ActivityIndicator size="small" color="#3498db" />
          </View>
        )}
        
        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity 
            style={styles.sendButton} 
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons 
              name="send" 
              size={24} 
              color={inputText.trim() ? "#3498db" : "#B0C4DE"} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    height: 60,
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 5,
  },
  archiveButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3498db',
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginVertical: 4,
  },
  userBubble: {
    backgroundColor: '#3498db',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#e5e5e5',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 10,
    color: '#888888',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginLeft: 16,
  },
  typingText: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 12,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 25 : 12, // Extra padding for iOS
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
});

export default ChatScreen;
