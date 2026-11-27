import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { SegmentedTabs, type SegmentedTabItem } from '../ui/SegmentedTabs';

export type TrainingTab = 'proposed' | 'programs' | 'history' | 'exercises';

export const TRAINING_TAB_ORDER: TrainingTab[] = ['proposed', 'programs', 'history', 'exercises'];

const tabs = (): SegmentedTabItem<TrainingTab>[] => [
  { value: 'proposed', icon: 'bookmark', label: i18n.t('member.proposes') },
  { value: 'programs', icon: 'fitness-center', label: i18n.t('training.tabPrograms') },
  { value: 'history', icon: 'history', label: i18n.t('member.historique') },
  { value: 'exercises', icon: 'sports-gymnastics', label: i18n.t('common.exercices') },
];

/** Sous-menus de l'onglet Entraînement. */
export function TrainingTabs({ value, onChange }: { value: TrainingTab; onChange: (tab: TrainingTab) => void }) {
  useTranslation();
  return <SegmentedTabs items={tabs()} value={value} onChange={onChange} />;
}
