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

      {/* LocalLoop LL design */}
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

        {/* First L (left, slightly higher) */}
        <Path
          d="M -18 -20
             L -18 5
             L -3 5"
          fill="none"
          stroke="#6C4DF4"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.4}
        />

        {/* Second L (right, slightly lower) */}
        <Path
          d="M 3 -15
             L 3 10
             L 18 10"
          fill="none"
          stroke="#6C4DF4"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.4}
        />

        {/* Decorative dots for community connection */}
        <Circle cx="-15" cy="8" r="2.5" fill="#FFFFFF" opacity={0.7} />
        <Circle cx="0" cy="8" r="2.5" fill="#FFFFFF" opacity={0.7} />
        <Circle cx="15" cy="8" r="2.5" fill="#FFFFFF" opacity={0.7} />
      </G>

      {/* Outer ring accent */}
      <Circle cx="100" cy="100" r="88" fill="none" stroke="#FFFFFF" strokeWidth="0.5" opacity={0.3} />
    </Svg>
  );
};

export default LogoSVG;