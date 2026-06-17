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

            applyNetlifyLowMemoryWebpack(webpackConfig);
            
            // Ignore source map loader warnings from third-party packages (e.g. html5-qrcode)
            webpackConfig.ignoreWarnings = [
                ...(webpackConfig.ignoreWarnings || []),
                /Failed to parse source map/,
            ];
            
            return webpackConfig;
        },
    },
};
