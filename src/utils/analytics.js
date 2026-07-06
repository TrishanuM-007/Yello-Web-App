import mixpanel from 'mixpanel-browser';

try {
  // Initialize with a placeholder token (I will swap this later)
  mixpanel.init('f368c2f83d8862e70ef25019b5dd7f13', { debug: false, track_pageview: true, persistence: 'localStorage' });
} catch (error) {
  console.warn("Mixpanel initialization blocked.");
}

export const Analytics = {
  identify: (userId, role) => {
    try {
      mixpanel.identify(userId);
      mixpanel.people.set({ $role: role });
    } catch (error) {
      console.warn("Analytics identify blocked.");
    }
  },
  track: (eventName, properties = {}) => {
    try {
      mixpanel.track(eventName, properties);
    } catch (error) {
      console.warn("Analytics track blocked.");
    }
  }
};
