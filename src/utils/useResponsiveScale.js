import { useWindowDimensions } from 'react-native';

const BASE_WIDTH = 1440;

export const useResponsiveScale = () => {
  const { width } = useWindowDimensions();

  const scale = (size) => {
    let multiplier = width / BASE_WIDTH;
    // Clamp multiplier between 0.7 and 1.5
    if (multiplier < 0.7) multiplier = 0.7;
    if (multiplier > 1.5) multiplier = 1.5;
    
    return size * multiplier;
  };

  return scale;
};
