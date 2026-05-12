/** @param {import('webpack').Configuration} webpackConfig */
function excludeFaceApiFromSourceMaps(webpackConfig) {
    const rules = webpackConfig.module?.rules;
    if (!Array.isArray(rules)) return;

    const faceApiRe = /node_modules[/\\]face-api\.js[/\\]/;

    for (const rule of rules) {
        if (!rule || rule.enforce !== 'pre') continue;
        const loader = rule.loader || (Array.isArray(rule.use) && rule.use[0]?.loader);
        if (typeof loader !== 'string' || !loader.includes('source-map-loader')) continue;

        const ex = rule.exclude;
        rule.exclude = [...(Array.isArray(ex) ? ex : ex != null ? [ex] : []), faceApiRe];
        break;
    }
}

module.exports = {
    webpack: {
        configure(webpackConfig) {
            webpackConfig.resolve = webpackConfig.resolve || {};
            webpackConfig.resolve.fallback = {
                ...(webpackConfig.resolve.fallback || {}),
                fs: false,
                path: false,
                crypto: false,
            };

            excludeFaceApiFromSourceMaps(webpackConfig);
            return webpackConfig;
        },
    },
};
