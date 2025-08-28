module.exports = {
    apps: [
        {
            name: 'lingoAI',
            cwd: '/home/fitlhu-lingoai/htdocs/lingoai.fitlhu.com/lingoAI',
            script: 'node_modules/next/dist/bin/next',
            args: 'start -p 3032',
            env: {
                NODE_ENV: 'production'
            }
        }
    ]
};