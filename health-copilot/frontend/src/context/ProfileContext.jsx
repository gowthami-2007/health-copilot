import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import patientProfileService from '../services/patientProfileService';
import useAuth from '../hooks/useAuth';

const ProfileContext = createContext(null);

const getSavedProfileId = () => {
  try {
    return localStorage.getItem('health_copilot_active_profile_id');
  } catch {
    return null;
  }
};

const setSavedProfileId = (id) => {
  try {
    localStorage.setItem('health_copilot_active_profile_id', id);
  } catch {}
};

export const ProfileProvider = ({ children }) => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfiles = useCallback(async () => {
    if (!user) {
      setProfiles([]);
      setActiveProfile(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await patientProfileService.getProfiles();
      const list = res.data?.profiles || [];
      setProfiles(list);

      // Restore saved active profile ID or default to primary/first
      const savedId = getSavedProfileId();
      const found = list.find((p) => p._id === savedId);
      if (found) {
        setActiveProfile(found);
      } else {
        const primary = list.find((p) => p.isPrimary) || list[0] || null;
        setActiveProfile(primary);
        if (primary) {
          setSavedProfileId(primary._id);
        }
      }
    } catch (err) {
      console.warn('Failed to load family profiles:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const switchProfile = (profileOrId) => {
    const profile = typeof profileOrId === 'string'
      ? profiles.find((p) => p._id === profileOrId)
      : profileOrId;

    if (profile) {
      setActiveProfile(profile);
      setSavedProfileId(profile._id);
    }
  };

  const createProfile = async (data) => {
    const res = await patientProfileService.createProfile(data);
    await fetchProfiles();
    if (res.data?.profile) {
      switchProfile(res.data.profile);
    }
    return res.data?.profile;
  };

  const updateProfile = async (id, data) => {
    const res = await patientProfileService.updateProfile(id, data);
    await fetchProfiles();
    return res.data?.profile;
  };

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        activeProfileId: activeProfile?._id || null,
        loading,
        error,
        fetchProfiles,
        switchProfile,
        createProfile,
        updateProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

export default ProfileContext;
