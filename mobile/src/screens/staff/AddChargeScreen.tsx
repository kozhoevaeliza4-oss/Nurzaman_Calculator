import React, { useState } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { FormScreen } from '../../components/FormScreen';
import { Field } from '../../components/ui';
import { SelectField } from '../../components/SelectField';
import { DateField } from '../../components/DateField';
import { useAuthedApi } from '../../hooks/useAuthedApi';
import { CHARGE_TYPE_LABELS } from '../../theme';
import { StaffStackParamList } from '../../navigation/types';
import { todayISO } from '../../utils/format';

type Route = RouteProp<StaffStackParamList, 'AddCharge'>;

export default function AddChargeScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { childId, childName } = route.params;
  const { request } = useAuthedApi();
  const [type, setType] = useState<keyof typeof CHARGE_TYPE_LABELS>('monthly_tariff');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(todayISO());
  const [description, setDescription] = useState('');

  return (
    <FormScreen
      title={`Начисление — ${childName}`}
      submitLabel="Начислить"
      submitDisabled={!amount.trim()}
      onCancel={() => navigation.goBack()}
      onSubmit={async () => {
        await request('/finance/charges', {
          method: 'POST',
          body: { childId, type, amount, dueDate, description: description.trim() || undefined },
        });
        navigation.goBack();
      }}
    >
      <SelectField
        label="Тип"
        value={type}
        onChange={setType}
        options={Object.entries(CHARGE_TYPE_LABELS).map(([value, label]) => ({ value: value as keyof typeof CHARGE_TYPE_LABELS, label }))}
      />
      <Field label="Сумма (сом)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="5000" />
      <DateField label="Срок оплаты" value={dueDate} onChange={setDueDate} />
      <Field label="Комментарий" value={description} onChangeText={setDescription} placeholder="Необязательно" />
    </FormScreen>
  );
}
