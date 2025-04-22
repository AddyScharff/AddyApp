import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from "expo-router";
import { useState, useRef, useEffect } from 'react';
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, Animated, ScrollView } from 'react-native';
import { AppHeader } from './_layout';

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

export default function TodoPage() {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  const handleNavigate = (route: string) => {
    if (route === '/todo') {
      // Already on this page, do nothing
      return;
    }
    
    // Cast the route string to the appropriate type for router.push
    router.push(route as any);
  };
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f7f7" />
      
      <AppHeader 
        title="To-Do List" 
        onMenuPress={() => setMenuVisible(true)}
      />

      <View style={styles.content}>
        <Ionicons name="checkbox-outline" size={80} color="#3700B3" />
        <Text style={styles.title}>Task Manager</Text>
        <Text style={styles.description}>
          This is a placeholder for the to-do list feature.
          Here you'll be able to create tasks, set priorities, and manage your daily responsibilities.
        </Text>
      </View>

      <SideMenu 
        isVisible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleNavigate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
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