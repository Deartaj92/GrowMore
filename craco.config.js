/**
 * Netlify build VMs are easy to OOM-kill during webpack minify + fork-ts-checker.
 * When NETLIFY=true (set by Netlify), drop type-check plugin and cap Terser workers.
 * @param {import('webpack').Configuration} webpackConfig
 */
function applyNetlifyLowMemoryWebpack(webpackConfig) {
    if (process.env.NETLIFY !== 'true') return;

    const plugins = webpackConfig.plugins;
    if (Array.isArray(plugins)) {
        webpackConfig.plugins = plugins.filter((p) => {
            const name = p?.constructor?.name || '';
            return !/ForkTsChecker/i.test(name);
        });
    }

    const minimizers = webpackConfig.optimization?.minimizer;
    if (!Array.isArray(minimizers)) return;

    for (const m of minimizers) {
        if (m?.constructor?.name === 'TerserPlugin' && m.options) {
            m.options.parallel = false;
        }
    }
}

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
            applyNetlifyLowMemoryWebpack(webpackConfig);
            return webpackConfig;
        },
    },
};
