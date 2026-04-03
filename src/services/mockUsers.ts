type UserRole = "Agent" | "Customer" | "Admin";
type User = { id: string; name: string; email?: string; role: UserRole };

const STORAGE_KEY = "branding_users";

export const getUsers = (): User[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as User[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const addUser = (u: Omit<User, "id">) => {
  const id = Math.random().toString(36).slice(2, 9);
  const user: User = { id, ...u };
  const list = getUsers();
  list.push(user);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return user;
};
