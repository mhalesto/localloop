import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';
import { useAlert } from '../contexts/AlertContext';
import useHaptics from '../hooks/useHaptics';

/**
 * CameraCapture - Full-screen camera component for quick photo/video capture
 *
 * Features:
 * - Front/back camera toggle
 * - Flash modes (off, on, auto)
 * - Photo capture with preview
 * - Clean, Instagram-style UI
 * - Haptic feedback
 *
 * Usage:
 * <CameraCapture
 *   visible={showCamera}
 *   onClose={() => setShowCamera(false)}
 *   onCapture={(photo) => console.log(photo.uri)}
 *   mode="photo"
 * />
 */
export default function CameraCapture({ visible, onClose, onCapture, mode = 'photo' }) {
  const { themeColors } = useSettings();
  const { showAlert } = useAlert();
  const haptics = useHaptics();
  const cameraRef = useRef(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [flash, setFlash] = useState('off');
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible]);

  const toggleCameraFacing = () => {
    haptics.light();
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    haptics.light();
    setFlash(current => {
      if (current === 'off') return 'on';
      if (current === 'on') return 'auto';
      return 'off';
    });
  };

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      haptics.medium();
      setIsCapturing(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        exif: false,
      });

      onCapture?.(photo);
      onClose?.();
    } catch (error) {
      console.error('Failed to take picture:', error);
      haptics.error();
      showAlert('Error', 'Failed to capture photo. Please try again.', 'error');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleClose = () => {
    haptics.light();
    onClose?.();
  };

  if (!visible) return null;

  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: themeColors.textPrimary }]}>
              Loading camera...
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={64} color={themeColors.textSecondary} />
            <Text style={[styles.permissionTitle, { color: themeColors.textPrimary }]}>
              Camera Permission Required
            </Text>
            <Text style={[styles.permissionText, { color: themeColors.textSecondary }]}>
              We need your permission to access the camera to take photos for your posts and status updates.
            </Text>
            <TouchableOpacity
              style={[styles.permissionButton, { backgroundColor: themeColors.primary }]}
              onPress={requestPermission}
              activeOpacity={0.8}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelButtonText, { color: themeColors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.container}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          flash={flash}
          mode={mode}
        >
          {/* Header Controls */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={32} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerButton}
              onPress={toggleFlash}
              activeOpacity={0.7}
            >
              <Ionicons
                name={flash === 'off' ? 'flash-off' : flash === 'on' ? 'flash' : 'flash-outline'}
                size={28}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          {/* Bottom Controls */}
          <View style={styles.controls}>
            {/* Gallery Button (placeholder) */}
            <TouchableOpacity
              style={styles.galleryButton}
              activeOpacity={0.7}
            >
              <Ionicons name="images-outline" size={28} color="#fff" />
            </TouchableOpacity>

            {/* Capture Button */}
            <TouchableOpacity
              style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
              onPress={takePicture}
              activeOpacity={0.8}
              disabled={isCapturing}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            {/* Flip Camera Button */}
            <TouchableOpacity
              style={styles.flipButton}
              onPress={toggleCameraFacing}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-reverse-outline" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  galleryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#fff',
  },
  flipButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
