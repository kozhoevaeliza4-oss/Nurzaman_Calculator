import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { FormScreen } from '../../components/FormScreen';
import { Field } from '../../components/ui';
import { SelectField } from '../../components/SelectField';
import { DateField } from '../../components/DateField';
import { useAuthedApi } from '../../hooks/useAuthedApi';
import { MEAL_LABELS } from '../../theme';
import { todayISO } from '../../utils/format';

export default function AddMenuItemScreen() {
  const navigation = useNavigation();
  const { request } = useAuthedApi();
  const [date, setDate] = useState(todayISO());
  const [mealType, setMealType] = useState<keyof typeof MEAL_LABELS>('breakfast');
  const [dishName, setDishName] = useState('');
  const [allergens, setAllergens] = useState('');

  return (
    <FormScreen
      title="Новое блюдо в меню"
      submitLabel="Добавить"
      submitDisabled={!dishName.trim()}
      onCancel={() => navigation.goBack()}
      onSubmit={async () => {
        await request('/menu', {
          method: 'POST',
          body: {
            date,
            mealType,
            dishName: dishName.trim(),
            allergens: allergens.trim() ? allergens.split(',').map((a) => a.trim()).filter(Boolean) : [],
          },
        });
        navigation.goBack();
      }}
    >
      <DateField label="Дата" value={date} onChange={setDate} />
      <SelectField
        label="Приём пищи"
        value={mealType}
        onChange={setMealType}
        options={Object.entries(MEAL_LABELS).map(([value, label]) => ({ value: value as keyof typeof MEAL_LABELS, label }))}
      />
      <Field label="Название блюда" value={dishName} onChangeText={setDishName} placeholder="Суп овощной" />
      <Field label="Аллергены (через запятую)" value={allergens} onChangeText={setAllergens} placeholder="орехи, молоко" />
    </FormScreen>
  );
}
