const { withAndroidManifest } = require('expo/config-plugins');

function withBillingPermission(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }
    const hasPermission = manifest['uses-permission'].some(
      (p) => p.$?.['android:name'] === 'com.android.vending.BILLING'
    );
    if (!hasPermission) {
      manifest['uses-permission'].push({
        $: { 'android:name': 'com.android.vending.BILLING' },
      });
    }
    return config;
  });
}

module.exports = withBillingPermission;
