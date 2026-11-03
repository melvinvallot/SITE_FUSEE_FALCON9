import { PerformanceMonitor } from '@react-three/drei';
import { useThree } from '@react-three/fiber';

interface AdaptiveResolutionProps {
  /** Densité de pixels de départ, et maximale. */
  max: number;
}

/**
 * Baisse la résolution du rendu 3D si l'appareil n'arrive pas à suivre
 * (téléphone, tablette, vieil ordinateur), puis la remonte s'il redevient fluide.
 */
export function AdaptiveResolution({ max }: AdaptiveResolutionProps) {
  const setDpr = useThree((s) => s.setDpr);
  const apply = (factor: number) => {
    const device = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    const dpr = Math.round((1 + (max - 1) * factor) * 4) / 4;
    setDpr(Math.max(1, Math.min(dpr, max, device)));
  };
  return (
    <PerformanceMonitor
      factor={1}
      flipflops={4}
      onChange={({ factor }) => apply(factor)}
      onFallback={() => apply(0)}
    />
  );
}
