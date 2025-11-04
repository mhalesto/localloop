import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Accelerometer,
  Barometer,
  DeviceMotion,
  Gyroscope,
  LightSensor,
  Magnetometer,
  Pedometer
} from 'expo-sensors';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SensorsContext = createContext(null);

const STORAGE_KEYS = {
  STEP_COUNTER_ENABLED: '@sensors/stepCounterEnabled',
  MOTION_DETECTION_ENABLED: '@sensors/motionDetectionEnabled',
  SHAKE_ENABLED: '@sensors/shakeEnabled',
  BAROMETER_ENABLED: '@sensors/barometerEnabled',
  COMPASS_ENABLED: '@sensors/compassEnabled',
  AMBIENT_LIGHT_ENABLED: '@sensors/ambientLightEnabled',
  DAILY_STEPS: '@sensors/dailySteps',
  LAST_STEP_RESET: '@sensors/lastStepReset',
  EXPLORATION_DATA: '@sensors/explorationData'
};

// Activity detection thresholds
const ACTIVITY_THRESHOLDS = {
  STATIONARY: 0.05,
  WALKING: 0.5,
  RUNNING: 1.5,
  DRIVING: 3.0
};

// Shake detection threshold
const SHAKE_THRESHOLD = 2.5;

// Distance calculation based on activity
const PROXIMITY_RADIUS = {
  STATIONARY: 100,   // 100 meters
  WALKING: 500,      // 500 meters
  RUNNING: 1000,     // 1 km
  DRIVING: 5000      // 5 km
};

export function SensorsProvider({ children }) {
  // Feature toggles - start all disabled by default for safety
  const [stepCounterEnabled, setStepCounterEnabled] = useState(false);
  const [motionDetectionEnabled, setMotionDetectionEnabled] = useState(false);
  const [shakeEnabled, setShakeEnabled] = useState(false);
  const [barometerEnabled, setBarometerEnabled] = useState(false);
  const [compassEnabled, setCompassEnabled] = useState(false);
  const [ambientLightEnabled, setAmbientLightEnabled] = useState(false);

  // Sensor data
  const [stepCount, setStepCount] = useState(0);
  const [dailySteps, setDailySteps] = useState(0);
  const [currentActivity, setCurrentActivity] = useState('STATIONARY');
  const [proximityRadius, setProximityRadius] = useState(PROXIMITY_RADIUS.STATIONARY);
  const [atmosphericPressure, setAtmosphericPressure] = useState(null);
  const [weatherCondition, setWeatherCondition] = useState('normal');
  const [compassHeading, setCompassHeading] = useState(0);
  const [ambientLight, setAmbientLight] = useState(null);
  const [autoAdaptUI, setAutoAdaptUI] = useState(false);
  const [explorationProgress, setExplorationProgress] = useState({
    locationsVisited: [],
    totalDistance: 0,
    neighborhoodCoverage: 0
  });

  // Shake detection
  const [onShake, setOnShake] = useState(null);
  const lastShakeTime = useRef(0);

  // Subscriptions
  const pedometerSubscription = useRef(null);
  const motionSubscription = useRef(null);
  const accelerometerSubscription = useRef(null);
  const barometerSubscription = useRef(null);
  const magnetometerSubscription = useRef(null);
  const lightSensorSubscription = useRef(null);

  // Load persisted settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [
        stepEnabled,
        motionEnabled,
        shakeEnabledVal,
        baroEnabled,
        compEnabled,
        lightEnabled,
        savedDailySteps,
        lastReset,
        explorationDataStr
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.STEP_COUNTER_ENABLED),
        AsyncStorage.getItem(STORAGE_KEYS.MOTION_DETECTION_ENABLED),
        AsyncStorage.getItem(STORAGE_KEYS.SHAKE_ENABLED),
        AsyncStorage.getItem(STORAGE_KEYS.BAROMETER_ENABLED),
        AsyncStorage.getItem(STORAGE_KEYS.COMPASS_ENABLED),
        AsyncStorage.getItem(STORAGE_KEYS.AMBIENT_LIGHT_ENABLED),
        AsyncStorage.getItem(STORAGE_KEYS.DAILY_STEPS),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_STEP_RESET),
        AsyncStorage.getItem(STORAGE_KEYS.EXPLORATION_DATA)
      ]);

      if (stepEnabled) setStepCounterEnabled(JSON.parse(stepEnabled));
      if (motionEnabled) setMotionDetectionEnabled(JSON.parse(motionEnabled));
      if (shakeEnabledVal) setShakeEnabled(JSON.parse(shakeEnabledVal));
      if (baroEnabled) setBarometerEnabled(JSON.parse(baroEnabled));
      if (compEnabled) setCompassEnabled(JSON.parse(compEnabled));
      if (lightEnabled) setAmbientLightEnabled(JSON.parse(lightEnabled));

      // Reset daily steps if it's a new day
      const today = new Date().toDateString();
      if (lastReset !== today) {
        setDailySteps(0);
        await AsyncStorage.setItem(STORAGE_KEYS.DAILY_STEPS, '0');
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_STEP_RESET, today);
      } else if (savedDailySteps) {
        setDailySteps(parseInt(savedDailySteps, 10));
      }

      if (explorationDataStr) {
        setExplorationProgress(JSON.parse(explorationDataStr));
      }
    } catch (error) {
      console.log('Error loading sensor settings:', error);
    }
  };

  // ===== PEDOMETER - Step Counter =====
  useEffect(() => {
    if (!stepCounterEnabled) {
      if (pedometerSubscription.current) {
        pedometerSubscription.current.remove();
        pedometerSubscription.current = null;
      }
      return;
    }

    const checkAvailability = async () => {
      try {
        const available = await Pedometer.isAvailableAsync();
        if (!available) {
          console.log('Pedometer not available on this device');
          return;
        }

        // Get today's steps
        const end = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const result = await Pedometer.getStepCountAsync(start, end);
        if (result) {
          setDailySteps(result.steps);
          await AsyncStorage.setItem(STORAGE_KEYS.DAILY_STEPS, String(result.steps));
        }

        // Subscribe to real-time updates
        pedometerSubscription.current = Pedometer.watchStepCount((result) => {
          setStepCount(result.steps);
          setDailySteps(prev => {
            const newSteps = prev + 1;
            AsyncStorage.setItem(STORAGE_KEYS.DAILY_STEPS, String(newSteps));
            return newSteps;
          });
        });
      } catch (error) {
        console.log('Error initializing pedometer:', error);
      }
    };

    checkAvailability();

    return () => {
      if (pedometerSubscription.current) {
        pedometerSubscription.current.remove();
      }
    };
  }, [stepCounterEnabled]);

  // ===== DEVICE MOTION - Activity Detection =====
  useEffect(() => {
    if (!motionDetectionEnabled) {
      if (motionSubscription.current) {
        motionSubscription.current.remove();
        motionSubscription.current = null;
      }
      return;
    }

    const initMotion = async () => {
      try {
        const available = await DeviceMotion.isAvailableAsync();
        if (!available) {
          console.log('DeviceMotion not available on this device');
          return;
        }

        DeviceMotion.setUpdateInterval(1000); // Update every second

        motionSubscription.current = DeviceMotion.addListener((data) => {
          if (!data.acceleration) return;

          const { x, y, z } = data.acceleration;
          const magnitude = Math.sqrt(x * x + y * y + z * z);

          let activity = 'STATIONARY';
          if (magnitude > ACTIVITY_THRESHOLDS.DRIVING) {
            activity = 'DRIVING';
          } else if (magnitude > ACTIVITY_THRESHOLDS.RUNNING) {
            activity = 'RUNNING';
          } else if (magnitude > ACTIVITY_THRESHOLDS.WALKING) {
            activity = 'WALKING';
          }

          setCurrentActivity(activity);
          setProximityRadius(PROXIMITY_RADIUS[activity]);
        });
      } catch (error) {
        console.log('Error initializing DeviceMotion:', error);
      }
    };

    initMotion();

    return () => {
      if (motionSubscription.current) {
        motionSubscription.current.remove();
      }
    };
  }, [motionDetectionEnabled]);

  // ===== ACCELEROMETER - Shake to Discover =====
  useEffect(() => {
    if (!shakeEnabled) {
      if (accelerometerSubscription.current) {
        accelerometerSubscription.current.remove();
        accelerometerSubscription.current = null;
      }
      return;
    }

    const initAccelerometer = async () => {
      try {
        const available = await Accelerometer.isAvailableAsync();
        if (!available) {
          console.log('Accelerometer not available on this device');
          return;
        }

        Accelerometer.setUpdateInterval(100); // Check every 100ms

        accelerometerSubscription.current = Accelerometer.addListener((data) => {
          const { x, y, z } = data;
          const acceleration = Math.sqrt(x * x + y * y + z * z);

          if (acceleration > SHAKE_THRESHOLD) {
            const now = Date.now();
            // Debounce: only trigger once per second
            if (now - lastShakeTime.current > 1000) {
              lastShakeTime.current = now;
              if (onShake) {
                onShake();
              }
            }
          }
        });
      } catch (error) {
        console.log('Error initializing Accelerometer:', error);
      }
    };

    initAccelerometer();

    return () => {
      if (accelerometerSubscription.current) {
        accelerometerSubscription.current.remove();
      }
    };
  }, [shakeEnabled, onShake]);

  // ===== BAROMETER - Weather Awareness =====
  useEffect(() => {
    if (!barometerEnabled || Platform.OS === 'web') {
      if (barometerSubscription.current) {
        barometerSubscription.current.remove();
        barometerSubscription.current = null;
      }
      return;
    }

    const checkAvailability = async () => {
      const available = await Barometer.isAvailableAsync();
      if (!available) {
        console.log('Barometer not available on this device');
        return;
      }

      Barometer.setUpdateInterval(60000); // Update every minute

      barometerSubscription.current = Barometer.addListener((data) => {
        const pressure = data.pressure; // in hPa
        setAtmosphericPressure(pressure);

        // Detect weather conditions based on pressure
        // Standard pressure is ~1013 hPa
        if (pressure < 1000) {
          setWeatherCondition('stormy');
        } else if (pressure < 1010) {
          setWeatherCondition('rainy');
        } else if (pressure > 1020) {
          setWeatherCondition('clear');
        } else {
          setWeatherCondition('normal');
        }
      });
    };

    checkAvailability();

    return () => {
      if (barometerSubscription.current) {
        barometerSubscription.current.remove();
      }
    };
  }, [barometerEnabled]);

  // ===== MAGNETOMETER - Compass =====
  useEffect(() => {
    if (!compassEnabled || Platform.OS === 'web') {
      if (magnetometerSubscription.current) {
        magnetometerSubscription.current.remove();
        magnetometerSubscription.current = null;
      }
      return;
    }

    const checkAvailability = async () => {
      const available = await Magnetometer.isAvailableAsync();
      if (!available) {
        console.log('Magnetometer not available on this device');
        return;
      }

      Magnetometer.setUpdateInterval(500); // Update twice per second

      magnetometerSubscription.current = Magnetometer.addListener((data) => {
        const { x, y } = data;
        // Calculate heading (0-360 degrees)
        let heading = Math.atan2(y, x) * (180 / Math.PI);
        if (heading < 0) heading += 360;
        setCompassHeading(heading);
      });
    };

    checkAvailability();

    return () => {
      if (magnetometerSubscription.current) {
        magnetometerSubscription.current.remove();
      }
    };
  }, [compassEnabled]);

  // ===== LIGHT SENSOR - Ambient Awareness (Android only) =====
  useEffect(() => {
    if (!ambientLightEnabled || Platform.OS !== 'android') {
      if (lightSensorSubscription.current) {
        lightSensorSubscription.current.remove();
        lightSensorSubscription.current = null;
      }
      return;
    }

    const checkAvailability = async () => {
      const available = await LightSensor.isAvailableAsync();
      if (!available) {
        console.log('Light sensor not available on this device');
        return;
      }

      LightSensor.setUpdateInterval(2000); // Update every 2 seconds

      lightSensorSubscription.current = LightSensor.addListener((data) => {
        const lux = data.illuminance;
        setAmbientLight(lux);
      });
    };

    checkAvailability();

    return () => {
      if (lightSensorSubscription.current) {
        lightSensorSubscription.current.remove();
      }
    };
  }, [ambientLightEnabled]);

  // Toggle functions with persistence
  const toggleStepCounter = useCallback(async (value) => {
    setStepCounterEnabled(value);
    await AsyncStorage.setItem(STORAGE_KEYS.STEP_COUNTER_ENABLED, JSON.stringify(value));
  }, []);

  const toggleMotionDetection = useCallback(async (value) => {
    setMotionDetectionEnabled(value);
    await AsyncStorage.setItem(STORAGE_KEYS.MOTION_DETECTION_ENABLED, JSON.stringify(value));
  }, []);

  const toggleShake = useCallback(async (value) => {
    setShakeEnabled(value);
    await AsyncStorage.setItem(STORAGE_KEYS.SHAKE_ENABLED, JSON.stringify(value));
  }, []);

  const toggleBarometer = useCallback(async (value) => {
    setBarometerEnabled(value);
    await AsyncStorage.setItem(STORAGE_KEYS.BAROMETER_ENABLED, JSON.stringify(value));
  }, []);

  const toggleCompass = useCallback(async (value) => {
    setCompassEnabled(value);
    await AsyncStorage.setItem(STORAGE_KEYS.COMPASS_ENABLED, JSON.stringify(value));
  }, []);

  const toggleAmbientLight = useCallback(async (value) => {
    setAmbientLightEnabled(value);
    await AsyncStorage.setItem(STORAGE_KEYS.AMBIENT_LIGHT_ENABLED, JSON.stringify(value));
  }, []);

  // Register shake callback
  const registerShakeHandler = useCallback((callback) => {
    setOnShake(() => callback);
  }, []);

  // Get compass direction
  const getCompassDirection = useCallback(() => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(compassHeading / 45) % 8;
    return directions[index];
  }, [compassHeading]);

  // Update exploration progress
  const updateExplorationData = useCallback(async (location) => {
    setExplorationProgress(prev => {
      const newData = {
        ...prev,
        locationsVisited: [...prev.locationsVisited, location],
        totalDistance: prev.totalDistance + (stepCount * 0.762), // Average step = 0.762 meters
        neighborhoodCoverage: Math.min(100, (prev.locationsVisited.length / 100) * 100)
      };
      AsyncStorage.setItem(STORAGE_KEYS.EXPLORATION_DATA, JSON.stringify(newData));
      return newData;
    });
  }, [stepCount]);

  const value = {
    // Feature toggles
    stepCounterEnabled,
    motionDetectionEnabled,
    shakeEnabled,
    barometerEnabled,
    compassEnabled,
    ambientLightEnabled,
    toggleStepCounter,
    toggleMotionDetection,
    toggleShake,
    toggleBarometer,
    toggleCompass,
    toggleAmbientLight,

    // Pedometer data
    stepCount,
    dailySteps,

    // Motion detection
    currentActivity,
    proximityRadius,

    // Shake
    registerShakeHandler,

    // Barometer
    atmosphericPressure,
    weatherCondition,

    // Compass
    compassHeading,
    getCompassDirection,

    // Light sensor
    ambientLight,
    autoAdaptUI,
    setAutoAdaptUI,

    // Exploration
    explorationProgress,
    updateExplorationData
  };

  return (
    <SensorsContext.Provider value={value}>
      {children}
    </SensorsContext.Provider>
  );
}

export function useSensors() {
  const context = useContext(SensorsContext);
  if (!context) {
    // Return default values to prevent crashes when SensorsProvider is not available
    console.warn('useSensors: SensorsProvider not found, returning default values');
    return {
      // Feature toggles
      stepCounterEnabled: false,
      motionDetectionEnabled: false,
      shakeEnabled: false,
      barometerEnabled: false,
      compassEnabled: false,
      ambientLightEnabled: false,
      toggleStepCounter: () => {},
      toggleMotionDetection: () => {},
      toggleShake: () => {},
      toggleBarometer: () => {},
      toggleCompass: () => {},
      toggleAmbientLight: () => {},

      // Data
      stepCount: 0,
      dailySteps: 0,
      currentActivity: 'STATIONARY',
      proximityRadius: 100,
      atmosphericPressure: null,
      weatherCondition: 'normal',
      compassHeading: 0,
      getCompassDirection: () => 'N',
      ambientLight: null,
      autoAdaptUI: false,
      setAutoAdaptUI: () => {},
      explorationProgress: {
        locationsVisited: [],
        totalDistance: 0,
        neighborhoodCoverage: 0
      },
      updateExplorationData: () => {},
      setOnShake: () => {},
      pressureHistory: []
    };
  }
  return context;
}
