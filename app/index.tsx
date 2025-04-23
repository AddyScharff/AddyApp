import {
  Text,
  View,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  Dimensions,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useMemo, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Id } from "../convex/_generated/dataModel";
import { AppHeader } from "./_layout";

// Define activity type
interface Activity {
  _id: Id<"activities">;  // Fixed: Using proper Convex ID type
  name: string;
  type: string;
  startTime: number;
  endTime: number;
}

// Helper function to format dates from timestamps
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Type mapping for activity icons and colors
interface ActivityStyle {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

const activityStyles: Record<string, ActivityStyle> = {
  work: {
    icon: "briefcase-outline",
    color: "#3700b3",
    bgColor: "#eae6ff"
  },
  meeting: {
    icon: "people-outline",
    color: "#018786",
    bgColor: "#e0f7fa"
  },
  exercise: {
    icon: "fitness-outline",
    color: "#03dac6", 
    bgColor: "#e0fdf5"
  },
  study: {
    icon: "book-outline",
    color: "#bb86fc",
    bgColor: "#f3e8ff"
  },
  meal: {
    icon: "restaurant-outline",
    color: "#ff7597",
    bgColor: "#ffe9f0"
  },
  leisure: {
    icon: "game-controller-outline",
    color: "#ffb300",
    bgColor: "#fff8e1"
  },
  default: {
    icon: "calendar-outline",
    color: "#6200ee",
    bgColor: "#f0e8ff"
  }
};

// Constants for the calendar view
const HOUR_HEIGHT = 60; // Height for one hour in the calendar
const TIME_COLUMN_WIDTH = 60; // Width of the time column on the left
const SCREEN_WIDTH = Dimensions.get('window').width;
const CALENDAR_WIDTH = SCREEN_WIDTH - TIME_COLUMN_WIDTH - 20; // Width of the calendar area

// Activity card component for calendar view
const CalendarActivityCard = ({ 
  activity, 
  onPress,
  top,
  height
}: { 
  activity: Activity;
  onPress: (activity: Activity) => void;
  top: number;
  height: number;
}) => {
  // Get activity style based on type
  const activityType = activity.type.toLowerCase();
  const style = activityStyles[activityType] || activityStyles.default;

  return (
    <TouchableOpacity
      style={[
        styles.calendarCard, 
        { 
          backgroundColor: style.bgColor,
          top: top,
          height: height,
        }
      ]}
      onPress={() => onPress(activity)}
    >
      <Text style={styles.calendarCardTitle}>{activity.name}</Text>
      <View style={styles.calendarCardFooter}>
        <View>
          <Ionicons name={style.icon} size={14} color={style.color} />
        </View>
        <Text style={[styles.calendarCardType, { color: style.color }]}>{activity.type}</Text>
      </View>
    </TouchableOpacity>
  );
};

// Generate time slots for the calendar
const generateTimeSlots = () => {
  const slots = [];
  for (let i = 0; i < 24; i++) {
    // Format hour in 12-hour format
    const hour = i % 12 || 12;
    const ampm = i < 12 ? 'AM' : 'PM';
    slots.push(`${hour} ${ampm}`);
  }
  return slots;
};

// Activity actions modal component
const ActivityActionsModal = ({ 
  visible, 
  activity, 
  onClose, 
  onEdit, 
  onDelete 
}: { 
  visible: boolean;
  activity: Activity | null;
  onClose: () => void;
  onEdit: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
}) => {
  if (!activity) return null;
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{activity.name}</Text>
            <Text style={styles.modalSubtitle}>{activity.type}</Text>
            <Text style={styles.modalTime}>
              {formatDate(activity.startTime)} - {formatDate(activity.endTime)}
            </Text>
            
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => {
                onClose();
                onEdit(activity);
              }}
            >
              <View>
                <Ionicons name="create-outline" size={22} color="#6200ee" />
              </View>
              <Text style={styles.actionText}>Edit Activity</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]} 
              onPress={() => {
                onClose();
                onDelete(activity);
              }}
            >
              <View>
                <Ionicons name="trash-outline" size={22} color="#f44336" />
              </View>
              <Text style={[styles.actionText, styles.deleteText]}>Delete Activity</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

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

export default function Index() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [menuVisible, setMenuVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Add state for selected date, initialize with current date
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Get date for the header
  const formattedDate = selectedDate.toLocaleDateString(undefined, { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  // Navigation functions for calendar dates
  const goToPreviousDay = () => {
    const prevDay = new Date(selectedDate);
    prevDay.setDate(prevDay.getDate() - 1);
    setSelectedDate(prevDay);
  };

  const goToNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setSelectedDate(nextDay);
  };
  
  // Fetch activities for the selected date from Convex
  const activities = useQuery(api.activities.getByDate, { date: selectedDate.getTime() });
  const deleteActivity = useMutation(api.activities.remove);

  // Update current time every minute
  useEffect(() => {
    const updateCurrentTime = () => {
      setCurrentTime(new Date());
    };

    // Update current time immediately
    updateCurrentTime();
    
    // Setup interval to update time every minute
    const interval = setInterval(updateCurrentTime, 60000);
    
    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  // Scroll to current time on initial load
  useEffect(() => {
    if (scrollViewRef.current) {
      // Calculate position based on current time
      const hours = currentTime.getHours();
      const minutes = currentTime.getMinutes();
      const scrollPosition = (hours + minutes / 60) * HOUR_HEIGHT;
      
      // Add a small delay to ensure the scroll view is rendered
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, scrollPosition - 200), // Scroll to current time minus some padding
          animated: true
        });
      }, 500);
    }
  }, []);

  // Calculate current time position
  const currentTimePosition = useMemo(() => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    return (hours + minutes / 60) * HOUR_HEIGHT;
  }, [currentTime]);

  // Sort activities by start time
  const sortedActivities = useMemo(() => {
    if (!activities) return [];
    return [...activities].sort((a, b) => a.startTime - b.startTime);
  }, [activities]);

  // Generate time slots for the calendar
  const timeSlots = generateTimeSlots();

  const onRefresh = () => {
    setRefreshing(true);
    // The query will automatically refresh
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleActivityPress = (activity: Activity) => {
    setSelectedActivity(activity);
    setModalVisible(true);
  };

  const handleEdit = (activity: Activity) => {
    router.push({
      pathname: "/edit",
      params: { id: activity._id }
    });
  };

  const handleDelete = (activity: Activity) => {
    Alert.alert(
      "Delete Activity",
      `Are you sure you want to delete "${activity.name}"?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteActivity({ id: activity._id });
            } catch (error) {
              console.error("Error deleting activity:", error);
              Alert.alert("Error", "Failed to delete activity. Please try again.");
            }
          }
        }
      ]
    );
  };

  // Function to calculate position and height of an activity in the calendar
  const calculateActivityPosition = (activity: Activity) => {
    // Create Date objects from the timestamps
    const startTime = new Date(activity.startTime);
    const endTime = new Date(activity.endTime);
    
    // Log the timestamps and their Date representations for debugging
    console.log(`Activity: ${activity.name}`);
    console.log(`Start timestamp: ${activity.startTime}, Date: ${startTime.toLocaleString()}`);
    console.log(`End timestamp: ${activity.endTime}, Date: ${endTime.toLocaleString()}`);
  
    // Extract hours and minutes adjusted for local timezone display
    const startHour = startTime.getHours();
    const startMinutes = startTime.getMinutes();
    const endHour = endTime.getHours();
    const endMinutes = endTime.getMinutes();
    
    // Calculate top position based on start time
    const top = (startHour + startMinutes / 60) * HOUR_HEIGHT;
    
    // Calculate height based on duration
    let durationHours = (endHour - startHour) + (endMinutes - startMinutes) / 60;
    
    // If end time is before start time in the same day (e.g., crosses midnight)
    // adjust the duration calculation
    if (durationHours <= 0 && startTime.getDate() === endTime.getDate()) {
      durationHours = 24 + durationHours;
    }
    
    const height = Math.max(durationHours * HOUR_HEIGHT, 30); // Minimum height of 30
    
    return { top, height };
  };

  const handleNavigate = (route: string) => {
    if (route === '/') {
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
        title="My Calendar" 
        subtitle={formattedDate}
        onMenuPress={() => setMenuVisible(true)}
      />

      <View style={styles.dateNavigation}>
        <TouchableOpacity onPress={goToPreviousDay}>
          <Ionicons name="chevron-back-outline" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerDate}>{formattedDate}</Text>
        <TouchableOpacity onPress={goToNextDay}>
          <Ionicons name="chevron-forward-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {activities === undefined ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Loading activities...</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.calendarContainer}
          contentContainerStyle={styles.calendarContent}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.calendarLayout}>
            {/* Time Column */}
            <View style={styles.timeColumn}>
              {timeSlots.map((time, index) => (
                <View key={`time-${index}`} style={styles.timeSlot}>
                  <Text style={styles.timeText}>{time}</Text>
                </View>
              ))}
            </View>
            
            {/* Calendar Content */}
            <View style={styles.calendarGrid}>
              {/* Hour Grid Lines */}
              {timeSlots.map((_, index) => (
                <View key={`line-${index}`} style={styles.hourLine} />
              ))}
              
              {/* Current Time Indicator */}
              <View style={[
                styles.currentTimeIndicator,
                { top: currentTimePosition }
              ]}>
                <View style={styles.currentTimeDot} />
                <View style={styles.currentTimeLine} />
              </View>
              
              {/* Activities */}
              {sortedActivities.length === 0 ? (
                <View style={styles.emptyCalendar}>
                  <Ionicons name="calendar-outline" size={60} color="#ddd" />
                  <Text style={styles.emptyText}>No activities for today</Text>
                </View>
              ) : (
                sortedActivities.map((activity) => {
                  const { top, height } = calculateActivityPosition(activity);
                  return (
                    <CalendarActivityCard
                      key={activity._id.toString()}
                      activity={activity}
                      onPress={handleActivityPress}
                      top={top}
                      height={height}
                    />
                  );
                })
              )}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Bottom floating action button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => {
            router.push("/hello");
          }}
        >
          <View>
            <Ionicons name="add" size={28} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      <ActivityActionsModal
        visible={modalVisible}
        activity={selectedActivity}
        onClose={() => setModalVisible(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

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
  headerDate: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  
  // Calendar Specific Styles
  calendarContainer: {
    flex: 1,
  },
  calendarContent: {
    paddingBottom: 80, // Increased to accommodate the FAB
  },
  calendarLayout: {
    flexDirection: "row",
    flex: 1,
    minHeight: HOUR_HEIGHT * 24,
  },
  timeColumn: {
    width: TIME_COLUMN_WIDTH,
    backgroundColor: "#f0f0f0",
  },
  timeSlot: {
    height: HOUR_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  timeText: {
    fontSize: 12,
    color: "#666",
  },
  calendarGrid: {
    flex: 1,
    position: "relative",
    backgroundColor: "#fff",
  },
  hourLine: {
    position: "absolute",
    height: 1,
    left: 0,
    right: 0,
    backgroundColor: "#e0e0e0",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  calendarCard: {
    position: "absolute",
    left: 4,
    right: 4,
    borderRadius: 6,
    padding: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    overflow: "hidden",
  },
  calendarCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  calendarCardFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  calendarCardType: {
    fontSize: 12,
    marginLeft: 4,
  },
  emptyCalendar: {
    position: "absolute",
    top: "40%",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 8,
  },
  
  // Current Time Indicator
  currentTimeIndicator: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },
  currentTimeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#f44336",
    marginLeft: -6,
    marginRight: 4,
  },
  currentTimeLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#f44336",
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalContent: {
    padding: 22,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  modalTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
  },
  deleteButton: {
    borderBottomWidth: 0,
  },
  deleteText: {
    color: '#f44336',
  },
  cancelButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },

  // Floating Action Button
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6200ee",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#6200ee",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
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
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
});
