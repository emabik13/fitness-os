import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  ChipGroup,
  EmptyState,
  FormSection,
  HScrollChips,
  Screen,
  TextField,
  goBack,
} from '@/components/ui';
import { DIFFICULTY_LABELS, PATTERNS, type Pattern } from '@/catalog';
import { useDatabase } from '@/database/DatabaseProvider';
import { createCatalogRepository } from '@/database/repositories/catalogRepository';
import { createExerciseRepository, type ExerciseListItem } from '@/database/repositories/exerciseRepository';
import { EQUIPMENT, EQUIPMENT_LABELS, type Equipment } from '@/domain/profile';
import { useDbQuery } from '@/hooks/useDbQuery';
import { spacing } from '@/theme';
import { notify } from '@/utils/dialog';
import { haptics } from '@/utils/haptics';

import { ExerciseRow } from './ExerciseRow';
import { applyPick, parsePickTarget, pickTitle } from './pick';

type Difficulty = ExerciseListItem['difficulty'];

export function ExerciseLibraryScreen() {
  const { db, userId } = useDatabase();
  const params = useLocalSearchParams<{ pick?: string; muscle?: string }>();
  const pick = parsePickTarget(params.pick);
  const [search, setSearch] = useState('');
  const [muscleId, setMuscleId] = useState<string | null>(params.muscle ?? null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: muscles } = useDbQuery((d) => createCatalogRepository(d).listMuscleGroups());
  const { data } = useDbQuery(
    (d) => createExerciseRepository(d).list({ search, muscleId, equipment, difficulty, pattern }),
    [search, muscleId, equipment, difficulty, pattern],
  );

  const activeFilters = [equipment, difficulty, pattern].filter(Boolean).length;
  const toggle = <T,>(cur: T | null, v: T) => (cur === v ? null : v);

  const onSelect = async (item: ExerciseListItem) => {
    if (!pick) {
      router.push({ pathname: '/ejercicios/[id]', params: { id: item.id } });
      return;
    }
    try {
      await applyPick(db, userId, pick, item.id);
      haptics.success();
      goBack();
    } catch (e) {
      notify('No se pudo añadir', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Screen title={pick ? pickTitle(pick) : 'Ejercicios'} subtitle={pick ? 'Biblioteca' : undefined} back>
      <TextField placeholder="Buscar ejercicio" value={search} onChangeText={setSearch} accessibilityLabel="Buscar ejercicio" />
      <HScrollChips
        options={[{ value: null, label: 'Todos' }, ...(muscles ?? []).map((m) => ({ value: m.id, label: m.nameEs }))]}
        value={muscleId}
        onChange={setMuscleId}
        accessibilityLabel="Filtrar por músculo"
      />
      <View style={styles.row}>
        <AppText variant="footnote" color="textSecondary" style={styles.flex}>
          {data ? `${data.length} ejercicios` : ' '}
        </AppText>
        <Button
          label={activeFilters ? `Filtros (${activeFilters})` : 'Filtros'}
          icon="options-outline"
          variant="ghost"
          size="md"
          onPress={() => setShowFilters((s) => !s)}
        />
      </View>
      {showFilters ? (
        <Card padding="lg" style={styles.filters}>
          <FormSection title="Equipamiento">
            <ChipGroup
              options={EQUIPMENT.map((e) => ({ value: e, label: EQUIPMENT_LABELS[e] }))}
              selected={equipment ? [equipment] : []}
              onToggle={(v) => setEquipment(toggle(equipment, v))}
            />
          </FormSection>
          <FormSection title="Dificultad">
            <ChipGroup
              options={(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] }))}
              selected={difficulty ? [difficulty] : []}
              onToggle={(v) => setDifficulty(toggle(difficulty, v))}
            />
          </FormSection>
          <FormSection title="Patrón de movimiento">
            <ChipGroup
              options={(Object.keys(PATTERNS) as Pattern[]).map((p) => ({ value: p, label: PATTERNS[p] }))}
              selected={pattern ? [pattern] : []}
              onToggle={(v) => setPattern(toggle(pattern, v))}
            />
          </FormSection>
          {activeFilters ? (
            <Button
              label="Quitar filtros"
              variant="secondary"
              size="md"
              onPress={() => {
                setEquipment(null);
                setDifficulty(null);
                setPattern(null);
              }}
            />
          ) : null}
        </Card>
      ) : null}
      {data && data.length === 0 ? (
        <EmptyState icon="search-outline" title="Sin resultados" description="Prueba con otra búsqueda o quita filtros." />
      ) : null}
      <View style={styles.list}>
        {(data ?? []).map((item) => (
          <ExerciseRow key={item.id} item={item} onPress={() => onSelect(item)} trailingIcon={pick ? 'add-circle' : 'chevron-forward'} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  filters: { gap: spacing.xl },
  list: { gap: spacing.sm },
});
