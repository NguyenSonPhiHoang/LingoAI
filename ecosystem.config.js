module.exports = {
    apps: [
        {
            name: 'lingoAI',
            cwd: './',
            script: 'node_modules/next/dist/bin/next',
            args: 'start -p 3124',
            env: {
                NODE_ENV: 'production'
            }
        }
    ]
};