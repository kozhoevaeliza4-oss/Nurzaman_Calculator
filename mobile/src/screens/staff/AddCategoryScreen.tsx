import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { FormScreen } from '../../components/FormScreen';
import { Field } from '../../components/ui';
import { useAuthedApi } from '../../hooks/useAuthedApi';

export default function AddCategoryScreen() {
  const navigation = useNavigation();
  const { request } = useAuthedApi();
  const [name, setName] = useState('');

  return (
    <FormScreen
      title="Новая категория расходов"
      submitLabel="Создать"
      submitDisabled={!name.trim()}
      onCancel={() => navigation.goBack()}
      onSubmit={async () => {
        await request('/expenses/categories', { method: 'POST', body: { name: name.trim() } });
        navigation.goBack();
      }}
    >
      <Field label="Название" value={name} onChangeText={setName} placeholder="Питание" />
    </FormScreen>
  );
}
