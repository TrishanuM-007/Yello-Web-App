import mixpanel from 'mixpanel-browser';

// Initialize with a placeholder token (I will swap this later)
mixpanel.init('f368c2f83d8862e70ef25019b5dd7f13', { debug: false, track_pageview: true, persistence: 'localStorage' });

export const Analytics = {
  identify: (userId, role) => {
    mixpanel.identify(userId);
    mixpanel.people.set({ $role: role });
  },
  track: (eventName, properties = {}) => {
    mixpanel.track(eventName, properties);
  }
};
