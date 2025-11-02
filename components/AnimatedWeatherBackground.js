import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

export default function AnimatedWeatherBackground({ condition, isNight }) {
  const rainDrops = useRef(
    Array.from({ length: 50 }, () => ({
      anim: new Animated.Value(0),
      left: Math.random() * 100,
      delay: Math.random() * 2000
    }))
  ).current;

  const stars = useRef(
    Array.from({ length: 30 }, () => ({
      anim: new Animated.Value(0),
      left: Math.random() * 100,
      top: Math.random() * 60,
      size: Math.random() * 2 + 1
    }))
  ).current;

  const clouds = useRef(
    Array.from({ length: 5 }, () => ({
      anim: new Animated.Value(0),
      top: Math.random() * 40 + 10,
      speed: Math.random() * 30000 + 40000
    }))
  ).current;

  const lightning = useRef(new Animated.Value(0)).current;

  // Rain animation
  useEffect(() => {
    if (condition === 'rainy' || condition === 'stormy') {
      const animations = rainDrops.map((drop, index) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(drop.delay),
            Animated.timing(drop.anim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true
            }),
            Animated.timing(drop.anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true
            })
          ])
        );
      });
      animations.forEach(anim => anim.start());

      return () => animations.forEach(anim => anim.stop());
    }
  }, [condition]);

  // Star twinkle animation
  useEffect(() => {
    if (isNight) {
      const animations = stars.map(star => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(star.anim, {
              toValue: 1,
              duration: 1000 + Math.random() * 2000,
              useNativeDriver: true
            }),
            Animated.timing(star.anim, {
              toValue: 0,
              duration: 1000 + Math.random() * 2000,
              useNativeDriver: true
            })
          ])
        );
      });
      animations.forEach(anim => anim.start());

      return () => animations.forEach(anim => anim.stop());
    }
  }, [isNight]);

  // Cloud drift animation - DISABLED
  // useEffect(() => {
  //   const animations = clouds.map(cloud => {
  //     return Animated.loop(
  //       Animated.timing(cloud.anim, {
  //         toValue: 1,
  //         duration: cloud.speed,
  //         useNativeDriver: true
  //       })
  //     );
  //   });
  //   animations.forEach(anim => anim.start());

  //   return () => animations.forEach(anim => anim.stop());
  // }, []);

  // Lightning animation
  useEffect(() => {
    if (condition === 'stormy') {
      const flashLightning = () => {
        Animated.sequence([
          Animated.timing(lightning, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true
          }),
          Animated.timing(lightning, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true
          }),
          Animated.timing(lightning, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true
          }),
          Animated.timing(lightning, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true
          })
        ]).start(() => {
          setTimeout(flashLightning, Math.random() * 5000 + 3000);
        });
      };

      const timeout = setTimeout(flashLightning, 2000);
      return () => clearTimeout(timeout);
    }
  }, [condition]);

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Stars - Night time */}
      {isNight && (
        <View style={styles.starsContainer}>
          {stars.map((star, index) => (
            <Animated.View
              key={`star-${index}`}
              style={[
                styles.star,
                {
                  left: `${star.left}%`,
                  top: `${star.top}%`,
                  width: star.size,
                  height: star.size,
                  opacity: star.anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1]
                  })
                }
              ]}
            />
          ))}
        </View>
      )}

      {/* Clouds - DISABLED */}
      {/* <View style={styles.cloudsContainer}>
        {clouds.map((cloud, index) => (
          <Animated.View
            key={`cloud-${index}`}
            style={[
              styles.cloud,
              {
                top: `${cloud.top}%`,
                transform: [
                  {
                    translateX: cloud.anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-100, 500]
                    })
                  }
                ]
              }
            ]}
          >
            <View style={styles.cloudPart1} />
            <View style={styles.cloudPart2} />
            <View style={styles.cloudPart3} />
          </Animated.View>
        ))}
      </View> */}

      {/* Rain - Rainy/Stormy conditions */}
      {(condition === 'rainy' || condition === 'stormy') && (
        <View style={styles.rainContainer}>
          {rainDrops.map((drop, index) => (
            <Animated.View
              key={`rain-${index}`}
              style={[
                styles.rainDrop,
                {
                  left: `${drop.left}%`,
                  transform: [
                    {
                      translateY: drop.anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 800]
                      })
                    }
                  ],
                  opacity: drop.anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 1, 0]
                  })
                }
              ]}
            />
          ))}
        </View>
      )}

      {/* Lightning - Stormy conditions */}
      {condition === 'stormy' && (
        <Animated.View
          style={[
            styles.lightning,
            {
              opacity: lightning
            }
          ]}
        />
      )}

      {/* Fog overlay - Partly cloudy at night or custom fog condition */}
      {(condition === 'cloudy' || (condition === 'normal' && isNight)) && (
        <View style={styles.fogOverlay} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden'
  },
  starsContainer: {
    ...StyleSheet.absoluteFillObject
  },
  star: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 1
  },
  cloudsContainer: {
    ...StyleSheet.absoluteFillObject
  },
  cloud: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center'
  },
  cloudPart1: {
    width: 50,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20
  },
  cloudPart2: {
    width: 60,
    height: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 25,
    marginLeft: -20
  },
  cloudPart3: {
    width: 45,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 18,
    marginLeft: -15
  },
  rainContainer: {
    ...StyleSheet.absoluteFillObject
  },
  rainDrop: {
    position: 'absolute',
    width: 2,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1
  },
  lightning: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.4)'
  },
  fogOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.05)'
  }
});
