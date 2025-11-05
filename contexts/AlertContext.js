import React, { createContext, useContext, useState, useCallback } from 'react';
import CustomAlert from '../components/CustomAlert';
import { useSettings } from './SettingsContext';

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const { themeColors, accentPreset } = useSettings();
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [],
    icon: null,
    iconColor: null,
  });

  const showAlert = useCallback((title, message, buttons = [], options = {}) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons: buttons.map((btn) => ({
        ...btn,
        onPress: () => {
          setAlertConfig((prev) => ({ ...prev, visible: false }));
          btn.onPress?.();
        },
      })),
      icon: options.icon || null,
      iconColor: options.iconColor || null,
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  }, []);

  const value = {
    showAlert,
    hideAlert,
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
        themeColors={themeColors}
        accentColor={accentPreset?.buttonBackground}
      />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
