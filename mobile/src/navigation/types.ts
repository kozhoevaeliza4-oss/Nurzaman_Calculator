export type StaffStackParamList = {
  MainTabs: undefined;
  ChildDetail: { childId: string };
  AddGroup: undefined;
  AddChild: undefined;
  AddParent: undefined;
  AddStaff: undefined;
  AddCharge: { childId: string; childName: string };
  AddPayment: { childId: string; childName: string };
  AddMenuItem: undefined;
  AddCategory: undefined;
  SetPlan: undefined;
  AddFact: undefined;
  Scanner: undefined;
};

export type StaffTabParamList = {
  Overview: undefined;
  Menu: undefined;
  Expenses: undefined;
  Reports: undefined;
  Notifications: undefined;
};
