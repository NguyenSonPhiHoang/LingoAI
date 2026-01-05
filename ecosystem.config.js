module.exports = {
    apps: [
        {
            name: 'lingoAI',
            cwd: '/home/fitlhu-lingoai/htdocs/lingoai.fitlhu.com/lingoAI',
            script: 'node_modules/next/dist/bin/next',
            args: 'start -p 3032',
            env: {
                NODE_ENV: 'production',
                env: {
                    VERTEXAI_PROJECT: "your-project-id",
                    GOOGLE_CLOUD_PROJECT: "your-project-id",
                    VERTEXAI_LOCATION: "us-central1",
                    GOOGLE_APPLICATION_CREDENTIALS: "/opt/keys/svc-vertex.json"
                }
            }
        }
    ]
};