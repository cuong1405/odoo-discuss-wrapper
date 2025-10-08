import React, { useEffect } from 'react';
import { LoginForm } from './components/auth/LoginForm';
import { TopBar } from './components/layout/TopBar';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { RecentMessagesList } from './components/messages/RecentMessagesList';
import { useAuthStore } from './store/auth-store';
import { useAppStore } from './store/app-store';
import { ChannelsTab } from './components/layout/ChannelsTab';
import { DirectMessagesTab } from './components/layout/DirectMessagesTab';

function App() {
  const { isAuthenticated, restoreSession } = useAuthStore();
  const { currentTab, setCurrentTab, loadRecentMessages, currentChannelId } = useAppStore();
  const loadChannels = useAppStore(state => state.loadChannels);
  const loadDirectChannels = useAppStore(state => state.loadDirectChannels);

  useEffect(() => {
    // Try to restore previous session on app start
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    // Load channels when authenticated
    if (isAuthenticated) {
      loadChannels();
    }
  }, [isAuthenticated, loadChannels]);

  useEffect(() => {
    // Load direct channels when authenticated
    if (isAuthenticated) {
      loadDirectChannels();
    }
  }, [isAuthenticated, loadDirectChannels]);

  useEffect(() => {
    // Load recent messages when authenticated
    if (isAuthenticated) {
      loadRecentMessages();
    }
  }, [isAuthenticated, loadRecentMessages]);

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

  useEffect(() => {
    // Request notification permission on app start
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Redirect to login if not authenticated

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  const isInChatView = currentChannelId !== null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar - Hidden when in chat view */}
      {!isInChatView && <TopBar />}

      {/* Main Content Area */}
      <div className={isInChatView ? '' : 'pt-[140px] pb-16'}>
        {currentTab === 'inbox' && (
          <div className="p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Inbox</h1>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
              <div className="text-gray-500 mb-2">📨</div>
              <p className="text-gray-600">Your messages will appear here</p>
            </div>
          </div>
        )}

        {currentTab === 'channels' && <ChannelsTab />}

        {currentTab === 'dms' && <DirectMessagesTab />}

        {currentTab === 'activity' && <RecentMessagesList />}
      </div>

      {/* Bottom Navigation - Hidden when in chat view */}
      {!isInChatView && (
        <BottomNavigation
          currentTab={currentTab}
          onTabChange={setCurrentTab}
        />
      )}
    </div>
  );
}

export default App;
