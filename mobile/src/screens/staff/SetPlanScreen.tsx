import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { FormScreen } from '../../components/FormScreen';
import { Field } from '../../components/ui';
import { SelectField } from '../../components/SelectField';
import { useAuthedApi } from '../../hooks/useAuthedApi';
import { ExpenseCategory } from '../../types';
import { currentPeriod } from '../../utils/format';

export default function SetPlanScreen() {
  const navigation = useNavigation();
  const { request } = useAuthedApi();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [period, setPeriod] = useState(currentPeriod());
  const [plannedAmount, setPlannedAmount] = useState('');

  useEffect(() => {
    request<ExpenseCategory[]>('/expenses/categories').then((res) => {
      setCategories(res);
      if (res[0]) setCategoryId(res[0].id);
    }).catch(() => undefined);
  }, [request]);

  return (
    <FormScreen
      title="Плановая сумма на месяц"
      submitLabel="Сохранить план"
      submitDisabled={!categoryId || !plannedAmount.trim()}
      onCancel={() => navigation.goBack()}
      onSubmit={async () => {
        await request('/expenses/plans', { method: 'POST', body: { categoryId, period, plannedAmount } });
        navigation.goBack();
      }}
    >
      {categories.length === 0 ? (
        <Field label="Категория" value="Сначала создайте категорию" editable={false} />
      ) : (
        <SelectField label="Категория" value={categoryId} onChange={setCategoryId} options={categories.map((c) => ({ label: c.name, value: c.id }))} />
      )}
      <Field label="Месяц (ГГГГ-ММ)" value={period} onChangeText={setPeriod} placeholder="2026-09" />
      <Field label="Плановая сумма (сом)" value={plannedAmount} onChangeText={setPlannedAmount} keyboardType="decimal-pad" placeholder="50000" />
    </FormScreen>
  );
}
