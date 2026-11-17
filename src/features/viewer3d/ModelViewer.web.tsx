import { lazy, Suspense, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText, Button, SegmentedControl } from '@/components/ui';
import { colors, radii, spacing } from '@/theme';

import type { ViewPreset } from './muscleHighlight';
import type { ModelViewerProps } from './types';

// three.js is only downloaded when a model is actually shown (lazy loading).
const ThreeCanvas = lazy(() => import('./ThreeCanvas.web'));

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

const SPEEDS = [
  { value: '0.5', label: '0,5×' },
  { value: '1', label: '1×' },
  { value: '1.5', label: '1,5×' },
] as const;

export function ModelViewer({ uri, roles, source, license, attribution, height = 320 }: ModelViewerProps) {
  const supported = useMemo(() => webglAvailable(), []);
  const [preset, setPreset] = useState<ViewPreset>('front');
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<'0.5' | '1' | '1.5'>('1');
  const [restart, setRestart] = useState(0);
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; animated: boolean; message?: string }>({
    status: 'loading',
    animated: false,
  });

  if (!supported || state.status === 'error') {
    return (
      <View style={[styles.box, styles.center, { height }]}>
        <AppText variant="bodyStrong" align="center">
          No se puede mostrar el modelo 3D
        </AppText>
        <AppText variant="footnote" color="textSecondary" align="center">
          {supported ? state.message : 'Este dispositivo no admite WebGL.'} Consulta los músculos implicados y la técnica en esta ficha.
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.box, { height }]} accessibilityLabel="Modelo 3D interactivo: arrastra para rotar, pellizca para hacer zoom">
        <Suspense fallback={<ActivityIndicator color={colors.accent} style={styles.center} />}>
          <ThreeCanvas
            uri={uri}
            roles={roles}
            preset={preset}
            playing={playing}
            speed={Number(speed)}
            restartToken={restart}
            onLoaded={({ animated }) => setState({ status: 'ready', animated })}
            onError={(message) => setState({ status: 'error', animated: false, message })}
          />
        </Suspense>
        {state.status === 'loading' ? <ActivityIndicator color={colors.accent} style={styles.overlay} /> : null}
      </View>
      <SegmentedControl
        options={[
          { value: 'front', label: 'Frontal' },
          { value: 'back', label: 'Posterior' },
          { value: 'side', label: 'Lateral' },
        ]}
        value={preset}
        onChange={setPreset}
        accessibilityLabel="Vista del modelo"
      />
      {state.animated ? (
        <>
          <View style={styles.row}>
            <Button label={playing ? 'Pausar' : 'Reproducir'} icon={playing ? 'pause' : 'play'} size="md" variant="secondary" onPress={() => setPlaying((p) => !p)} style={styles.flex} />
            <Button label="Reiniciar" icon="refresh" size="md" variant="secondary" onPress={() => setRestart((r) => r + 1)} style={styles.flex} />
          </View>
          <SegmentedControl options={SPEEDS} value={speed} onChange={setSpeed} accessibilityLabel="Velocidad" />
        </>
      ) : null}
      <AppText variant="caption" color="textTertiary">
        Fuente: {source} · Licencia: {license}
        {attribution ? ` · ${attribution}` : ''}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  box: { borderRadius: radii.xl, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm, flex: 1 },
  overlay: { position: 'absolute', top: '45%', left: 0, right: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
