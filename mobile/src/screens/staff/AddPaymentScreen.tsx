import React, { useState } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { FormScreen } from '../../components/FormScreen';
import { Field } from '../../components/ui';
import { SelectField } from '../../components/SelectField';
import { DateField } from '../../components/DateField';
import { useAuthedApi } from '../../hooks/useAuthedApi';
import { PAYMENT_METHOD_LABELS } from '../../theme';
import { StaffStackParamList } from '../../navigation/types';
import { todayISO } from '../../utils/format';

type Route = RouteProp<StaffStackParamList, 'AddPayment'>;

export default function AddPaymentScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { childId, childName } = route.params;
  const { request } = useAuthedApi();
  const [method, setMethod] = useState<keyof typeof PAYMENT_METHOD_LABELS>('cash');
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(todayISO());
  const [note, setNote] = useState('');

  return (
    <FormScreen
      title={`Оплата — ${childName}`}
      submitLabel="Принять оплату"
      submitDisabled={!amount.trim()}
      onCancel={() => navigation.goBack()}
      onSubmit={async () => {
        await request('/finance/payments', {
          method: 'POST',
          body: { childId, method, amount, paidAt, note: note.trim() || undefined },
        });
        navigation.goBack();
      }}
    >
      <SelectField
        label="Способ оплаты"
        value={method}
        onChange={setMethod}
        options={Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value: value as keyof typeof PAYMENT_METHOD_LABELS, label }))}
      />
      <Field label="Сумма (сом)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="3000" />
      <DateField label="Дата оплаты" value={paidAt} onChange={setPaidAt} />
      <Field label="Комментарий" value={note} onChangeText={setNote} placeholder="Необязательно" />
    </FormScreen>
  );
}
