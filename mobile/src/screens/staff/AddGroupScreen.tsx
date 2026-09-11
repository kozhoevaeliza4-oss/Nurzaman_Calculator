import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { FormScreen } from '../../components/FormScreen';
import { Field } from '../../components/ui';
import { useAuthedApi } from '../../hooks/useAuthedApi';

export default function AddGroupScreen() {
  const navigation = useNavigation();
  const { request } = useAuthedApi();
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');

  return (
    <FormScreen
      title="Новая группа"
      submitLabel="Создать группу"
      submitDisabled={!name.trim() || !capacity.trim()}
      onCancel={() => navigation.goBack()}
      onSubmit={async () => {
        await request('/groups', { method: 'POST', body: { name: name.trim(), capacity: Number(capacity) } });
        navigation.goBack();
      }}
    >
      <Field label="Название группы" value={name} onChangeText={setName} placeholder="Например: Ромашка" />
      <Field
        label="Вместимость (мест)"
        value={capacity}
        onChangeText={setCapacity}
        keyboardType="number-pad"
        placeholder="20"
      />
    </FormScreen>
  );
}
