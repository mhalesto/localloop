# LocalLoop Sensor Features Documentation

## Overview

LocalLoop uses advanced device sensors to create an immersive, location-aware neighborhood discovery experience. This documentation covers all sensor-powered features implemented using Expo SDK 54.

## Table of Contents

1. [Features Overview](#features-overview)
2. [Implementation Details](#implementation-details)
3. [Usage Guide](#usage-guide)
4. [API Reference](#api-reference)
5. [Platform Support](#platform-support)
6. [Permissions](#permissions)

---

## Features Overview

### 1. Step Counter (Pedometer)
**What it does:**
- Tracks daily steps automatically
- Calculates distance traveled based on average step length (0.762m)
- Displays exploration progress
- Resets automatically at midnight

**Use Cases:**
- Track neighborhood exploration
- Gamification: "You've explored 60% of your neighborhood"
- Achievement system based on daily step goals
- Distance-based content discovery

**How it works:**
- Uses the device's built-in pedometer sensor
- Subscribes to real-time step count updates
- Persists daily step count to AsyncStorage
- Auto-resets every day at midnight

---

### 2. Activity Detection (DeviceMotion)
**What it does:**
- Detects current user activity (Stationary, Walking, Running, Driving)
- Automatically adjusts discovery radius based on movement
- Provides smart proximity filtering for content

**Activity Thresholds:**
| Activity | Threshold | Discovery Radius |
|----------|-----------|------------------|
| Stationary | < 0.05 | 100m |
| Walking | 0.05 - 0.5 | 500m |
| Running | 0.5 - 1.5 | 1km |
| Driving | > 1.5 | 5km |

**Use Cases:**
- Hyper-local content when standing still
- Expanding content radius while moving
- Context-aware notifications
- Smart content filtering

---

### 3. Shake to Discover (Accelerometer)
**What it does:**
- Detects shake gestures
- Shows random nearby posts when shaken
- Debounced to prevent accidental triggers (1 second cooldown)

**Shake Threshold:**
- Acceleration magnitude > 2.5

**Use Cases:**
- Fun discovery mechanism
- Serendipitous content exploration
- Quick refresh alternative
- Interactive user engagement

**Implementation:**
```javascript
// Register shake handler
const { registerShakeHandler } = useSensors();

useEffect(() => {
  registerShakeHandler(() => {
    // Handle shake event
    console.log('Device shaken!');
    // Show random nearby post
  });
}, []);
```

---

### 4. Weather Awareness (Barometer)
**What it does:**
- Measures atmospheric pressure (hPa)
- Detects weather conditions automatically
- Enables weather-based features

**Pressure Ranges:**
| Condition | Pressure (hPa) | Description |
|-----------|----------------|-------------|
| Stormy | < 1000 | Low pressure system |
| Rainy | 1000 - 1010 | Below average |
| Normal | 1010 - 1020 | Standard pressure |
| Clear | > 1020 | High pressure |

**Use Cases:**
- Weather-based post filtering
- Storm alerts for neighborhood safety
- "Rainy day check-ins" special posts
- Atmospheric condition badges on posts

**Note:** Only available on iOS and Android (not web)

---

### 5. Compass Navigation (Magnetometer)
**What it does:**
- Provides real-time compass heading (0-360°)
- Shows cardinal direction (N, NE, E, SE, S, SW, W, NW)
- Enables directional post discovery

**Use Cases:**
- "Posts north of you" compass view
- Directional navigation: "3 new posts 200m east"
- AR-style point-to-discover feature
- Spatial awareness in feed

**Directions Calculation:**
```javascript
const { compassHeading, getCompassDirection } = useSensors();

console.log(compassHeading); // 45
console.log(getCompassDirection()); // "NE"
```

**Note:** Only available on iOS and Android (not web)

---

### 6. Ambient Light Adaptation (LightSensor)
**What it does:**
- Measures ambient light in lux
- Auto-adapts UI brightness
- Provides environmental awareness

**Light Levels:**
| Condition | Lux Range | UI Adaptation |
|-----------|-----------|---------------|
| Dark | < 10 | Maximum dimming |
| Dim | 10 - 50 | Low brightness |
| Indoor | 50 - 1000 | Normal brightness |
| Bright | 1000 - 10000 | Enhanced contrast |
| Very Bright | > 10000 | Maximum brightness |

**Use Cases:**
- Auto dark mode in low light
- Brighter UI outdoors
- Reading mode optimization
- Battery conservation

**Note:** **Android only** - iOS doesn't expose ambient light sensor

---

## Implementation Details

### Architecture

```
App.js
├── AuthProvider
├── SettingsProvider
│   └── SensorsProvider ← Sensor management
│       ├── PostsProvider
│       └── StatusesProvider
```

### Files Structure

```
contexts/
├── SensorsContext.js ← Main sensor logic and state management

components/
├── NeighborhoodExplorer.js ← UI component displaying sensor data

screens/
├── CountryScreen.js ← Shows NeighborhoodExplorer
└── SettingsScreen.js ← Sensor toggle controls

docs/
└── SENSOR_FEATURES.md ← This file
```

### State Management

The `SensorsContext` manages all sensor state:

```javascript
const {
  // Feature toggles
  stepCounterEnabled,
  motionDetectionEnabled,
  shakeEnabled,
  barometerEnabled,
  compassEnabled,
  ambientLightEnabled,

  // Toggle functions
  toggleStepCounter,
  toggleMotionDetection,
  toggleShake,
  toggleBarometer,
  toggleCompass,
  toggleAmbientLight,

  // Sensor data
  stepCount,
  dailySteps,
  currentActivity,
  proximityRadius,
  atmosphericPressure,
  weatherCondition,
  compassHeading,
  getCompassDirection,
  ambientLight,
  explorationProgress,

  // Methods
  registerShakeHandler,
  updateExplorationData
} = useSensors();
```

### Persistence

All sensor settings and data are persisted to AsyncStorage:

- Feature toggles → Preserved across app restarts
- Daily steps → Reset at midnight, stored throughout day
- Exploration data → Cumulative tracking of visited locations
- Last reset timestamp → Ensures daily reset accuracy

**Storage Keys:**
```javascript
@sensors/stepCounterEnabled
@sensors/motionDetectionEnabled
@sensors/shakeEnabled
@sensors/barometerEnabled
@sensors/compassEnabled
@sensors/ambientLightEnabled
@sensors/dailySteps
@sensors/lastStepReset
@sensors/explorationData
```

---

## Usage Guide

### For Users

#### Enabling Sensor Features

1. Open **Settings** screen
2. Scroll to **"Neighborhood Discovery"** section
3. Toggle the features you want:
   - Step counter
   - Activity detection
   - Shake to discover
   - Weather awareness
   - Compass navigation
   - Ambient light adaptation (Android only)

#### Viewing Sensor Data

The **Neighborhood Explorer** card appears on the home screen (Country screen) when any sensor is enabled. It shows:

- Daily step count and distance traveled
- Current activity and discovery radius
- Weather conditions (if barometer enabled)
- Compass heading (if compass enabled)
- Ambient light level (Android only)
- Exploration progress

#### Using Shake to Discover

1. Enable "Shake to discover" in Settings
2. On any screen, shake your phone
3. You'll see a random nearby post from your discovery radius

---

### For Developers

#### Adding Sensor Data to Your Component

```javascript
import { useSensors } from '../contexts/SensorsContext';

function MyComponent() {
  const {
    dailySteps,
    currentActivity,
    proximityRadius,
    weatherCondition
  } = useSensors();

  return (
    <View>
      <Text>Steps: {dailySteps}</Text>
      <Text>Activity: {currentActivity}</Text>
      <Text>Radius: {proximityRadius}m</Text>
      <Text>Weather: {weatherCondition}</Text>
    </View>
  );
}
```

#### Implementing Shake Handler

```javascript
import { useSensors } from '../contexts/SensorsContext';

function MyScreen() {
  const { registerShakeHandler, shakeEnabled } = useSensors();

  useEffect(() => {
    if (!shakeEnabled) return;

    registerShakeHandler(() => {
      // Your shake handler logic
      Alert.alert('Shake detected!');
      // Show random post, refresh content, etc.
    });
  }, [shakeEnabled, registerShakeHandler]);

  return <View>...</View>;
}
```

#### Filtering Content by Proximity

```javascript
function MyFeed() {
  const { proximityRadius, currentActivity } = useSensors();

  const filteredPosts = posts.filter(post => {
    const distance = calculateDistance(
      userLocation,
      post.location
    );
    return distance <= proximityRadius;
  });

  return (
    <View>
      <Text>Showing posts within {proximityRadius}m</Text>
      <Text>Activity: {currentActivity}</Text>
      {filteredPosts.map(post => <PostCard post={post} />)}
    </View>
  );
}
```

#### Tracking Exploration Progress

```javascript
function ExplorationTracker() {
  const { explorationProgress, updateExplorationData } = useSensors();

  useEffect(() => {
    // When user visits a new location
    const newLocation = {
      lat: 40.7128,
      lng: -74.0060,
      timestamp: Date.now()
    };

    updateExplorationData(newLocation);
  }, [currentLocation]);

  return (
    <View>
      <Text>
        Neighborhood Coverage: {explorationProgress.neighborhoodCoverage}%
      </Text>
      <Text>
        Locations Visited: {explorationProgress.locationsVisited.length}
      </Text>
      <Text>
        Total Distance: {(explorationProgress.totalDistance / 1000).toFixed(2)} km
      </Text>
    </View>
  );
}
```

---

## API Reference

### SensorsContext API

#### Properties

##### Feature Toggles
- `stepCounterEnabled: boolean` - Step counter feature state
- `motionDetectionEnabled: boolean` - Motion detection state
- `shakeEnabled: boolean` - Shake detection state
- `barometerEnabled: boolean` - Barometer state
- `compassEnabled: boolean` - Compass state
- `ambientLightEnabled: boolean` - Light sensor state

##### Toggle Functions
- `toggleStepCounter(value: boolean): Promise<void>`
- `toggleMotionDetection(value: boolean): Promise<void>`
- `toggleShake(value: boolean): Promise<void>`
- `toggleBarometer(value: boolean): Promise<void>`
- `toggleCompass(value: boolean): Promise<void>`
- `toggleAmbientLight(value: boolean): Promise<void>`

##### Sensor Data
- `stepCount: number` - Current step count
- `dailySteps: number` - Total steps today
- `currentActivity: 'STATIONARY' | 'WALKING' | 'RUNNING' | 'DRIVING'`
- `proximityRadius: number` - Discovery radius in meters
- `atmosphericPressure: number | null` - Pressure in hPa
- `weatherCondition: 'stormy' | 'rainy' | 'normal' | 'clear'`
- `compassHeading: number` - Heading in degrees (0-360)
- `ambientLight: number | null` - Light level in lux
- `explorationProgress: object` - Exploration statistics
  - `locationsVisited: Array<Location>`
  - `totalDistance: number` - In meters
  - `neighborhoodCoverage: number` - Percentage (0-100)

##### Methods
- `getCompassDirection(): string` - Returns cardinal direction (N, NE, E, etc.)
- `registerShakeHandler(callback: Function): void` - Register shake callback
- `updateExplorationData(location: Location): Promise<void>` - Track new location

---

### NeighborhoodExplorer Component

Displays sensor data in a beautiful card interface.

**Props:** None (reads from SensorsContext)

**Usage:**
```javascript
import NeighborhoodExplorer from '../components/NeighborhoodExplorer';

function MyScreen() {
  return (
    <View>
      <NeighborhoodExplorer />
      {/* Other content */}
    </View>
  );
}
```

**Features:**
- Auto-hides when no sensors are enabled
- Responsive grid layout
- Real-time data updates
- Theme-aware styling
- Activity-based hints

---

## Platform Support

| Feature | iOS | Android | Web |
|---------|-----|---------|-----|
| Step Counter | ✅ | ✅ | ❌ |
| Activity Detection | ✅ | ✅ | ✅ |
| Shake to Discover | ✅ | ✅ | ✅ |
| Weather Awareness | ✅ | ✅ | ❌ |
| Compass Navigation | ✅ | ✅ | ❌ |
| Ambient Light | ❌ | ✅ | ❌ |

### Notes:
- **Web:** Limited sensor access due to browser restrictions
- **iOS:** No ambient light sensor API available
- **Android:** Full sensor support including light sensor

---

## Permissions

### iOS (app.json / Info.plist)

```json
{
  "ios": {
    "infoPlist": {
      "NSMotionUsageDescription": "LocalLoop uses your device motion to detect activity and enhance your neighborhood discovery experience."
    }
  }
}
```

### Android (app.json)

No special permissions required for sensors. However, for high-frequency sampling:

```json
{
  "android": {
    "permissions": [
      "HIGH_SAMPLING_RATE_SENSORS"
    ]
  }
}
```

**Note:** Most sensors work without this permission. Only needed for >200Hz sampling on Android 12+.

---

## Performance Considerations

### Update Intervals

Each sensor has an optimized update interval:

| Sensor | Interval | Reason |
|--------|----------|--------|
| Pedometer | Real-time | Accurate step tracking |
| DeviceMotion | 1000ms | Activity detection doesn't need high frequency |
| Accelerometer | 100ms | Responsive shake detection |
| Barometer | 60000ms | Weather changes slowly |
| Magnetometer | 500ms | Smooth compass updates |
| LightSensor | 2000ms | Environmental changes are gradual |

### Battery Impact

Sensor features are designed for minimal battery impact:

- **Low:** Barometer, LightSensor (infrequent updates)
- **Medium:** Pedometer, Magnetometer, DeviceMotion
- **Higher:** Accelerometer (shake detection)

**Recommendation:** Users can toggle features on/off as needed to balance functionality with battery life.

---

## Troubleshooting

### Sensor Not Working

1. **Check device compatibility:**
   ```javascript
   import { Pedometer } from 'expo-sensors';

   const available = await Pedometer.isAvailableAsync();
   if (!available) {
     console.log('Pedometer not available on this device');
   }
   ```

2. **Verify feature is enabled:**
   - Check Settings → Neighborhood Discovery
   - Ensure toggle is ON

3. **Check permissions (iOS):**
   - Settings → Privacy → Motion & Fitness
   - Ensure LocalLoop has permission

### Steps Not Updating

1. Verify pedometer is enabled in Settings
2. Check that daily step reset happened (midnight check)
3. Force close and restart the app
4. Clear AsyncStorage cache if issues persist

### Shake Not Detected

1. Increase shake intensity
2. Check that shake detection is enabled
3. Verify accelerometer availability
4. Try shaking in different directions

---

## Future Enhancements

Potential additions for future versions:

1. **Gyroscope Integration**
   - Detect phone orientation
   - Portrait/landscape content optimization

2. **Background Location Tracking**
   - Track neighborhood exploration even when app is closed
   - Heat map of areas visited

3. **Proximity Beacons**
   - Detect nearby LocalLoop users
   - "Bump to connect" feature

4. **Step Challenges**
   - Weekly/monthly step goals
   - Neighborhood leaderboards
   - Achievement badges

5. **Weather Predictions**
   - Use barometer trends to predict weather
   - "Rain likely in next hour" notifications

6. **AR Compass Mode**
   - Camera overlay with directional post markers
   - "Point your phone to discover" feature

---

## Credits

**Implementation:** Claude Code (Anthropic)
**Sensors Library:** expo-sensors (Expo SDK 54)
**Framework:** React Native + Expo
**Date:** November 2025

---

## Support

For issues or questions:
- GitHub Issues: [LocalLoop Repository](https://github.com/hlalisani/codex/issues)
- Documentation: This file
- Expo Sensors Docs: https://docs.expo.dev/versions/latest/sdk/sensors/

---

**Happy Exploring! 🚀**
