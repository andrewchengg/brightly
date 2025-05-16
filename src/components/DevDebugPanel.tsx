"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function DevDebugPanel() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const fetchProfileData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if session exists first
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!sessionData.session) {
        setError('No active session found');
        setProfileData(null);
        setLoading(false);
        return;
      }

      // Fetch profile from debug API
      try {
        const response = await fetch('/api/debug/profile');
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        setProfileData(data);
      } catch (apiError: any) {
        console.error('Error fetching debug profile:', apiError);
        setError(`API error: ${apiError.message}`);
        // Still show session data even if profile fetch fails
        setProfileData({ 
          user: sessionData.session.user,
          profile: null,
          error: apiError.message
        });
      }
    } catch (err: any) {
      console.error('Error in auth flow:', err);
      setError(err.message || 'Failed to load debug data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => {
          setOpen(!open);
          if (!open && !profileData) {
            fetchProfileData();
          }
        }}
        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm font-medium"
      >
        {open ? 'Close Debug' : 'Debug Panel'}
      </button>

      {open && (
        <div className="absolute bottom-10 right-0 p-4 bg-white border border-gray-300 rounded-md shadow-lg w-96 max-h-[80vh] overflow-auto">
          <h3 className="text-lg font-medium mb-2">Debug Info</h3>
          
          {loading && <p className="text-gray-600">Loading...</p>}
          
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 p-2 mb-2">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {profileData && (
            <div className="text-xs">
              <h4 className="font-medium mb-1">Auth User:</h4>
              <pre className="bg-gray-100 p-2 mb-2 overflow-auto">
                {JSON.stringify(profileData.user, null, 2)}
              </pre>
              
              {profileData.profile && (
                <>
                  <h4 className="font-medium mb-1">Profile Data:</h4>
                  <pre className="bg-gray-100 p-2 overflow-auto">
                    {JSON.stringify(profileData.profile, null, 2)}
                  </pre>
                </>
              )}

              {profileData.error && (
                <>
                  <h4 className="font-medium mb-1 text-red-600">Profile Error:</h4>
                  <pre className="bg-red-50 p-2 overflow-auto text-red-600">
                    {JSON.stringify(profileData.error, null, 2)}
                  </pre>
                </>
              )}
            </div>
          )}

          <div className="mt-4">
            <button
              onClick={fetchProfileData}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-xs"
            >
              Refresh Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 