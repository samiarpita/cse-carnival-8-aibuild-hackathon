import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const DEFAULT_USERS = [
  {
    id: 'usr-001',
    name: 'Sakibul Hassan',
    email: '20-40532@aust.edu',
    student_id: '20-40532',
    department: 'Computer Science & Engineering',
    role: 'Student',
    avatar: '👨‍🎓',
  },
  {
    id: 'usr-002',
    name: 'Prof. Dr. Md. Shahriar Mahbub',
    email: 'mahbub.cse@aust.edu',
    student_id: 'FAC-701',
    department: 'Computer Science & Engineering',
    role: 'Faculty',
    avatar: '👨‍🏫',
  },
  {
    id: 'usr-003',
    name: 'AUSTPIC Executive',
    email: 'austpic@aust.edu',
    student_id: 'CLUB-01',
    department: 'CSE / AUSTPIC',
    role: 'Club Organizer',
    avatar: '🏆',
  },
];

const STORAGE_KEY_USER = 'campusos_current_user_v1';
const STORAGE_KEY_TOKEN = 'campusos_auth_token_v1';
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_TOKEN) || null;
    } catch (e) {
      return null;
    }
  });

  const [demoUsers, setDemoUsers] = useState(DEFAULT_USERS);
  const [loading, setLoading] = useState(true);

  // Sync token to localStorage
  useEffect(() => {
    try {
      if (token) {
        localStorage.setItem(STORAGE_KEY_TOKEN, token);
      } else {
        localStorage.removeItem(STORAGE_KEY_TOKEN);
      }
    } catch (e) {}
  }, [token]);

  // Sync user to localStorage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY_USER);
      }
    } catch (e) {}
  }, [user]);

  // On mount: fetch latest user profile with active token and fetch demo users
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const currentToken = localStorage.getItem(STORAGE_KEY_TOKEN);
      if (currentToken) {
        try {
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: {
              Authorization: `Bearer ${currentToken}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (isMounted && data.user) {
              setUser(data.user);
            }
          }
        } catch (err) {
          console.warn('Could not verify token with backend:', err);
        }
      }

      // Fetch demo users from backend database
      try {
        const usersRes = await fetch(`${API_BASE}/auth/users`);
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          if (isMounted && usersData.users && usersData.users.length > 0) {
            setDemoUsers(usersData.users);
          }
        }
      } catch (err) {
        // Fallback to local default users
      }

      if (isMounted) {
        setLoading(false);
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async ({ emailOrId, password }) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailOrId, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed. Please check your credentials.');
      }

      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      // If network failure, provide helpful error
      throw err;
    }
  };

  const register = async ({ name, email, student_id, department, role, password }) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          student_id,
          department,
          role,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed.');
      }

      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const loginAsDemo = async (role = 'Student') => {
    const target = demoUsers.find((u) => u.role === role) || DEFAULT_USERS[0];
    try {
      // Attempt backend authentication with default password
      const loggedIn = await login({
        emailOrId: target.email || target.student_id,
        password: 'password123',
      });
      return loggedIn;
    } catch (err) {
      // Fallback to direct demo user setting
      setUser(target);
      return target;
    }
  };

  const isFaculty = user?.role?.toLowerCase() === 'faculty';
  const isStudent = user?.role?.toLowerCase() === 'student';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(user),
        isFaculty,
        isStudent,
        login,
        register,
        logout,
        loginAsDemo,
        demoUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
