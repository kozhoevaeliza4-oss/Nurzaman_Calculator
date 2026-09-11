import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { FormScreen } from '../../components/FormScreen';
import { Field } from '../../components/ui';
import { SelectField } from '../../components/SelectField';
import { useAuthedApi } from '../../hooks/useAuthedApi';
import { Child, Paginated } from '../../types';
import { RELATION_LABELS } from '../../theme';

export default function AddParentScreen() {
  const navigation = useNavigation();
  const { request } = useAuthedApi();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [childId, setChildId] = useState('');
  const [relationType, setRelationType] = useState<keyof typeof RELATION_LABELS>('mother');
  const [children, setChildren] = useState<Child[]>([]);

  useEffect(() => {
    request<Paginated<Child>>('/children?pageSize=100')
      .then((res) => setChildren(res.items))
      .catch(() => undefined);
  }, [request]);

  return (
    <FormScreen
      title="Новый родитель"
      submitLabel="Добавить родителя"
      submitDisabled={!fullName.trim()}
      onCancel={() => navigation.goBack()}
      onSubmit={async () => {
        const parent = await request<{ id: string }>('/parents', {
          method: 'POST',
          body: {
            fullName: fullName.trim(),
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
          },
        });

        if (childId) {
          await request(`/parents/${parent.id}/children`, {
            method: 'POST',
            body: { childId, relationType },
          });
        }

        if (email.trim() && password) {
          await request(`/parents/${parent.id}/create-login`, {
            method: 'POST',
            body: { email: email.trim(), password },
          });
        }
        navigation.goBack();
      }}
    >
      <Field label="ФИО родителя" value={fullName} onChangeText={setFullName} placeholder="Иванова Айгуль Сериковна" />
      <Field label="Телефон" value={phone} onChangeText={setPhone} placeholder="+996 700 000 000" keyboardType="phone-pad" />
      <Field
        label="Email (для входа в личный кабинет)"
        value={email}
        onChangeText={setEmail}
        placeholder="parent@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Field
        label="Пароль для входа"
        value={password}
        onChangeText={setPassword}
        placeholder="Не менее 8 символов"
        secureTextEntry
        hint="Заполните вместе с email, чтобы сразу выдать доступ в личный кабинет"
      />
      <SelectField
        label="Ребёнок"
        value={childId}
        onChange={setChildId}
        options={[{ label: '— не привязывать сейчас —', value: '' }, ...children.map((c) => ({ label: c.fullName, value: c.id }))]}
      />
      <SelectField
        label="Кем приходится ребёнку"
        value={relationType}
        onChange={setRelationType}
        options={Object.entries(RELATION_LABELS).map(([value, label]) => ({ value: value as keyof typeof RELATION_LABELS, label }))}
      />
    </FormScreen>
  );
}
