import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { FormScreen } from '../../components/FormScreen';
import { Field } from '../../components/ui';
import { SelectField } from '../../components/SelectField';
import { DateField } from '../../components/DateField';
import { useAuthedApi } from '../../hooks/useAuthedApi';
import { Group } from '../../types';
import { todayISO } from '../../utils/format';

export default function AddChildScreen() {
  const navigation = useNavigation();
  const { request } = useAuthedApi();
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState(todayISO());
  const [groupId, setGroupId] = useState('');
  const [allergies, setAllergies] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    request<Group[]>('/groups').then(setGroups).catch(() => undefined);
  }, [request]);

  return (
    <FormScreen
      title="Новый ребёнок"
      submitLabel="Добавить ребёнка"
      submitDisabled={!fullName.trim() || !dateOfBirth}
      onCancel={() => navigation.goBack()}
      onSubmit={async () => {
        const allergiesList = allergies
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean);
        await request('/children', {
          method: 'POST',
          body: {
            fullName: fullName.trim(),
            dateOfBirth,
            enrollmentDate,
            groupId: groupId || undefined,
            allergies: allergiesList,
          },
        });
        navigation.goBack();
      }}
    >
      <Field label="ФИО ребёнка" value={fullName} onChangeText={setFullName} placeholder="Иванов Алихан Бекович" />
      <DateField label="Дата рождения" value={dateOfBirth} onChange={setDateOfBirth} />
      <DateField label="Дата зачисления" value={enrollmentDate} onChange={setEnrollmentDate} />
      <SelectField
        label="Группа"
        value={groupId}
        onChange={setGroupId}
        options={[{ label: '— без группы —', value: '' }, ...groups.map((g) => ({ label: g.name, value: g.id }))]}
      />
      <Field
        label="Аллергии (через запятую)"
        value={allergies}
        onChangeText={setAllergies}
        placeholder="орехи, мёд"
        hint="Оставьте пустым, если аллергий нет"
      />
    </FormScreen>
  );
}
