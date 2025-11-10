import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Circle, Path, RadialGradient } from 'react-native-svg';

const LogoSVG = ({ width = 200, height = 200, ...props }) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 1024 1024" fill="none" {...props}>
      <Defs>
        <LinearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#8D6BFF" />
          <Stop offset="100%" stopColor="#4B2CD9" />
        </LinearGradient>
        <LinearGradient id="pin" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.95} />
          <Stop offset="100%" stopColor="#E5DEFF" />
        </LinearGradient>
        <RadialGradient id="glow" cx="50%" cy="35%" r="70%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.35} />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* background circle */}
      <Circle cx="512" cy="512" r="432" fill="url(#bg)" />
      <Circle cx="512" cy="400" r="280" fill="url(#glow)" />
      <Circle cx="512" cy="512" r="420" stroke="#FFFFFF" strokeOpacity={0.15} strokeWidth="12" fill="none" />
      <Circle cx="512" cy="512" r="330" stroke="#FFFFFF" strokeOpacity={0.15} strokeWidth="10" fill="none" />

      {/* location loop mark */}
      <Path
        d="M512 268C392 268 296 364 296 484C296 656 484 806 500 818C506 822 514 822 520 818C536 806 728 656 728 484C728 364 632 268 512 268Z"
        fill="url(#pin)" />
      <Path
        d="M512 324C625 324 717 416 717 528C717 659 568 781 515 820C513 822 511 822 509 820C456 781 307 659 307 528C307 416 399 324 512 324Z"
        fill="none" stroke="#8D6BFF" strokeOpacity={0.2} strokeWidth="24" />
      <Circle cx="512" cy="472" r="96" fill="none" stroke="#6C4DF4" strokeWidth="32" />

      {/* inner loop spark */}
      <Path
        d="M566 618C614 618 654 648 666 692C668 700 661 708 653 705C592 684 538 668 480 668C422 668 368 684 307 705C299 708 292 700 294 692C306 648 346 618 394 618H566Z"
        fill="#F8F6FF" opacity={0.85} />
      <Circle cx="638" cy="360" r="32" fill="#FFFFFF" opacity={0.9} />
      <Circle cx="428" cy="336" r="20" fill="#FFFFFF" opacity={0.75} />
    </Svg>
  );
};

export default LogoSVG;