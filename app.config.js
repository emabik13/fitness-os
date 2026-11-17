// Extends app.json. EXPO_PUBLIC_BASE_URL lets the web build live under a
// sub-path (e.g. GitHub Pages: /fitness-os).
module.exports = ({ config }) => {
  const baseUrl = (process.env.EXPO_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  return {
    ...config,
    experiments: { ...config.experiments, ...(baseUrl ? { baseUrl } : {}) },
  };
};
