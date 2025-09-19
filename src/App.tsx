import React, { useEffect } from 'react';
import { LoginForm } from './components/auth/LoginForm';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { MessageList } from './components/messaging/MessageList';
import { useAuthStore } from './store/auth-store';
import { useAppStore } from './store/app-store';

function App() {
  const { isAuthenticated, restoreSession } = useAuthStore();
  const { 
    currentTab, 
    setCurrentTab, 
    messages, 
    users, 
    toggleStarMessage,
    getStarredMessages 
  } = useAppStore();

  useEffect(() => {
    // Try to restore previous session on app start
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    // Initialize real-time features and notifications when authenticated
    if (isAuthenticated) {
      const initializeApp = async () => {
        const { 
          loadRecentMessages, 
          initializeRealTime, 
          requestNotificationPermission 
        } = useAppStore.getState();
        
        // Request notification permission
        await requestNotificationPermission();
        
        // Load recent messages
        await loadRecentMessages();
        
        // Initialize real-time features
        const token = useAuthStore.getState().token;
        const serverUrl = useAuthStore.getState().serverUrl;
        
        if (token && serverUrl) {
          await initializeRealTime(serverUrl, token);
        }
      };
      
      initializeApp();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Set up online/offline detection
    const handleOnline = () => useAppStore.getState().setOfflineStatus(false);
    const handleOffline = () => useAppStore.getState().setOfflineStatus(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Main Content Area */}
      <div className="h-full">
        {currentTab === 'inbox' && (
          <div className="p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Inbox</h1>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {Object.keys(messages).length > 0 ? (
                <div className="max-h-96 overflow-y-auto">
                  {Object.entries(messages).map(([channelId, channelMessages]) => (
                    <div key={channelId} className="border-b border-gray-100 last:border-b-0">
                      <MessageList
                        messages={channelMessages.slice(0, 5)} // Show latest 5 messages per channel
                        users={users}
                        onToggleStar={toggleStarMessage}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <div className="text-gray-500 mb-2">📨</div>
                  <p className="text-gray-600">Your recent messages will appear here</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {currentTab === 'starred' && (
          <div className="p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Starred Messages</h1>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {(() => {
                const starredMessages = getStarredMessages();
                return starredMessages.length > 0 ? (
                  <MessageList
                    messages={starredMessages}
                    users={users}
                    onToggleStar={toggleStarMessage}
                  />
                ) : (
                  <div className="p-6 text-center">
                    <div className="text-gray-500 mb-2">⭐</div>
                    <p className="text-gray-600">Starred messages will appear here</p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {currentTab === 'history' && (
          <div className="p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Message History</h1>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
              <div className="text-gray-500 mb-2">🕐</div>
              <p className="text-gray-600">Message history will appear here</p>
            </div>
          </div>
        )}

        {currentTab === 'channels' && (
          <div className="p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Channels</h1>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
              <div className="text-gray-500 mb-2">#️⃣</div>
              <p className="text-gray-600">Channel list will appear here</p>
            </div>
          </div>
        )}

        {currentTab === 'direct' && (
          <div className="p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Direct Messages</h1>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
              <div className="text-gray-500 mb-2">💬</div>
              <p className="text-gray-600">Direct messages will appear here</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation
        currentTab={currentTab}
        onTabChange={setCurrentTab}
      />
    </div>
  );
}

export default App;