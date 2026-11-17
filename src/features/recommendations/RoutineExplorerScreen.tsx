import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText, Badge, Card, EmptyState, HScrollChips, Screen, SegmentedControl } from '@/components/ui';
import { CATALOG_EXERCISES } from '@/catalog';
import { recommendRoutines, type Recommendation } from '@/engine/recommendations/recommendRoutines';
import { SPLITS, type SplitId } from '@/engine/workout-generator/splits';
import { STYLE_IDS, STYLES, type StyleId } from '@/engine/workout-generator/styles';
import { useDbQuery } from '@/hooks/useDbQuery';
import { colors, spacing } from '@/theme';

import { loadRecommendationInputs } from './loadContext';
import { ScoreRing } from './ScoreRing';

const pct = (v: number) => `${Math.round(v * 100)} %`;

function RecommendationCard({ rec, rank }: { rec: Recommendation; rank: number }) {
  const maxMin = Math.max(...rec.routine.days.map((d) => d.estimatedMinutes));
  const exercises = rec.routine.days.reduce((a, d) => a + d.exercises.length, 0);
  return (
    <Card
      padding="lg"
      style={styles.card}
      onPress={() => router.push({ pathname: '/rutinas/generar', params: { id: rec.id } })}
      accessibilityLabel={`Opción ${rank}: ${rec.routine.splitLabel}, ${STYLES[rec.style].label}, ${rec.days} días, compatibilidad ${rec.score}`}
    >
      <View style={styles.head}>
        <View style={styles.flex}>
          <AppText variant="overline" color="textTertiary">
            #{rank} · {rec.days} días · ~{maxMin} min
          </AppText>
          <AppText variant="title3">{rec.routine.splitLabel}</AppText>
          <View style={styles.badges}>
            <Badge label={STYLES[rec.style].label} tone="accent" />
            <Badge label={`${exercises} ejercicios/sem`} />
          </View>
        </View>
        <ScoreRing score={rec.score} />
      </View>
      <AppText variant="footnote" color="textSecondary">
        {STYLES[rec.style].summary}
      </AppText>
      <View style={styles.prob}>
        <AppText variant="caption" color="textTertiary" style={styles.flex}>
          Probabilidad de cumplir {rec.days} sesiones/sem{rec.adherence.basis === 'prior' ? ' (sin historial)' : ''}
        </AppText>
        <AppText variant="callout" color={rec.adherence.probability >= 0.6 ? 'accent' : 'warning'}>
          {pct(rec.adherence.probability)}
        </AppText>
      </View>
      {rec.cautions[0] ? (
        <AppText variant="caption" color="warning" numberOfLines={2}>
          {rec.cautions[0]}
        </AppText>
      ) : null}
    </Card>
  );
}

export function RoutineExplorerScreen() {
  const { data, loading } = useDbQuery(async (db, userId) => {
    const inputs = await loadRecommendationInputs(db, userId);
    if (!inputs) return null;
    return { ...inputs, recs: recommendRoutines(inputs.input, CATALOG_EXERCISES, inputs.ctx) };
  });
  const [style, setStyle] = useState<StyleId | null>(null);
  const [days, setDays] = useState<string | null>(null);
  const [split, setSplit] = useState<SplitId | null>(null);
  const [sort, setSort] = useState<'score' | 'adherence'>('score');

  const recs = useMemo(() => {
    const list = (data?.recs ?? []).filter(
      (r) => (!style || r.style === style) && (!days || r.days === Number(days)) && (!split || r.split === split),
    );
    return sort === 'score' ? list : [...list].sort((a, b) => b.adherence.probability - a.adherence.probability || b.score - a.score);
  }, [data, style, days, split, sort]);

  if (loading) {
    return (
      <Screen title="Explorar rutinas" back>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <AppText variant="footnote" color="textSecondary">
            Generando y evaluando combinaciones…
          </AppText>
        </View>
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen title="Explorar rutinas" back>
        <EmptyState icon="person-outline" title="Configura tu perfil" description="El recomendador necesita tu objetivo, experiencia y disponibilidad." />
      </Screen>
    );
  }

  const dayOptions = [...new Set(data.recs.map((r) => r.days))].sort();
  const splitOptions = [...new Set(data.recs.map((r) => r.split))];

  return (
    <Screen title="Explorar rutinas" subtitle={`${data.recs.length} rutinas evaluadas`} back>
      <AppText variant="footnote" color="textSecondary">
        El motor combina {STYLE_IDS.length} estilos, {Object.keys(SPLITS).length} divisiones y {dayOptions.join(', ')} días por semana, genera cada rutina y la
        puntúa según tu objetivo, volumen, frecuencia, disponibilidad, experiencia, recuperación y limitaciones. La probabilidad de cumplimiento se calcula con tu
        historial real de semanas entrenadas.
      </AppText>
      <SegmentedControl
        options={[
          { value: 'score', label: 'Compatibilidad' },
          { value: 'adherence', label: 'Prob. de cumplir' },
        ]}
        value={sort}
        onChange={setSort}
        accessibilityLabel="Ordenar por"
      />
      <HScrollChips
        options={[{ value: null, label: 'Todos los estilos' }, ...STYLE_IDS.filter((s) => data.recs.some((r) => r.style === s)).map((s) => ({ value: s, label: STYLES[s].label }))]}
        value={style}
        onChange={setStyle}
        accessibilityLabel="Filtrar por estilo"
      />
      <HScrollChips
        options={[{ value: null, label: 'Cualquier división' }, ...splitOptions.map((s) => ({ value: s, label: SPLITS[s].label }))]}
        value={split}
        onChange={setSplit}
        accessibilityLabel="Filtrar por división"
      />
      <HScrollChips
        options={[{ value: null, label: 'Cualquier nº de días' }, ...dayOptions.map((d) => ({ value: String(d), label: `${d} días${d === data.input.daysPerWeek ? ' (los tuyos)' : ''}` }))]}
        value={days}
        onChange={setDays}
        accessibilityLabel="Filtrar por días"
      />
      <AppText variant="caption" color="textTertiary">
        {recs.length} resultados
      </AppText>
      {recs.length === 0 ? <EmptyState icon="search-outline" title="Sin resultados" description="Prueba con otros filtros." /> : null}
      {recs.slice(0, 40).map((r, i) => (
        <RecommendationCard key={r.id} rec={r} rank={i + 1} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  head: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  flex: { flex: 1 },
  badges: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', marginTop: spacing.xs },
  prob: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  loading: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.huge },
});
