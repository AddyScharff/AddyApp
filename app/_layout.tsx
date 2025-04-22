import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated, ScrollView, StyleSheet, SafeAreaView, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

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

  // Updated menu items to only include existing pages
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

// Reusable header component with hamburger menu for all screens
export const AppHeader = ({ 
  title, 
  subtitle = null, 
  onMenuPress 
}: { 
  title: string,
  subtitle?: string | null,
  onMenuPress: () => void
}) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onMenuPress}>
          <View>
            <Ionicons name="menu" size={24} color="#333" />
          </View>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
        </View>
        <View style={{ width: 24 }} /> {/* Empty view for spacing */}
      </View>
    </SafeAreaView>
  );
};

export default function RootLayout() {
  const [menuVisible, setMenuVisible] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigate = (route: string) => {
    if (route === pathname) {
      // Already on this page, do nothing
      return;
    }
    
    // Cast the route string to the appropriate type for router.push
    router.push({
      pathname: route as any,
      // Add this option to prevent animation
      params: { animation: 'none' }
    });
  };

  return (
    <ConvexProvider client={convex}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f7f7" />
      
      {/* Use Stack with headerShown false so we can use custom headers */}
      <Stack
        screenOptions={{
          headerShown: false,
          // Disable animations globally
          animation: 'none',
          // These additional options help eliminate any remaining flickers
          animationTypeForReplace: 'pop',
          presentation: 'containedTransparentModal',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="hello" />
        <Stack.Screen name="edit" />
        <Stack.Screen name="assistant" />
        <Stack.Screen name="todo" />
      </Stack>

      <SideMenu 
        isVisible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleNavigate}
      />
    </ConvexProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#fff',
    paddingTop: 30, // Add extra padding at top to position header lower
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
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
    textAlign: "center",
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