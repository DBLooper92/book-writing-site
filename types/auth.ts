export type AppAuthUser = {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
};

export type AppAuthSession = {
  user: AppAuthUser | null;
};
