import React, { useEffect, useState } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { FormScreen } from '../../components/FormScreen';
import { Field, LoadingView } from '../../components/ui';
import { SelectField } from '../../components/SelectField';
import { DateField } from '../../components/DateField';
import { useAuthedApi } from '../../hooks/useAuthedApi';
import { Child, Group } from '../../types';
import { STATUS_LABELS } from '../../theme';
import { StaffStackParamList } from '../../navigation/types';

type Route = RouteProp<StaffStackParamList, 'EditChild'>;

// Same fields as "new child", pre-filled and PUT instead of POST. Also
// where staff mark a child as left/academic leave (archiving) - the
// backend never hard-deletes a child through this screen, so attendance/
// finance/document history stays intact.
export default function EditChildScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { childId } = route.params;
  const { request } = useAuthedApi();

  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [groupId, setGroupId] = useState('');
  const [status, setStatus] = useState('active');
  const [allergies, setAllergies] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    Promise.all([request<Child>(`/children/${childId}`), request<Group[]>('/groups')])
      .then(([child, groupsRes]) => {
        setFullName(child.fullName);
        setDateOfBirth(child.dateOfBirth);
        setGroupId(child.groupId ?? '');
        setStatus(child.status);
        setAllergies(child.allergies.join(', '));
        setGroups(groupsRes);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [request, childId]);

  if (loading) return <LoadingView />;

  return (
    <FormScreen
      title="Редактировать ребёнка"
      submitLabel="Сохранить изменения"
      submitDisabled={!fullName.trim() || !dateOfBirth}
      onCancel={() => navigation.goBack()}
      onSubmit={async () => {
        const allergiesList = allergies
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean);
        await request(`/children/${childId}`, {
          method: 'PUT',
          body: {
            fullName: fullName.trim(),
            dateOfBirth,
            groupId: groupId || null,
            status,
            allergies: allergiesList,
          },
        });
        navigation.goBack();
      }}
    >
      <Field label="ФИО ребёнка" value={fullName} onChangeText={setFullName} placeholder="Иванов Алихан Бекович" />
      <DateField label="Дата рождения" value={dateOfBirth} onChange={setDateOfBirth} />
      <SelectField
        label="Группа"
        value={groupId}
        onChange={setGroupId}
        options={[{ label: '— без группы —', value: '' }, ...groups.map((g) => ({ label: g.name, value: g.id }))]}
      />
      <SelectField
        label="Статус"
        value={status}
        onChange={setStatus}
        options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ label, value }))}
        hint="«Выбыл» или «Академ. отпуск» — это архивирование без потери истории"
      />
      <Field
        label="Аллергии (через запятую)"
        value={allergies}
        onChangeText={setAllergies}
        placeholder="орехи, мёд"
      />
    </FormScreen>
  );
}
