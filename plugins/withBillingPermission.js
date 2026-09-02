const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withBillingPermission(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const billing = manifest['uses-permission'].find(
      (p) => p.$?.['android:name'] === 'com.android.vending.BILLING'
    );

    if (!billing) {
      manifest['uses-permission'].push({
        $: { 'android:name': 'com.android.vending.BILLING' },
      });
    }

    return config;
  });
};
