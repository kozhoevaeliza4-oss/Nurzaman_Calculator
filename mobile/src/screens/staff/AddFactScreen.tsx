import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { FormScreen } from '../../components/FormScreen';
import { Field } from '../../components/ui';
import { SelectField } from '../../components/SelectField';
import { DateField } from '../../components/DateField';
import { useAuthedApi } from '../../hooks/useAuthedApi';
import { ExpenseCategory } from '../../types';
import { todayISO } from '../../utils/format';

export default function AddFactScreen() {
  const navigation = useNavigation();
  const { request } = useAuthedApi();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [spentAt, setSpentAt] = useState(todayISO());
  const [description, setDescription] = useState('');

  useEffect(() => {
    request<ExpenseCategory[]>('/expenses/categories').then((res) => {
      setCategories(res);
      if (res[0]) setCategoryId(res[0].id);
    }).catch(() => undefined);
  }, [request]);

  return (
    <FormScreen
      title="Новый расход"
      submitLabel="Добавить расход"
      submitDisabled={!categoryId || !amount.trim()}
      onCancel={() => navigation.goBack()}
      onSubmit={async () => {
        await request('/expenses/facts', {
          method: 'POST',
          body: { categoryId, amount, spentAt, description: description.trim() || undefined },
        });
        navigation.goBack();
      }}
    >
      {categories.length === 0 ? (
        <Field label="Категория" value="Сначала создайте категорию" editable={false} />
      ) : (
        <SelectField label="Категория" value={categoryId} onChange={setCategoryId} options={categories.map((c) => ({ label: c.name, value: c.id }))} />
      )}
      <Field label="Сумма (сом)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="12000" />
      <DateField label="Дата" value={spentAt} onChange={setSpentAt} />
      <Field label="Комментарий" value={description} onChangeText={setDescription} placeholder="Необязательно" />
    </FormScreen>
  );
}
