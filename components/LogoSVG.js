import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Circle, G, Path } from 'react-native-svg';

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

      {/* Modern abstract S shape with story/speech bubble inspiration */}
      <G transform="translate(100, 100)">
        {/* Speech bubble background shape */}
        <Path
          d="M -35 -25
             Q -35 -35 -25 -35
             L 25 -35
             Q 35 -35 35 -25
             L 35 15
             Q 35 25 25 25
             L 5 25
             L -5 38
             L -5 25
             L -25 25
             Q -35 25 -35 15
             Z"
          fill="url(#iconGradient)"
          opacity={0.95}
        />

        {/* Inner S letterform */}
        <Path
          d="M 20 -20
             Q 20 -30 5 -30
             L -10 -30
             Q -25 -30 -25 -15
             Q -25 -5 -15 -5
             L 10 -5
             Q 25 -5 25 10
             Q 25 20 10 20
             L -5 20
             Q -20 20 -20 10"
          fill="none"
          stroke="#6C4DF4"
          strokeWidth="8"
          strokeLinecap="round"
          opacity={0.4}
        />

        {/* Decorative story dots (like ellipsis for continuing story) */}
        <Circle cx="-15" cy="8" r="3" fill="#FFFFFF" opacity={0.8} />
        <Circle cx="0" cy="8" r="3" fill="#FFFFFF" opacity={0.8} />
        <Circle cx="15" cy="8" r="3" fill="#FFFFFF" opacity={0.8} />
      </G>

      {/* Outer ring accent */}
      <Circle cx="100" cy="100" r="88" fill="none" stroke="#FFFFFF" strokeWidth="0.5" opacity={0.3} />
    </Svg>
  );
};

export default LogoSVG;