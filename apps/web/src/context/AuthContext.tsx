import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isPlatformAdmin?: boolean;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  role: string;
  planTier?: string;
}

interface AuthContextType {
  user: User | null;
  organizations: OrganizationSummary[];
  activeOrg: OrganizationSummary | null;
  isLoading: boolean;
  switchOrganization: (orgId: string, orgData?: Partial<OrganizationSummary>) => void;
  setUserSession: (user: User, orgs: OrganizationSummary[], activeOrgId?: string) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [activeOrg, setActiveOrg] = useState<OrganizationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const switchOrganization = (orgId: string, orgData?: Partial<OrganizationSummary>) => {
    let target = organizations.find((o) => o.id === orgId);
    if (!target && orgData) {
      target = {
        id: orgId,
        name: orgData.name || 'Workspace',
        slug: orgData.slug || orgId,
        role: orgData.role || 'OWNER',
        planTier: orgData.planTier,
      };
      setOrganizations((prev) => [...prev.filter((o) => o.id !== orgId), target!]);
    }
    if (target) {
      setActiveOrg(target);
    } else {
      setActiveOrg({
        id: orgId,
        name: orgData?.name || 'Workspace',
        slug: orgData?.slug || orgId,
        role: orgData?.role || 'OWNER',
      });
    }
    api.setActiveTenantId(orgId);
  };

  const setUserSession = (
    newUser: User,
    newOrgs: OrganizationSummary[],
    activeOrgId?: string,
  ) => {
    setUser(newUser);
    setOrganizations(newOrgs);

    let selected = newOrgs.find((o) => o.id === activeOrgId);
    if (!selected && newOrgs.length > 0) {
      selected = newOrgs[0];
    }

    if (selected) {
      setActiveOrg(selected);
      api.setActiveTenantId(selected.id);
    }
  };

  const refreshProfile = async () => {
    try {
      const data = await api.get<{
        id: string;
        email: string;
        firstName?: string;
        lastName?: string;
        isPlatformAdmin?: boolean;
        organizations: OrganizationSummary[];
      }>('/auth/me');

      setUser({
        id: data.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        isPlatformAdmin: data.isPlatformAdmin,
      });

      setOrganizations(data.organizations || []);

      const savedOrgId = api.getActiveTenantId();
      let matchedOrg = data.organizations.find((o) => o.id === savedOrgId);
      if (!matchedOrg && data.organizations.length > 0) {
        matchedOrg = data.organizations[0];
      }

      if (matchedOrg) {
        setActiveOrg(matchedOrg);
        api.setActiveTenantId(matchedOrg.id);
      }
    } catch {
      setUser(null);
      setOrganizations([]);
      setActiveOrg(null);
      api.setActiveTenantId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setOrganizations([]);
      setActiveOrg(null);
      api.setActiveTenantId(null);
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        activeOrg,
        isLoading,
        switchOrganization,
        setUserSession,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
