import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { FormScreen } from '../../components/FormScreen';
import { Field } from '../../components/ui';
import { SelectField } from '../../components/SelectField';
import { useAuthedApi } from '../../hooks/useAuthedApi';
import { Group } from '../../types';
import { ROLE_LABELS } from '../../theme';

const STAFF_ROLE_OPTIONS = ['admin', 'accountant', 'teacher', 'medic'] as const;

export default function AddStaffScreen() {
  const navigation = useNavigation();
  const { request } = useAuthedApi();
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<(typeof STAFF_ROLE_OPTIONS)[number]>('teacher');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [groupId, setGroupId] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    request<Group[]>('/groups').then(setGroups).catch(() => undefined);
  }, [request]);

  return (
    <FormScreen
      title="Новый сотрудник"
      submitLabel="Создать учётную запись"
      submitDisabled={!fullName.trim() || !email.trim() || password.length < 8}
      onCancel={() => navigation.goBack()}
      onSubmit={async () => {
        await request('/users', {
          method: 'POST',
          body: {
            fullName: fullName.trim(),
            role,
            email: email.trim(),
            password,
            groupId: groupId || undefined,
          },
        });
        navigation.goBack();
      }}
    >
      <Field label="ФИО" value={fullName} onChangeText={setFullName} placeholder="Асанова Жамиля Токтосуновна" />
      <SelectField
        label="Роль"
        value={role}
        onChange={setRole}
        options={STAFF_ROLE_OPTIONS.map((r) => ({ label: ROLE_LABELS[r], value: r }))}
      />
      <Field
        label="Email (логин)"
        value={email}
        onChangeText={setEmail}
        placeholder="teacher@asyl-amanat.kg"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Field label="Пароль" value={password} onChangeText={setPassword} placeholder="Не менее 8 символов" secureTextEntry />
      <SelectField
        label="Группа (для воспитателя)"
        value={groupId}
        onChange={setGroupId}
        options={[{ label: '— не привязывать —', value: '' }, ...groups.map((g) => ({ label: g.name, value: g.id }))]}
      />
    </FormScreen>
  );
}
