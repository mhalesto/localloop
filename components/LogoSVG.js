import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Filter, FeDropShadow, Circle, G, Path, Rect } from 'react-native-svg';

const LogoSVG = ({ width = 200, height = 200, ...props }) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 200" fill="none" {...props}>
      <Defs>
        <LinearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#8D73FF" stopOpacity={1} />
          <Stop offset="100%" stopColor="#5333E0" stopOpacity={1} />
        </LinearGradient>

        <LinearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
          <Stop offset="100%" stopColor="#F5F1FF" stopOpacity={1} />
        </LinearGradient>
      </Defs>

      {/* Main circle background */}
      <Circle cx="100" cy="100" r="90" fill="url(#bgGradient)" />

      {/* Modern abstract T shape with chat bubble inspiration */}
      <G transform="translate(100, 100)">
        {/* Chat bubble inspired shape */}
        <Path
          d="M -35 -30
             Q -35 -40 -25 -40
             L 25 -40
             Q 35 -40 35 -30
             L 35 10
             Q 35 20 25 20
             L 5 20
             L -5 35
             L -5 20
             L -25 20
             Q -35 20 -35 10
             Z"
          fill="url(#iconGradient)"
          opacity={0.95}
        />

        {/* Inner T letterform */}
        <G fill="#6C4DF4" opacity={0.3}>
          <Rect x="-25" y="-30" width="50" height="10" rx="5" />
          <Rect x="-5" y="-30" width="10" height="45" rx="5" />
        </G>

        {/* Decorative dots */}
        <Circle cx="-15" cy="5" r="3" fill="#FFFFFF" opacity={0.8} />
        <Circle cx="0" cy="5" r="3" fill="#FFFFFF" opacity={0.8} />
        <Circle cx="15" cy="5" r="3" fill="#FFFFFF" opacity={0.8} />
      </G>

      {/* Outer ring accent */}
      <Circle cx="100" cy="100" r="88" fill="none" stroke="#FFFFFF" strokeWidth="0.5" opacity={0.3} />
    </Svg>
  );
};

export default LogoSVG;